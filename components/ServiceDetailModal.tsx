
import React from 'react';
import type { ServiceItem } from '../types';
import { SparkleIcon, DocumentTextIcon, XIcon } from './common/icons';

interface ServiceDetailModalProps {
  service: ServiceItem;
  onClose: () => void;
  overridePriceVisibility?: boolean;
  overrideShowMenu?: boolean;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ service, onClose, overridePriceVisibility, overrideShowMenu }) => {
    const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : service.displayPrice !== false;
    const showMenu = overrideShowMenu !== undefined ? overrideShowMenu : true;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in-item" onClick={onClose}>
            <div 
                className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border max-h-[90vh] md:max-h-[85vh]"
                style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}
                onClick={(e) => e.stopPropagation()}
            >
                 <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition shadow-lg">
                    <XIcon className="h-6 w-6" />
                </button>

                {/* Image Section */}
                <div className="w-full md:w-1/2 relative h-56 md:h-auto group bg-black flex-shrink-0">
                    <img 
                        src={service.imageUrl || `https://picsum.photos/seed/${service.id}/800/800`} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt={service.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden pointer-events-none"></div>
                     {service.isFeatured && (
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[var(--primary-accent-color)] text-white text-xs font-bold uppercase flex items-center gap-1 shadow-lg backdrop-blur-md z-10">
                            <SparkleIcon className="h-3 w-3"/> Featured
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto custom-scrollbar relative flex flex-col bg-[var(--card-container-color)]">
                     <div className="mb-6">
                         <p className="text-[var(--primary-accent-color)] text-xs md:text-sm font-bold uppercase tracking-widest mb-2">{service.category}</p>
                         <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary-color)] mb-2 leading-tight">{service.name}</h2>
                         <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                             <span className="text-xl md:text-2xl font-mono font-bold text-green-400">
                                 {showPrice && (service.basePrice || service.basePrice === 0) ? `SAR ${(service.basePrice || 0).toLocaleString()}` : 'Price on Request'}
                             </span>
                             {showPrice && service.pricingType && <span className="text-sm text-[var(--text-secondary-color)]">/ {service.pricingType}</span>}
                         </div>
                     </div>

                     <div className="space-y-6 flex-grow">
                         {/* Description */}
                         <div className="prose prose-sm text-[var(--text-secondary-color)] leading-relaxed">
                             <p>{service.description}</p>
                         </div>

                         {/* Menu Options (If available and enabled) */}
                         {showMenu && service.menuOptions && service.menuOptions.length > 0 && (
                             <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                 <h4 className="text-[var(--text-primary-color)] font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                                     <DocumentTextIcon className="h-4 w-4 text-[var(--primary-accent-color)]"/> Menu & Inclusions
                                 </h4>
                                 <ul className="space-y-2">
                                     {service.menuOptions.map((option, i) => (
                                         <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary-color)]">
                                             <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--primary-accent-color)] flex-shrink-0"></span>
                                             <span>{option}</span>
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         )}

                         {/* Features */}
                         {service.keyFeatures && service.keyFeatures.length > 0 && (
                             <div>
                                 <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] mb-3">Key Features</h4>
                                 <div className="flex flex-wrap gap-2">
                                     {service.keyFeatures.map((feature, idx) => (
                                         <span key={idx} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-[var(--text-primary-color)]">
                                             {feature}
                                         </span>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>
                     
                     {/* Footer Actions */}
                     <div className="pt-6 mt-8 border-t border-white/10">
                        <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: 'var(--primary-accent-color)' }}>
                            Close Details
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};
