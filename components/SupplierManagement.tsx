
// components/SupplierManagement.tsx
import React, { useState, useMemo, useEffect } from 'react';
import type { Supplier, ProcurementDocument, AppSettings, User, AIInteraction, EventItem } from '../types';
import { MenuIcon, PlusIcon, BoltIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, UploadIcon, SparkleIcon, EyeIcon, StarIcon, ChartBarIcon, RefreshIcon, ExpandIcon, CreditCardIcon, CalendarIcon } from './common/icons'; 
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { InlineSpinner } from './common/LoadingSpinner';
import { analyzeProcurementDocument } from '../services/geminiService';
import { ProgressBar } from './common/ProgressBar';

interface SupplierManagementProps {
    suppliers: Supplier[];
    documents: ProcurementDocument[];
    events: EventItem[];
    user: User;
    settings: AppSettings;
    onMenuClick: () => void;
    onAddDocument: (doc: ProcurementDocument) => void;
    onUpdateDocument: (id: string, data: Partial<ProcurementDocument>) => void;
    onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
    onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
    setError: (msg: any) => void;
    setSuccess: (msg: string) => void;
}

const KPICard = ({ title, value, subtext, color }: any) => (
    <div className="p-4 rounded-xl border backdrop-blur-xl shadow-sm transition-all hover:-translate-y-1" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 text-[var(--text-secondary-color)]">{title}</h4>
        <div className="mt-2 text-2xl font-bold" style={{ color: color || 'var(--text-primary-color)' }}>{value}</div>
        {subtext && <p className="text-xs opacity-60 mt-1 text-[var(--text-secondary-color)]">{subtext}</p>}
    </div>
);

const VarianceBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'FULL_MATCH': return <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded border border-green-500/30 uppercase flex items-center gap-1 w-fit"><CheckCircleIcon className="h-3 w-3"/> Match</span>;
        case 'MINOR_VARIANCE': return <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded border border-yellow-500/30 uppercase flex items-center gap-1 w-fit"><BoltIcon className="h-3 w-3"/> Minor Var</span>;
        case 'MAJOR_DISCREPANCY': return <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded border border-red-500/30 uppercase flex items-center gap-1 w-fit"><XCircleIcon className="h-3 w-3"/> Discrepancy</span>;
        case 'NO_PO_FOUND': return <span className="bg-slate-500/20 text-slate-400 text-[10px] font-bold px-2 py-1 rounded border border-slate-500/30 uppercase w-fit">Orphan</span>;
        default: return <span className="bg-slate-500/20 text-slate-400 text-[10px] font-bold px-2 py-1 rounded border border-slate-500/30 uppercase w-fit">{status?.replace('_', ' ') || 'Processing'}</span>;
    }
};

export const SupplierManagement: React.FC<SupplierManagementProps> = ({ 
    suppliers, documents, events, user, settings, onMenuClick, onAddDocument, onUpdateDocument, onUpdateEvent, onLogAIInteraction, setError, setSuccess 
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'documents' | 'payments'>('dashboard');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<ProcurementDocument | null>(null);
    
    // Expanded Card State
    const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);

    // Upload State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadType, setUploadType] = useState<'Invoice' | 'Quote' | 'Purchase Order'>('Invoice');
    const [uploadPoRef, setUploadPoRef] = useState('');
    const [uploadEventRef, setUploadEventRef] = useState(''); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let interval: any;
        if (isProcessing) {
          setProgress(10);
          interval = setInterval(() => {
            setProgress((prev) => (prev < 90 ? prev + Math.random() * 15 : prev));
          }, 600);
        } else if (!isProcessing && progress > 0) {
            setProgress(100);
            setTimeout(() => setProgress(0), 500);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    // Computed Stats
    const totalSpend = documents.reduce((sum, d) => sum + (d.gemini_results?.extracted_details?.total_amount || 0), 0);
    const pendingCount = documents.filter(d => d.gemini_status === 'Pending' || d.gemini_status === 'Processing' || d.payment_status === 'Unpaid').length;
    const flaggedCount = documents.filter(d => d.gemini_results?.reconciliation_match?.match_status === 'MAJOR_DISCREPANCY').length;

    // Payment Stats
    const paymentStats = useMemo(() => {
        const invoices = documents.filter(d => d.document_type === 'Invoice');
        return {
            outstanding: invoices.filter(d => d.payment_status === 'Unpaid').reduce((sum, d) => sum + (d.gemini_results?.extracted_details.total_amount || 0), 0),
            scheduled: invoices.filter(d => d.payment_status === 'Scheduled').reduce((sum, d) => sum + (d.gemini_results?.extracted_details.total_amount || 0), 0),
            paid: invoices.filter(d => d.payment_status === 'Paid').reduce((sum, d) => sum + (d.gemini_results?.extracted_details.total_amount || 0), 0),
        };
    }, [documents]);

    // Identify Linked PO for Selected Doc (for Reconciliation View)
    const linkedPO = useMemo(() => {
        if (!selectedDoc || !selectedDoc.related_po_id) return null;
        return documents.find(d => 
            d.document_type === 'Purchase Order' && 
            (d.document_number.trim() === selectedDoc.related_po_id.trim() || d.document_id === selectedDoc.related_po_id)
        );
    }, [selectedDoc, documents]);

    // Compute Supplier KPIs
    const supplierStats = useMemo(() => {
        return suppliers.map(s => {
            const supplierDocs = documents.filter(d => d.supplier_id === s.supplier_id);
            const totalSpend = supplierDocs.reduce((sum, d) => sum + (d.gemini_results?.extracted_details?.total_amount || 0), 0);
            
            // Calculate Avg Processing Time (Upload Date to Payment Date)
            const paidDocs = supplierDocs.filter(d => d.payment_status === 'Paid' && d.payment_date && d.upload_date);
            let avgProcessingTime = 0;
            if (paidDocs.length > 0) {
                const totalDays = paidDocs.reduce((sum, d) => {
                    const start = new Date(d.upload_date).getTime();
                    const end = new Date(d.payment_date!).getTime();
                    const days = (end - start) / (1000 * 60 * 60 * 24);
                    return sum + Math.max(0, days);
                }, 0);
                avgProcessingTime = Math.round(totalDays / paidDocs.length);
            }

            return {
                ...s,
                totalSpend,
                avgProcessingTime,
                documentCount: supplierDocs.length,
                lastActive: supplierDocs.length > 0 
                    ? supplierDocs.sort((a,b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())[0].upload_date
                    : null
            };
        }).sort((a, b) => b.totalSpend - a.totalSpend);
    }, [suppliers, documents]);

    const handleProcessDocument = async () => {
        if (!uploadFile) return;
        setIsProcessing(true);
        try {
            const docId = `doc-${Date.now()}`;
            // Create initial doc entry
            const newDoc: ProcurementDocument = {
                document_id: docId,
                document_type: uploadType,
                document_number: 'Processing...',
                file_url: URL.createObjectURL(uploadFile), // In real app, upload to storage first
                upload_date: new Date().toISOString(),
                gemini_status: 'Processing',
                payment_status: 'Unpaid',
                related_po_id: uploadType === 'Invoice' ? uploadPoRef : undefined,
                related_event_id: uploadEventRef || undefined
            };
            
            // SMART PO LOOKUP: Contextual matching against existing POs in system state
            let poContext = undefined;
            if (uploadType === 'Invoice' && uploadPoRef) {
                const existingPO = documents.find(d => 
                    d.document_type === 'Purchase Order' && 
                    (d.document_number.trim().toLowerCase() === uploadPoRef.trim().toLowerCase())
                );

                if (existingPO && existingPO.gemini_results) {
                     poContext = {
                        poNumber: existingPO.document_number,
                        totalAmount: existingPO.gemini_results.extracted_details.total_amount,
                        lineItems: existingPO.gemini_results.extracted_details.line_items
                    };
                }
            }

            const { analysis, fullPrompt } = await analyzeProcurementDocument(uploadFile, uploadType, poContext);
            
            // Determine status based on match logic
            let finalStatus: any = 'Verified';
            if (analysis.reconciliation_match.match_status === 'MAJOR_DISCREPANCY') finalStatus = 'Review Needed';
            if (analysis.reconciliation_match.match_status === 'NO_PO_FOUND' && uploadType === 'Invoice') finalStatus = 'Review Needed';
            if (analysis.extraction_status === 'FAILED') finalStatus = 'Rejected';

            // Attempt to auto-match supplier if not provided or inferred
            let supplierId = 'sup-001'; // Default fallback
            if (analysis.extracted_details.supplier_name) {
                const matchedSupplier = suppliers.find(s => s.name.toLowerCase().includes(analysis.extracted_details.supplier_name.toLowerCase()));
                if (matchedSupplier) supplierId = matchedSupplier.supplier_id;
            }

            const processedDoc: ProcurementDocument = {
                ...newDoc,
                document_number: analysis.extracted_details.document_number || 'Unknown',
                supplier_id: supplierId, 
                gemini_status: finalStatus,
                gemini_results: analysis,
                related_po_id: newDoc.related_po_id || analysis.reconciliation_match.related_po_number
            };
            
            onAddDocument(processedDoc);
            onLogAIInteraction({
                feature: 'procurement_analysis',
                promptSummary: `Analyze ${uploadType} from file`,
                fullPrompt: fullPrompt,
                response: JSON.stringify(analysis),
                model: 'gemini-2.5-pro'
            });
            
            setSuccess(`${uploadType} processed successfully. Status: ${finalStatus}`);
            setIsUploadModalOpen(false);
            setUploadFile(null);
            setUploadPoRef('');
            setUploadEventRef('');

        } catch (e) {
            setError(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = () => {
        if (selectedDoc) {
            onUpdateDocument(selectedDoc.document_id, { 
                gemini_status: 'Verified', 
                payment_status: 'Scheduled',
                payment_date: new Date().toISOString() 
            });

            // Automated Cost Integration
            if (selectedDoc.related_event_id && selectedDoc.gemini_results && selectedDoc.document_type === 'Invoice') {
                const event = events.find(e => e.eventId === selectedDoc.related_event_id);
                if (event) {
                    const newCostItems = selectedDoc.gemini_results.extracted_details.line_items.map((li, idx) => ({
                        itemId: `cost-auto-${selectedDoc.document_id}-${idx}`,
                        name: li.description,
                        description: `Sourced from Invoice #${selectedDoc.document_number} (${selectedDoc.gemini_results?.extracted_details.supplier_name})`,
                        quantity: li.quantity,
                        unit_cost_sar: li.unit_price,
                        client_price_sar: 0, 
                        costType: 'Variable'
                    }));

                    const updatedTracker = [...event.cost_tracker, ...newCostItems];
                    onUpdateEvent(event.eventId, { cost_tracker: updatedTracker as any[] });
                    setSuccess("Document approved and costs integrated into Event Budget.");
                } else {
                    setSuccess("Document approved.");
                }
            } else {
                setSuccess("Document approved.");
            }
            
            setIsReconcileModalOpen(false);
        }
    };

    const handleReject = () => {
        if (selectedDoc) {
             onUpdateDocument(selectedDoc.document_id, { gemini_status: 'Rejected', payment_status: 'Cancelled' });
             setSuccess("Document rejected.");
             setIsReconcileModalOpen(false);
        }
    };
    
    const handleUpdatePaymentStatus = (docId: string, status: 'Paid' | 'Scheduled' | 'Cancelled' | 'Unpaid') => {
        onUpdateDocument(docId, {
            payment_status: status,
            payment_date: status === 'Paid' ? new Date().toISOString() : undefined
        });
        setSuccess(`Invoice payment status updated to: ${status}`);
    };

    // Helper to format currency
    const formatMoney = (amount: number) => `SAR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    return (
        <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Supplier Management</h1>
                </div>
                <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 bg-[var(--primary-accent-color)] text-white font-bold rounded-lg shadow-lg hover:opacity-90 flex items-center gap-2 transition-transform active:scale-95"
                >
                    <UploadIcon className="h-5 w-5" /> Process Document
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in-item">
                <KPICard title="Total Spend (YTD)" value={formatMoney(totalSpend)} color="var(--primary-accent-color)" />
                <KPICard title="Outstanding Payments" value={formatMoney(paymentStats.outstanding)} color="#f59e0b" />
                <KPICard title="Review Flagged" value={flaggedCount.toString()} color="#ef4444" subtext="Requires Attention" />
                <KPICard title="Active Suppliers" value={suppliers.length.toString()} color="var(--text-primary-color)" />
            </div>

            {/* Main Content Area */}
            <div className="flex-grow bg-black/20 rounded-xl border border-white/5 p-6 overflow-hidden flex flex-col animate-in-item" style={{animationDelay: '100ms'}}>
                <div className="flex gap-6 border-b border-white/10 mb-4 overflow-x-auto">
                    <button onClick={() => setActiveTab('dashboard')} className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>Dashboard & Alerts</button>
                    <button onClick={() => setActiveTab('payments')} className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'payments' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>Payment Tracker</button>
                    <button onClick={() => setActiveTab('suppliers')} className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'suppliers' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>Suppliers & Performance</button>
                    <button onClick={() => setActiveTab('documents')} className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>All Documents</button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            {flaggedCount > 0 && (
                                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                                    <h3 className="text-red-400 font-bold flex items-center gap-2 mb-3">
                                        <BoltIcon className="h-5 w-5" /> Attention Required ({flaggedCount})
                                    </h3>
                                    <div className="space-y-2">
                                        {documents.filter(d => d.gemini_results?.reconciliation_match?.match_status === 'MAJOR_DISCREPANCY').map(doc => (
                                            <div key={doc.document_id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-black/30 rounded-lg border border-red-500/20 hover:bg-black/50 cursor-pointer transition-colors gap-3" onClick={() => { setSelectedDoc(doc); setIsReconcileModalOpen(true); }}>
                                                <div>
                                                    <p className="font-bold text-white">{doc.gemini_results?.extracted_details.supplier_name || 'Unknown Supplier'}</p>
                                                    <p className="text-xs text-red-300 mt-1">{doc.gemini_results?.reconciliation_match.variance_reason}</p>
                                                </div>
                                                <div className="text-left sm:text-right w-full sm:w-auto">
                                                    <p className="text-sm font-mono text-white">{formatMoney(doc.gemini_results?.extracted_details.total_amount || 0)}</p>
                                                    <span className="text-[10px] uppercase font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded mt-1 inline-block">Review Discrepancy</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary-color)] mb-4">Recent Activity</h3>
                                <div className="space-y-2">
                                    {documents.slice(0, 5).map(doc => (
                                        <div key={doc.document_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => { setSelectedDoc(doc); setIsReconcileModalOpen(true); }}>
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded bg-black/30 border border-white/10">
                                                    <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{doc.document_type} <span className="font-mono font-normal opacity-70">#{doc.document_number}</span></p>
                                                    <p className="text-xs text-[var(--text-secondary-color)]">{new Date(doc.upload_date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-mono font-medium hidden sm:inline">{formatMoney(doc.gemini_results?.extracted_details.total_amount || 0)}</span>
                                                <VarianceBadge status={doc.gemini_results?.reconciliation_match?.match_status || ''} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'payments' && (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-xl">
                                     <p className="text-xs font-bold uppercase text-red-300">Outstanding Liabilities</p>
                                     <p className="text-2xl font-bold text-white mt-1">{formatMoney(paymentStats.outstanding)}</p>
                                 </div>
                                 <div className="p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-xl">
                                     <p className="text-xs font-bold uppercase text-yellow-300">Scheduled Payments</p>
                                     <p className="text-2xl font-bold text-white mt-1">{formatMoney(paymentStats.scheduled)}</p>
                                 </div>
                                  <div className="p-4 bg-green-900/20 border border-green-500/20 rounded-xl">
                                     <p className="text-xs font-bold uppercase text-green-300">Total Paid</p>
                                     <p className="text-2xl font-bold text-white mt-1">{formatMoney(paymentStats.paid)}</p>
                                 </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-black/20 border-b border-white/10 text-[var(--text-secondary-color)]">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Invoice #</th>
                                            <th className="px-4 py-3 text-left">Supplier</th>
                                            <th className="px-4 py-3 text-left">Due Date</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {documents
                                            .filter(d => d.document_type === 'Invoice')
                                            .sort((a, b) => new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime())
                                            .map(doc => (
                                            <tr key={doc.document_id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs opacity-80">{doc.document_number}</td>
                                                <td className="px-4 py-3 font-bold text-white">{doc.gemini_results?.extracted_details.supplier_name || 'Unknown'}</td>
                                                <td className="px-4 py-3 text-[var(--text-secondary-color)]">
                                                    {doc.due_date ? new Date(doc.due_date).toLocaleDateString() : <span className="italic opacity-50">Not Set</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono">{formatMoney(doc.gemini_results?.extracted_details.total_amount || 0)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                                        doc.payment_status === 'Paid' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                                                        doc.payment_status === 'Scheduled' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                        doc.payment_status === 'Cancelled' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                                    }`}>
                                                        {doc.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {doc.payment_status !== 'Paid' && doc.payment_status !== 'Cancelled' && (
                                                            <>
                                                                {doc.payment_status === 'Unpaid' && (
                                                                     <button onClick={() => handleUpdatePaymentStatus(doc.document_id, 'Scheduled')} className="p-1.5 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 transition" title="Schedule Payment">
                                                                         <CalendarIcon className="h-4 w-4" />
                                                                     </button>
                                                                )}
                                                                <button onClick={() => handleUpdatePaymentStatus(doc.document_id, 'Paid')} className="p-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition" title="Mark as Paid">
                                                                    <CreditCardIcon className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {doc.payment_status !== 'Cancelled' && (
                                                             <button onClick={() => handleUpdatePaymentStatus(doc.document_id, 'Cancelled')} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition" title="Cancel Invoice">
                                                                <XCircleIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'suppliers' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {supplierStats.map(s => {
                                const isExpanded = expandedSupplierId === s.supplier_id;
                                return (
                                    <div 
                                        key={s.supplier_id} 
                                        className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer bg-black/20 hover:bg-black/30 ${isExpanded ? 'border-[var(--primary-accent-color)] ring-1 ring-[var(--primary-accent-color)] col-span-1 md:col-span-2' : 'border-white/10'}`}
                                        onClick={() => setExpandedSupplierId(isExpanded ? null : s.supplier_id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[var(--primary-accent-color)]/20 flex items-center justify-center text-[var(--primary-accent-color)] font-bold">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">{s.name}</h4>
                                                    <p className="text-xs text-[var(--text-secondary-color)]">{s.category}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs uppercase tracking-wider text-[var(--text-secondary-color)]">Spend</p>
                                                <p className="font-mono font-bold text-white">{formatMoney(s.totalSpend)}</p>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in-item">
                                                <div>
                                                    <p className="text-xs text-[var(--text-secondary-color)] uppercase mb-1">Performance</p>
                                                    <div className="flex items-center gap-1 text-yellow-400">
                                                        <span className="text-xl font-bold">{s.performance_rating.toFixed(1)}</span>
                                                        <StarIcon className="h-4 w-4 fill-current" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[var(--text-secondary-color)] uppercase mb-1">Processing Time</p>
                                                    <p className="text-white font-medium">{s.avgProcessingTime} Days Avg</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[var(--text-secondary-color)] uppercase mb-1">Documents</p>
                                                    <p className="text-white font-medium">{s.documentCount} Records</p>
                                                </div>
                                                <div className="col-span-1 md:col-span-3">
                                                    <p className="text-xs text-[var(--text-secondary-color)] uppercase mb-2">Contact Details</p>
                                                    <div className="flex gap-4 text-sm text-white">
                                                        <span>{s.contact_email}</span>
                                                        <span>{s.payment_terms}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                         <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-black/20 border-b border-white/10 text-[var(--text-secondary-color)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-left">Ref #</th>
                                        <th className="px-4 py-3 text-left">Supplier</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-center">Match Status</th>
                                        <th className="px-4 py-3 text-center">Payment</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {documents.map(doc => (
                                        <tr key={doc.document_id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => { setSelectedDoc(doc); setIsReconcileModalOpen(true); }}>
                                            <td className="px-4 py-3">{doc.document_type}</td>
                                            <td className="px-4 py-3 font-mono opacity-80">{doc.document_number}</td>
                                            <td className="px-4 py-3 font-medium">{doc.gemini_results?.extracted_details.supplier_name || '-'}</td>
                                            <td className="px-4 py-3 text-right font-mono">{formatMoney(doc.gemini_results?.extracted_details.total_amount || 0)}</td>
                                            <td className="px-4 py-3 text-center"><VarianceBadge status={doc.gemini_results?.reconciliation_match.match_status || ''} /></td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${doc.payment_status === 'Paid' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>{doc.payment_status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button className="text-[var(--primary-accent-color)] hover:text-white text-xs font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">Review</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <Modal title="Process Procurement Document" onClose={() => setIsUploadModalOpen(false)} onSave={handleProcessDocument} saveText={isProcessing ? "Processing..." : "Analyze Document"} size="lg">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-1">Document Type</label>
                                <select value={uploadType} onChange={(e: any) => setUploadType(e.target.value)} className="w-full p-2 rounded bg-black/10 border border-white/10 text-[var(--text-primary-color)]">
                                    <option>Invoice</option>
                                    <option>Quote</option>
                                    <option>Purchase Order</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-1">Link to Event (Optional)</label>
                                <select value={uploadEventRef} onChange={(e: any) => setUploadEventRef(e.target.value)} className="w-full p-2 rounded bg-black/10 border border-white/10 text-[var(--text-primary-color)]">
                                    <option value="">-- Select Event --</option>
                                    {events.filter(e => e.status !== 'Completed' && e.status !== 'Canceled').map(e => (
                                        <option key={e.eventId} value={e.eventId}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                            {uploadType === 'Invoice' && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-1">Related PO # (Optional)</label>
                                    <input type="text" value={uploadPoRef} onChange={e => setUploadPoRef(e.target.value)} className="w-full p-2 rounded bg-black/10 border border-white/10 text-[var(--text-primary-color)]" placeholder="e.g. PO-2023-100" />
                                </div>
                            )}
                        </div>

                        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                            <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.png,.jpeg" />
                            {uploadFile ? (
                                <div className="text-[var(--primary-accent-color)] font-bold flex flex-col items-center">
                                    <DocumentTextIcon className="h-10 w-10 mb-2" />
                                    {uploadFile.name}
                                </div>
                            ) : (
                                <div className="text-[var(--text-secondary-color)] flex flex-col items-center">
                                    <UploadIcon className="h-10 w-10 mb-2 opacity-50" />
                                    <p>Drag & Drop or Click to Upload</p>
                                    <p className="text-xs opacity-50 mt-1">PDF, PNG, JPG (Max 10MB)</p>
                                </div>
                            )}
                        </div>

                        {isProcessing && (
                            <div className="flex flex-col items-center justify-center py-4">
                                <InlineSpinner />
                                <p className="text-sm text-purple-400 mt-2 animate-pulse">Gemini 2.5 Pro is extracting and reconciling...</p>
                                <div className="w-64 mt-4">
                                    <ProgressBar progress={progress} label="Processing" />
                                </div>
                            </div>
                        )}
                        <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg text-xs text-blue-300 flex gap-2">
                             <SparkleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                             <p>Gemini will perform OCR to extract line items, totals, and supplier details. If a PO number is provided, it will perform a 3-way match analysis.</p>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Reconciliation Workbench Modal */}
            {isReconcileModalOpen && selectedDoc && (
                <Modal title="Reconciliation Workbench" onClose={() => setIsReconcileModalOpen(false)} size="full" footer={null}>
                    <div className="flex flex-col lg:flex-row h-[80vh] gap-6">
                        {/* Left: Source Document */}
                        <div className="lg:w-1/2 bg-black/50 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden relative group">
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white z-10 border border-white/10">Original Source</div>
                            {selectedDoc.file_url ? (
                                <img src={selectedDoc.file_url} alt="Doc" className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="text-center opacity-50">
                                    <DocumentTextIcon className="h-16 w-16 mx-auto mb-2" />
                                    <p>Preview Unavailable</p>
                                </div>
                            )}
                        </div>

                        {/* Right: Analysis & Actions */}
                        <div className="lg:w-1/2 flex flex-col overflow-hidden">
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 pr-2">
                                {/* Match Status Banner */}
                                <div className={`p-4 rounded-xl border flex items-center gap-4 ${selectedDoc.gemini_results?.reconciliation_match.match_status === 'FULL_MATCH' ? 'bg-green-900/20 border-green-500/30' : selectedDoc.gemini_results?.reconciliation_match.match_status === 'NO_PO_FOUND' ? 'bg-slate-800 border-slate-600' : 'bg-red-900/20 border-red-500/30'}`}>
                                    <div className={`p-2 rounded-full ${selectedDoc.gemini_results?.reconciliation_match.match_status === 'FULL_MATCH' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white'}`}>
                                        {selectedDoc.gemini_results?.reconciliation_match.match_status === 'FULL_MATCH' ? <CheckCircleIcon className="h-6 w-6" /> : <BoltIcon className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{selectedDoc.gemini_results?.reconciliation_match.match_status.replace('_', ' ')}</h3>
                                        <p className="text-sm opacity-80 text-white">{selectedDoc.gemini_results?.reconciliation_match.variance_reason}</p>
                                    </div>
                                </div>

                                {/* Financial Comparison Grid (If Linked PO Exists) */}
                                {linkedPO && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-3 rounded bg-black/30 border border-white/10">
                                            <span className="text-[10px] uppercase text-slate-400 tracking-wider font-bold">PO Total</span>
                                            <p className="text-lg font-mono text-blue-300 font-bold mt-1">
                                                {formatMoney(linkedPO.gemini_results?.extracted_details.total_amount || 0)}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded bg-black/30 border border-white/10">
                                            <span className="text-[10px] uppercase text-slate-400 tracking-wider font-bold">Invoice Total</span>
                                            <p className={`text-lg font-mono font-bold mt-1 ${selectedDoc.gemini_results?.extracted_details.total_amount === linkedPO.gemini_results?.extracted_details.total_amount ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {formatMoney(selectedDoc.gemini_results?.extracted_details.total_amount || 0)}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded bg-black/30 border border-white/10">
                                            <span className="text-[10px] uppercase text-slate-400 tracking-wider font-bold">Variance</span>
                                            <p className={`text-lg font-mono font-bold mt-1 ${selectedDoc.gemini_results?.reconciliation_match.total_variance_amount === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {formatMoney(selectedDoc.gemini_results?.reconciliation_match.total_variance_amount || 0)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Variance Detail Alert */}
                                {selectedDoc.gemini_results?.reconciliation_match.total_variance_amount !== 0 && selectedDoc.gemini_results?.reconciliation_match.match_status !== 'NO_PO_FOUND' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                                        <span className="font-bold">Variance Detected:</span> The invoice differs from the PO by {formatMoney(selectedDoc.gemini_results?.reconciliation_match.total_variance_amount || 0)}. Please review line items below.
                                    </div>
                                )}

                                {/* Extracted Details Card */}
                                <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] mb-4 flex items-center gap-2"><SparkleIcon className="h-4 w-4 text-purple-400"/> AI Extraction Data</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="opacity-60 text-[var(--text-secondary-color)]">Supplier</p>
                                            <p className="font-bold text-white">{selectedDoc.gemini_results?.extracted_details.supplier_name}</p>
                                        </div>
                                        <div>
                                            <p className="opacity-60 text-[var(--text-secondary-color)]">Doc Number</p>
                                            <p className="font-mono text-white">{selectedDoc.gemini_results?.extracted_details.document_number}</p>
                                        </div>
                                        <div>
                                            <p className="opacity-60 text-[var(--text-secondary-color)]">Date</p>
                                            <p className="text-white">{selectedDoc.gemini_results?.extracted_details.document_date}</p>
                                        </div>
                                        <div>
                                            <p className="opacity-60 text-[var(--text-secondary-color)]">Total</p>
                                            <p className="font-bold text-lg text-green-400">{formatMoney(selectedDoc.gemini_results?.extracted_details.total_amount || 0)}</p>
                                        </div>
                                        {selectedDoc.related_event_id && (
                                             <div className="col-span-2 border-t border-white/10 pt-2 mt-2">
                                                <p className="opacity-60 text-[var(--text-secondary-color)]">Linked Event</p>
                                                <p className="text-white font-medium">{events.find(e => e.eventId === selectedDoc.related_event_id)?.name || 'Unknown Event'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] mb-2">Line Items</h4>
                                    <div className="border border-white/10 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-black/30 text-[var(--text-secondary-color)]">
                                                <tr>
                                                    <th className="p-3">Description</th>
                                                    <th className="p-3 text-center">Qty</th>
                                                    <th className="p-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {selectedDoc.gemini_results?.extracted_details.line_items.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="p-3 text-white">{item.description}</td>
                                                        <td className="p-3 text-center text-[var(--text-secondary-color)]">{item.quantity}</td>
                                                        <td className="p-3 text-right text-white font-mono">{item.total.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="pt-4 border-t border-white/10 flex gap-3 mt-auto bg-[var(--card-container-color)] sticky bottom-0">
                                <button onClick={handleReject} className="flex-1 py-3 bg-red-600/20 text-red-400 font-bold rounded-lg border border-red-600/30 hover:bg-red-600/30 transition">
                                    Reject / Flag
                                </button>
                                <button onClick={handleApprove} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg transition flex items-center justify-center gap-2">
                                    Approve & Pay
                                    {selectedDoc.related_event_id && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">+ Cost Integration</span>}
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
