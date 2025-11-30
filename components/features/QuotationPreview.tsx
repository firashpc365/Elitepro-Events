
// components/features/QuotationPreview.tsx
import React, { useMemo, forwardRef } from 'react';
import type { EventItem, CostTrackerItem, QuotationDetails } from '../../types';
import { LinkedInIcon, TwitterIcon, InstagramIcon, MapPinIcon, CalendarIcon, UsersIcon } from '../common/icons';

interface QuotationPreviewProps {
    data: {
        details: QuotationDetails;
        event: EventItem;
        lineItems: CostTrackerItem[];
        showQRCode?: boolean;
    }
}

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(({ data }, ref) => {
    const { details, event, lineItems } = data;

    const groupedItems = useMemo(() => {
        const groups: { [key: string]: CostTrackerItem[] } = {
            'Fixed Costs': [],
            'Variable Costs': [],
            'Mandatory Compliance Costs': [],
            'Other Items': []
        };
        lineItems.forEach(item => {
            if (item.costType === 'Fixed') {
                groups['Fixed Costs'].push(item);
            } else if (item.costType === 'Variable') {
                groups['Variable Costs'].push(item);
            } else if (item.costType === 'Compliance') {
                groups['Mandatory Compliance Costs'].push(item);
            } else {
                groups['Other Items'].push(item);
            }
        });
        
        // Clean up empty groups before returning
        const finalGroups: { [key: string]: CostTrackerItem[] } = {};
        for (const key in groups) {
            if (groups[key].length > 0) {
                finalGroups[key] = groups[key];
            }
        }
        
        return finalGroups;
    }, [lineItems]);

    const calculations = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + item.client_price_sar * item.quantity, 0);
        const salesTax = subtotal * (details.taxRate / 100);
        const other = details.otherCharges.amount || 0;
        const total = subtotal + salesTax + other;
        return { subtotal, salesTax, other, total };
    }, [lineItems, details.taxRate, details.otherCharges.amount]);

    const formatCurrency = (amount: number) => {
        return `SAR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const renderItemsTable = (title: string, items: CostTrackerItem[]) => {
        if (items.length === 0) return null;
        const tableSubtotal = items.reduce((acc, item) => acc + item.client_price_sar * item.quantity, 0);

        return (
            <div key={title} className="proposal-item mb-8 break-inside-avoid shadow-sm rounded-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                     <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: details.primaryColor }}>{title}</h3>
                     <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{items.length} Items</span>
                </div>
                <table className="w-full text-sm bg-white">
                    <thead>
                        <tr className="text-left border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <th className="px-6 py-3 w-1/2">Description</th>
                            <th className="px-6 py-3 text-center">Qty</th>
                            <th className="px-6 py-3 text-right">Unit Price</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.itemId + index} className="border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-3 align-top">
                                    <p className="font-bold text-gray-800">{item.name}</p>
                                    {item.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>}
                                </td>
                                <td className="px-6 py-3 text-center align-top text-gray-600">{item.quantity}</td>
                                <td className="px-6 py-3 text-right align-top text-gray-600">{formatCurrency(item.client_price_sar)}</td>
                                <td className="px-6 py-3 text-right align-top font-bold text-gray-800">{formatCurrency(item.client_price_sar * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-end px-6 py-3 bg-gray-50 border-t border-gray-200">
                   <div className="flex items-center gap-4 text-sm">
                       <span className="font-semibold text-gray-500 uppercase text-xs">Subtotal</span>
                       <span className="font-bold text-gray-800">{formatCurrency(tableSubtotal)}</span>
                   </div>
                </div>
            </div>
        );
    };

    return (
        <div ref={ref} className="bg-white text-gray-800 flex flex-col mx-auto shadow-2xl relative overflow-hidden" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Inter', sans-serif" }}>
            {/* Top Accent Bar */}
            <div className="h-2 w-full" style={{ backgroundColor: details.primaryColor }}></div>
            
            <div className="p-12 flex flex-col flex-grow relative z-10 pb-0">
                {/* Header Content */}
                <header className="flex justify-between items-start mb-12">
                    <div className="w-1/2">
                        {details.companyLogo ? (
                            <img src={details.companyLogo} alt="Company Logo" className="max-h-16 object-contain mb-4" />
                        ) : (
                            <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-gray-900">{details.companyName}</h1>
                        )}
                         <div className="text-gray-500 text-sm font-medium space-y-1">
                            {details.companyAddress && <p>{details.companyAddress}</p>}
                            {details.website && <p>{details.website}</p>}
                            {details.contactEmail && <p>{details.contactEmail}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black tracking-tight text-gray-900/10 mb-2 uppercase">Quotation</h2>
                        <div className="inline-block text-right">
                            <div className="mb-2">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</span>
                                <span className="text-lg font-bold text-gray-800">{details.quotationId}</span>
                            </div>
                            <div className="flex gap-8 justify-end">
                                <div>
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Date</span>
                                    <span className="text-sm font-medium">{new Date().toLocaleDateString('en-GB')}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Valid Until</span>
                                    <span className="text-sm font-medium">{details.validUntil}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Client & Event Info */}
                <section className="grid grid-cols-2 gap-12 mb-12 pb-8 border-b border-gray-100">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                            <UsersIcon className="h-3 w-3" /> Prepared For
                        </p>
                        <p className="text-xl font-bold text-gray-900">{event.clientName}</p>
                        <p className="text-sm text-gray-500 mt-1">{event.clientContact}</p>
                    </div>
                    
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2 justify-end">
                            <CalendarIcon className="h-3 w-3" /> Event Details
                        </p>
                        <p className="text-xl font-bold text-gray-900">{event.name}</p>
                        <div className="text-sm text-gray-500 mt-1 flex flex-col items-end">
                             <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3 opacity-50"/> {event.date}</span>
                             <span className="flex items-center gap-1.5"><MapPinIcon className="h-3 w-3 opacity-50"/> {event.location}</span>
                        </div>
                    </div>
                </section>

                {/* Line Items Table */}
                <section className="flex-grow">
                    {Object.entries(groupedItems).map(([title, items]) => renderItemsTable(title, items as CostTrackerItem[]))}
                </section>
                
                {/* Financial Summary */}
                <section className="flex justify-end mb-16 break-inside-avoid">
                     <div className="w-full max-w-sm bg-gray-50 rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(calculations.subtotal)}</span>
                            </div>
                             <div className="flex justify-between text-gray-600">
                                <span>VAT ({details.taxRate}%)</span>
                                <span>{formatCurrency(calculations.salesTax)}</span>
                            </div>
                            {details.otherCharges.amount !== 0 && (
                                 <div className="flex justify-between text-gray-600">
                                    <span>{details.otherCharges.description}</span>
                                    <span>{formatCurrency(calculations.other)}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-end">
                                <span className="font-bold text-lg text-gray-900">Grand Total</span>
                                <span className="font-black text-2xl" style={{ color: details.primaryColor }}>{formatCurrency(calculations.total)}</span>
                            </div>
                        </div>
                     </div>
                </section>

                {/* Terms */}
                <div className="mt-auto break-inside-avoid">
                    <section className="grid grid-cols-2 gap-12 text-xs text-gray-500 border-t border-gray-200 pt-8 mb-8">
                        <div>
                            <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">Terms & Conditions</h4>
                            <p className="whitespace-pre-line leading-relaxed">{details.termsAndConditions}</p>
                        </div>
                        <div className="flex flex-col justify-end">
                                <div className="border-b border-gray-300 h-12 w-full mb-2"></div>
                                <div className="flex justify-between font-medium text-gray-400">
                                    <span>Date</span>
                                    <span>Authorized Signature</span>
                                </div>
                        </div>
                    </section>

                    {/* Custom Footer recreating the "Safe Integrated" branding */}
                    <footer className="w-full mt-auto relative">
                        <div className="flex w-full h-28 items-stretch">
                            {/* Left Cyan Strip */}
                            <div className="w-8 bg-[#00ADEF] flex-shrink-0"></div>
                            
                            {/* Dark Blue Body */}
                            <div className="flex-grow bg-[#050A30] flex items-center px-8 relative overflow-hidden">
                                {/* "SiTE" Logo Approximation */}
                                <div className="text-white z-10">
                                    <div className="font-black text-6xl tracking-tighter flex items-center gap-1">
                                        <span>S</span>
                                        <span className="text-[#00ADEF]">i</span>
                                        <span>TE</span>
                                    </div>
                                </div>
                                
                                {/* Angled Cyan Slice */}
                                <div className="absolute top-0 right-0 h-full w-24 bg-[#00ADEF] transform skew-x-[20deg] translate-x-10"></div>
                            </div>

                            {/* Right White Body */}
                            <div className="w-[45%] bg-gray-50 flex flex-col justify-center items-end pr-8 pl-4 relative">
                                {/* Triangle overlay to create the angle effect from the dark section */}
                                <div className="absolute top-0 left-0 bottom-0 w-12 bg-[#050A30] transform -skew-x-[20deg] -translate-x-6"></div>
                                
                                <div className="relative z-10 text-right">
                                    <h2 className="text-xl font-bold text-[#050A30] mb-0" style={{fontFamily: "serif"}}>مؤسسة آمنة متكاملة للتجارة</h2>
                                    <h3 className="text-[#00ADEF] font-bold text-xs uppercase tracking-wider mb-2">Safe Integrated Trading Establishment</h3>
                                    
                                    <div className="flex justify-end gap-6 text-[10px] font-bold text-[#050A30]">
                                        <span className="flex items-center gap-1">CR: <span className="font-mono text-sm">2050178705</span></span>
                                        <span className="flex items-center gap-1">VAT: <span className="font-mono text-sm">311080699100003</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
});
