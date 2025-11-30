
// components/Services.tsx
import React, { useState, useMemo } from 'react';
import type { ServiceItem, User, ServiceStatus, AIInteraction, AppSettings, EventItem, SavedCatalogue } from '../types';
import { ServiceEditor } from './ServiceEditor';
import { ServiceCatalogue } from './ServiceCatalogue';
import { IntelligentServiceCreator } from './features/IntelligentServiceCreator';
import { CatalogueBuilder } from './features/CatalogueBuilder';
import { PlusIcon, MenuIcon, EditIcon, Squares2X2Icon, ListBulletIcon, CubeTransparentIcon, TrashIcon, SparkleIcon, DocumentTextIcon } from './common/icons';
import { ConfirmationModal } from './common/ConfirmationModal';

interface ServicesProps {
  services: ServiceItem[];
  events: EventItem[];
  user: User;
  setError: (message: any) => void;
  setSuccess: (message: string | null) => void;
  onAddItem: (itemData: Omit<ServiceItem, 'id'>) => void;
  onUpdateService: (serviceId: string, data: Partial<ServiceItem>) => void;
  onDeleteService: (serviceId: string) => void;
  onBulkAddServices: (itemsData: Omit<ServiceItem, 'id'>[]) => void;
  onMenuClick: () => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
  settings: AppSettings;
  onAIFallback: (isActive: boolean) => void;
}

const statusColors: { [key: string]: string } = {
  'Active': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Archived': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Draft': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Inactive': 'bg-red-500/20 text-red-400 border-red-500/30',
};

// --- Sub-Components for Admin View ---

const ServiceCard: React.FC<{ item: ServiceItem; onEdit: () => void; onDelete: () => void; canManage: boolean }> = ({ item, onEdit, onDelete, canManage }) => (
  <div 
    className="backdrop-blur-xl border shadow-lg p-4 flex flex-col justify-between h-full group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    style={{
      backgroundColor: 'var(--card-container-color)',
      borderColor: 'var(--border-color)',
      borderRadius: 'var(--border-radius)',
    }}
  >
    <div>
      <div className="relative overflow-hidden rounded-lg mb-4 aspect-video">
        <img
          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/225`}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => { e.currentTarget.src = "https://picsum.photos/400/225?grayscale"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
        
        {/* Status Badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase border backdrop-blur-md ${statusColors[item.status] || 'bg-gray-700'}`}>
            {item.status}
        </div>

         {item.isFeatured && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-[var(--primary-accent-color)] text-white text-[10px] font-bold uppercase flex items-center gap-1 shadow-lg">
                <SparkleIcon className="h-3 w-3"/> Featured
            </div>
        )}

        {canManage && (
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-[var(--primary-accent-color)] transition shadow-lg" title="Edit Service">
                    <EditIcon className="h-4 w-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-red-600 transition shadow-lg" title="Delete Service">
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
        )}
      </div>
      
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary-color)'}}>{item.name}</h3>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary-accent-color)] mb-2">{item.category}</p>
      
      {item.description && (
        <p className="text-xs text-[var(--text-secondary-color)] line-clamp-2 mb-3">{item.description}</p>
      )}

      {item.keyFeatures && item.keyFeatures.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
            {item.keyFeatures.slice(0, 3).map((feature, idx) => (
                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-[var(--text-secondary-color)]">{feature}</span>
            ))}
            {item.keyFeatures.length > 3 && <span className="text-[10px] text-[var(--text-secondary-color)]">+{item.keyFeatures.length - 3}</span>}
        </div>
      )}
    </div>
    
    <div className="mt-auto pt-3 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-color)'}}>
       <span className="text-xs text-[var(--text-secondary-color)]">{item.pricingType || 'Flat Fee'}</span>
       <span className="font-bold text-green-400 text-lg">SAR {item.basePrice?.toLocaleString() || 'N/A'}</span>
    </div>
  </div>
);

const ServiceListItem: React.FC<{ item: ServiceItem; onEdit: () => void; onDelete: () => void; canManage: boolean }> = ({ item, onEdit, onDelete, canManage }) => (
    <div 
        className="flex items-center p-3 border-b hover:bg-black/10 group transition-colors"
        style={{ borderColor: 'var(--border-color)' }}
    >
        <div className="relative w-12 h-12 mr-4 flex-shrink-0">
             <img 
                src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100`}
                alt={item.name}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => { e.currentTarget.src = "https://picsum.photos/100?grayscale"; }}
            />
        </div>
       
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4">
                <div className="flex items-center gap-2">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary-color)' }}>{item.name}</p>
                    {item.isFeatured && <SparkleIcon className="h-3 w-3 text-[var(--primary-accent-color)]" />}
                </div>
                <p className="text-xs text-[var(--primary-accent-color)]">{item.category}</p>
            </div>
            
            <div className="col-span-3 hidden sm:block">
                 <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${statusColors[item.status] || 'bg-gray-700'}`}>{item.status}</span>
            </div>

            <div className="col-span-3 text-right">
                 <p className="text-sm text-green-400 font-bold">SAR {item.basePrice?.toLocaleString() || 'N/A'}</p>
                 <p className="text-[10px] text-[var(--text-secondary-color)]">{item.pricingType}</p>
            </div>

            <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {canManage && (
                    <>
                        <button onClick={onEdit} className="p-1.5 hover:bg-white/10 rounded text-[var(--text-secondary-color)] hover:text-[var(--primary-accent-color)]" title="Edit">
                            <EditIcon className="h-4 w-4" />
                        </button>
                        <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 rounded text-red-400 hover:text-red-300" title="Delete">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
);


export const Services: React.FC<ServicesProps> = ({ services, user, setError, setSuccess, onAddItem, onUpdateService, onDeleteService, onBulkAddServices, onMenuClick, onLogAIInteraction, settings, onAIFallback }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isBulkCreatorOpen, setIsBulkCreatorOpen] = useState(false);
  const [isCatalogueStudioOpen, setIsCatalogueStudioOpen] = useState(false); // New State
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  
  const [displayMode, setDisplayMode] = useState<'admin' | 'catalogue'>('admin');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // For Admin View
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{ status: string[], category: string[] }>({ status: ['Active', 'Draft'], category: [] });
  const [sortBy, setSortBy] = useState('category_asc');
  const [showFilters, setShowFilters] = useState(false);
  
  const canManage = user.permissions.canManageServices;

  const handleOpenEditor = (service: ServiceItem | null) => {
    setEditingService(service);
    setIsEditorOpen(true);
  };
  
  const handleCloseEditor = () => {
    setEditingService(null);
    setIsEditorOpen(false);
  };

  const handleSaveService = (serviceData: Omit<ServiceItem, 'id'> | ServiceItem) => {
    if ('id' in serviceData && serviceData.id) {
      onUpdateService(serviceData.id, { ...serviceData, lastModifiedAt: new Date().toISOString() });
      setSuccess("Service updated successfully");
    } else {
      const now = new Date().toISOString();
      onAddItem({ ...serviceData, createdAt: now, lastModifiedAt: now });
    }
    handleCloseEditor();
  };
  
  const handleConfirmDelete = () => {
      if (serviceToDelete) {
          onDeleteService(serviceToDelete);
          setServiceToDelete(null);
      }
  };

  const handleToggleSelect = (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setSelectedIds(newSelected);
  };

  const handleCreateFromSelection = () => {
      // Logic to create a new Event/RFQ from selected items would go here.
      setSuccess(`${selectedIds.size} items selected for new event creation.`);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
  };
  
  const handleSaveCatalogue = (catalogue: SavedCatalogue) => {
      // In a real implementation, we would save this to the backend/state.
      // For now, just success message as per prompt scope.
      // We'd ideally update AppState with new catalogues.
      setSuccess(`Catalogue "${catalogue.name}" saved successfully.`);
  };

  const { uniqueStatuses, uniqueCategories } = useMemo(() => {
      const stats = new Set<ServiceStatus>();
      const cats = new Set<string>();
      services.forEach(s => {
          stats.add(s.status);
          cats.add(s.category);
      });
      return { uniqueStatuses: Array.from(stats), uniqueCategories: Array.from(cats).sort() };
  }, [services]);

  const handleFilterChange = (type: 'status' | 'category', value: string) => {
      setFilters(prev => {
          const current = prev[type];
          const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
          return { ...prev, [type]: newValues };
      });
  };

  const processedServices = useMemo(() => {
    let items = [...services];

    // Filter
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        items = items.filter(s => 
            s.name.toLowerCase().includes(lowerSearch) ||
            s.description?.toLowerCase().includes(lowerSearch) ||
            s.category.toLowerCase().includes(lowerSearch) ||
            s.tags?.some(t => t.toLowerCase().includes(lowerSearch))
        );
    }
    
    // Only apply status filter in Admin mode
    if (displayMode === 'admin') {
        if (filters.status.length > 0) {
            items = items.filter(s => filters.status.includes(s.status));
        }
    }

    if (filters.category.length > 0) {
        items = items.filter(s => filters.category.includes(s.category));
    }

    // Sort
    const [sortKey, sortOrder] = sortBy.split('_');
    items.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1; // Featured first in default sorts
        if (!a.isFeatured && b.isFeatured) return 1;

        let valA: any, valB: any;
        switch (sortKey) {
            case 'name':
            case 'category':
                valA = a[sortKey].toLowerCase();
                valB = b[sortKey].toLowerCase();
                break;
            case 'basePrice':
                valA = a.basePrice ?? -1;
                valB = b.basePrice ?? -1;
                break;
            case 'lastModifiedAt':
                valA = new Date(a.lastModifiedAt).getTime();
                valB = new Date(b.lastModifiedAt).getTime();
                break;
            default: return 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return items;
  }, [services, searchTerm, filters, sortBy, displayMode]);

  return (
    <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col relative">
      {/* Floating Action Bar for Selection */}
      {isSelectionMode && selectedIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[var(--card-container-color)] backdrop-blur-xl border border-[var(--border-color)] p-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in-item">
              <span className="font-bold text-sm px-2">{selectedIds.size} Selected</span>
              <div className="h-6 w-px bg-gray-500/30"></div>
              <button onClick={handleCreateFromSelection} className="px-4 py-2 bg-[var(--primary-accent-color)] text-white rounded-lg font-semibold text-sm hover:opacity-90">
                  Create Event
              </button>
              <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="px-3 py-2 hover:bg-black/10 rounded-lg text-xs">
                  Cancel
              </button>
          </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)'}}>
              {displayMode === 'catalogue' ? 'Service Catalogue' : 'Service Manager'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                <button 
                    onClick={() => setDisplayMode('admin')} 
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all ${displayMode === 'admin' ? 'bg-[var(--primary-accent-color)] text-white shadow' : 'text-[var(--text-secondary-color)] hover:text-white'}`}
                >
                    Admin
                </button>
                <button 
                    onClick={() => setDisplayMode('catalogue')} 
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all ${displayMode === 'catalogue' ? 'bg-[var(--primary-accent-color)] text-white shadow' : 'text-[var(--text-secondary-color)] hover:text-white'}`}
                >
                    Catalogue
                </button>
            </div>

            {displayMode === 'catalogue' && (
                <button 
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className={`px-3 py-1.5 ml-2 text-xs font-bold uppercase rounded transition-all border ${isSelectionMode ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:bg-white/10'}`}
                >
                    {isSelectionMode ? 'Done Selecting' : 'Select Items'}
                </button>
            )}

            {displayMode === 'admin' && canManage && (
            <div className="flex items-center gap-2 ml-2 border-l pl-4 border-white/10">
                 <button
                    onClick={() => setIsCatalogueStudioOpen(true)}
                    className="px-3 py-2 bg-blue-600 text-white font-semibold text-sm shadow-md hover:bg-blue-700 transition-all duration-300 flex items-center rounded-lg"
                    title="Create Custom Catalogue"
                >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Studio
                </button>
                <button
                    onClick={() => setIsBulkCreatorOpen(true)}
                    className="px-3 py-2 bg-purple-600 text-white font-semibold text-sm shadow-md hover:bg-purple-700 transition-all duration-300 flex items-center rounded-lg"
                >
                    <CubeTransparentIcon className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">AI </span>Bulk
                </button>
                <button
                    onClick={() => handleOpenEditor(null)}
                    className="px-3 py-2 text-white font-semibold text-sm shadow-md hover:opacity-90 transition-all duration-300 flex items-center rounded-lg"
                    style={{ backgroundColor: 'var(--primary-accent-color)'}}
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add
                </button>
            </div>
            )}
        </div>
      </div>

      {/* CATALOGUE VIEW */}
      {displayMode === 'catalogue' ? (
          <ServiceCatalogue 
             services={services} 
             settings={settings}
             isSelectionMode={isSelectionMode}
             selectedIds={selectedIds}
             onToggleSelect={handleToggleSelect}
          />
      ) : (
        <>
            {/* Admin View Toolbar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 p-3 rounded-xl border shadow-sm animate-in-item" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                <div className="flex-grow relative">
                    <input 
                        type="text"
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-3 text-sm rounded-lg focus:ring-2 focus:ring-[var(--primary-accent-color)] outline-none transition-all"
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-primary-color)', border: '1px solid var(--border-color)'}}
                    />
                </div>
                
                <div className="relative">
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className={`px-3 py-2 text-sm font-medium transition rounded-lg flex items-center gap-2 ${showFilters ? 'bg-[var(--primary-accent-color)] text-white' : 'hover:bg-white/10 text-[var(--text-secondary-color)]'}`}
                    >
                        <span className="hidden sm:inline">Filters</span> 
                        {(filters.status.length > 0 || filters.category.length > 0) && (
                            <span className="flex h-2 w-2 rounded-full bg-blue-400"></span>
                        )}
                    </button>
                    
                    {showFilters && (
                        <div className="absolute top-full right-0 mt-2 w-72 backdrop-blur-xl border shadow-2xl p-4 z-20 rounded-xl" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)'}}>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-[var(--text-secondary-color)]">Status</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {uniqueStatuses.map(status => (
                                            <label key={status} className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80">
                                                <input 
                                                    type="checkbox" 
                                                    checked={filters.status.includes(status)} 
                                                    onChange={() => handleFilterChange('status', status)}
                                                    className="rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/20 border-white/10" 
                                                /> 
                                                <span className={statusColors[status]?.split(' ')[1]}>{status}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
                                    <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-[var(--text-secondary-color)]">Category</h4>
                                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                        {uniqueCategories.map(cat => (
                                            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
                                                <input 
                                                    type="checkbox" 
                                                    checked={filters.category.includes(cat)} 
                                                    onChange={() => handleFilterChange('category', cat)}
                                                    className="rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/20 border-white/10" 
                                                /> 
                                                <span className="truncate">{cat}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <select 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value)} 
                    className="p-2 text-sm rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-[var(--primary-accent-color)]" 
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-primary-color)', border: '1px solid var(--border-color)'}}
                >
                    <option value="category_asc">Group by Category</option>
                    <option value="lastModifiedAt_desc">Newest First</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="basePrice_asc">Price (Low-High)</option>
                    <option value="basePrice_desc">Price (High-Low)</option>
                </select>

                <div className="flex items-center bg-black/20 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--primary-accent-color)] text-white shadow-sm' : 'text-[var(--text-secondary-color)] hover:text-white'}`}><Squares2X2Icon className="h-4 w-4"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--primary-accent-color)] text-white shadow-sm' : 'text-[var(--text-secondary-color)] hover:text-white'}`}><ListBulletIcon className="h-4 w-4"/></button>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pb-10">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {processedServices.map((item, index) => (
                            <div key={item.id} className="animate-in-item" style={{ animationDelay: `${index * 30}ms` }}>
                                <ServiceCard item={item} onEdit={() => handleOpenEditor(item)} onDelete={() => setServiceToDelete(item.id)} canManage={canManage} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="backdrop-blur-xl border shadow-lg rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)'}}>
                        {processedServices.map((item, index) => (
                            <div key={item.id} className="animate-in-item" style={{ animationDelay: `${index * 30}ms` }}>
                                <ServiceListItem item={item} onEdit={() => handleOpenEditor(item)} onDelete={() => setServiceToDelete(item.id)} canManage={canManage} />
                            </div>
                        ))}
                    </div>
                )}
                
                {processedServices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary-color)] opacity-60">
                        <CubeTransparentIcon className="h-16 w-16 mb-4" />
                        <p className="text-lg">No services found matching your criteria.</p>
                        <button onClick={() => {setSearchTerm(''); setFilters({status:[], category:[]})}} className="mt-4 text-sm text-[var(--primary-accent-color)] hover:underline">Clear Filters</button>
                    </div>
                )}
            </div>
        </>
      )}

      {/* Modals */}
      {isEditorOpen && canManage && (
        <ServiceEditor
            service={editingService}
            allServices={services}
            onClose={handleCloseEditor}
            onSave={handleSaveService}
            setError={setError}
            onLogAIInteraction={onLogAIInteraction}
            settings={settings}
            onAIFallback={onAIFallback}
        />
      )}
      
      {isBulkCreatorOpen && canManage && (
        <IntelligentServiceCreator
          existingServices={services}
          onClose={() => setIsBulkCreatorOpen(false)}
          onServicesCreate={(servicesData) => {
            onBulkAddServices(servicesData);
            setIsBulkCreatorOpen(false);
          }}
          setError={setError}
          onLogAIInteraction={onLogAIInteraction}
        />
      )}

      {isCatalogueStudioOpen && canManage && (
          <CatalogueBuilder 
             services={services}
             settings={settings}
             onClose={() => setIsCatalogueStudioOpen(false)}
             onSave={handleSaveCatalogue}
             setError={setError}
             onLogAIInteraction={onLogAIInteraction}
          />
      )}
      
      {serviceToDelete && (
        <ConfirmationModal
            title="Delete Service"
            message="Are you sure you want to permanently delete this service? This action cannot be undone."
            onConfirm={handleConfirmDelete}
            onCancel={() => setServiceToDelete(null)}
            confirmText="Delete"
            cancelText="Cancel"
        />
      )}
    </div>
  );
};
