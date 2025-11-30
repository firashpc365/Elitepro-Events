
// components/Reports.tsx
import React, { useMemo, useState, useRef } from 'react';
import type { EventItem, ServiceItem, User } from '../types';
import { MenuIcon, DownloadIcon, UploadIcon, ChartBarIcon, UsersIcon, DocumentTextIcon, SparkleIcon, TrendingUpIcon, CreditCardIcon } from './common/icons';
import { BarChart } from './common/BarChart';
import { Modal } from './common/Modal';
import { ConfirmationModal } from './common/ConfirmationModal';
import { generateReportInsight } from '../services/geminiService';
import { InlineSpinner } from './common/LoadingSpinner';

interface ReportsProps {
  events: EventItem[];
  services: ServiceItem[];
  users: User[];
  currentUser: User & { permissions: any };
  onMenuClick: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
}

const StatCard: React.FC<{ title: string, value: string, note?: string, color?: string }> = ({ title, value, note, color }) => (
    <div 
      className="p-4 rounded-lg border flex flex-col justify-between h-full"
      style={{ 
          backgroundColor: 'var(--card-container-color)',
          borderColor: 'var(--border-color)'
      }}
    >
      <div>
        <p className="text-sm font-medium opacity-80" style={{ color: 'var(--text-secondary-color)' }}>{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: color || 'var(--text-primary-color)' }}>{value}</p>
      </div>
      {note && <p className="text-xs mt-2 opacity-60" style={{ color: 'var(--text-secondary-color)' }}>{note}</p>}
    </div>
);

type ReportType = 'Executive Summary' | 'Sales Performance' | 'Commission Tracker' | 'Service Analytics';

export const Reports: React.FC<ReportsProps> = ({ events, services, users, currentUser, onMenuClick, onBackup, onRestore }) => {
    
    const [activeReport, setActiveReport] = useState<ReportType>('Executive Summary');
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [fileToRestore, setFileToRestore] = useState<File | null>(null);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    // AI State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- Data Processing ---

    const eventFinancials = useMemo(() => {
        return events.map(event => {
            const revenue = event.cost_tracker.reduce((sum, item) => sum + item.client_price_sar * item.quantity, 0);
            const cost = event.cost_tracker.reduce((sum, item) => sum + item.unit_cost_sar * item.quantity, 0);
            const profit = revenue - cost;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
            return { ...event, revenue, cost, profit, margin };
        });
    }, [events]);

    const completedEvents = useMemo(() => eventFinancials.filter(e => e.status === 'Completed'), [eventFinancials]);

    // 1. Executive Summary Data
    const overallStats = useMemo(() => {
        const totalRevenue = completedEvents.reduce((sum, e) => sum + e.revenue, 0);
        const totalProfit = completedEvents.reduce((sum, e) => sum + e.profit, 0);
        const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        return {
            completedCount: completedEvents.length,
            totalRevenue,
            totalProfit,
            overallMargin,
        };
    }, [completedEvents]);

    const monthlyPerformance = useMemo(() => {
        const months: { [key: string]: { revenue: number, profit: number } } = {};
        completedEvents.forEach(event => {
            const month = new Date(event.date).toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!months[month]) months[month] = { revenue: 0, profit: 0 };
            months[month].revenue += event.revenue;
            months[month].profit += event.profit;
        });
        return Object.entries(months)
            .map(([label, values]) => ({
                label,
                values: [
                    { value: values.revenue, color: 'var(--primary-accent-color)', label: 'Revenue' },
                    { value: values.profit, color: '#16a34a', label: 'Profit' },
                ],
            }))
            .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
    }, [completedEvents]);

    // 2. Sales Performance Data
    const salesPerformance = useMemo(() => {
        const salesStats: Record<string, { name: string, revenue: number, events: number, profit: number }> = {};
        
        eventFinancials.forEach(event => {
            // Include Confirmed and Completed for Sales Performance
            if (['Confirmed', 'Completed'].includes(event.status)) {
                 if (!salesStats[event.salespersonId]) {
                     const salesperson = users.find(u => u.userId === event.salespersonId);
                     salesStats[event.salespersonId] = { 
                         name: salesperson?.name || 'Unknown', 
                         revenue: 0, events: 0, profit: 0 
                     };
                 }
                 salesStats[event.salespersonId].revenue += event.revenue;
                 salesStats[event.salespersonId].profit += event.profit;
                 salesStats[event.salespersonId].events += 1;
            }
        });

        return Object.values(salesStats).sort((a, b) => b.revenue - a.revenue);
    }, [eventFinancials, users]);

    // Chart Data for Sales Performance
    const salesChartData = useMemo(() => {
        return salesPerformance.map(s => ({
            label: s.name,
            value: s.revenue,
            color: 'var(--primary-accent-color)'
        }));
    }, [salesPerformance]);

    // 3. Commission Tracker Data
    const commissionLedger = useMemo(() => {
        // Filter based on permissions: Admin sees all, Sales sees only their own
        const relevantEvents = currentUser.permissions.canViewFinancials 
            ? completedEvents 
            : completedEvents.filter(e => e.salespersonId === currentUser.userId);

        return relevantEvents.map(event => {
            const salesperson = users.find(u => u.userId === event.salespersonId);
            // Default to user's rate if event specific not set
            const rate = event.commissionRate ?? salesperson?.commissionRate ?? 0;
            const amount = event.profit * (rate / 100);
            
            return {
                eventId: event.eventId,
                eventName: event.name,
                date: event.date,
                salesperson: salesperson?.name || 'Unknown',
                salespersonId: event.salespersonId,
                profit: event.profit,
                rate,
                amount,
                status: event.commissionPaid ? 'Paid' : 'Pending'
            };
        }).filter(c => c.amount > 0).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [completedEvents, users, currentUser]);

    const commissionSummary = useMemo(() => {
        return commissionLedger.reduce((acc, item) => {
            acc.totalEarned += item.amount;
            if (item.status === 'Paid') acc.totalPaid += item.amount;
            else acc.totalPending += item.amount;
            return acc;
        }, { totalEarned: 0, totalPaid: 0, totalPending: 0 });
    }, [commissionLedger]);

    // 4. Service Analytics Data
    const serviceAnalytics = useMemo(() => {
        const stats: Record<string, { name: string, count: number, totalRevenue: number }> = {};
        
        completedEvents.forEach(event => {
            event.cost_tracker.forEach(item => {
                // Use masterServiceId to group variants, or name if ad-hoc
                const key = item.masterServiceId || item.name;
                if (!stats[key]) {
                    stats[key] = { name: item.name, count: 0, totalRevenue: 0 };
                }
                stats[key].count += 1; // Count occurrences in events
                stats[key].totalRevenue += (item.client_price_sar * item.quantity);
            });
        });

        return Object.values(stats).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10); // Top 10
    }, [completedEvents]);

    // Chart Data for Services
    const serviceChartData = useMemo(() => {
        return serviceAnalytics.map(s => ({
            label: s.name.length > 15 ? s.name.substring(0,15) + '...' : s.name,
            value: s.totalRevenue,
            color: 'var(--primary-accent-color)'
        }));
    }, [serviceAnalytics]);


    // --- Actions ---

    const handleRunAiAnalysis = async () => {
        setIsAiModalOpen(true);
        setIsAnalyzing(true);
        setAiAnalysis(null);
        
        try {
            let contextData: any = {};
            let reportTypeTitle = activeReport;

            switch (activeReport) {
                case 'Executive Summary':
                    contextData = { overallStats, monthlyTrends: monthlyPerformance.map(m => ({ month: m.label, ...m.values.reduce((acc, v) => ({...acc, [v.label]: v.value}), {}) })) };
                    break;
                case 'Sales Performance':
                    contextData = { salesLeaderboard: salesPerformance };
                    break;
                case 'Commission Tracker':
                    contextData = { summary: commissionSummary, recentTransactions: commissionLedger.slice(0, 5) };
                    break;
                case 'Service Analytics':
                    contextData = { topServices: serviceAnalytics };
                    break;
            }

            const { result } = await generateReportInsight(reportTypeTitle, contextData);
            setAiAnalysis(result);

        } catch (error) {
            setAiAnalysis("Failed to generate analysis. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExport = () => {
        const now = new Date().toISOString().split('T')[0];
        let csvContent = '';
        let filename = '';

        const arrayToCsv = (headers: string[], rows: any[]) => {
            const headerRow = headers.join(',') + '\n';
            const dataRows = rows.map(row => {
                return headers.map(header => {
                    const val = row[header] || '';
                    return `"${String(val).replace(/"/g, '""')}"`; // Escape quotes
                }).join(',');
            }).join('\n');
            return headerRow + dataRows;
        };

        switch (activeReport) {
            case 'Executive Summary':
                filename = `Executive_Summary_${now}.csv`;
                // Export monthly data as it's more tabular
                const monthlyRows = monthlyPerformance.map(m => ({
                    Month: m.label,
                    Revenue: m.values.find(v => v.label === 'Revenue')?.value || 0,
                    Profit: m.values.find(v => v.label === 'Profit')?.value || 0
                }));
                csvContent = arrayToCsv(['Month', 'Revenue', 'Profit'], monthlyRows);
                break;
            case 'Sales Performance':
                filename = `Sales_Performance_${now}.csv`;
                const salesRows = salesPerformance.map(s => ({
                    Name: s.name,
                    Events: s.events,
                    Revenue: s.revenue,
                    Profit: s.profit
                }));
                csvContent = arrayToCsv(['Name', 'Events', 'Revenue', 'Profit'], salesRows);
                break;
            case 'Commission Tracker':
                filename = `Commission_Tracker_${now}.csv`;
                const commRows = commissionLedger.map(c => ({
                    Date: new Date(c.date).toLocaleDateString(),
                    Salesperson: c.salesperson,
                    Event: c.eventName,
                    Profit: c.profit,
                    Rate: `${c.rate}%`,
                    Commission: c.amount,
                    Status: c.status
                }));
                csvContent = arrayToCsv(['Date', 'Salesperson', 'Event', 'Profit', 'Rate', 'Commission', 'Status'], commRows);
                break;
            case 'Service Analytics':
                filename = `Service_Analytics_${now}.csv`;
                const serviceRows = serviceAnalytics.map(s => ({
                    Service: s.name,
                    Count: s.count,
                    Revenue: s.totalRevenue
                }));
                csvContent = arrayToCsv(['Service', 'Count', 'Revenue'], serviceRows);
                break;
        }

        if (csvContent) {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };
    
    const handleRestoreClick = () => restoreInputRef.current?.click();
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToRestore(file);
            setIsRestoreModalOpen(false);
            event.target.value = '';
        }
    };

    const themedContainerStyle = {
      backgroundColor: 'var(--card-container-color)',
      borderColor: 'var(--border-color)',
      borderRadius: 'var(--border-radius)',
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Reports & Analytics</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleRunAiAnalysis} className="px-4 py-2 text-white font-semibold text-sm bg-purple-600 hover:bg-purple-700 rounded-lg shadow flex items-center gap-2 transition-all">
                        <SparkleIcon className="h-4 w-4" /> AI Analysis
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 text-white font-semibold text-sm bg-slate-600 hover:bg-slate-700 rounded-lg shadow flex items-center gap-2 transition-all">
                        <DownloadIcon className="h-4 w-4" /> Export CSV
                    </button>
                     <button onClick={onBackup} className="px-4 py-2 text-white font-semibold text-sm bg-blue-600 hover:bg-blue-700 rounded-lg shadow flex items-center gap-2 transition-all">
                        <DownloadIcon className="h-4 w-4" /> Backup
                    </button>
                    <button onClick={() => setIsRestoreModalOpen(true)} className="px-4 py-2 text-white font-semibold text-sm bg-red-600 hover:bg-red-700 rounded-lg shadow flex items-center gap-2 transition-all">
                        <UploadIcon className="h-4 w-4" /> Restore
                    </button>
                </div>
            </div>

            {/* Report Selector */}
            <div className="flex overflow-x-auto gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                {['Executive Summary', 'Sales Performance', 'Commission Tracker', 'Service Analytics'].map((rep) => (
                    <button
                        key={rep}
                        onClick={() => setActiveReport(rep as ReportType)}
                        className={`px-4 py-2 whitespace-nowrap text-sm font-medium rounded-lg transition-all ${activeReport === rep ? 'bg-[var(--primary-accent-color)] text-white shadow-md' : 'text-[var(--text-secondary-color)] hover:bg-white/5'}`}
                    >
                        {rep}
                    </button>
                ))}
            </div>

            {/* Report Content */}
            <div className="animate-in-item">
                
                {/* 1. Executive Summary */}
                {activeReport === 'Executive Summary' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <StatCard title="Completed Events" value={overallStats.completedCount.toString()} color="var(--text-primary-color)" />
                            <StatCard title="Total Revenue" value={`SAR ${overallStats.totalRevenue.toLocaleString()}`} color="var(--primary-accent-color)" />
                            <StatCard title="Total Profit" value={`SAR ${overallStats.totalProfit.toLocaleString()}`} color="#16a34a" />
                            <StatCard title="Profit Margin" value={`${overallStats.overallMargin.toFixed(1)}%`} color={overallStats.overallMargin > 20 ? '#16a34a' : '#f59e0b'} />
                        </div>
                        <div className="backdrop-blur-xl border shadow-lg p-4 rounded-xl" style={themedContainerStyle}>
                             <BarChart data={monthlyPerformance} title="Monthly Performance Trend" yAxisLabel="Amount (SAR)" />
                        </div>
                    </div>
                )}

                {/* 2. Sales Performance */}
                {activeReport === 'Sales Performance' && (
                     <div className="space-y-6">
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUpIcon className="h-5 w-5 text-[var(--primary-accent-color)]"/> Revenue Leaderboard</h3>
                                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                     {salesPerformance.map((sales, idx) => (
                                         <div key={idx} className="flex items-center justify-between p-3 bg-black/10 rounded-lg border border-white/5">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-[var(--primary-accent-color)]/20 text-[var(--primary-accent-color)] flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                                 <span className="font-semibold">{sales.name}</span>
                                             </div>
                                             <span className="font-bold">SAR {sales.revenue.toLocaleString()}</span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                             <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><ChartBarIcon className="h-5 w-5 text-[var(--primary-accent-color)]"/> Performance Visualization</h3>
                                <BarChart data={salesChartData} title="Revenue by Salesperson" yAxisLabel="Revenue (SAR)" />
                             </div>
                         </div>
                         {/* Event Count Grid */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {salesPerformance.sort((a,b) => b.events - a.events).map((sales, idx) => (
                                <div key={idx} className="p-4 rounded-lg border bg-black/10 flex items-center justify-between" style={{borderColor: 'var(--border-color)'}}>
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary-color)]">{sales.name}</p>
                                        <p className="text-xl font-bold">{sales.events} Events</p>
                                    </div>
                                    <UsersIcon className="h-8 w-8 text-[var(--primary-accent-color)] opacity-20" />
                                </div>
                            ))}
                         </div>
                     </div>
                )}

                {/* 3. Commission Tracker */}
                {activeReport === 'Commission Tracker' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Total Earned" value={`SAR ${commissionSummary.totalEarned.toLocaleString()}`} color="var(--text-primary-color)" />
                            <StatCard title="Paid Out" value={`SAR ${commissionSummary.totalPaid.toLocaleString()}`} color="#16a34a" />
                            <StatCard title="Pending Payment" value={`SAR ${commissionSummary.totalPending.toLocaleString()}`} color="#f59e0b" />
                        </div>
                        <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCardIcon className="h-5 w-5 text-[var(--primary-accent-color)]"/> Commission Ledger</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="border-b" style={{borderColor: 'var(--border-color)'}}>
                                        <tr>
                                            <th className="text-left py-3 px-4 opacity-70">Date</th>
                                            <th className="text-left py-3 px-4 opacity-70">Salesperson</th>
                                            <th className="text-left py-3 px-4 opacity-70">Event</th>
                                            <th className="text-right py-3 px-4 opacity-70">Profit</th>
                                            <th className="text-right py-3 px-4 opacity-70">Rate</th>
                                            <th className="text-right py-3 px-4 opacity-70">Commission</th>
                                            <th className="text-center py-3 px-4 opacity-70">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{borderColor: 'var(--border-color)'}}>
                                        {commissionLedger.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-black/5">
                                                <td className="py-3 px-4">{new Date(item.date).toLocaleDateString()}</td>
                                                <td className="py-3 px-4 font-medium">{item.salesperson}</td>
                                                <td className="py-3 px-4">{item.eventName}</td>
                                                <td className="py-3 px-4 text-right opacity-80">{Math.round(item.profit).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right opacity-80">{item.rate}%</td>
                                                <td className="py-3 px-4 text-right font-bold">SAR {item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.status === 'Paid' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {commissionLedger.length === 0 && (
                                            <tr><td colSpan={7} className="text-center py-8 opacity-50">No commission records found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Service Analytics */}
                {activeReport === 'Service Analytics' && (
                    <div className="space-y-6">
                         <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                             <BarChart data={serviceChartData} title="Top 10 Revenue Generating Services" yAxisLabel="Total Revenue (SAR)" />
                        </div>

                        <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><DocumentTextIcon className="h-5 w-5 text-[var(--primary-accent-color)]"/> Service Performance Details</h3>
                            <div className="space-y-4">
                                {serviceAnalytics.map((service, idx) => (
                                    <div key={idx} className="relative pt-1">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-[var(--primary-accent-color)] text-white">
                                                    #{idx + 1}
                                                </span>
                                                <span className="font-bold ml-3">{service.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block" style={{color: 'var(--primary-accent-color)'}}>
                                                    SAR {service.totalRevenue.toLocaleString()}
                                                </span>
                                                <span className="text-xs block opacity-60">{service.count} Bookings</span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-black/10">
                                            <div style={{ width: `${(service.totalRevenue / serviceAnalytics[0].totalRevenue) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[var(--primary-accent-color)]"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Support Modals */}
            <input type="file" ref={restoreInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            
            {isRestoreModalOpen && (
                <Modal title="Restore Backup" onClose={() => setIsRestoreModalOpen(false)}>
                    <div className="space-y-4">
                         <p className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded border border-yellow-500/20">Warning: Restoring will overwrite all current data.</p>
                         <button onClick={handleRestoreClick} className="w-full py-2 bg-blue-600 text-white rounded-lg">Select File</button>
                    </div>
                </Modal>
            )}

            {fileToRestore && (
                <ConfirmationModal
                    title="Confirm Restore"
                    message="This will overwrite all current data. Continue?"
                    onConfirm={() => { onRestore(fileToRestore); setFileToRestore(null); }}
                    onCancel={() => setFileToRestore(null)}
                    confirmText="Overwrite"
                />
            )}

            {/* AI Analysis Modal */}
            {isAiModalOpen && (
                <Modal title={`AI Analysis: ${activeReport}`} onClose={() => setIsAiModalOpen(false)} size="lg">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center min-h-[200px]">
                            <InlineSpinner />
                            <p className="mt-4 text-purple-400 animate-pulse">Consulting Gemini...</p>
                        </div>
                    ) : (
                        <div className="prose prose-sm prose-invert max-w-none">
                            {aiAnalysis ? (
                                <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300">$1</strong>').replace(/\n/g, '<br/>') }} />
                            ) : (
                                <p className="text-center opacity-50">No analysis generated.</p>
                            )}
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
};
