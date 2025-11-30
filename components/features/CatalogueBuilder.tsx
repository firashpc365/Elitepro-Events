
// components/features/CatalogueBuilder.tsx
import React, { useState, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Modal } from '../common/Modal';
import { ServiceCatalogue } from '../ServiceCatalogue';
import { InputField } from '../common/InputField';
import { InlineSpinner } from '../common/LoadingSpinner';
import { ImageUploader } from '../common/ImageUploader';
import { SparkleIcon, DownloadIcon, EyeIcon, Squares2X2Icon, ListBulletIcon, EditIcon, XIcon } from '../common/icons';
import type { ServiceItem, AppSettings, SavedCatalogue, AIInteraction } from '../../types';
import { curateServiceCollection, generateCatalogueConfig } from '../../services/geminiService';

interface CatalogueBuilderProps {
  services: ServiceItem[];
  settings: AppSettings;
  onClose: () => void;
  onSave: (catalogue: SavedCatalogue) => void;
  setError: (message: any) => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const CatalogueBuilder: React.FC<CatalogueBuilderProps> = ({ services, settings, onClose, onSave, setError, onLogAIInteraction }) => {
    // State
    const [activeTab, setActiveTab] = useState<'select' | 'design' | 'preview'>('select');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [layout, setLayout] = useState<'boutique' | 'ledger' | 'spotlight'>('boutique');
    const [customTitle, setCustomTitle] = useState('Exclusive Collection');
    const [introText, setIntroText] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [showPrices, setShowPrices] = useState(true);
    const [showMenuDetails, setShowMenuDetails] = useState(true);
    
    // Advanced Design State
    const [force4K, setForce4K] = useState(false);
    const [gridDensity, setGridDensity] = useState< 'compact' | 'standard' | 'spacious' >('standard');
    const [borderRadiusOverride, setBorderRadiusOverride] = useState<number>(16);
    const [shadowIntensity, setShadowIntensity] = useState<number>(0.5);

    // AI
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isMagicContentLoading, setIsMagicContentLoading] = useState(false);
    
    // Export
    const [isExporting, setIsExporting] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // Presentation Mode
    const [isPresentationMode, setIsPresentationMode] = useState(false);

    // Filter logic for selection tab
    const [filterTerm, setFilterTerm] = useState('');
    const filteredSelectionList = services.filter(s => 
        s.name.toLowerCase().includes(filterTerm.toLowerCase()) || 
        s.category.toLowerCase().includes(filterTerm.toLowerCase())
    );

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleAiCurate = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiLoading(true);
        try {
            const { serviceIds, fullPrompt } = await curateServiceCollection(aiPrompt, services);
            onLogAIInteraction({
                feature: 'curate_catalogue',
                promptSummary: `Curate for: ${aiPrompt}`,
                fullPrompt: fullPrompt,
                response: JSON.stringify(serviceIds)
            });
            setSelectedIds(new Set(serviceIds));
            setActiveTab('design'); // Move to design step
        } catch (e) {
            setError(e);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleMagicContent = async () => {
        if (selectedIds.size === 0) {
            setError("Please select some services first.");
            return;
        }
        setIsMagicContentLoading(true);
        try {
            const { title, intro, fullPrompt } = await generateCatalogueConfig(Array.from(selectedIds), services);
            onLogAIInteraction({
                feature: 'catalogue_content',
                promptSummary: `Generate catalogue title/intro`,
                fullPrompt: fullPrompt,
                response: JSON.stringify({ title, intro })
            });
            setCustomTitle(title);
            setIntroText(intro);
        } catch (e) {
            setError(e);
        } finally {
            setIsMagicContentLoading(false);
        }
    };

    const handleDownloadPdf = useCallback(async () => {
        const element = previewRef.current;
        if (!element) return;
        
        // Temporarily force full height and visibility to capture scrollable content
        const originalHeight = element.style.height;
        const originalOverflow = element.style.overflow;
        element.style.height = 'auto';
        element.style.overflow = 'visible';

        setIsExporting(true);
        try {
            // Use a clean white background for ledger layout, otherwise theme background
            const bg = layout === 'ledger' ? '#ffffff' : settings.colors.background;
            
            // Scale factor: If 4K mode is on, assume scale 2 (standard high res) or 3 for ultra. 
            // Standard html2canvas at scale 2 is usually sufficient for print.
            const scale = force4K ? 3 : 2; 

            const canvas = await html2canvas(element, { 
                scale: scale, 
                useCORS: true, 
                backgroundColor: bg,
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            // Add subsequent pages if content overflows
            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`${customTitle.replace(/[^a-z0-9]/gi, '_')}_Catalogue.pdf`);
        } catch (e) {
            console.error(e);
            setError("Failed to generate PDF. Please try again.");
        } finally {
            // Restore original styles
            element.style.height = originalHeight;
            element.style.overflow = originalOverflow;
            setIsExporting(false);
        }
    }, [layout, settings, customTitle, setError, force4K]);

    const handleSaveCatalogue = () => {
        const catalogue: SavedCatalogue = {
            id: `cat-${Date.now()}`,
            name: customTitle,
            layout,
            serviceIds: Array.from(selectedIds),
            config: {
                showPrices,
                showMenuDetails,
                customTitle,
                coverImage,
                introText
            },
            createdAt: new Date().toISOString()
        };
        onSave(catalogue);
        onClose();
    };

    const selectedServices = services.filter(s => selectedIds.has(s.id));

    // Enhanced props passed to ServiceCatalogue for live preview
    const previewSettings = {
        ...settings,
        layout: { ...settings.layout, borderRadius: borderRadiusOverride }
    };

    if (isPresentationMode) {
        return (
            <div className="fixed inset-0 z-[200] bg-slate-900 overflow-hidden flex flex-col animate-in-item">
                <button 
                    onClick={() => setIsPresentationMode(false)}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/30 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-md shadow-lg group"
                    title="Exit Presentation Mode"
                >
                    <XIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </button>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar p-0" ref={previewRef}>
                     {selectedServices.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-white/30">
                             <SparkleIcon className="h-16 w-16 mb-4 opacity-20" />
                             <p className="text-lg">Select services to preview.</p>
                         </div>
                     ) : (
                        <div className="min-h-full p-0">
                            <ServiceCatalogue 
                                services={selectedServices} 
                                settings={previewSettings}
                                forcedLayout={layout}
                                hideControls={true}
                                customTitle={customTitle}
                                coverImage={coverImage}
                                introText={introText}
                                overridePriceVisibility={showPrices}
                                overrideShowMenu={showMenuDetails}
                            />
                        </div>
                     )}
                </div>
            </div>
        );
    }

    return (
        <Modal title="Catalogue Studio" onClose={onClose} size="full" footer={null}>
            <div className="flex h-[85vh] overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                
                {/* LEFT PANEL: Controls */}
                <div className="w-1/3 min-w-[320px] flex flex-col border-r bg-[var(--card-container-color)]" style={{ borderColor: 'var(--border-color)' }}>
                    {/* Tabs */}
                    <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <button onClick={() => setActiveTab('select')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'select' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:bg-white/5'}`}>Selection</button>
                        <button onClick={() => setActiveTab('design')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'design' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:bg-white/5'}`}>Design</button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                        
                        {activeTab === 'select' && (
                            <div className="space-y-6 animate-in-item">
                                {/* AI Curator */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/30 to-black border border-purple-500/30">
                                    <h3 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2"><SparkleIcon className="h-4 w-4"/> AI Curator</h3>
                                    <p className="text-xs text-slate-400 mb-2">Describe the event theme to automatically pick the best services.</p>
                                    <textarea 
                                        rows={2}
                                        placeholder="e.g. High-End Summer Wedding with floral theme..."
                                        className="w-full text-xs p-2 rounded bg-black/40 border border-purple-500/30 focus:ring-1 focus:ring-purple-500 outline-none mb-3 text-white"
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleAiCurate}
                                        disabled={isAiLoading}
                                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                                    >
                                        {isAiLoading ? <InlineSpinner/> : 'Magic Select'}
                                    </button>
                                </div>

                                {/* Manual List */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                         <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Manual Selection</h4>
                                         <div className="text-xs text-[var(--text-secondary-color)]">
                                            <span className={selectedIds.size > 0 ? 'text-[var(--primary-accent-color)] font-bold' : ''}>{selectedIds.size}</span> selected
                                        </div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Filter services..." 
                                        className="w-full p-2 mb-2 text-sm bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-[var(--primary-accent-color)] text-white"
                                        value={filterTerm}
                                        onChange={e => setFilterTerm(e.target.value)}
                                    />
                                    <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                                        {filteredSelectionList.map(s => (
                                            <div key={s.id} onClick={() => handleToggleSelect(s.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${selectedIds.has(s.id) ? 'bg-[var(--primary-accent-color)]/20 border border-[var(--primary-accent-color)]/30' : 'hover:bg-white/5 border border-transparent'}`}>
                                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selectedIds.has(s.id) ? 'bg-[var(--primary-accent-color)] border-transparent' : 'border-gray-500'}`}>
                                                    {selectedIds.has(s.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                                                </div>
                                                <div className="overflow-hidden flex-grow">
                                                    <p className="text-sm font-medium truncate text-[var(--text-primary-color)]">{s.name}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary-color)] truncate">{s.category}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedIds.size > 0 && (
                                        <button onClick={() => setSelectedIds(new Set())} className="mt-2 text-xs text-red-400 hover:text-red-300 w-full text-right">Clear Selection</button>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'design' && (
                            <div className="space-y-6 animate-in-item">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider mb-2 block text-[var(--text-secondary-color)]">Layout Style</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'boutique', icon: <Squares2X2Icon className="h-5 w-5"/>, label: 'Boutique' },
                                            { id: 'ledger', icon: <ListBulletIcon className="h-5 w-5"/>, label: 'Ledger' },
                                            { id: 'spotlight', icon: <EyeIcon className="h-5 w-5"/>, label: 'Spotlight' }
                                        ].map(opt => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => setLayout(opt.id as any)}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${layout === opt.id ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)] text-white shadow-lg scale-105' : 'border-white/10 hover:bg-white/5 text-[var(--text-secondary-color)]'}`}
                                            >
                                                {opt.icon}
                                                <span className="text-[10px] font-bold">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Content</h4>
                                        <button onClick={handleMagicContent} disabled={isMagicContentLoading} className="text-xs text-purple-400 flex items-center gap-1 hover:text-purple-300">
                                            {isMagicContentLoading ? <InlineSpinner/> : <><SparkleIcon className="h-3 w-3"/> Magic Content</>}
                                        </button>
                                    </div>
                                    <InputField label="Catalogue Title" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                                    <div>
                                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary-color)'}}>Introduction Text</label>
                                        <textarea 
                                            rows={3} 
                                            className="w-full p-2 rounded border bg-black/10 text-sm focus:outline-none focus:border-[var(--primary-accent-color)]"
                                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                            value={introText}
                                            onChange={e => setIntroText(e.target.value)}
                                            placeholder="A brief introduction to this collection..."
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider mb-2 block text-[var(--text-secondary-color)]">Cover Visual (High Res Supported)</label>
                                    <ImageUploader label="Cover Image (Optional)" onImageSelected={b64 => setCoverImage(b64)} initialImage={coverImage} maxSize={3840} />
                                </div>

                                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Card Styling</h4>
                                    
                                    {/* Grid Density Control */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Grid Density</label>
                                        <div className="flex bg-black/30 p-1 rounded-lg">
                                            {(['compact', 'standard', 'spacious'] as const).map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setGridDensity(d)}
                                                    className={`flex-1 py-1 text-xs rounded transition-all capitalize ${gridDensity === d ? 'bg-white text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Radius Slider */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <label className="text-slate-400">Border Radius</label>
                                            <span className="font-mono">{borderRadiusOverride}px</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="32" step="4" 
                                            value={borderRadiusOverride} 
                                            onChange={e => setBorderRadiusOverride(Number(e.target.value))}
                                            className="w-full h-1 rounded bg-gray-700 appearance-none cursor-pointer accent-[var(--primary-accent-color)]"
                                        />
                                    </div>
                                     
                                     {/* Shadow Slider */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <label className="text-slate-400">Shadow Depth</label>
                                            <span className="font-mono">{Math.round(shadowIntensity * 100)}%</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.1" 
                                            value={shadowIntensity} 
                                            onChange={e => setShadowIntensity(Number(e.target.value))}
                                            className="w-full h-1 rounded bg-gray-700 appearance-none cursor-pointer accent-[var(--primary-accent-color)]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider mb-2 block text-[var(--text-secondary-color)]">Export Options</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer hover:bg-black/30 transition">
                                            <span className="text-sm font-medium text-[var(--text-primary-color)]">Display Prices</span>
                                            <input type="checkbox" checked={showPrices} onChange={e => setShowPrices(e.target.checked)} className="w-5 h-5 rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/40 border-white/10" />
                                        </label>
                                        <label className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer hover:bg-black/30 transition">
                                            <span className="text-sm font-medium text-[var(--text-primary-color)]">Display Menus</span>
                                            <input type="checkbox" checked={showMenuDetails} onChange={e => setShowMenuDetails(e.target.checked)} className="w-5 h-5 rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/40 border-white/10" />
                                        </label>
                                        <label className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer hover:bg-black/30 transition">
                                            <span className="text-sm font-medium text-[var(--text-primary-color)]">Force 4K Export</span>
                                            <input type="checkbox" checked={force4K} onChange={e => setForce4K(e.target.checked)} className="w-5 h-5 rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/40 border-white/10" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t bg-black/10 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                         <button onClick={() => setIsPresentationMode(true)} className="w-full py-3 text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition rounded-lg flex items-center justify-center gap-2 border border-blue-500/20 mb-2">
                            <EyeIcon className="h-4 w-4" /> Live Presentation
                        </button>
                        <button 
                            onClick={handleSaveCatalogue}
                            disabled={selectedIds.size === 0}
                            className="w-full py-3 bg-white text-black font-bold rounded-lg shadow hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            Save Collection
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => window.print()} 
                                className="py-2 border border-white/10 hover:bg-white/10 rounded-lg text-xs font-bold uppercase text-[var(--text-primary-color)]"
                            >
                                Quick Print
                            </button>
                            <button 
                                onClick={handleDownloadPdf}
                                disabled={isExporting || selectedIds.size === 0}
                                className="py-2 bg-[var(--primary-accent-color)] text-white rounded-lg text-xs font-bold uppercase hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isExporting ? <InlineSpinner/> : <><DownloadIcon className="h-4 w-4"/> Export PDF</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Preview */}
                <div className="flex-grow bg-slate-900 relative overflow-hidden flex flex-col">
                    <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 pointer-events-none">
                        Preview
                    </div>
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-0 catalogue-preview-container" ref={previewRef}>
                         {selectedServices.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-white/30">
                                 <SparkleIcon className="h-16 w-16 mb-4 opacity-20" />
                                 <p className="text-lg">Select services to build your catalogue.</p>
                             </div>
                         ) : (
                            <div className="min-h-full p-8">
                                <ServiceCatalogue 
                                    services={selectedServices} 
                                    settings={previewSettings}
                                    forcedLayout={layout}
                                    hideControls={true}
                                    customTitle={customTitle}
                                    coverImage={coverImage}
                                    introText={introText}
                                    overridePriceVisibility={showPrices}
                                    overrideShowMenu={showMenuDetails}
                                />
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
