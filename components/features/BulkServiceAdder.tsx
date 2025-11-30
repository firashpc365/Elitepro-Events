// components/features/BulkServiceAdder.tsx
import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { InputField } from '../common/InputField';
import type { ServiceItem, CostTrackerItem, ServiceStatus } from '../../types';
import { Squares2X2Icon, ListBulletIcon } from '../common/icons';

interface BulkServiceAdderProps {
  services: ServiceItem[];
  existingItemIds: Set<string>;
  onClose: () => void;
  onAddItems: (items: CostTrackerItem[]) => void;
}

interface SelectedService {
  serviceId: string;
  quantity: number;
}

const statusColors: { [key: string]: string } = {
  'Active': 'bg-green-500/20 text-green-300',
  'Archived': 'bg-slate-500/20 text-slate-400',
  'Draft': 'bg-yellow-500/20 text-yellow-300',
  'Inactive': 'bg-red-500/20 text-red-400',
};

export const BulkServiceAdder: React.FC<BulkServiceAdderProps> = ({ services, existingItemIds, onClose, onAddItems }) => {
  const [selectedServices, setSelectedServices] = useState<Record<string, SelectedService>>({});
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{ status: string[], category: string[] }>({ status: ['Active'], category: [] });
  const [sortBy, setSortBy] = useState('category_asc');
  const [showFilters, setShowFilters] = useState(false);

  const availableServices = useMemo(() => {
    return services.filter(s => !existingItemIds.has(s.id));
  }, [services, existingItemIds]);

  const { uniqueCategories, uniqueStatuses } = useMemo(() => {
    const cats = new Set<string>();
    const stats = new Set<ServiceStatus>();
    availableServices.forEach(s => {
        cats.add(s.category);
        stats.add(s.status);
    });
    return { uniqueCategories: Array.from(cats).sort(), uniqueStatuses: Array.from(stats) };
  }, [availableServices]);

  const handleFilterChange = (type: 'status' | 'category', value: string) => {
    setFilters(prev => {
        const current = prev[type];
        const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        return { ...prev, [type]: newValues };
    });
  };

  const processedServices = useMemo(() => {
    let items = [...availableServices];

    // Filter
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        items = items.filter(s => s.name.toLowerCase().includes(lowerSearch) || s.category.toLowerCase().includes(lowerSearch));
    }
    if (filters.status.length > 0) {
        items = items.filter(s => filters.status.includes(s.status));
    }
    if (filters.category.length > 0) {
        items = items.filter(s => filters.category.includes(s.category));
    }

    // Sort
    const [sortKey, sortOrder] = sortBy.split('_');
    items.sort((a, b) => {
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
            default: return 0;
        }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return items;
  }, [availableServices, searchTerm, filters, sortBy]);

  const handleToggleSelect = (service: ServiceItem) => {
    setSelectedServices(prev => {
      const newSelection = { ...prev };
      if (newSelection[service.id]) {
        delete newSelection[service.id];
      } else {
        newSelection[service.id] = { serviceId: service.id, quantity: 1 };
      }
      return newSelection;
    });
  };

  const handleQuantityChange = (serviceId: string, quantity: number) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], quantity: Math.max(1, quantity) },
    }));
  };

  const handleAddSelected = () => {
    const itemsToAdd: CostTrackerItem[] = Object.values(selectedServices).map((selected: SelectedService) => {
      const service = services.find(s => s.id === selected.serviceId)!;
      return {
        itemId: `ci-${Date.now()}-${Math.random()}`,
        masterServiceId: service.id,
        name: service.name,
        description: service.description,
        quantity: selected.quantity,
        unit_cost_sar: (service.basePrice || 0) * 0.6, // Mock cost
        client_price_sar: service.basePrice || 0,
        imageUrl: service.imageUrl,
      };
    });
    onAddItems(itemsToAdd);
  };
  
  const selectedCount = Object.keys(selectedServices).length;
  
  const renderService = (service: ServiceItem) => {
    const isSelected = !!selectedServices[service.id];
    if (viewMode === 'grid') {
      return (
        <div key={service.id} className={`relative p-3 rounded-lg transition border ${isSelected ? 'bg-cyan-500/20 border-cyan-500/30' : 'bg-black/10 border-transparent'}`}>
          <img src={service.imageUrl || `https://picsum.photos/seed/${service.id}/200`} className="w-full h-24 object-cover rounded-md mb-2" />
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary-color)' }}>{service.name}</p>
          <div className="flex justify-between items-center mt-2">
            <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(service)} className="h-5 w-5 rounded" />
            {isSelected && <input type="number" value={selectedServices[service.id].quantity} onChange={e => handleQuantityChange(service.id, Number(e.target.value))} className="w-16 p-1 text-sm rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />}
          </div>
        </div>
      );
    }
    // List View
    return (
      <div key={service.id} className={`p-3 rounded-lg transition flex items-center gap-3 ${isSelected ? 'bg-cyan-500/20' : 'bg-black/10'}`}>
        <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(service)} className="h-5 w-5 rounded flex-shrink-0"/>
        <img src={service.imageUrl || `https://picsum.photos/seed/${service.id}/100`} className="w-10 h-10 object-cover rounded-md" />
        <div className="flex-grow">
          <p className="font-semibold" style={{ color: 'var(--text-primary-color)' }}>{service.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary-color)' }}>{service.category}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full text-center w-fit ${statusColors[service.status] || 'bg-gray-700'}`}>{service.status}</span>
        {isSelected && <input type="number" value={selectedServices[service.id].quantity} onChange={e => handleQuantityChange(service.id, Number(e.target.value))} className="w-20 p-1 text-sm rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} min={1} />}
      </div>
    );
  };
  
  return (
    <Modal
      title="Add Services from Master List"
      onClose={onClose}
      onSave={handleAddSelected}
      saveText={`Add ${selectedCount} Selected Item(s)`}
      size="full"
    >
      <div className="space-y-4 h-[70vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 p-2 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <input 
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-grow p-2 text-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-color)', borderRadius: 'calc(var(--border-radius) / 2)'}}
            />
            <div className="relative">
                <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-2 text-sm font-medium hover:bg-black/20 transition rounded-lg">Filters</button>
                {showFilters && (
                    <div className="absolute top-full right-0 mt-2 w-72 backdrop-blur-xl border shadow-lg p-4 z-10 space-y-4" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)', borderRadius: 'var(--border-radius)'}}>
                        <div>
                            <h4 className="font-semibold text-sm mb-2">Status</h4>
                            <div className="space-y-1">
                                {uniqueStatuses.map(status => (
                                    <label key={status} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.status.includes(status)} onChange={() => handleFilterChange('status', status)} /> {status}</label>
                                ))}
                            </div>
                        </div>
                        <div className="border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
                            <h4 className="font-semibold text-sm mb-2">Category</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {uniqueCategories.map(cat => (
                                    <label key={cat} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.category.includes(cat)} onChange={() => handleFilterChange('category', cat)} /> {cat}</label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="p-2 text-sm" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-color)', borderRadius: 'calc(var(--border-radius) / 2)'}}>
                <option value="category_asc">Category</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="basePrice_asc">Price (Low-High)</option>
                <option value="basePrice_desc">Price (High-Low)</option>
            </select>
            <div className="flex items-center bg-black/20 p-1 rounded-lg">
                <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-[var(--primary-accent-color)] text-white' : ''}`}><ListBulletIcon className="h-5 w-5"/></button>
                <button onClick={() => setViewMode('grid')} className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[var(--primary-accent-color)] text-white' : ''}`}><Squares2X2Icon className="h-5 w-5"/></button>
            </div>
        </div>

        {/* Service List */}
        <div className={`flex-grow overflow-y-auto border rounded-lg p-2 space-y-2 ${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)' }}>
          {processedServices.map(service => renderService(service))}
          {processedServices.length === 0 && (
              <div className="text-center p-8 col-span-full" style={{ color: 'var(--text-secondary-color)' }}>
                  <p>No available services match your criteria.</p>
              </div>
          )}
        </div>
      </div>
    </Modal>
  );
};