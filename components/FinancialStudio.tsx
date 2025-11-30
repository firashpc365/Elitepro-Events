
// components/FinancialStudio.tsx
import React, { useState, useMemo } from 'react';
import type { EventItem, ServiceItem, User, AIInteraction } from '../types';
import { MenuIcon, SparkleIcon, TrendingUpIcon, TrendingDownIcon, UsersIcon, ChartBarIcon } from './common/icons';
import { getFinancialAnalysis, getPricingSuggestion } from '../services/geminiService';
import { Modal } from './common/Modal';
import { InlineSpinner } from './common/LoadingSpinner';
import { BarChart } from './common/BarChart';

interface FinancialStudioProps {
  events: EventItem[];
  services: ServiceItem[];
  users: User[];
  currentUser: User;
  onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
  onUpdateService: (serviceId: string, data: Partial<ServiceItem>) => void;
  onMenuClick: () => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

const StatCard: React.FC<{ title: string; value: string; subValue?: string; color?: string }> = ({ title, value, subValue, color }) => (
    <div className="p-5 rounded-xl border backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
        <p className="text-sm font-bold opacity-70 uppercase tracking-wide" style={{ color: 'var(--text-secondary-color)' }}>{title}</p>
        <p className="text-3xl font-extrabold mt-2" style={{ color: color || 'var(--text-primary-color)' }}>{value}</p>
        {subValue && <p className="text-xs mt-2 opacity-60 font-medium" style={{ color: 'var(--text-secondary-color)' }}>{subValue}</p>}
    </div>
);

type Suggestion = { suggestedPrice: number; suggestedMargin: number };

export const FinancialStudio: React.FC<FinancialStudioProps> = ({ events, services, users, onUpdateEvent, onUpdateService, onMenuClick, onLogAIInteraction, currentUser }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'profit', direction: 'desc' });
  
  // State for pricing analysis tab
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion | null>>({});
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);

  const themedContainerStyle = {
    backgroundColor: 'var(--card-container-color)',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--border-radius)',
  };

  const eventFinancials = useMemo(() => {
    return events.map(event => {
      const revenue = (event.cost_tracker || []).reduce((sum, item) => sum + (item.client_price_sar || 0) * (item.quantity || 0), 0);
      const cost = (event.cost_tracker || []).reduce((sum, item) => sum + (item.unit_cost_sar || 0) * (item.quantity || 0), 0);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { ...event, revenue, cost, profit, margin };
    });
  }, [events]);

  const sortedEvents = useMemo(() => {
    let sortableItems = [...eventFinancials];
    if (sortConfig && (activeTab === 'event deep dive')) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key as keyof typeof a;
        if (a[key] < b[key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [eventFinancials, sortConfig, activeTab]);
  
  const sortedServices = useMemo(() => {
    let sortableItems = [...services];
     if (sortConfig && activeTab === 'pricing & margin analysis') {
        sortableItems.sort((a,b) => {
            const key = sortConfig.key as keyof typeof a;
            let valA = a[key] || 0;
            let valB = b[key] || 0;
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
     }
     return sortableItems;
  }, [services, sortConfig, activeTab]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const overallFinancials = useMemo(() => {
    return eventFinancials.reduce((acc, event) => {
        acc.totalRevenue += event.revenue;
        acc.totalCost += event.cost;
        acc.totalProfit += event.profit;
        return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
  }, [eventFinancials]);
  const overallMargin = overallFinancials.totalRevenue > 0 ? (overallFinancials.totalProfit / overallFinancials.totalRevenue) * 100 : 0;
  
  // Commission Logic
  const commissionData = useMemo(() => {
    const salesUsers = users.filter(u => u.role === 'Sales');
    
    const summary = salesUsers.map(user => {
        const userEvents = eventFinancials.filter(e => e.salespersonId === user.userId);
        let totalCommission = 0;
        let paidCommission = 0;
        
        userEvents.forEach(event => {
             if (event.profit > 0) {
                const commissionRate = (event.commissionRate ?? user.commissionRate ?? 0) / 100;
                const amount = event.profit * commissionRate;
                totalCommission += amount;
                if (event.commissionPaid) {
                    paidCommission += amount;
                }
             }
        });
        
        return {
            user,
            totalCommission,
            paidCommission,
            pendingCommission: totalCommission - paidCommission,
            eventCount: userEvents.length
        };
    });

    const detailedLedger: any[] = [];
    salesUsers.forEach(user => {
      const userEvents = eventFinancials.filter(e => e.salespersonId === user.userId);
      userEvents.forEach(event => {
        if (event.profit > 0) {
            const commissionRate = (event.commissionRate ?? user.commissionRate ?? 0) / 100;
            const commissionAmount = event.profit * commissionRate;
            if (commissionAmount > 0) {
              detailedLedger.push({
                user,
                event,
                commissionAmount,
                commissionRate: commissionRate * 100,
                isPaid: event.commissionPaid,
              });
            }
        }
      });
    });

    // Sort ledger by date descending
    detailedLedger.sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());

    return { summary, detailedLedger };
  }, [eventFinancials, users]);

  // Forecasting Logic (Simple Linear Regression)
  const forecastData = useMemo(() => {
      const monthlyData: Record<string, number> = {};
      eventFinancials.forEach(e => {
          if(['Completed', 'Confirmed'].includes(e.status)) {
              const monthKey = e.date.substring(0, 7); // YYYY-MM
              monthlyData[monthKey] = (monthlyData[monthKey] || 0) + e.revenue;
          }
      });
      
      const sortedMonths = Object.keys(monthlyData).sort();
      const dataPoints = sortedMonths.map((m, i) => ({ x: i, y: monthlyData[m] }));
      
      if (dataPoints.length < 2) return null;

      const n = dataPoints.length;
      const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
      const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
      const sumXY = dataPoints.reduce((acc, p) => acc + (p.x * p.y), 0);
      const sumXX = dataPoints.reduce((acc, p) => acc + (p.x * p.x), 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const nextMonthIndex = n;
      const forecastRevenue = slope * nextMonthIndex + intercept;
      
      return {
          nextMonthRevenue: Math.max(0, forecastRevenue),
          trend: slope > 0 ? 'up' : 'down',
          slope
      };
  }, [eventFinancials]);


  const handleToggleCommissionPaid = (eventId: string, currentStatus: boolean) => {
    onUpdateEvent(eventId, { commissionPaid: !currentStatus });
  };
  
  const handleRunAnalysis = async () => {
    setIsAnalysisModalOpen(true);
    setIsAnalyzing(true);
    try {
        const { result, fullPrompt } = await getFinancialAnalysis(events, services, users);
        setAnalysisResult(result);
        onLogAIInteraction({ feature: 'financial_studio_analysis', promptSummary: 'Run AI Financial Analysis', fullPrompt, response: result });
    } catch (e) {
        setAnalysisResult(`An error occurred: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGetSuggestion = async (service: ServiceItem) => {
    setLoadingSuggestion(service.id);
    try {
        const { result, fullPrompt } = await getPricingSuggestion(service, events);
        setSuggestions(prev => ({ ...prev, [service.id]: result }));
        onLogAIInteraction({ feature: 'pricing_suggestion', promptSummary: `Pricing suggestion for ${service.name}`, fullPrompt, response: JSON.stringify(result) });
    } catch (e) {
        console.error("Failed to get suggestion", e);
    } finally {
        setLoadingSuggestion(null);
    }
  };

  const handleApplySuggestion = (serviceId: string) => {
    const suggestion = suggestions[serviceId];
    if (!suggestion) return;
    onUpdateService(serviceId, {
        basePrice: suggestion.suggestedPrice,
        profitMarginPercentage: suggestion.suggestedMargin,
    });
    setSuggestions(prev => ({...prev, [serviceId]: null}));
  };

  const handleBulkSuggest = async () => {
    for (const service of sortedServices) {
        if (!suggestions[service.id]) {
            await handleGetSuggestion(service);
        }
    }
  };

  // Chart Data Generation
  const categoryFinancials = useMemo(() => {
    const categoryData: { [key: string]: { profit: number; count: number } } = {};

    eventFinancials.forEach(event => {
        if (event.cost_tracker.length === 0) return;

        let dominantCategory = 'Uncategorized';
        let maxRevenue = -1;

        event.cost_tracker.forEach(item => {
            const service = services.find(s => s.id === item.masterServiceId);
            const itemRevenue = (item.client_price_sar || 0) * (item.quantity || 0);
            if (service && itemRevenue > maxRevenue) {
                maxRevenue = itemRevenue;
                dominantCategory = service.category;
            }
        });

        if (!categoryData[dominantCategory]) {
            categoryData[dominantCategory] = { profit: 0, count: 0 };
        }
        categoryData[dominantCategory].profit += event.profit;
        categoryData[dominantCategory].count += 1;
    });

    return Object.entries(categoryData)
        .map(([label, data]) => ({ label, value: data.profit }))
        .sort((a, b) => b.value - a.value);
  }, [eventFinancials, services]);

  const monthlyPerformanceData = useMemo(() => {
      const months: Record<string, { revenue: number, profit: number }> = {};
      
      eventFinancials.forEach(event => {
          if (event.status === 'Completed' || event.status === 'Confirmed') {
             const date = new Date(event.date);
             const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
             if (!months[key]) months[key] = { revenue: 0, profit: 0 };
             months[key].revenue += event.revenue;
             months[key].profit += event.profit;
          }
      });

      return Object.entries(months)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()) // Approximate sort
        .map(([label, data]) => ({
            label,
            values: [
                { label: 'Revenue', value: data.revenue, color: 'var(--primary-accent-color)' },
                { label: 'Profit', value: data.profit, color: '#16a34a' }
            ]
        }));
  }, [eventFinancials]);

  const eventComparisonData = useMemo(() => {
      return eventFinancials
          .filter(e => e.revenue > 0)
          .sort((a,b) => b.revenue - a.revenue)
          .slice(0, 10)
          .map(event => ({
              label: event.name,
              values: [
                  { value: event.revenue, color: 'var(--primary-accent-color)', label: 'Revenue' },
                  { value: event.profit, color: '#16a34a', label: 'Profit' },
              ],
          }));
  }, [eventFinancials]);


  const TABS = ['overview', 'forecast', 'event deep dive', 'visual insights', 'pricing & margin analysis', 'commission management'];

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-y-2">
            <div className="flex items-center gap-2">
              <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                <MenuIcon className="h-6 w-6" />
              </button>
              <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Financial Studio</h1>
            </div>
            <button onClick={handleRunAnalysis} className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg shadow hover:bg-purple-700 flex items-center gap-2">
                <SparkleIcon className="h-5 w-5" />
                Run AI Financial Analysis
            </button>
        </div>
        
        <div className="border-b overflow-x-auto flex whitespace-nowrap" style={{ borderColor: 'var(--border-color)' }}>
            {TABS.map(tab => {
                 if (tab === 'pricing & margin analysis' && !currentUser.permissions.canManageServices) return null;
                 return (
                    <button key={tab} onClick={() => setActiveTab(tab)} data-active={activeTab === tab} className="tab-button px-6 py-3 text-sm font-medium capitalize tracking-wide">
                        {tab}
                    </button>
                )
            })}
        </div>

        {activeTab === 'overview' && (
            <div className="space-y-6 animate-in-item">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard title="Total Revenue" value={`SAR ${overallFinancials.totalRevenue.toLocaleString()}`} color="var(--text-primary-color)" />
                    <StatCard title="Net Profit" value={`SAR ${overallFinancials.totalProfit.toLocaleString()}`} subValue={`from ${eventFinancials.length} events`} color="#16a34a" />
                    <StatCard title="Overall Profit Margin" value={`${overallMargin.toFixed(1)}%`} color="var(--primary-accent-color)" />
                    {forecastData && (
                        <StatCard 
                            title="Forecast (Next Month)" 
                            value={`~ SAR ${forecastData.nextMonthRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}`} 
                            subValue={forecastData.trend === 'up' ? 'Trending Up 📈' : 'Trending Down 📉'}
                            color={forecastData.trend === 'up' ? '#16a34a' : '#f59e0b'}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-2 backdrop-blur-xl border shadow-lg p-4 rounded-xl" style={themedContainerStyle}>
                         <BarChart data={monthlyPerformanceData} title="Monthly Performance Trend" yAxisLabel="Amount (SAR)" />
                    </div>
                    <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl flex flex-col justify-center items-center text-center" style={themedContainerStyle}>
                         <h3 className="text-lg font-bold mb-4">Financial Health Score</h3>
                         <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                             <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary-accent-color)" strokeWidth="3" strokeDasharray={`${overallMargin}, 100`} />
                             </svg>
                             <div className="absolute text-3xl font-bold">{Math.min(100, Math.max(0, overallMargin)).toFixed(0)}</div>
                         </div>
                         <p className="text-sm opacity-70">Based on current profit margins across all events.</p>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'forecast' && forecastData && (
             <div className="space-y-6 animate-in-item">
                 <div className="backdrop-blur-xl border shadow-lg p-8 rounded-xl" style={themedContainerStyle}>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <TrendingUpIcon className="h-6 w-6 text-[var(--primary-accent-color)]" /> Revenue Forecast
                    </h2>
                    <p className="text-sm mb-6" style={{color: 'var(--text-secondary-color)'}}>
                        Based on a linear regression model of your completed and confirmed events, we project your revenue trend.
                    </p>
                    
                    <div className="flex items-center justify-around p-6 bg-black/20 rounded-lg">
                        <div className="text-center">
                            <p className="text-sm text-[var(--text-secondary-color)] uppercase tracking-wider">Next Month Projection</p>
                            <p className="text-4xl font-extrabold mt-2 text-green-400">SAR {forecastData.nextMonthRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                        </div>
                        <div className="h-12 w-px bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-sm text-[var(--text-secondary-color)] uppercase tracking-wider">Trend Direction</p>
                            <div className={`text-2xl font-bold mt-2 flex items-center justify-center gap-2 ${forecastData.trend === 'up' ? 'text-blue-400' : 'text-orange-400'}`}>
                                {forecastData.trend === 'up' ? <TrendingUpIcon className="h-6 w-6"/> : <TrendingDownIcon className="h-6 w-6"/>}
                                {forecastData.trend === 'up' ? 'Growth' : 'Decline'}
                            </div>
                        </div>
                    </div>
                 </div>
             </div>
        )}

        {activeTab === 'event deep dive' && (
             <div className="backdrop-blur-xl border shadow-lg p-6 animate-in-item" style={themedContainerStyle}>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b" style={{borderColor: 'var(--border-color)'}}>
                            <tr>
                                {['name', 'revenue', 'cost', 'profit', 'margin'].map(key => (
                                    <th key={key} onClick={() => requestSort(key)} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer text-[var(--text-secondary-color)]">
                                        {key.replace('_', ' ')}
                                        {sortConfig?.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{borderColor: 'var(--border-color)'}}>
                            {sortedEvents.map((event, index) => (
                                <tr key={event.eventId} className="hover:bg-black/10 transition-colors animate-in-item" style={{animationDelay: `${index * 30}ms`}}>
                                    <td className="px-4 py-3 font-medium text-[var(--text-primary-color)]">{event.name}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary-color)]">SAR {(event.revenue || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-red-400">SAR {(event.cost || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 font-semibold text-green-400">SAR {(event.profit || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 font-semibold text-[var(--primary-accent-color)]">{event.margin.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'visual insights' && (
            <div className="space-y-8 animate-in-item">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                        <BarChart
                            data={monthlyPerformanceData}
                            title="Revenue vs. Profit"
                            yAxisLabel="Amount (SAR)"
                        />
                    </div>
                     <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                        <BarChart
                            data={categoryFinancials}
                            title="Profit by Category"
                            yAxisLabel="Total Profit (SAR)"
                        />
                    </div>
                    {eventComparisonData.length > 0 && (
                         <div className="lg:col-span-2 backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                            <BarChart
                                data={eventComparisonData}
                                title="Top 10 Events Performance"
                                yAxisLabel="Amount (SAR)"
                            />
                         </div>
                    )}
                </div>
            </div>
        )}
        
        {activeTab === 'pricing & margin analysis' && currentUser.permissions.canManageServices && (
            <div className="backdrop-blur-xl border shadow-lg p-6 animate-in-item" style={themedContainerStyle}>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Service Pricing Strategy</h2>
                    <button onClick={handleBulkSuggest} className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg shadow hover:bg-purple-700 flex items-center gap-2 transition-transform active:scale-95"><SparkleIcon className="h-5 w-5"/> Auto-Suggest All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b" style={{borderColor: 'var(--border-color)'}}>
                            <tr>
                                {['name', 'category', 'defaultCost', 'basePrice', 'profitMarginPercentage'].map(key => (
                                    <th key={key} onClick={() => requestSort(key)} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer text-[var(--text-secondary-color)]">
                                        {key.replace(/([A-Z])/g, ' $1')}
                                        {sortConfig?.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                    </th>
                                ))}
                                 <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">AI Insight</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{borderColor: 'var(--border-color)'}}>
                            {sortedServices.map((service, index) => {
                                const currentMargin = (service.basePrice && service.defaultCost) ? ((service.basePrice - service.defaultCost) / service.basePrice) * 100 : 0;
                                const suggestion = suggestions[service.id];
                                return (
                                <tr key={service.id} className="hover:bg-black/10 transition-colors animate-in-item" style={{animationDelay: `${index * 30}ms`}}>
                                    <td className="px-4 py-3 font-medium text-[var(--text-primary-color)]">{service.name}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--text-secondary-color)]">{service.category}</td>
                                    <td className="px-4 py-3 text-sm text-red-400">SAR {(service.defaultCost || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-green-400">SAR {(service.basePrice || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-[var(--primary-accent-color)]">{currentMargin > 0 ? `${currentMargin.toFixed(1)}%` : 'N/A'}</td>
                                    <td className="px-4 py-3">
                                        {loadingSuggestion === service.id ? <InlineSpinner/> : (suggestion && typeof suggestion.suggestedPrice === 'number') ? (
                                            <div className="flex items-center gap-2 bg-purple-900/20 p-2 rounded-lg border border-purple-500/30">
                                                <div>
                                                    <p className="text-xs font-semibold flex items-center text-purple-200">
                                                        Rec: SAR {(suggestion.suggestedPrice || 0).toLocaleString()}
                                                        {suggestion.suggestedPrice > (service.basePrice || 0) ? <TrendingUpIcon className="h-3 w-3 text-green-400 ml-1"/> : <TrendingDownIcon className="h-3 w-3 text-red-400 ml-1"/>}
                                                    </p>
                                                     <p className="text-[10px] font-medium opacity-70 text-purple-300">
                                                        Margin: {(suggestion.suggestedMargin || 0).toFixed(1)}%
                                                    </p>
                                                </div>
                                                <button onClick={() => handleApplySuggestion(service.id)} className="px-2 py-1 text-[10px] bg-purple-600 text-white rounded hover:bg-purple-700 transition">Apply</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleGetSuggestion(service)} className="px-3 py-1.5 text-xs bg-slate-700/50 text-slate-300 rounded hover:bg-slate-700 transition flex items-center gap-1">
                                                <SparkleIcon className="h-3 w-3"/> Analyze
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'commission management' && (
             <div className="space-y-8 animate-in-item">
                 {/* Salesperson Summary */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {commissionData.summary.map((item: any) => (
                         <div key={item.user.userId} className="p-5 rounded-xl border shadow-sm transition hover:-translate-y-1" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                             <div className="flex items-center gap-3 mb-4">
                                 <div className="p-3 rounded-full bg-[var(--primary-accent-color)]/20 text-[var(--primary-accent-color)]">
                                     <UsersIcon className="h-6 w-6" />
                                 </div>
                                 <div>
                                     <h3 className="text-lg font-bold text-[var(--text-primary-color)]">{item.user.name}</h3>
                                     <p className="text-xs opacity-70 text-[var(--text-secondary-color)]">{item.eventCount} Commissionable Events</p>
                                 </div>
                             </div>
                             <div className="space-y-3">
                                 <div className="flex justify-between text-sm">
                                     <span className="text-[var(--text-secondary-color)]">Total Earned:</span>
                                     <span className="font-bold text-[var(--text-primary-color)]">SAR {item.totalCommission.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between text-sm">
                                     <span className="text-[var(--text-secondary-color)]">Paid:</span>
                                     <span className="text-green-400 font-semibold">SAR {item.paidCommission.toLocaleString()}</span>
                                 </div>
                                 <div className="pt-2 border-t flex justify-between text-sm font-bold" style={{ borderColor: 'var(--border-color)' }}>
                                     <span className="text-[var(--text-secondary-color)]">Pending Balance:</span>
                                     <span className="text-yellow-400">SAR {item.pendingCommission.toLocaleString()}</span>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>

                 {/* Detailed Ledger */}
                 <div className="backdrop-blur-xl border shadow-lg p-6 rounded-xl" style={themedContainerStyle}>
                     <h3 className="text-lg font-bold mb-4 text-[var(--text-primary-color)]">Detailed Commission Ledger</h3>
                     <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="border-b" style={{borderColor: 'var(--border-color)'}}>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Salesperson</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Event</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Rate</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Commission Amount</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Status</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y" style={{borderColor: 'var(--border-color)'}}>
                                {commissionData.detailedLedger.map(({ user, event, commissionAmount, commissionRate, isPaid }: any, index: number) => (
                                    <tr key={`${user.userId}-${event.eventId}`} className="hover:bg-black/10 transition-colors">
                                        <td className="px-4 py-3 text-xs opacity-70 text-[var(--text-secondary-color)]">{new Date(event.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 font-medium text-[var(--text-primary-color)]">{user.name}</td>
                                        <td className="px-4 py-3 text-[var(--text-primary-color)]">{event.name}</td>
                                        <td className="px-4 py-3 text-right text-xs opacity-70 text-[var(--text-secondary-color)]">{commissionRate.toFixed(1)}%</td>
                                        <td className="px-4 py-3 text-right font-semibold text-blue-400">SAR {(commissionAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-3 text-center">
                                             <button
                                                onClick={() => handleToggleCommissionPaid(event.eventId, isPaid)}
                                                disabled={currentUser.role !== 'Admin'}
                                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isPaid ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'}`}
                                            >
                                                {isPaid ? 'Paid' : 'Unpaid'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {commissionData.detailedLedger.length === 0 && <p className="text-center py-8 opacity-60" style={{ color: 'var(--text-secondary-color)' }}>No commission records found.</p>}
                    </div>
                 </div>
             </div>
        )}

      </div>
       {isAnalysisModalOpen && (
        <Modal title="AI Financial Analysis" onClose={() => setIsAnalysisModalOpen(false)} size="lg">
            {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <InlineSpinner/>
                    <p className="mt-4 text-sm font-medium animate-pulse" style={{color: 'var(--text-secondary-color)'}}>Gemini is analyzing your financial data...</p>
                </div>
            ) : (
                <div 
                    className="prose prose-sm max-w-none whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar p-2"
                    dangerouslySetInnerHTML={{ __html: analysisResult.replace(/###\s*(.*)/g, '<h3 class="font-bold text-lg mt-4 mb-2 text-[var(--primary-accent-color)]">$1</h3>').replace(/##\s*(.*)/g, '<h2 class="font-extrabold text-xl mt-6 mb-3 border-b border-white/10 pb-1">$1</h2>').replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--primary-accent-color)]">$1</strong>') }}
                ></div>
            )}
        </Modal>
      )}
    </>
  );
};
