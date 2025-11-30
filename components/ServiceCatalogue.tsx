
import React, { useState, useMemo } from 'react';
import type { ServiceItem, AppSettings } from '../types';
import { ServiceDetailModal } from './ServiceDetailModal';
import { SparkleIcon, Squares2X2Icon, ListBulletIcon, EyeIcon } from './common/icons';

interface ServiceCatalogueProps {
    services: ServiceItem[];
    settings: AppSettings;
    isSelectionMode?: boolean;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    forcedLayout?: 'boutique' | 'ledger' | 'spotlight';
    hideControls?: boolean;
    customTitle?: string;
    coverImage?: string;
    introText?: string;
    overridePriceVisibility?: boolean;
    overrideShowMenu?: boolean;
}

export const ServiceCatalogue: React.FC<ServiceCatalogueProps> = ({
    services,
    settings,
    isSelectionMode = false,
    selectedIds = new Set(),
    onToggleSelect,
    forcedLayout,
    hideControls = false,
    customTitle,
    coverImage,
    introText,
    overridePriceVisibility,
    overrideShowMenu
}) => {
    const [layout, setLayout] = useState<'boutique' | 'ledger' | 'spotlight'>(forcedLayout || 'boutique');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

    const categories = useMemo(() => ['All', ...Array.from(new Set(services.map(s => s.category))).sort()], [services]);

    const filteredServices = useMemo(() => {
        return activeCategory === 'All' ? services : services.filter(s => s.category === activeCategory);
    }, [services, activeCategory]);

    // Allow forcedLayout prop to override state if changed
    React.useEffect(() => {
        if (forcedLayout) setLayout(forcedLayout);
    }, [forcedLayout]);

    const handleCardClick = (service: ServiceItem) => {
        if (isSelectionMode && onToggleSelect) {
            onToggleSelect(service.id);
        } else {
            setSelectedService(service);
        }
    };

    // --- Catalogue Card Components ---

    const BoutiqueCard: React.FC<{ item: ServiceItem }> = ({ item }) => {
        const isSelected = selectedIds.has(item.id);
        const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : item.displayPrice !== false;
        
        return (
            <div 
                onClick={() => handleCardClick(item)}
                className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-500 ${isSelected ? 'ring-4 ring-[var(--primary-accent-color)]' : 'hover:shadow-2xl hover:-translate-y-2'}`}
                style={{ borderRadius: settings.layout.borderRadius }}
            >
                <div className="aspect-[3/4] w-full relative">
                    <img 
                        src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/800`} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
                    
                    <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary-accent-color)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">{item.category}</p>
                        <h3 className="text-2xl font-bold mb-2 font-serif leading-none">{item.name}</h3>
                        
                        <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-500">
                            <p className="text-sm text-gray-300 line-clamp-2 mb-3">{item.description}</p>
                            <div className="flex justify-between items-end border-t border-white/20 pt-3">
                                <span className="text-white/80 text-xs font-medium">{item.pricingType}</span>
                                <span className="text-white font-mono font-bold text-lg">
                                    {showPrice && (item.basePrice || item.basePrice === 0) ? `SAR ${(item.basePrice || 0).toLocaleString()}` : 'On Request'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Selection Overlay */}
                    {isSelectionMode && (
                         <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)]' : 'border-white bg-black/30'}`}>
                            {isSelected && <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const LedgerRow: React.FC<{ item: ServiceItem }> = ({ item }) => {
        const isSelected = selectedIds.has(item.id);
        const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : item.displayPrice !== false;

        return (
            <div 
                 onClick={() => handleCardClick(item)}
                 className={`group flex flex-col sm:flex-row items-start sm:items-center py-6 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5 relative ${isSelected ? 'bg-white/10' : ''}`}
            >
                {isSelectionMode && (
                     <div className={`absolute top-4 right-4 sm:static sm:mr-4 w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)]' : 'border-gray-500'}`}>
                         {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                     </div>
                )}
                <div className="w-full sm:w-24 h-32 sm:h-24 flex-shrink-0 mb-4 sm:mb-0 sm:mr-6 relative overflow-hidden rounded-lg">
                    <img 
                        src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200`} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                </div>
                <div className="flex-grow flex flex-col sm:flex-row sm:items-baseline w-full">
                     <span className="text-sm text-[var(--primary-accent-color)] w-full sm:w-32 font-bold uppercase tracking-wider mb-1 sm:mb-0">{item.category}</span>
                     <h3 className="text-xl font-bold text-white mr-4 mb-1 sm:mb-0">{item.name}</h3>
                     <div className="hidden sm:block flex-grow mx-4 border-b border-dotted border-gray-400 h-1 opacity-30"></div>
                     <span className="font-mono font-bold text-lg text-white mt-2 sm:mt-0">
                        {showPrice && (item.basePrice || item.basePrice === 0) ? `SAR ${(item.basePrice || 0).toLocaleString()}` : 'On Request'}
                     </span>
                </div>
            </div>
        );
    };

    const SpotlightCard: React.FC<{ item: ServiceItem }> = ({ item }) => {
        const isSelected = selectedIds.has(item.id);
        const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : item.displayPrice !== false;

        return (
            <div 
                onClick={() => handleCardClick(item)}
                className={`group relative col-span-1 md:col-span-2 lg:col-span-1 overflow-hidden rounded-2xl cursor-pointer min-h-[300px] ${isSelected ? 'ring-4 ring-[var(--primary-accent-color)]' : ''}`}
                style={{ borderRadius: settings.layout.borderRadius }}
            >
                 <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/20 transition-colors duration-500"></div>
                 <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/1200/800`} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 z-20">
                     <div className="transform transition-transform duration-500 group-hover:-translate-y-4">
                        <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-white uppercase bg-[var(--primary-accent-color)] rounded-full">
                            {item.category}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg font-serif">{item.name}</h2>
                        <p className="text-base sm:text-lg text-gray-200 max-w-xl line-clamp-2 drop-shadow-md">{item.description}</p>
                        
                        <div className="flex items-center justify-between border-t border-white/20 pt-6 sm:pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            <div>
                                <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Estimated Cost</p>
                                <p className="text-2xl sm:text-3xl font-mono text-[var(--primary-accent-color)] font-bold">
                                    {showPrice && (item.basePrice || item.basePrice === 0) ? `SAR ${(item.basePrice || 0).toLocaleString()}` : 'On Request'}
                                </p>
                            </div>
                             <button className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors text-sm sm:text-base">
                                View Details
                            </button>
                        </div>
                     </div>
                </div>
                
                {/* Selection Overlay */}
                 {isSelectionMode && (
                     <div className={`absolute top-6 right-6 w-8 h-8 rounded-full border-2 flex items-center justify-center z-30 ${isSelected ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)]' : 'border-white bg-black/30'}`}>
                        {isSelected && <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="w-full h-full flex flex-col bg-slate-900 text-white overflow-hidden">
            
            {/* Hero / Header Section */}
            <div className="relative w-full h-48 md:h-80 flex-shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-black/60 z-10"></div>
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0 scale-105 blur-sm" 
                    style={{ backgroundImage: `url(${coverImage || 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop'})` }}
                ></div>
                
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6">
                    <p className="text-xs md:text-sm font-bold tracking-[0.3em] text-[var(--primary-accent-color)] uppercase mb-2 md:mb-4 animate-fade-in-up">
                        Kanchana Events Hub
                    </p>
                    <h1 className="text-3xl md:text-6xl font-serif font-bold text-white mb-4 md:mb-6 max-w-3xl leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        {customTitle || "Curated Service Collection"}
                    </h1>
                    {introText && (
                        <p className="text-sm md:text-lg text-gray-300 max-w-2xl animate-fade-in-up leading-relaxed hidden sm:block" style={{ animationDelay: '0.2s' }}>
                            {introText}
                        </p>
                    )}
                </div>

                {/* Controls Bar (Hidden in pure preview mode if requested) */}
                {!hideControls && (
                    <div className="absolute bottom-0 left-0 w-full z-30 bg-gradient-to-t from-black to-transparent p-4 flex flex-col md:flex-row justify-between items-center md:items-end gap-2">
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full md:w-auto justify-center md:justify-start">
                            {categories.map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-3 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md border transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-white text-black border-white' : 'bg-black/30 text-white border-white/30 hover:bg-white/10'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10">
                            {[
                                { id: 'boutique', icon: <Squares2X2Icon className="h-4 w-4"/> },
                                { id: 'ledger', icon: <ListBulletIcon className="h-4 w-4"/> },
                                { id: 'spotlight', icon: <EyeIcon className="h-4 w-4"/> }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => setLayout(opt.id as any)}
                                    className={`p-2 rounded transition-all ${layout === opt.id ? 'bg-[var(--primary-accent-color)] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {opt.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Grid Content */}
            <div className="flex-grow overflow-y-auto p-4 md:p-10 custom-scrollbar">
                {filteredServices.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                        <p>No services found in this category.</p>
                    </div>
                ) : (
                    <>
                        {layout === 'boutique' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                {filteredServices.map(service => <BoutiqueCard key={service.id} item={service} />)}
                            </div>
                        )}
                        
                        {layout === 'ledger' && (
                            <div className="max-w-5xl mx-auto bg-black/20 backdrop-blur-sm rounded-xl p-4 md:p-8 border border-white/5">
                                {filteredServices.map(service => <LedgerRow key={service.id} item={service} />)}
                            </div>
                        )}

                        {layout === 'spotlight' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredServices.map(service => <SpotlightCard key={service.id} item={service} />)}
                            </div>
                        )}
                    </>
                )}
                
                <div className="mt-20 text-center text-gray-500 text-xs tracking-widest uppercase">
                    <p>End of Collection</p>
                    <div className="w-12 h-px bg-gray-700 mx-auto mt-4"></div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedService && (
                <ServiceDetailModal 
                    service={selectedService} 
                    onClose={() => setSelectedService(null)}
                    overridePriceVisibility={overridePriceVisibility}
                    overrideShowMenu={overrideShowMenu}
                />
            )}
        </div>
    );
};
