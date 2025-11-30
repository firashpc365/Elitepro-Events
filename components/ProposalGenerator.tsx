// components/features/ProposalGenerator.tsx
import React, { useState, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { InputField } from '../common/InputField';
import { ProposalPreview } from './ProposalPreview';
import { generateEventTheme, generateEventIntroduction, generateEventConclusion, generateImageForPrompt, enhanceLineItem, reviewProposalContent, generateSubItemsForItem, generateSubItemDescription } from '../../services/geminiService';
import type { EventItem, AIInteraction, CostTrackerItem, AppSettings, ProposalLineItem, SubItem } from '../../types';
import { DownloadIcon, SparkleIcon, PlusIcon, EditIcon, TrashIcon } from '../common/icons';
import { ImageUploader } from '../common/ImageUploader';

interface ProposalGeneratorProps {
  event: EventItem;
  appSettings: AppSettings;
  onClose: () => void;
  setError: (error: any) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

interface ProposalContent {
    themeTitle: string;
    themeDescription: string;
    introduction: string;
    lineItems: ProposalLineItem[];
    conclusion: string;
    cover: {
        title: string;
        subtitle: string;
        clientName: string;
        date: string;
    }
}

interface Branding {
    primaryColor: string;
    companyLogo: string;
    partnerLogo1: string;
    partnerLogo2: string;
}

type LoadingStates = {
    theme: boolean; introduction: boolean; conclusion: boolean; review: boolean;
    items: { [key: string]: { description?: boolean; image?: boolean; subItems?: boolean } };
    allItemsDescription: boolean; allItemsImage: boolean;
};

// Sub-components defined within the main component file to avoid creating new files.

const SubItemEditorModal: React.FC<{
    subItem: Partial<SubItem> | null;
    parentItem: ProposalLineItem;
    event: EventItem;
    onClose: () => void;
    onSave: (subItem: SubItem) => void;
    setError: (e: any) => void;
    onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}> = ({ subItem, parentItem, event, onClose, onSave, setError, onLogInteraction }) => {
    const [localSubItem, setLocalSubItem] = useState<Partial<SubItem>>(subItem || { quantity: 1, unitPrice: 0 });
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    const handleSave = () => {
        if (!localSubItem.name || localSubItem.quantity == null || localSubItem.unitPrice == null) {
            setError(new Error("Sub-item name, quantity, and unit price are required."));
            return;
        }
        const finalSubItem: SubItem = {
            subItemId: localSubItem.subItemId || `sub-${Date.now()}`,
            name: localSubItem.name,
            description: localSubItem.description || '',
            quantity: localSubItem.quantity,
            unitPrice: localSubItem.unitPrice,
            ...localSubItem,
        };
        onSave(finalSubItem);
    };

    const handleGenerateDescription = async () => {
        if (!localSubItem.name) {
            setError(new Error("Please provide a name for the sub-item first."));
            return;
        }
        setIsGeneratingDesc(true);
        try {
            const result = await generateSubItemDescription(localSubItem.name, parentItem, event);
            onLogInteraction({
                feature: 'sub_item_description', promptSummary: `Generate description for sub-item ${localSubItem.name}`,
                fullPrompt: `Sub-item: ${localSubItem.name}, Parent: ${parentItem.name}`, response: result
            });
            setLocalSubItem(prev => ({ ...prev, description: result, description_source: 'ai' }));
        } catch (e) {
            setError(e);
        } finally {
            setIsGeneratingDesc(false);
        }
    };
    
    return (
        <Modal title={localSubItem.subItemId ? "Edit Sub-Item" : "Add Sub-Item"} onClose={onClose} onSave={handleSave}>
            <div className="space-y-4">
                <InputField label="Sub-Item Name" value={localSubItem.name || ''} onChange={e => setLocalSubItem(p => ({ ...p, name: e.target.value }))} required />
                <div>
                    <label className="block text-sm font-medium">Description</label>
                    <textarea value={localSubItem.description || ''} onChange={e => setLocalSubItem(p => ({ ...p, description: e.target.value }))} rows={4} className="mt-1 block w-full p-2 border rounded" />
                    <button onClick={handleGenerateDescription} disabled={isGeneratingDesc} className="text-xs text-purple-600 flex items-center gap-1 mt-1 hover:text-purple-800">
                        {isGeneratingDesc ? <InlineSpinner /> : <><SparkleIcon className="h-4 w-4" /> Generate with AI</>}
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Quantity" type="number" value={localSubItem.quantity || ''} onChange={e => setLocalSubItem(p => ({ ...p, quantity: Number(e.target.value) }))} required />
                    <InputField label="Unit Price (SAR)" type="number" value={localSubItem.unitPrice || ''} onChange={e => setLocalSubItem(p => ({ ...p, unitPrice: Number(e.target.value) }))} required />
                </div>
                <ImageUploader label="Sub-Item Image" onImageSelected={b64 => setLocalSubItem(p => ({ ...p, image: b64 }))} initialImage={localSubItem.image} />
            </div>
        </Modal>
    );
};

const AISubItemSuggesterModal: React.FC<{
    suggestions: { name: string, description: string }[];
    onClose: () => void;
    onConfirm: (selected: { name: string, description: string }[]) => void;
}> = ({ suggestions, onClose, onConfirm }) => {
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    const handleToggle = (name: string) => {
        setSelected(prev => ({...prev, [name]: !prev[name]}));
    };

    const handleConfirm = () => {
        const selectedSuggestions = suggestions.filter(s => selected[s.name]);
        onConfirm(selectedSuggestions);
    };

    return (
        <Modal title="AI Sub-Item Suggestions" onClose={onClose} onSave={handleConfirm} saveText={`Add ${Object.values(selected).filter(Boolean).length} items`}>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50">
                        <input type="checkbox" className="mt-1 h-4 w-4" onChange={() => handleToggle(s.name)} checked={!!selected[s.name]}/>
                        <div>
                            <p className="font-semibold text-slate-800">{s.name}</p>
                            <p className="text-sm text-slate-600">{s.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    )
};


export const ProposalGenerator: React.FC<ProposalGeneratorProps> = ({ event, appSettings, onClose, setError, onLogInteraction }) => {
  const [proposalContent, setProposalContent] = useState<ProposalContent>({
    themeTitle: '', themeDescription: '',
    introduction: '', conclusion: '',
    lineItems: event.cost_tracker.map((item, index) => ({...item, key: `${item.itemId}-${index}`, subItems: [] })),
    cover: { title: event.name, subtitle: 'Event Proposal', clientName: event.clientName, date: event.date }
  });
  const [branding, setBranding] = useState<Branding>({
      primaryColor: appSettings.colors.primaryAccent, companyLogo: '', partnerLogo1: '', partnerLogo2: ''
  });
  const [themeImage, setThemeImage] = useState('');
  const [includedItems, setIncludedItems] = useState<Record<string, boolean>>(
      event.cost_tracker.reduce((acc, item, index) => ({ ...acc, [`${item.itemId}-${index}`]: true }), {})
  );

  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    theme: false, introduction: false, conclusion: false, review: false,
    items: {}, allItemsDescription: false, allItemsImage: false
  });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [editingSubItem, setEditingSubItem] = useState<{ parentIndex: number; subItem?: Partial<SubItem> } | null>(null);
  const [subItemSuggestions, setSubItemSuggestions] = useState<{ parentIndex: number; suggestions: { name: string; description: string }[] } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const handleGenerateTheme = useCallback(async () => {
    setLoadingStates(prev => ({...prev, theme: true}));
    setError(null);
    try {
        const { title, description, imagePrompt } = await generateEventTheme(event);
        onLogInteraction({ feature: 'theme', promptSummary: `Generate theme for ${event.name}`, fullPrompt: `Event: ${JSON.stringify(event)}`, response: JSON.stringify({ title, description, imagePrompt }), model: 'gemini-2.5-pro' });
        setProposalContent(prev => ({...prev, themeTitle: title, themeDescription: description}));

        const imageData = await generateImageForPrompt(imagePrompt);
        onLogInteraction({ feature: 'theme', promptSummary: `Generate theme image`, fullPrompt: imagePrompt, response: '[Image Data]', model: 'gemini-2.5-flash-image' });
        setThemeImage(`data:image/png;base64,${imageData}`);
    } catch(e) { setError(e) } finally { setLoadingStates(prev => ({...prev, theme: false})) }
  }, [event, setError, onLogInteraction]);

  const handleGenerateIntroduction = useCallback(async () => {
    if (!proposalContent.themeTitle) { setError(new Error("Please generate a theme first.")); return; }
    setLoadingStates(prev => ({...prev, introduction: true}));
    setError(null);
    try {
        const result = await generateEventIntroduction(event, proposalContent.themeTitle, proposalContent.themeDescription);
        onLogInteraction({ feature: 'introduction', promptSummary: `Generate introduction`, fullPrompt: `Theme: ${proposalContent.themeTitle}`, response: result, model: 'gemini-2.5-flash' });
        setProposalContent(prev => ({...prev, introduction: result}));
    } catch(e) { setError(e) } finally { setLoadingStates(prev => ({...prev, introduction: false})) }
  }, [event, proposalContent.themeTitle, proposalContent.themeDescription, setError, onLogInteraction]);
  
  const handleGenerateConclusion = useCallback(async () => {
    setLoadingStates(prev => ({...prev, conclusion: true}));
    setError(null);
    try {
        const result = await generateEventConclusion(event);
        onLogInteraction({ feature: 'conclusion', promptSummary: `Generate conclusion`, fullPrompt: `Event: ${event.name}`, response: result, model: 'gemini-2.5-flash' });
        setProposalContent(prev => ({...prev, conclusion: result}));
    } catch(e) { setError(e) } finally { setLoadingStates(prev => ({...prev, conclusion: false})) }
  }, [event, setError, onLogInteraction]);

  const handleGenerateItemDetail = useCallback(async (item: CostTrackerItem, index: number, type: 'description' | 'image') => {
      const itemKey = `${item.itemId}-${index}`;
      setLoadingStates(prev => ({ ...prev, items: { ...prev.items, [itemKey]: { ...prev.items[itemKey], [type]: true } } }));
      setError(null);
      try {
          if (type === 'description') {
              const { result, fullPrompt } = await enhanceLineItem(item, event, 'description');
              onLogInteraction({ feature: 'description', promptSummary: `Generate description for ${item.name}`, fullPrompt, response: result, model: 'gemini-2.5-flash' });
              setProposalContent(prev => ({...prev, lineItems: prev.lineItems.map((it, i) => i === index ? {...it, description: result, description_source: 'ai'} : it)}));
          } else {
              const { result: imagePrompt, fullPrompt } = await enhanceLineItem(item, event, 'image_prompt');
              // FIX: Corrected typo from onLogAIInteraction to onLogInteraction
              onLogInteraction({ feature: 'item_image', promptSummary: `Generate image prompt for ${item.name}`, fullPrompt, response: imagePrompt, model: 'gemini-2.5-flash' });
              
              const imageData = await generateImageForPrompt(imagePrompt);
              // FIX: Corrected typo from onLogAIInteraction to onLogInteraction
              onLogInteraction({ feature: 'item_image', promptSummary: `Generate image for ${item.name}`, fullPrompt: imagePrompt, response: '[Image Data]', model: 'gemini-2.5-flash-image' });
              setProposalContent(prev => ({...prev, lineItems: prev.lineItems.map((it, i) => i === index ? {...it, generatedImage: `data:image/png;base64,${imageData}`} : it)}));
          }
      } catch(e) { setError(e) } finally { setLoadingStates(prev => ({ ...prev, items: { ...prev.items, [itemKey]: { ...prev.items[itemKey], [type]: false } } })); }
  }, [event, setError, onLogInteraction]);

  const handleGenerateAll = async (type: 'description' | 'image') => {
      setLoadingStates(prev => type === 'description' ? { ...prev, allItemsDescription: true } : { ...prev, allItemsImage: true });
      for (const [index, item] of proposalContent.lineItems.entries()) {
          const itemKey = `${item.itemId}-${index}`;
          if (includedItems[itemKey]) {
              await handleGenerateItemDetail(item, index, type);
          }
      }
      setLoadingStates(prev => type === 'description' ? { ...prev, allItemsDescription: false } : { ...prev, allItemsImage: false });
  };

  const handleReview = async () => {
      setLoadingStates(prev => ({...prev, review: true}));
      setIsReviewModalOpen(true);
      setReviewContent('');
      setError(null);
      try {
          const fullText = `
              Theme: ${proposalContent.themeTitle} - ${proposalContent.themeDescription}
              Introduction: ${proposalContent.introduction}
              Items: ${proposalContent.lineItems.filter((_,i) => includedItems[`${_.itemId}-${i}`]).map(i => `${i.name}: ${i.description}`).join('\n')}
              Conclusion: ${proposalContent.conclusion}
          `;
          const { result, fullPrompt } = await reviewProposalContent(fullText);
          // FIX: Corrected typo from onLogAIInteraction to onLogInteraction
          onLogInteraction({ feature: 'proposal_review', promptSummary: 'Review proposal content', fullPrompt, response: result, model: 'gemini-2.5-flash' });
          setReviewContent(result);
      } catch(e) { setError(e) } finally { setLoadingStates(prev => ({...prev, review: false})) }
  };
  
  const handleDownloadPdf = useCallback(async () => {
    const element = previewRef.current;
    if (!element) { setError(new Error("Proposal content not found.")); return; }
    setIsDownloading(true);
    try {
        const pages = element.querySelectorAll('.proposal-page');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for(let i = 0; i < pages.length; i++) {
            const page = pages[i] as HTMLElement;
            const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false });
            if (i > 0) pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
        pdf.save(`Proposal-${event.name}.pdf`);
    } catch (e) { setError(e) } finally { setIsDownloading(false) }
  }, [event.name, setError]);

  // Sub-Item Handlers
  const handleSaveSubItem = (parentIndex: number, subItem: SubItem) => {
      setProposalContent(prev => {
          const lineItems = [...prev.lineItems];
          const parent = { ...lineItems[parentIndex] };
          parent.subItems = parent.subItems || [];
          const existingIndex = parent.subItems.findIndex(si => si.subItemId === subItem.subItemId);

          if (existingIndex > -1) {
              parent.subItems[existingIndex] = subItem;
          } else {
              parent.subItems.push(subItem);
          }
          lineItems[parentIndex] = parent;
          return { ...prev, lineItems };
      });
      setEditingSubItem(null);
  };
  
  const handleDeleteSubItem = (parentIndex: number, subItemId: string) => {
      setProposalContent(prev => {
          const lineItems = [...prev.lineItems];
          const parent = { ...lineItems[parentIndex] };
          parent.subItems = (parent.subItems || []).filter(si => si.subItemId !== subItemId);
          lineItems[parentIndex] = parent;
          return { ...prev, lineItems };
      });
  };

  const handleGenerateSubItems = async (parentItem: ProposalLineItem, parentIndex: number) => {
      const itemKey = parentItem.key;
      setLoadingStates(prev => ({ ...prev, items: { ...prev.items, [itemKey]: { ...prev.items[itemKey], subItems: true } } }));
      try {
          const suggestions = await generateSubItemsForItem(parentItem, event);
          // FIX: Corrected typo from onLogAIInteraction to onLogInteraction
          onLogInteraction({ feature: 'sub_items', promptSummary: `Generate sub-items for ${parentItem.name}`, fullPrompt: `...`, response: JSON.stringify(suggestions) });
          setSubItemSuggestions({ parentIndex, suggestions });
      } catch (e) {
          setError(e);
      } finally {
          setLoadingStates(prev => ({ ...prev, items: { ...prev.items, [itemKey]: { ...prev.items[itemKey], subItems: false } } }));
      }
  };

  const handleConfirmSubItemSuggestions = (parentIndex: number, selected: {name: string, description: string}[]) => {
      const newSubItems: SubItem[] = selected.map(s => ({
          subItemId: `sub-${Date.now()}-${Math.random()}`,
          name: s.name,
          description: s.description,
          quantity: 1,
          unitPrice: 0, // User needs to set price
          description_source: 'ai'
      }));
      setProposalContent(prev => {
          const lineItems = [...prev.lineItems];
          const parent = { ...lineItems[parentIndex] };
          parent.subItems = [...(parent.subItems || []), ...newSubItems];
          lineItems[parentIndex] = parent;
          return { ...prev, lineItems };
      });
      setSubItemSuggestions(null);
  };

  const footer = (
    <div className="flex justify-end gap-3 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-black/20 transition rounded-lg">Close</button>
        <button onClick={handleDownloadPdf} disabled={isDownloading} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 flex items-center gap-2 disabled:bg-green-800">
            {isDownloading ? <InlineSpinner/> : <DownloadIcon className="h-5 w-5"/>} {isDownloading ? 'Downloading...' : 'Download PDF'}
        </button>
    </div>
  );
  
  const coverChange = (field: keyof ProposalContent['cover'], value: string) => {
      setProposalContent(p => ({ ...p, cover: { ...p.cover, [field]: value } }));
  };

  return (
    <>
    <Modal title="Proposal Studio" onClose={onClose} size="full" footer={footer}>
        <div className="grid grid-cols-12 gap-6 h-[80vh]">
            <div className="col-span-4 overflow-y-auto pr-4 space-y-4">
                {/* Branding */}
                <div className="p-3 border rounded-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-container-color)' }}>
                    <h3 className="font-semibold text-lg mb-2">Branding</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm">Accent Color:</label>
                            <input type="color" value={branding.primaryColor} onChange={e => setBranding(p => ({...p, primaryColor: e.target.value}))} />
                        </div>
                        <ImageUploader label="Company Logo" onImageSelected={b64 => setBranding(p => ({...p, companyLogo: b64}))}/>
                        <ImageUploader label="Partner Logo 1" onImageSelected={b64 => setBranding(p => ({...p, partnerLogo1: b64}))}/>
                        <ImageUploader label="Partner Logo 2" onImageSelected={b64 => setBranding(p => ({...p, partnerLogo2: b64}))}/>
                    </div>
                </div>
                 {/* Cover Page Details */}
                <div className="p-3 border rounded-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-container-color)' }}>
                    <h3 className="font-semibold text-lg mb-2">Cover Page Details</h3>
                    <div className="space-y-3">
                       <InputField label="Main Title" value={proposalContent.cover.title} onChange={e => coverChange('title', e.target.value)} />
                       <InputField label="Subtitle" value={proposalContent.cover.subtitle} onChange={e => coverChange('subtitle', e.target.value)} />
                       <InputField label="Client Name" value={proposalContent.cover.clientName} onChange={e => coverChange('clientName', e.target.value)} />
                       <InputField label="Event Date" type="date" value={proposalContent.cover.date} onChange={e => coverChange('date', e.target.value)} />
                    </div>
                </div>
                {/* Content Generation */}
                <div className="p-3 border rounded-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-container-color)' }}>
                    <h3 className="font-semibold text-lg mb-2">Content Generation</h3>
                    <div className="space-y-3">
                        <button onClick={handleGenerateTheme} disabled={loadingStates.theme} className="w-full text-sm flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-800">
                            {loadingStates.theme ? <InlineSpinner/> : <SparkleIcon className="h-4 w-4"/>} 1. Generate Theme & Cover Image
                        </button>
                        <div>
                            <textarea value={proposalContent.introduction} onChange={e => setProposalContent(p => ({...p, introduction: e.target.value}))} rows={3} placeholder="Introduction..." className="w-full text-sm p-2 border rounded" style={{backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)'}}/>
                            <button onClick={handleGenerateIntroduction} disabled={loadingStates.introduction || !proposalContent.themeTitle} className="w-full mt-1 text-xs flex items-center justify-center gap-1 py-1 px-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-800">
                                {loadingStates.introduction ? <InlineSpinner/> : <><SparkleIcon className="h-4 w-4"/> Generate Intro</>}
                            </button>
                        </div>
                         <div>
                            <textarea value={proposalContent.conclusion} onChange={e => setProposalContent(p => ({...p, conclusion: e.target.value}))} rows={3} placeholder="Conclusion..." className="w-full text-sm p-2 border rounded" style={{backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)'}}/>
                            <button onClick={handleGenerateConclusion} disabled={loadingStates.conclusion} className="w-full mt-1 text-xs flex items-center justify-center gap-1 py-1 px-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-800">
                                {loadingStates.conclusion ? <InlineSpinner/> : <><SparkleIcon className="h-4 w-4"/> Generate Conclusion</>}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Item Selection & Generation */}
                <div className="p-3 border rounded-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-container-color)' }}>
                    <h3 className="font-semibold text-lg">Event Items ({proposalContent.lineItems.length})</h3>
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => handleGenerateAll('description')} disabled={loadingStates.allItemsDescription} className="w-full text-xs flex items-center justify-center gap-2 py-2 px-3 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-700">{loadingStates.allItemsDescription ? <InlineSpinner/> : <><SparkleIcon className="h-4 w-4"/> Gen All Desc</>}</button>
                        <button onClick={() => handleGenerateAll('image')} disabled={loadingStates.allItemsImage} className="w-full text-xs flex items-center justify-center gap-2 py-2 px-3 bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:bg-slate-700">{loadingStates.allItemsImage ? <InlineSpinner/> : <><SparkleIcon className="h-4 w-4"/> Gen All Images</>}</button>
                    </div>
                    <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1">
                        {proposalContent.lineItems.map((item, index) => (
                            <div key={item.key} className="p-2 border rounded" style={{ borderColor: 'var(--border-color)'}}>
                                <div className="flex items-start gap-2">
                                    <input type="checkbox" checked={includedItems[item.key] || false} onChange={e => setIncludedItems(p => ({...p, [item.key]: e.target.checked}))} className="mt-1"/>
                                    <p className="text-sm font-semibold flex-grow">{item.name}</p>
                                    <button onClick={() => setExpandedItems(p => ({...p, [item.key]: !p[item.key]}))} className="text-xs">{expandedItems[item.key] ? 'Collapse' : 'Expand'}</button>
                                </div>
                                {expandedItems[item.key] && (
                                    <div className="pl-5 mt-2 space-y-2">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleGenerateItemDetail(item, index, 'description')} disabled={loadingStates.items[item.key]?.description} className="w-full text-xs flex items-center justify-center gap-1 py-1 px-2 bg-slate-500/50 rounded hover:bg-slate-500/80 disabled:bg-slate-700">{loadingStates.items[item.key]?.description ? <InlineSpinner/> : 'Desc'}</button>
                                            <button onClick={() => handleGenerateItemDetail(item, index, 'image')} disabled={loadingStates.items[item.key]?.image} className="w-full text-xs flex items-center justify-center gap-1 py-1 px-2 bg-slate-500/50 rounded hover:bg-slate-500/80 disabled:bg-slate-700">{loadingStates.items[item.key]?.image ? <InlineSpinner/> : 'Image'}</button>
                                            <button onClick={() => handleGenerateSubItems(item, index)} disabled={loadingStates.items[item.key]?.subItems} className="w-full text-xs flex items-center justify-center gap-1 py-1 px-2 bg-slate-500/50 rounded hover:bg-slate-500/80 disabled:bg-slate-700">{loadingStates.items[item.key]?.subItems ? <InlineSpinner/> : 'Sub-Items'}</button>
                                        </div>
                                        {/* Sub-item list */}
                                        <div className="space-y-1">
                                            {item.subItems?.map(si => (
                                                <div key={si.subItemId} className="flex justify-between items-center bg-black/20 p-1 rounded text-xs">
                                                    <span className="truncate">{si.name}</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => setEditingSubItem({ parentIndex: index, subItem: si })}><EditIcon className="h-3 w-3"/></button>
                                                        <button onClick={() => handleDeleteSubItem(index, si.subItemId)}><TrashIcon className="h-3 w-3"/></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => setEditingSubItem({ parentIndex: index })} className="w-full text-xs flex items-center justify-center gap-1 py-1 px-2 bg-blue-500/20 rounded hover:bg-blue-500/40">
                                            <PlusIcon className="h-3 w-3"/> Add Sub-Item
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                 {/* Review */}
                <div className="p-3 border rounded-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-container-color)' }}>
                    <h3 className="font-semibold text-lg">AI Review</h3>
                    <button onClick={handleReview} disabled={loadingStates.review} className="w-full mt-2 text-sm flex items-center justify-center gap-2 py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-800">
                        {loadingStates.review ? <InlineSpinner/> : <SparkleIcon className="h-4 w-4"/>} Review with AI
                    </button>
                </div>
            </div>
            <div className="col-span-8 bg-slate-800/50 p-4 overflow-y-auto rounded-lg">
                <ProposalPreview ref={previewRef} content={{...proposalContent, lineItems: proposalContent.lineItems.filter(item => includedItems[item.key])}} event={event} themeImage={themeImage} branding={branding} />
            </div>
        </div>
    </Modal>
    {isReviewModalOpen && (
        <Modal title="AI Proposal Review" onClose={() => setIsReviewModalOpen(false)}>
            {loadingStates.review ? (
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <InlineSpinner/>
                    <p className="mt-2" style={{color: 'var(--text-secondary-color)'}}>Gemini is reviewing your proposal...</p>
                </div>
            ) : (
                 <div className="prose prose-sm max-w-none whitespace-pre-wrap max-h-[60vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: reviewContent.replace(/###\s*(.*)/g, '<h3 class="font-bold text-lg mt-2">$1</h3>') }}></div>
            )}
        </Modal>
    )}
     {editingSubItem && (
        <SubItemEditorModal
            subItem={editingSubItem.subItem || null}
            parentItem={proposalContent.lineItems[editingSubItem.parentIndex]}
            event={event}
            onClose={() => setEditingSubItem(null)}
            onSave={(subItem) => handleSaveSubItem(editingSubItem.parentIndex, subItem)}
            setError={setError}
            onLogInteraction={onLogInteraction}
        />
     )}
     {subItemSuggestions && (
         <AISubItemSuggesterModal
            suggestions={subItemSuggestions.suggestions}
            onClose={() => setSubItemSuggestions(null)}
            onConfirm={(selected) => handleConfirmSubItemSuggestions(subItemSuggestions.parentIndex, selected)}
        />
     )}
    </>
  );
};