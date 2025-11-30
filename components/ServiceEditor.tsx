
// components/ServiceEditor.tsx
import React, { useState, useMemo } from 'react';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { InlineSpinner } from './common/LoadingSpinner';
import { ImageUploader } from './common/ImageUploader';
import { SubItemEditor } from './features/SubItemEditor';
import { AISubItemSuggester } from './features/AISubItemSuggester';
import { getAIServiceAssistance, generateSubItemsForService, QuotaExceededError, generateImageForPrompt } from '../services/geminiService';
import type { ServiceItem, AIInteraction, ServiceStatus, PricingType, SubItem, DataSource, AppSettings, ServiceVariant } from '../../types';
import { SparkleIcon, TrashIcon, EditIcon, PlusIcon, LockClosedIcon, LockOpenIcon, BeakerIcon, EyeIcon, DocumentTextIcon } from './common/icons';
import { ConfirmationModal } from './common/ConfirmationModal';

interface ServiceEditorProps {
    service: ServiceItem | null;
    allServices: ServiceItem[];
    onClose: () => void;
    onSave: (serviceData: Omit<ServiceItem, 'id'> | ServiceItem) => void;
    setError: (message: any) => void;
    onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
    settings: AppSettings;
    onAIFallback: (isActive: boolean) => void;
}

const VariantEditorModal: React.FC<{
    variant: Partial<ServiceVariant> | null;
    onClose: () => void;
    onSave: (variant: ServiceVariant) => void;
    setError: (e: any) => void;
}> = ({ variant, onClose, onSave, setError }) => {
    const [localVariant, setLocalVariant] = useState<Partial<ServiceVariant>>(variant || { price: 0 });

    const handleSave = () => {
        if (!localVariant.name || localVariant.price === undefined) {
            setError(new Error("Variant name and price are required."));
            return;
        }
        onSave({
            id: localVariant.id || `var-${Date.now()}-${Math.random()}`,
            name: localVariant.name,
            price: Number(localVariant.price),
            sku: localVariant.sku
        });
    };

    return (
        <Modal title={localVariant.id ? "Edit Variant" : "Add Variant"} onClose={onClose} onSave={handleSave}>
            <div className="space-y-4">
                <InputField label="Variant Name (e.g. Large, Red, Premium)" value={localVariant.name || ''} onChange={e => setLocalVariant(p => ({ ...p, name: e.target.value }))} required autoFocus />
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Price (SAR)" type="number" value={localVariant.price ?? ''} onChange={e => setLocalVariant(p => ({ ...p, price: e.target.value === '' ? undefined : Number(e.target.value) }))} required />
                    <InputField label="SKU (Optional)" value={localVariant.sku || ''} onChange={e => setLocalVariant(p => ({ ...p, sku: e.target.value }))} />
                </div>
            </div>
        </Modal>
    );
};

export const ServiceEditor: React.FC<ServiceEditorProps> = ({ service, allServices = [], onClose, onSave, setError, onLogAIInteraction, settings, onAIFallback }) => {
    const [localService, setLocalService] = useState<Partial<ServiceItem>>(service || { status: 'Draft', pricingType: 'Flat Fee', keyFeatures: [], tags: [], isFeatured: false, displayPrice: true, menuOptions: [] });
    const [activeTab, setActiveTab] = useState('details');
    
    const [editingSubItem, setEditingSubItem] = useState<Partial<SubItem> | null>(null);
    const [isSubItemEditorOpen, setIsSubItemEditorOpen] = useState(false);
    const [isSubItemSuggesterOpen, setIsSubItemSuggesterOpen] = useState(false);
    const [subItemSuggestions, setSubItemSuggestions] = useState<{name: string, description: string}[]>([]);

    const [isVariantEditorOpen, setIsVariantEditorOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<Partial<ServiceVariant> | null>(null);

    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [descToConfirm, setDescToConfirm] = useState<{ onConfirm: () => void } | null>(null);
    const [duplicateWarning, setDuplicateWarning] = useState<ServiceItem | null>(null);

    const [newFeature, setNewFeature] = useState('');
    const [newMenuOption, setNewMenuOption] = useState('');
    const [newTag, setNewTag] = useState('');

    const handleFieldChange = (field: keyof ServiceItem, value: any, source: DataSource = 'manual') => {
        setLocalService(prev => ({
            ...prev,
            [field]: value,
            [`${field}_source`]: source
        }));
    };
    
    const validateAndSave = () => {
        const trimmedName = localService.name?.trim();
        const trimmedCategory = localService.category?.trim();

        // 1. Basic Validation
        if (!trimmedName) {
            setError("Service Name is required.");
            return;
        }
        if (!trimmedCategory) {
            setError("Category is required.");
            return;
        }
        if (localService.basePrice !== undefined && localService.basePrice < 0) {
             setError("Base Price cannot be negative.");
             return;
        }

        // 2. Duplicate Check
        const normalize = (str: string) => str.trim().toLowerCase();
        // Ensure allServices is an array before filtering
        const servicesList = Array.isArray(allServices) ? allServices : [];
        const duplicate = servicesList.find(s => 
            normalize(s.name) === normalize(trimmedName) && 
            s.id !== localService.id // Exclude self if editing
        );

        if (duplicate) {
            setDuplicateWarning(duplicate);
            return; // Stop here, wait for modal confirmation
        }

        // 3. Proceed if valid
        finalizeSave();
    };

    const finalizeSave = () => {
        // Ensure strings are trimmed on save
        const cleanedService = {
            ...localService,
            name: localService.name?.trim(),
            category: localService.category?.trim(),
            basePrice: localService.basePrice || 0, // Ensure valid number
        };
        onSave(cleanedService as ServiceItem);
        setDuplicateWarning(null);
    };

    const handleAIAssist = async (type: 'description' | 'features' | 'price' | 'tags' | 'image_prompt' | 'category' | 'menu_options') => {
        if (!localService.name && (type === 'description' || type === 'category' || type === 'tags' || type === 'features' || type === 'menu_options')) {
            setError("Please provide a service name first.");
            return;
        }
        
        const assist = async () => {
            setLoading({ ...loading, [type]: true });
            try {
                const uniqueCategories: string[] = Array.from(new Set(allServices.map((s: ServiceItem) => s.category)));
                const { result, fullPrompt, source } = await getAIServiceAssistance(type, localService, settings, uniqueCategories);
                
                if (source === 'mock_data') {
                    onAIFallback(true);
                } else {
                    onAIFallback(false);
                }

                onLogAIInteraction({
                    feature: `service_${type}` as any, promptSummary: `Generate ${type} for ${localService.name}`,
                    fullPrompt, response: JSON.stringify(result)
                });
                
                const sourceToSet: DataSource = source === 'mock_data' ? 'mock_data' : 'ai';
                
                if (type === 'image_prompt') {
                    const imagePrompt = result as string;
                    setLoading(prev => ({ ...prev, generatingImage: true }));
                    const imageData = await generateImageForPrompt(imagePrompt);
                    onLogAIInteraction({ feature: 'service_image_prompt', promptSummary: `Generate service image`, fullPrompt: imagePrompt, response: '[Image Data]' });
                    handleFieldChange('imageUrl', `data:image/png;base64,${imageData}`, sourceToSet);
                    setLoading(prev => ({ ...prev, generatingImage: false }));
                } else {
                    switch (type) {
                        case 'description':
                            handleFieldChange('description', result, sourceToSet);
                            break;
                        case 'price':
                            handleFieldChange('basePrice', parseFloat(result as string) || localService.basePrice || 0, sourceToSet);
                            break;
                        case 'features':
                            const feats = Array.isArray(result) ? result : (result as string).split('\n').filter(x => x.trim());
                            handleFieldChange('keyFeatures', feats, sourceToSet);
                            break;
                        case 'tags':
                             const tags = Array.isArray(result) ? result : (result as string).split(',').map(x => x.trim()).filter(x => x);
                             handleFieldChange('tags', tags, sourceToSet);
                            break;
                        case 'category':
                            handleFieldChange('category', result, sourceToSet);
                            break;
                        case 'menu_options':
                            const menuOpts = Array.isArray(result) ? result : (result as string).split('\n').filter(x => x.trim());
                            handleFieldChange('menuOptions', menuOpts, sourceToSet);
                            break;
                    }
                }
            } catch (e) {
                if (e instanceof QuotaExceededError) {
                  onAIFallback(true);
                } else {
                  setError(e);
                }
            } finally {
                setLoading({ ...loading, [type]: false });
            }
        };

        if (type === 'description' && localService.description_source === 'manual' && !localService.description_locked) {
            setDescToConfirm({ onConfirm: assist });
        } else if (!localService.description_locked) {
            assist();
        }
    };

    const handleAddFeature = () => {
        if (newFeature.trim()) {
            const updated = [...(localService.keyFeatures || []), newFeature.trim()];
            handleFieldChange('keyFeatures', updated);
            setNewFeature('');
        }
    };

    const handleRemoveFeature = (idx: number) => {
        const updated = (localService.keyFeatures || []).filter((_, i) => i !== idx);
        handleFieldChange('keyFeatures', updated);
    };

    const handleAddTag = () => {
        if (newTag.trim()) {
            const updated = [...(localService.tags || []), newTag.trim()];
            handleFieldChange('tags', updated);
            setNewTag('');
        }
    };

    const handleRemoveTag = (idx: number) => {
        const updated = (localService.tags || []).filter((_, i) => i !== idx);
        handleFieldChange('tags', updated);
    };

    const handleAddMenuOption = () => {
        if (newMenuOption.trim()) {
            const updated = [...(localService.menuOptions || []), newMenuOption.trim()];
            handleFieldChange('menuOptions', updated);
            setNewMenuOption('');
        }
    };

    const handleRemoveMenuOption = (idx: number) => {
        const updated = (localService.menuOptions || []).filter((_, i) => i !== idx);
        handleFieldChange('menuOptions', updated);
    };
    
    // Sub-Item Management
    const handleAddSubItem = (subItem: SubItem) => {
        const subItems = [...(localService.subItems || []), subItem];
        setLocalService(p => ({...p, subItems}));
        setIsSubItemEditorOpen(false);
        setEditingSubItem(null);
    };

    const handleUpdateSubItem = (updatedSubItem: SubItem) => {
        const subItems = (localService.subItems || []).map(si => si.subItemId === updatedSubItem.subItemId ? updatedSubItem : si);
        setLocalService(p => ({...p, subItems}));
        setIsSubItemEditorOpen(false);
        setEditingSubItem(null);
    };

    const handleDeleteSubItem = (subItemId: string) => {
        const subItems = (localService.subItems || []).filter(si => si.subItemId !== subItemId);
        setLocalService(p => ({...p, subItems}));
    };

    const handleGenerateSubItems = async () => {
        setLoading(p => ({...p, subItems: true}));
        try {
            // Ensure we have enough data to generate suggestions
            const mockService = localService as ServiceItem; 
            const suggestions = await generateSubItemsForService(mockService);
            
            onLogAIInteraction({
                feature: 'sub_items',
                promptSummary: `Generate sub-items for ${localService.name}`,
                fullPrompt: `Service: ${localService.name}, Category: ${localService.category}`,
                response: JSON.stringify(suggestions)
            });

            setSubItemSuggestions(suggestions);
            setIsSubItemSuggesterOpen(true);
        } catch (e) {
             if (e instanceof QuotaExceededError) {
                onAIFallback(true);
            } else {
                setError(e);
            }
        } finally {
            setLoading(p => ({...p, subItems: false}));
        }
    };

    const handleConfirmSubItemSuggestions = (selected: {name: string, description: string}[]) => {
        const newItems: SubItem[] = selected.map(s => ({
            subItemId: `sub-${Date.now()}-${Math.random()}`,
            name: s.name,
            description: s.description,
            quantity: 1,
            unitPrice: 0, // User needs to configure this
            description_source: 'ai'
        }));
        
        setLocalService(p => ({...p, subItems: [...(p.subItems || []), ...newItems]}));
        setIsSubItemSuggesterOpen(false);
    };

    // Variant Management
    const handleAddVariant = (variant: ServiceVariant) => {
        const variants = [...(localService.variants || []), variant];
        setLocalService(p => ({...p, variants}));
        setIsVariantEditorOpen(false);
        setEditingVariant(null);
    };

    const handleUpdateVariant = (updatedVariant: ServiceVariant) => {
        const variants = (localService.variants || []).map(v => v.id === updatedVariant.id ? updatedVariant : v);
        setLocalService(p => ({...p, variants}));
        setIsVariantEditorOpen(false);
        setEditingVariant(null);
    };

    const handleDeleteVariant = (id: string) => {
        const variants = (localService.variants || []).filter(v => v.id !== id);
        setLocalService(p => ({...p, variants}));
    };

    return (
        <>
        <Modal 
            title={service ? `Edit: ${service.name}` : "Create New Service"} 
            onClose={onClose} 
            onSave={validateAndSave}
            size="lg"
        >
            <div className="flex gap-4 border-b border-white/10 mb-4">
                <button onClick={() => setActiveTab('details')} className={`pb-2 px-2 text-sm font-bold uppercase transition-colors border-b-2 ${activeTab === 'details' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white'}`}>Details</button>
                <button onClick={() => setActiveTab('media')} className={`pb-2 px-2 text-sm font-bold uppercase transition-colors border-b-2 ${activeTab === 'media' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white'}`}>Media & Branding</button>
                <button onClick={() => setActiveTab('configuration')} className={`pb-2 px-2 text-sm font-bold uppercase transition-colors border-b-2 ${activeTab === 'configuration' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white'}`}>Configuration</button>
                <button onClick={() => setActiveTab('variants')} className={`pb-2 px-2 text-sm font-bold uppercase transition-colors border-b-2 ${activeTab === 'variants' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white'}`}>Variants</button>
            </div>

            <div className="space-y-6 h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {activeTab === 'details' && (
                    <div className="space-y-5 animate-in-item">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <InputField 
                                    label="Service Name" 
                                    value={localService.name || ''} 
                                    onChange={e => handleFieldChange('name', e.target.value)} 
                                    required
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary-color)'}}>Category</label>
                                <div className="flex gap-2">
                                    <input 
                                        list="categories" 
                                        className="w-full p-2 border rounded bg-black/10 focus:border-[var(--primary-accent-color)] outline-none text-[var(--text-primary-color)]"
                                        style={{borderColor: 'var(--border-color)'}}
                                        value={localService.category || ''}
                                        onChange={e => handleFieldChange('category', e.target.value)}
                                    />
                                    <datalist id="categories">
                                        {Array.from(new Set(allServices.map(s => s.category))).map(cat => <option key={cat} value={cat} />)}
                                    </datalist>
                                    <button 
                                        onClick={() => handleAIAssist('category')} 
                                        disabled={loading.category} 
                                        className="p-2 bg-purple-600/20 text-purple-300 rounded hover:bg-purple-600/40 transition disabled:opacity-50"
                                        title="Suggest Category"
                                    >
                                        {loading.category ? <InlineSpinner /> : <SparkleIcon className="h-5 w-5"/>}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Base Price (SAR)</label>
                                <div className="flex mt-1">
                                    <input
                                        type="number"
                                        value={localService.basePrice ?? ''}
                                        onChange={e => handleFieldChange('basePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                                        className="block w-full p-2 border rounded-l"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                    />
                                    <button 
                                        onClick={() => handleAIAssist('price')} 
                                        disabled={loading.price} 
                                        className="px-3 bg-purple-600/20 border-y border-r border-purple-500/30 rounded-r hover:bg-purple-600/40 disabled:opacity-50"
                                        title="Estimate Price"
                                    >
                                        {loading.price ? <InlineSpinner/> : <SparkleIcon className="h-4 w-4 text-purple-300"/>}
                                    </button>
                                </div>
                             </div>
                             <div>
                                <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Pricing Type</label>
                                <select 
                                    value={localService.pricingType} 
                                    onChange={e => handleFieldChange('pricingType', e.target.value)}
                                    className="mt-1 block w-full p-2 border rounded"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                >
                                    <option>Flat Fee</option>
                                    <option>Per Unit</option>
                                    <option>Per Hour</option>
                                    <option>Per Person</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Status</label>
                                <select 
                                    value={localService.status} 
                                    onChange={e => handleFieldChange('status', e.target.value)}
                                    className="mt-1 block w-full p-2 border rounded"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                >
                                    <option>Draft</option>
                                    <option>Active</option>
                                    <option>Inactive</option>
                                    <option>Archived</option>
                                </select>
                             </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Description</label>
                                <div className="flex gap-2">
                                    <button onClick={() => handleFieldChange('description_locked', !localService.description_locked)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                        {localService.description_locked ? <LockClosedIcon className="h-3 w-3"/> : <LockOpenIcon className="h-3 w-3"/>}
                                        {localService.description_locked ? 'Unlock' : 'Lock'}
                                    </button>
                                    <button onClick={() => handleAIAssist('description')} disabled={loading.description || localService.description_locked} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50">
                                        {loading.description ? <InlineSpinner/> : <SparkleIcon className="h-3 w-3"/>} Generate
                                    </button>
                                </div>
                            </div>
                            <textarea 
                                rows={4} 
                                value={localService.description || ''} 
                                onChange={e => handleFieldChange('description', e.target.value)} 
                                className="w-full p-2 border rounded bg-black/10 text-sm"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                disabled={localService.description_locked}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'media' && (
                     <div className="space-y-6 animate-in-item">
                         <div>
                             <div className="flex justify-between items-end mb-2">
                                 <label className="text-sm font-medium text-[var(--text-secondary-color)]">Service Image</label>
                                 <button 
                                    onClick={() => handleAIAssist('image_prompt')} 
                                    disabled={loading.generatingImage}
                                    className="text-xs flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30 transition disabled:opacity-50"
                                >
                                    {loading.generatingImage ? <InlineSpinner/> : <><SparkleIcon className="h-3 w-3"/> Generate AI Image</>}
                                </button>
                             </div>
                             <ImageUploader label="" onImageSelected={b64 => handleFieldChange('imageUrl', b64)} initialImage={localService.imageUrl} />
                         </div>
                         
                         <div>
                             <label className="text-sm font-medium text-[var(--text-secondary-color)] mb-2 block">Key Features / Highlights</label>
                             <div className="flex gap-2 mb-2">
                                 <input 
                                    type="text" 
                                    value={newFeature} 
                                    onChange={e => setNewFeature(e.target.value)}
                                    placeholder="Add a feature (e.g. 'Vegan Friendly')"
                                    className="flex-grow p-2 rounded bg-black/10 border border-white/10 text-sm focus:border-[var(--primary-accent-color)] outline-none text-white"
                                    onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
                                 />
                                 <button onClick={handleAddFeature} className="px-3 bg-[var(--primary-accent-color)] text-white rounded"><PlusIcon className="h-5 w-5"/></button>
                                 <button onClick={() => handleAIAssist('features')} disabled={loading.features} className="px-3 bg-purple-600/20 text-purple-300 rounded hover:bg-purple-600/30">
                                     {loading.features ? <InlineSpinner/> : <SparkleIcon className="h-5 w-5"/>}
                                 </button>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                 {localService.keyFeatures?.map((feat, idx) => (
                                     <span key={idx} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs flex items-center gap-2">
                                         {feat}
                                         <button onClick={() => handleRemoveFeature(idx)} className="text-slate-400 hover:text-red-400"><TrashIcon className="h-3 w-3"/></button>
                                     </span>
                                 ))}
                             </div>
                         </div>

                         {/* Tags Section */}
                         <div>
                             <label className="text-sm font-medium text-[var(--text-secondary-color)] mb-2 block">Search Tags</label>
                             <div className="flex gap-2 mb-2">
                                 <input 
                                    type="text" 
                                    value={newTag} 
                                    onChange={e => setNewTag(e.target.value)}
                                    placeholder="Add a tag (e.g. 'Conference')"
                                    className="flex-grow p-2 rounded bg-black/10 border border-white/10 text-sm focus:border-[var(--primary-accent-color)] outline-none text-white"
                                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                 />
                                 <button onClick={handleAddTag} className="px-3 bg-[var(--primary-accent-color)] text-white rounded"><PlusIcon className="h-5 w-5"/></button>
                                 <button onClick={() => handleAIAssist('tags')} disabled={loading.tags} className="px-3 bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30 flex items-center gap-2">
                                     {loading.tags ? <InlineSpinner/> : <><SparkleIcon className="h-4 w-4"/> Auto-Tag</>}
                                 </button>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                 {localService.tags?.map((tag, idx) => (
                                     <span key={idx} className="px-2 py-1 bg-blue-900/20 border border-blue-500/20 rounded-full text-xs text-blue-200 flex items-center gap-2">
                                         #{tag}
                                         <button onClick={() => handleRemoveTag(idx)} className="text-blue-400 hover:text-red-400"><TrashIcon className="h-3 w-3"/></button>
                                     </span>
                                 ))}
                                 {(!localService.tags || localService.tags.length === 0) && <span className="text-xs text-slate-500 italic">No tags added.</span>}
                             </div>
                         </div>
                     </div>
                )}

                {activeTab === 'configuration' && (
                     <div className="space-y-6 animate-in-item">
                         <div className="p-4 rounded-lg bg-black/20 border border-white/10">
                             <h3 className="font-bold text-sm mb-4 text-[var(--text-primary-color)]">Display Options</h3>
                             <div className="flex flex-col gap-3">
                                 <label className="flex items-center justify-between cursor-pointer">
                                     <span className="text-sm text-[var(--text-secondary-color)]">Show Price in Catalogues</span>
                                     <input type="checkbox" checked={localService.displayPrice} onChange={e => handleFieldChange('displayPrice', e.target.checked)} className="rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/20" />
                                 </label>
                                 <label className="flex items-center justify-between cursor-pointer">
                                     <span className="text-sm text-[var(--text-secondary-color)]">Mark as Featured</span>
                                     <input type="checkbox" checked={localService.isFeatured} onChange={e => handleFieldChange('isFeatured', e.target.checked)} className="rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/20" />
                                 </label>
                             </div>
                         </div>

                         <div className="p-4 rounded-lg bg-black/20 border border-white/10">
                             <h3 className="font-bold text-sm mb-4 text-[var(--text-primary-color)]">Menu / Inclusions</h3>
                             <div className="flex gap-2 mb-2">
                                 <input 
                                    type="text" 
                                    value={newMenuOption} 
                                    onChange={e => setNewMenuOption(e.target.value)}
                                    placeholder="Add menu item or inclusion..."
                                    className="flex-grow p-2 rounded bg-black/10 border border-white/10 text-sm focus:border-[var(--primary-accent-color)] outline-none text-white"
                                    onKeyDown={e => e.key === 'Enter' && handleAddMenuOption()}
                                 />
                                 <button onClick={handleAddMenuOption} className="px-3 bg-[var(--primary-accent-color)] text-white rounded"><PlusIcon className="h-5 w-5"/></button>
                                 <button onClick={() => handleAIAssist('menu_options')} disabled={loading.menu_options} className="px-3 bg-purple-600/20 text-purple-300 rounded hover:bg-purple-600/30">
                                     {loading.menu_options ? <InlineSpinner/> : <SparkleIcon className="h-5 w-5"/>}
                                 </button>
                             </div>
                             <ul className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                 {localService.menuOptions?.map((opt, idx) => (
                                     <li key={idx} className="flex justify-between items-center p-2 bg-white/5 rounded text-xs">
                                         <span>{opt}</span>
                                         <button onClick={() => handleRemoveMenuOption(idx)} className="text-slate-400 hover:text-red-400"><TrashIcon className="h-3 w-3"/></button>
                                     </li>
                                 ))}
                             </ul>
                         </div>

                         {/* Sub-Items / Ingredients */}
                         <div className="p-4 rounded-lg bg-black/20 border border-white/10">
                             <div className="flex justify-between items-center mb-4">
                                 <h3 className="font-bold text-sm text-[var(--text-primary-color)]">Sub-Items & Ingredients</h3>
                                 <div className="flex gap-2">
                                     <button onClick={handleGenerateSubItems} disabled={loading.subItems} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                         {loading.subItems ? <InlineSpinner/> : <><SparkleIcon className="h-3 w-3"/> AI Suggest</>}
                                     </button>
                                     <button onClick={() => { setEditingSubItem({}); setIsSubItemEditorOpen(true); }} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                         <PlusIcon className="h-3 w-3"/> Add
                                     </button>
                                 </div>
                             </div>
                             
                             {localService.subItems && localService.subItems.length > 0 ? (
                                 <div className="space-y-2">
                                     {localService.subItems.map(item => (
                                         <div key={item.subItemId} className="flex justify-between items-center p-2 bg-white/5 rounded hover:bg-white/10">
                                             <div>
                                                 <p className="text-sm font-medium">{item.name}</p>
                                                 <p className="text-xs opacity-60">{item.quantity} units</p>
                                             </div>
                                             <div className="flex gap-2">
                                                 <button onClick={() => { setEditingSubItem(item); setIsSubItemEditorOpen(true); }} className="p-1 text-slate-400 hover:text-white"><EditIcon className="h-3 w-3"/></button>
                                                 <button onClick={() => handleDeleteSubItem(item.subItemId)} className="p-1 text-slate-400 hover:text-red-400"><TrashIcon className="h-3 w-3"/></button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <p className="text-xs text-center opacity-50 py-4 border border-dashed border-white/10 rounded">No sub-items added.</p>
                             )}
                         </div>
                     </div>
                )}

                {activeTab === 'variants' && (
                    <div className="space-y-4 animate-in-item">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-[var(--text-secondary-color)]">Manage variations like size, color, or material.</p>
                            <button onClick={() => { setEditingVariant({}); setIsVariantEditorOpen(true); }} className="px-3 py-1.5 bg-[var(--primary-accent-color)] text-white text-xs font-bold rounded flex items-center gap-2">
                                <PlusIcon className="h-4 w-4"/> Add Variant
                            </button>
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden border-white/10">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white/5 text-[var(--text-secondary-color)]">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">SKU</th>
                                        <th className="p-3 text-right">Price</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {localService.variants?.map(v => (
                                        <tr key={v.id} className="hover:bg-white/5">
                                            <td className="p-3">{v.name}</td>
                                            <td className="p-3 font-mono opacity-70">{v.sku || '-'}</td>
                                            <td className="p-3 text-right font-bold text-green-400">SAR {v.price.toLocaleString()}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => { setEditingVariant(v); setIsVariantEditorOpen(true); }} className="p-1 text-slate-400 hover:text-white mr-2"><EditIcon className="h-4 w-4"/></button>
                                                <button onClick={() => handleDeleteVariant(v.id)} className="p-1 text-slate-400 hover:text-red-400"><TrashIcon className="h-4 w-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!localService.variants || localService.variants.length === 0) && (
                                        <tr><td colSpan={4} className="p-8 text-center text-xs opacity-50">No variants defined.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Overwrite Modal */}
            {descToConfirm && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded-lg backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-xl border border-white/10 max-w-sm text-center shadow-2xl">
                        <h4 className="font-bold text-white mb-2">Overwrite Description?</h4>
                        <p className="text-sm text-slate-300 mb-4">You have a manually entered description. Are you sure you want to replace it with AI content?</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDescToConfirm(null)} className="px-4 py-2 rounded bg-slate-600 hover:bg-slate-700 text-white text-sm">Cancel</button>
                            <button onClick={() => { descToConfirm.onConfirm(); setDescToConfirm(null); }} className="px-4 py-2 rounded bg-[var(--primary-accent-color)] hover:opacity-90 text-white text-sm font-bold">Overwrite</button>
                        </div>
                    </div>
                </div>
            )}

        </Modal>

        {/* Sub-Components */}
        {isSubItemEditorOpen && (
            <SubItemEditor 
                subItem={editingSubItem}
                parentContext={{ name: localService.name || 'Service', event: { name: 'Master Catalog' } }}
                onClose={() => setIsSubItemEditorOpen(false)}
                onSave={editingSubItem?.subItemId ? handleUpdateSubItem : handleAddSubItem}
                setError={setError}
                onLogAIInteraction={onLogAIInteraction}
            />
        )}

        {isSubItemSuggesterOpen && (
            <AISubItemSuggester 
                suggestions={subItemSuggestions}
                onClose={() => setIsSubItemSuggesterOpen(false)}
                onConfirm={handleConfirmSubItemSuggestions}
            />
        )}

        {isVariantEditorOpen && (
            <VariantEditorModal
                variant={editingVariant}
                onClose={() => setIsVariantEditorOpen(false)}
                onSave={editingVariant?.id ? handleUpdateVariant : handleAddVariant}
                setError={setError}
            />
        )}

        {duplicateWarning && (
            <ConfirmationModal
                title="Duplicate Service Detected"
                message={`A service with the name "${duplicateWarning.name}" already exists. Do you want to save this as a duplicate?`}
                onConfirm={finalizeSave}
                onCancel={() => setDuplicateWarning(null)}
                confirmText="Save Duplicate"
                cancelText="Cancel"
            />
        )}
        </>
    );
};
