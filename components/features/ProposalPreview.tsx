
// components/features/ProposalPreview.tsx
import React, { useMemo, forwardRef } from 'react';
import type { EventItem, ProposalLineItem, ProposalFinancials } from '../../types';

interface ProposalPreviewProps {
    content: {
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
    };
    financials?: ProposalFinancials;
    event: EventItem;
    themeImage: string;
    branding: {
        primaryColor: string;
        companyLogo: string;
        partnerLogo1: string;
        partnerLogo2: string;
        secondaryColor?: string;
        backgroundColor?: string;
        textColor?: string;
        fontFamilyHeading?: string;
        fontFamilyBody?: string;
        backgroundImageUrl?: string;
    };
    layoutStrategy?: 'one-per-page' | 'smart-grouping';
}

interface Branding {
    primaryColor: string;
    companyLogo: string;
    partnerLogo1: string;
    partnerLogo2: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamilyHeading?: string;
    fontFamilyBody?: string;
    backgroundImageUrl?: string;
}

const formatCurrency = (amount: number) => {
    return `SAR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Page: React.FC<{ children: React.ReactNode; pageNumber: number; totalPages: number; branding: Branding; isCover?: boolean }> = ({ children, pageNumber, totalPages, branding, isCover }) => (
    <div className="proposal-page relative overflow-hidden flex flex-col" style={{ backgroundColor: branding.backgroundColor, color: branding.textColor, fontFamily: branding.fontFamilyBody }}>
        {/* Background Image Layer (Subtle Watermark) */}
        {branding.backgroundImageUrl && !isCover && (
            <div 
                className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none grayscale" 
                style={{ 
                    backgroundImage: `url(${branding.backgroundImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            />
        )}
        
        {/* Branding Watermark Logo */}
        {branding.companyLogo && !isCover && (
            <div className="absolute -bottom-20 -right-20 w-96 h-96 opacity-[0.03] pointer-events-none z-0">
                 <img src={branding.companyLogo} alt="" className="w-full h-full object-contain grayscale" />
            </div>
        )}

        <div className="flex-grow relative z-10">
            {children}
        </div>
        
        {!isCover && (
            <footer className="proposal-page-footer relative z-10 flex justify-between items-end text-xs opacity-60 pt-4 mt-8 border-t" style={{ borderColor: `${branding.textColor}20` }}>
                <div>
                    <p className="font-bold">{branding.companyLogo ? 'Confidential Proposal' : 'Kanchana Events Hub'}</p>
                    <p>{new Date().toLocaleDateString()}</p>
                </div>
                <p>Page {pageNumber} of {totalPages}</p>
            </footer>
        )}
    </div>
);

// Helper to calculate visual weight of an item
const getItemWeight = (item: ProposalLineItem) => {
    let weight = 1; // Base weight
    if (item.generatedImage) weight += 3; // Image takes lots of space
    if (item.description && item.description.length > 150) weight += 1; // Long text
    if (item.subItems && item.subItems.length > 0) weight += Math.ceil(item.subItems.length / 3); // Sub-items take space
    return weight;
};

const ItemDisplay: React.FC<{ item: ProposalLineItem; branding: Branding }> = ({ item, branding }) => {
    const totalItemCost = (item.finalSalePrice || item.client_price_sar) * item.quantity;
    const displayImage = item.generatedImage || item.imageUrl;
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
        <div className="mb-8 break-inside-avoid relative">
            {/* Decorative accent line */}
            <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full" style={{ backgroundColor: branding.primaryColor }}></div>
            
            <div className="pl-6">
                <div className="flex justify-between items-baseline mb-3">
                     <h2 className="text-xl font-bold" style={{ color: branding.primaryColor, fontFamily: branding.fontFamilyHeading }}>{item.name}</h2>
                     <span className="text-sm font-medium opacity-60">Qty: {item.quantity}</span>
                </div>
               
                <div className={`grid gap-6 ${displayImage ? 'grid-cols-1' : 'grid-cols-1'}`}>
                    {displayImage && (
                        <div className="relative overflow-hidden rounded-lg shadow-md h-48 w-full">
                            <img src={displayImage} alt={item.name} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg"></div>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap opacity-80 leading-relaxed" style={{ color: branding.textColor }}>
                            {item.description && <p>{item.description}</p>}
                        </div>

                        {hasSubItems && (
                            <div className="bg-gray-50/50 p-4 rounded-lg border" style={{ borderColor: `${branding.textColor}15` }}>
                                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-70">Includes</h4>
                                <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
                                    {item.subItems!.map(si => (
                                        <li key={si.subItemId} className="flex justify-between text-sm pb-1 border-b border-dashed" style={{ borderColor: `${branding.textColor}10` }}>
                                            <span className="font-medium">{si.name}</span>
                                            <span className="opacity-60">{si.quantity > 1 ? `x${si.quantity}` : ''}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        <div className="flex justify-end items-center pt-2">
                            <div className="text-sm px-4 py-1 rounded-full border" style={{ borderColor: `${branding.primaryColor}40`, backgroundColor: `${branding.primaryColor}08`, color: branding.primaryColor }}>
                                <span className="opacity-70 mr-2">Item Total:</span>
                                <span className="font-bold">{formatCurrency(totalItemCost)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProposalPreview = forwardRef<HTMLDivElement, ProposalPreviewProps>(({ content, financials, event, themeImage, branding, layoutStrategy = 'smart-grouping' }, ref) => {
    
    // Logic for Smart Grouping of Items into Pages
    const groupedPages = useMemo(() => {
        if (layoutStrategy === 'one-per-page') {
            // Default behavior: 1 item per page
            return content.lineItems.map(item => [item]);
        }

        // Smart Grouping
        const pages: ProposalLineItem[][] = [];
        let currentPage: ProposalLineItem[] = [];
        let currentWeight = 0;
        const MAX_WEIGHT = 5; // Adjusted max weight per page

        content.lineItems.forEach(item => {
            const weight = getItemWeight(item);
            
            // If item is huge, force new page
            if (weight >= MAX_WEIGHT) {
                if (currentPage.length > 0) {
                    pages.push(currentPage);
                    currentPage = [];
                    currentWeight = 0;
                }
                pages.push([item]);
            } else {
                // Check if it fits
                if (currentWeight + weight > MAX_WEIGHT) {
                    pages.push(currentPage);
                    currentPage = [item];
                    currentWeight = weight;
                } else {
                    currentPage.push(item);
                    currentWeight += weight;
                }
            }
        });

        if (currentPage.length > 0) {
            pages.push(currentPage);
        }

        return pages;

    }, [content.lineItems, layoutStrategy]);

    // Calculate page numbers
    let pageCounter = 1; // Cover is page 1
    pageCounter++; // Intro is page 2
    const introPageNum = pageCounter;
    
    const itemsStartPageNum = pageCounter + 1;
    pageCounter += groupedPages.length;
    
    let financialsPageNum = 0;
    if (financials) {
        pageCounter++;
        financialsPageNum = pageCounter;
    }

    pageCounter++;
    const conclusionPageNum = pageCounter;

    pageCounter++;
    const endCoverPageNum = pageCounter;
    
    const totalPages = pageCounter;


    const CoverPage = () => (
        <div className="proposal-page relative flex flex-col p-0 h-full">
             <div className="absolute inset-0 z-0">
                {themeImage || branding.backgroundImageUrl ? (
                    <div className="w-full h-full relative">
                        <img src={themeImage || branding.backgroundImageUrl} className="w-full h-full object-cover" alt="Cover Background" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                        <div className="absolute inset-0" style={{ backgroundColor: branding.primaryColor, opacity: 0.2, mixBlendMode: 'overlay' }}></div>
                    </div>
                ) : (
                    <div className="w-full h-full" style={{ backgroundColor: branding.primaryColor }}></div>
                )}
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between p-16 text-white">
                <div className="flex justify-between items-start">
                     {branding.companyLogo && (
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20">
                            <img src={branding.companyLogo} alt="Company Logo" className="h-16 object-contain"/>
                        </div>
                     )}
                     <div className="text-right opacity-80">
                         <p className="font-bold text-lg tracking-widest uppercase">Proposal</p>
                         <p className="text-sm">{content.cover.date}</p>
                     </div>
                </div>

                <div>
                    <h1 className="text-6xl font-extrabold mb-4 leading-tight tracking-tight drop-shadow-lg" style={{ fontFamily: branding.fontFamilyHeading }}>
                        {content.cover.title}
                    </h1>
                    <div className="w-24 h-2 bg-white/80 mb-6"></div>
                    <h2 className="text-3xl font-light text-white/90" style={{ fontFamily: branding.fontFamilyBody }}>
                        {content.cover.subtitle}
                    </h2>
                </div>

                <div className="bg-white/10 backdrop-blur-lg border border-white/10 p-6 rounded-xl max-w-md">
                    <p className="text-sm uppercase tracking-wider text-white/60 mb-1">Prepared For</p>
                    <p className="text-2xl font-bold">{content.cover.clientName}</p>
                </div>
            </div>
        </div>
    );

    const EndCoverPage = () => (
        <div className="proposal-page relative flex flex-col items-center justify-center p-0" style={{ backgroundColor: branding.primaryColor }}>
            {/* Pattern Overlay */}
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="relative z-10 text-white text-center p-12 max-w-2xl">
                {branding.companyLogo && (
                    <div className="mb-12 flex justify-center">
                        <div className="bg-white p-6 rounded-full shadow-2xl">
                             <img src={branding.companyLogo} alt="Company Logo" className="h-20 object-contain"/>
                        </div>
                    </div>
                )}
                
                <h1 className="text-5xl font-bold mb-6 tracking-tight" style={{ fontFamily: branding.fontFamilyHeading }}>Let's Create Magic.</h1>
                <p className="text-xl mb-12 opacity-90 leading-relaxed">We are excited about the possibility of partnering with you to bring this vision to life.</p>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 inline-block w-full text-left">
                    <div className="grid grid-cols-2 gap-8 text-sm">
                         <div>
                             <p className="font-bold uppercase tracking-wider opacity-60 mb-1">Contact</p>
                             <p className="text-lg font-semibold">info@kanchana.events</p>
                         </div>
                         <div>
                             <p className="font-bold uppercase tracking-wider opacity-60 mb-1">Website</p>
                             <p className="text-lg font-semibold">www.kanchana.events</p>
                         </div>
                         <div className="col-span-2 pt-6 border-t border-white/20 flex justify-center gap-8 opacity-80">
                             {branding.partnerLogo1 && <img src={branding.partnerLogo1} alt="Partner" className="h-8 object-contain brightness-0 invert" />}
                             {branding.partnerLogo2 && <img src={branding.partnerLogo2} alt="Partner" className="h-8 object-contain brightness-0 invert" />}
                         </div>
                    </div>
                </div>
            </div>
            
            <footer className="absolute bottom-8 text-white/40 text-xs">
                &copy; {new Date().getFullYear()} Kanchana Events Hub. All Rights Reserved.
            </footer>
        </div>
    );

    return (
        <div ref={ref} className="proposal-preview-container shadow-2xl">
            <CoverPage />
            
            <Page pageNumber={introPageNum} totalPages={totalPages} branding={branding}>
                <div className="h-full flex flex-col justify-center max-w-3xl mx-auto">
                    <h2 className="text-4xl font-bold mb-6 pb-4 border-b-2" style={{ color: branding.primaryColor, fontFamily: branding.fontFamilyHeading, borderColor: branding.primaryColor }}>{content.themeTitle}</h2>
                    <p className="text-xl mb-10 italic font-light opacity-80 leading-relaxed" style={{ color: branding.secondaryColor || branding.textColor }}>{content.themeDescription}</p>
                    
                    <div className="bg-gray-50 p-8 rounded-xl border-l-4 shadow-sm" style={{ borderColor: branding.primaryColor }}>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-50">Executive Summary</h3>
                        <div className="prose prose-lg max-w-none whitespace-pre-wrap text-justify leading-8" style={{ color: branding.textColor, fontFamily: branding.fontFamilyBody }}>
                            {content.introduction}
                        </div>
                    </div>
                </div>
            </Page>

            {groupedPages.map((pageItems, index) => (
                <Page key={`items-page-${index}`} pageNumber={itemsStartPageNum + index} totalPages={totalPages} branding={branding}>
                     <div className="mb-6 flex items-center gap-4">
                        <div className="h-px bg-gray-200 flex-grow"></div>
                        <span className="text-xs uppercase tracking-widest opacity-40 font-bold">Proposed Services</span>
                        <div className="h-px bg-gray-200 flex-grow"></div>
                    </div>
                    {pageItems.map(item => (
                        <ItemDisplay key={item.key} item={item} branding={branding} />
                    ))}
                </Page>
            ))}
            
            {financials && (
                 <Page pageNumber={financialsPageNum} totalPages={totalPages} branding={branding}>
                    <div className="max-w-3xl mx-auto h-full flex flex-col justify-center">
                        <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: branding.primaryColor, fontFamily: branding.fontFamilyHeading }}>Investment Summary</h2>
                        
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="p-4 text-left">Service Item</th>
                                        <th className="p-4 text-center">Type</th>
                                        <th className="p-4 text-center">Qty</th>
                                        <th className="p-4 text-right">Unit Price</th>
                                        <th className="p-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {content.lineItems.map((item) => (
                                        <tr key={item.key} className="hover:bg-gray-50/50">
                                            <td className="p-4 font-medium text-gray-800">{item.name}</td>
                                            <td className="p-4 text-center text-gray-500">{item.pricingType || 'Fixed'}</td>
                                            <td className="p-4 text-center text-gray-500">{item.quantity}</td>
                                            <td className="p-4 text-right text-gray-600">{formatCurrency(item.client_price_sar)}</td>
                                            <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(item.client_price_sar * item.quantity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            <div className="bg-gray-50 p-6 border-t border-gray-100">
                                <div className="flex justify-end">
                                    <div className="w-1/2 space-y-3">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(financials.totalEstimatedRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                            <span className="font-bold text-lg text-gray-900">Grand Total</span>
                                            <span className="font-black text-2xl" style={{ color: branding.primaryColor }}>{formatCurrency(financials.totalEstimatedRevenue)}</span>
                                        </div>
                                        <p className="text-xs text-right text-gray-400 mt-2">* Inclusive of all applicable taxes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </Page>
            )}

            <Page pageNumber={conclusionPageNum} totalPages={totalPages} branding={branding}>
                 <div className="h-full flex flex-col justify-center max-w-3xl mx-auto">
                    <h3 className="text-2xl font-bold mb-6 border-b pb-4" style={{ fontFamily: branding.fontFamilyHeading, borderColor: branding.primaryColor, color: branding.primaryColor }}>Moving Forward</h3>
                    <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {content.conclusion}
                    </div>
                    
                    <div className="mt-12 p-6 border border-dashed border-gray-300 rounded-lg flex items-center justify-between bg-gray-50/50">
                         <div>
                             <p className="font-bold text-sm text-gray-400 uppercase mb-8">Client Signature</p>
                             <div className="w-64 border-b border-gray-300"></div>
                         </div>
                          <div>
                             <p className="font-bold text-sm text-gray-400 uppercase mb-8">Date</p>
                             <div className="w-32 border-b border-gray-300"></div>
                         </div>
                    </div>
                </div>
            </Page>

            <EndCoverPage />
        </div>
    );
});
