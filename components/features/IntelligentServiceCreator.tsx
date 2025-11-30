
// components/features/IntelligentServiceCreator.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { createServicesFromInput } from '../../services/geminiService';
import type { ServiceItem, AIInteraction } from '../../types';
import { TrashIcon, DocumentTextIcon, SparkleIcon, ListBulletIcon, PlusIcon, BoltIcon, UploadIcon, CheckCircleIcon, RefreshIcon } from '../common/icons';
import { ProgressBar } from '../common/ProgressBar';

interface IntelligentServiceCreatorProps {
  existingServices?: ServiceItem[];
  onClose: () => void;
  onServicesCreate: (servicesData: Omit<ServiceItem, 'id'>[]) => void;
  setError: (error: any) => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

type ParsedService = Omit<ServiceItem, 'id' | 'createdAt' | 'lastModifiedAt' | 'status'> & { confidenceScore?: number };

interface ManualItem {
    id: number;
    name: string;
    category: string;
    basePrice: number;
    description: string;
}

export const IntelligentServiceCreator: React.FC<IntelligentServiceCreatorProps> = ({ existingServices = [], onClose, onServicesCreate, setError, onLogAIInteraction }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  
  // AI Mode State
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ name: string; data: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<string>('Initializing...');
  
  // Metadata State from AI
  const [extractedMetadata, setExtractedMetadata] = useState<{ detectedBranding?: string, pricingStrategy?: string } | null>(null);

  // Manual Mode State
  const [manualItems, setManualItems] = useState<ManualItem[]>([
      { id: 1, name: '', category: '', basePrice: 0, description: '' }
  ]);

  // Shared State
  const [parsedServices, setParsedServices] = useState<ParsedService[] | null>(null);
  const [selectedServices, setSelectedServices] = useState<Record<number, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [duplicatesFound, setDuplicatesFound] = useState<number[]>([]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgress(10);
      setAnalysisStep("Scanning document structure...");
      
      // Simulate steps for better UX
      setTimeout(() => setAnalysisStep("Identifying branding & pricing context..."), 1500);
      setTimeout(() => setAnalysisStep("Extracting line items & categorizing..."), 3000);
      setTimeout(() => setAnalysisStep("Final verification & scoring..."), 5000);
      
      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 5 : prev));
      }, 300);
    } else if (!isLoading && progress > 0) {
        setProgress(100);
        setAnalysisStep("Complete!");
        setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Computed
  const uniqueCategories = useMemo(() => {
      const services = Array.isArray(existingServices) ? existingServices : [];
      return Array.from(new Set(services.map(s => s.category))).sort();
  }, [existingServices]);

  const checkDuplicates = useCallback((items: ParsedService[]) => {
      const duplicateIndices: number[] = [];
      const normalize = (s: string) => s?.trim().toLowerCase() || '';
      const existingNames = new Set(existingServices.map(s => normalize(s.name)));

      items.forEach((item, index) => {
          if (item.name && existingNames.has(normalize(item.name))) {
              duplicateIndices.push(index);
          }
      });
      setDuplicatesFound(duplicateIndices);
  }, [existingServices]);


  const processFiles = (fileList: FileList | null) => {
    if (fileList) {
        const newFiles = Array.from(fileList);
        setFiles(prev => [...prev, ...newFiles]);

        newFiles.forEach((file: File) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => [...prev, { name: file.name, data: reader.result as string }]);
                };
                reader.readAsDataURL(file);
            } else {
                setPreviews(prev => [...prev, { name: file.name, data: null }]);
            }
        });
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  };

  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(isEntering);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleAnalyze = useCallback(async () => {
    if (!inputText && files.length === 0) {
      setError(new Error('Please provide text or a file to analyze.'));
      return;
    }
    setIsLoading(true);
    setParsedServices(null);
    setExtractedMetadata(null);
    setError(null);
    try {
      const { services: result, metadata, interaction } = await createServicesFromInput({ text: inputText, files: files });
      onLogAIInteraction(interaction);
      
      setParsedServices(result);
      setExtractedMetadata(metadata);
      setSelectedServices(result.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}));
      checkDuplicates(result);

    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, files, setError, onLogAIInteraction, checkDuplicates]);
  
  // Manual Grid Handlers
  const handleManualItemChange = (id: number, field: keyof ManualItem, value: any) => {
      setManualItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddManualRow = () => {
      setManualItems(prev => [
          ...prev, 
          { id: Date.now(), name: '', category: '', basePrice: 0, description: '' }
      ]);
  };

  const handleRemoveManualRow = (id: number) => {
      if (manualItems.length > 1) {
          setManualItems(prev => prev.filter(item => item.id !== id));
      }
  };

  const handleProcessManual = () => {
      const validItems = manualItems.filter(i => i.name.trim() !== '');
      if (validItems.length === 0) {
          setError(new Error("Please add at least one service with a name."));
          return;
      }
      
      const converted: ParsedService[] = validItems.map(i => ({
          name: i.name,
          category: i.category || 'General',
          basePrice: i.basePrice,
          description: i.description,
          pricingType: 'Flat Fee',
          displayPrice: true,
          menuOptions: [],
          confidenceScore: 100 // Manual entry implies 100% confidence
      }));

      setParsedServices(converted);
      setExtractedMetadata({ detectedBranding: 'Manual Entry', pricingStrategy: 'User Defined' });
      setSelectedServices(converted.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}));
      checkDuplicates(converted);
  };

  const handleCreateServices = () => {
    if (!parsedServices) return;
    const servicesToCreateRaw = parsedServices.filter((_, index) => selectedServices[index]);
    const servicesToCreate: Omit<ServiceItem, 'id'>[] = servicesToCreateRaw.map(service => ({
        ...service,
        description: service.description || '',
        status: 'Active', // Default to Active for bulk import as requested
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        displayPrice: service.displayPrice ?? true,
        menuOptions: service.menuOptions ?? []
    }));
    onServicesCreate(servicesToCreate);
    onClose();
  };
  
  const handleStartOver = () => {
      setParsedServices(null);
      setExtractedMetadata(null);
      setFiles([]);
      setPreviews([]);
      setInputText('');
      setDuplicatesFound([]);
      setSelectedServices({});
      setManualItems([{ id: Date.now(), name: '', category: '', basePrice: 0, description: '' }]); // Reset manual items
  };

  const handleDeselectDuplicates = () => {
      const newSelection = { ...selectedServices };
      duplicatesFound.forEach(index => {
          newSelection[index] = false;
      });
      setSelectedServices(newSelection);
  };
  
  const handleSelectAll = () => {
      if (!parsedServices) return;
      const allSelected = Object.keys(selectedServices).length === parsedServices.length && Object.values(selectedServices).every(Boolean);
      
      if (allSelected) {
          setSelectedServices({});
      } else {
          const newSelection: Record<number, boolean> = {};
          parsedServices.forEach((_, index) => newSelection[index] = true);
          setSelectedServices(newSelection);
      }
  }
  
  const selectedCount = Object.values(selectedServices).filter(Boolean).length;

  const renderInputView = () => (
    <div className="space-y-4 h-[60vh] flex flex-col">
      <div className="flex border-b border-white/10 mb-4">
          <button 
            onClick={() => setActiveTab('ai')} 
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'ai' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white hover:bg-white/5'}`}
          >
              <SparkleIcon className="h-4 w-4 inline mr-2" /> AI Import
          </button>
          <button 
            onClick={() => setActiveTab('manual')} 
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'manual' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white hover:bg-white/5'}`}
          >
              <ListBulletIcon className="h-4 w-4 inline mr-2" /> Manual Grid
          </button>
      </div>

      {activeTab === 'ai' && (
          <div className="space-y-4 animate-in-item">
            <div>
                <label htmlFor="request-text" className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Paste a price list, menu, or service description.</label>
                <textarea
                id="request-text"
                rows={6}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="mt-1 block w-full p-2 border rounded-lg shadow-sm"
                placeholder="e.g., Gala Dinner Menu: - Starter: Soup... - Main: Steak... (SAR 250 per person)"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                />
            </div>
            <div className="text-center text-sm" style={{color: 'var(--text-secondary-color)'}}>OR</div>
            <div>
                <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Upload one or more files (TXT, PDF, DOCX, Images)</label>
                <div
                    onDragEnter={e => handleDragEvents(e, true)}
                    onDragOver={e => handleDragEvents(e, true)}
                    onDragLeave={e => handleDragEvents(e, false)}
                    onDrop={handleDrop}
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-[var(--primary-accent-color)] bg-cyan-500/10' : 'border-[var(--border-color)]'}`}
                >
                    <div className="space-y-1 text-center">
                        <div className="mx-auto h-12 w-12 text-[var(--text-secondary-color)] flex items-center justify-center">
                             <UploadIcon className="h-10 w-10" />
                        </div>
                        <div className="flex text-sm" style={{color: 'var(--text-secondary-color)'}}>
                            <label htmlFor="file-upload-creator" className="relative cursor-pointer bg-transparent rounded-md font-medium text-[var(--primary-accent-color)] hover:text-cyan-400 focus-within:outline-none">
                                <span>Upload files</span>
                                <input id="file-upload-creator" name="file-upload-creator" type="file" className="sr-only" onChange={handleFileChange} multiple accept="image/*,application/pdf,.doc,.docx,.txt" />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs" style={{color: 'var(--text-secondary-color)'}}>Images, PDF, DOCX, TXT</p>
                    </div>
                </div>
                
                {previews.length > 0 && (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md" style={{borderColor: 'var(--border-color)'}}>
                        {previews.map((preview, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md" style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                                <div className="flex items-center gap-2">
                                {preview.data ? (
                                        <img src={preview.data} alt="Preview" className="h-10 w-10 rounded object-cover" />
                                ) : (
                                        <div className="h-10 w-10 bg-black/10 rounded flex items-center justify-center">
                                            <DocumentTextIcon className="h-6 w-6" style={{color: 'var(--text-secondary-color)'}}/>
                                        </div>
                                )}
                                <span className="text-sm truncate">{preview.name}</span>
                                </div>
                                <button onClick={() => handleRemoveFile(index)} className="p-1 text-red-500 hover:text-red-400"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
      )}

      {activeTab === 'manual' && (
          <div className="flex-grow flex flex-col animate-in-item overflow-hidden">
              <datalist id="category-list">
                  {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
              
              <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                  <table className="w-full text-sm border-separate border-spacing-y-2">
                      <thead>
                          <tr className="text-[var(--text-secondary-color)] text-xs font-bold uppercase text-left">
                              <th className="px-2 pb-2">Name</th>
                              <th className="px-2 pb-2 w-1/4">Category</th>
                              <th className="px-2 pb-2 w-24">Price</th>
                              <th className="px-2 pb-2 w-1/3">Description</th>
                              <th className="px-2 pb-2 w-10"></th>
                          </tr>
                      </thead>
                      <tbody>
                          {manualItems.map((item, idx) => (
                              <tr key={item.id} className="group">
                                  <td className="px-1">
                                      <input 
                                        type="text" 
                                        value={item.name} 
                                        onChange={e => handleManualItemChange(item.id, 'name', e.target.value)}
                                        className="w-full p-2 rounded bg-black/20 border border-white/10 focus:border-[var(--primary-accent-color)] focus:outline-none"
                                        placeholder="Service Name"
                                      />
                                  </td>
                                  <td className="px-1">
                                      <input 
                                        type="text" 
                                        list="category-list"
                                        value={item.category} 
                                        onChange={e => handleManualItemChange(item.id, 'category', e.target.value)}
                                        className="w-full p-2 rounded bg-black/20 border border-white/10 focus:border-[var(--primary-accent-color)] focus:outline-none"
                                        placeholder="Category"
                                      />
                                  </td>
                                  <td className="px-1">
                                      <input 
                                        type="number" 
                                        value={item.basePrice ?? ''} 
                                        onChange={e => handleManualItemChange(item.id, 'basePrice', e.target.value === '' ? 0 : Number(e.target.value))}
                                        className="w-full p-2 rounded bg-black/20 border border-white/10 focus:border-[var(--primary-accent-color)] focus:outline-none"
                                      />
                                  </td>
                                  <td className="px-1">
                                      <input 
                                        type="text" 
                                        value={item.description} 
                                        onChange={e => handleManualItemChange(item.id, 'description', e.target.value)}
                                        className="w-full p-2 rounded bg-black/20 border border-white/10 focus:border-[var(--primary-accent-color)] focus:outline-none"
                                        placeholder="Short description..."
                                      />
                                  </td>
                                  <td className="px-1 text-center">
                                      <button onClick={() => handleRemoveManualRow(item.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                          <TrashIcon className="h-4 w-4" />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <button onClick={handleAddManualRow} className="mt-4 w-full py-2 border-2 border-dashed border-white/20 text-slate-400 rounded-lg hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <PlusIcon className="h-4 w-4" /> Add Row
              </button>
          </div>
      )}
    </div>
  );
  
  const renderConfirmationView = () => (
    <div className="space-y-4 h-[60vh] flex flex-col">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center">
            <button onClick={handleStartOver} className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] hover:text-white flex items-center gap-1">
                <RefreshIcon className="h-3 w-3" /> Start Over
            </button>
        </div>
        
        {/* Smart Insights Dashboard */}
        {extractedMetadata && (
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-xl border border-blue-500/30 flex flex-wrap gap-4 items-center justify-between animate-in-item">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-full text-blue-300">
                        <SparkleIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase text-blue-300 tracking-wider">AI Analysis</p>
                        <p className="text-sm font-bold text-white">
                            Detected: <span className="text-purple-300">{extractedMetadata.detectedBranding || 'Generic Source'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 text-xs border-l border-white/10 pl-4">
                    <div>
                        <p className="opacity-60 uppercase tracking-wider mb-1">Pricing Strategy</p>
                        <p className="font-bold text-green-300">{extractedMetadata.pricingStrategy?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                         <p className="opacity-60 uppercase tracking-wider mb-1">Source Type</p>
                         <p className="font-bold text-white">{(extractedMetadata as any).sourceType || 'Document'}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mt-2">
            <div className="flex gap-3">
                <h3 className="font-semibold text-lg">Extracted Services ({parsedServices?.length})</h3>
                <button onClick={handleSelectAll} className="text-xs text-[var(--primary-accent-color)] underline">
                    {Object.values(selectedServices).filter(Boolean).length === parsedServices?.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            
            {duplicatesFound.length > 0 && (
                <button 
                    onClick={handleDeselectDuplicates}
                    className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-full font-bold hover:bg-yellow-500/30 transition flex items-center gap-2"
                >
                    <BoltIcon className="h-3 w-3" /> Deselect {duplicatesFound.length} Duplicate(s)
                </button>
            )}
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {parsedServices?.map((service, index) => {
                const isDuplicate = duplicatesFound.includes(index);
                const confidence = service.confidenceScore || 0;
                
                // Determine confidence visual
                let confidenceColor = 'text-red-400';
                if (confidence > 80) confidenceColor = 'text-green-400';
                else if (confidence > 50) confidenceColor = 'text-yellow-400';
                
                const isElitePricing = extractedMetadata?.pricingStrategy === 'ElitePro_Client_Rate';

                return (
                    <div key={index} className={`flex items-start gap-3 p-3 border rounded-lg relative overflow-hidden transition-colors ${selectedServices[index] ? 'bg-[var(--primary-accent-color)]/5 border-[var(--primary-accent-color)]/20' : 'bg-black/20 border-transparent opacity-60'}`} style={{borderColor: isDuplicate ? '#eab308' : undefined}}>
                        {isDuplicate && (
                            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-bl-lg z-10 uppercase tracking-wider">
                                Duplicate
                            </div>
                        )}
                        <input 
                            type="checkbox" 
                            className="mt-1 h-4 w-4 rounded flex-shrink-0 accent-[var(--primary-accent-color)] cursor-pointer" 
                            onChange={() => setSelectedServices(prev => ({...prev, [index]: !prev[index]}))} 
                            checked={!!selectedServices[index]} 
                        />
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <p className={`font-bold ${isDuplicate ? 'text-yellow-300' : 'text-[var(--text-primary-color)]'}`}>{service.name}</p>
                                </div>
                                <div className="text-right">
                                     <span className={`text-[10px] font-bold ${confidenceColor} flex items-center justify-end gap-1`}>
                                         {confidence > 0 && `${confidence}% Conf.`}
                                         {confidence > 80 && <CheckCircleIcon className="h-3 w-3"/>}
                                     </span>
                                </div>
                            </div>
                            <p className="text-sm mt-1 line-clamp-2" style={{color: 'var(--text-secondary-color)'}}>{service.description}</p>
                            <div className="flex gap-4 mt-2 text-xs flex-wrap items-center">
                                <span>Category: <span className="font-semibold px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300">{service.category}</span></span>
                                <span>Price: <span className="font-semibold text-green-400">{service.displayPrice === false ? 'On Request' : `SAR ${service.basePrice?.toLocaleString() || 'N/A'}`}</span></span>
                                
                                {isElitePricing && (
                                    <span className="px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] uppercase font-bold flex items-center gap-1">
                                        <SparkleIcon className="h-3 w-3"/> Elite Rate
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );

  // Determine action button based on state
  const getSaveAction = () => {
      if (parsedServices) return handleCreateServices;
      if (activeTab === 'ai') return handleAnalyze;
      return handleProcessManual;
  };

  const getSaveText = () => {
      if (isLoading) return 'Processing...';
      if (parsedServices) return `Import ${selectedCount} Services`;
      if (activeTab === 'ai') return 'Deep Analyze & Extract';
      return 'Review Manual Entries';
  };

  return (
    <Modal
      title="Advanced Service Creator"
      onClose={onClose}
      onSave={getSaveAction()}
      saveText={getSaveText()}
      size="lg"
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative">
               <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"></div>
               <InlineSpinner />
          </div>
          <p className="mt-4 font-bold text-lg text-white animate-pulse">
             {analysisStep}
          </p>
          <p className="text-xs text-slate-400 mt-1">Gemini 2.5 Pro is processing your documents with enhanced reasoning.</p>
          <div className="w-64 mt-6">
              <ProgressBar progress={progress} label="Deep Analysis" />
          </div>
        </div>
      ) : parsedServices ? (
        renderConfirmationView()
      ) : (
        renderInputView()
      )}
    </Modal>
  );
};
