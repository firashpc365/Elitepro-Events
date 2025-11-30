
// components/Profitability.tsx
import React, { useMemo } from 'react';
import type { EventItem, ServiceItem, User, CostTrackerItem } from '../types';
import { CashIcon, PercentageIcon, MenuIcon } from './common/icons';
import { BarChart } from './common/BarChart';

interface AnalyzedService extends ServiceItem {
    profit: number;
    profitMargin: number;
}

const InsightCard: React.FC<{ title: string; item: AnalyzedService; metric: string; metricValue: string; icon: React.ReactNode }> = ({ title, item, metric, metricValue, icon }) => (
    <div 
        className="backdrop-blur-xl border shadow-lg p-6 card-hover-effect"
        style={{
            backgroundColor: 'var(--card-container-color)',
            borderColor: 'var(--border-color)',
            borderRadius: 'var(--border-radius)',
        }}
    >
        <div className="flex items-start">
            <div className="p-3 rounded-full mr-4" style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: 'var(--primary-accent-color)'}}>
                {icon}
            </div>
            <div>
                <h3 className="text-md font-semibold" style={{ color: 'var(--text-secondary-color)'}}>{title}</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary-color)'}}>{item.name}</p>
                <p className="text-lg font-semibold text-[var(--primary-accent-color)] mt-1">{metric}: <span className="font-extrabold">{metricValue}</span></p>
            </div>
        </div>
    </div>
);


export const Profitability: React.FC<{ services: ServiceItem[], events: EventItem[], users: User[], user: User, onMenuClick: () => void }> = ({ services, events, users, user, onMenuClick }) => {
    
    const themedContainerStyle = {
      backgroundColor: 'var(--card-container-color)',
      borderColor: 'var(--border-color)',
      borderRadius: 'var(--border-radius)',
    };
    
    const analyzedData = useMemo((): AnalyzedService[] => {
        return services
            .filter(s => s.basePrice !== undefined && s.basePrice > 0)
            .map(s => {
                // Estimating cost as 60% of basePrice for mock analysis
                const basePrice = s.basePrice || 0;
                const cost = basePrice * 0.6; 
                const profit = basePrice - cost;
                const profitMargin = basePrice > 0 ? (profit / basePrice) * 100 : 0;
                return { ...s, profit, profitMargin };
            })
            .sort((a, b) => b.profitMargin - a.profitMargin); // Sort by margin desc
    }, [services]);

    const highestMarginItem = useMemo(() => {
        if (analyzedData.length === 0) return null;
        return analyzedData.reduce((max, item) => item.profitMargin > max.profitMargin ? item : max, analyzedData[0]);
    }, [analyzedData]);

    const highestProfitItem = useMemo(() => {
        if (analyzedData.length === 0) return null;
        return analyzedData.reduce((max, item) => item.profit > max.profit ? item : max, analyzedData[0]);
    }, [analyzedData]);

    const categoryProfitData = useMemo(() => {
        const categoryStats: Record<string, number> = {};
        
        events.forEach(event => {
            // Only include completed events for accurate realized profit analysis
            if (event.status !== 'Completed') return;
            
            event.cost_tracker.forEach(item => {
                let category = 'Uncategorized';
                // Try to link back to master service to get the canonical category
                if (item.masterServiceId) {
                   const service = services.find(s => s.id === item.masterServiceId);
                   if (service) category = service.category;
                } else if (item.category) {
                    category = item.category;
                }
    
                const revenue = (item.client_price_sar || 0) * (item.quantity || 0);
                const cost = (item.unit_cost_sar || 0) * (item.quantity || 0);
                const profit = revenue - cost;
                
                categoryStats[category] = (categoryStats[category] || 0) + profit;
            });
        });
    
        return Object.entries(categoryStats)
          .map(([label, value]) => ({ label, value, color: 'var(--primary-accent-color)' }))
          .sort((a, b) => b.value - a.value);
    }, [events, services]);

    const commissionData = useMemo(() => {
        const salesUsers = users.filter(u => u.role === 'Sales');

        return salesUsers.map(salesUser => {
            const userEvents = events.filter(e => e.salespersonId === salesUser.userId);
            
            const totalRevenue = userEvents.reduce((sum, event) => sum + event.cost_tracker.reduce((s, i) => s + (i.client_price_sar || 0) * (i.quantity || 0), 0), 0);
            
            const totalProfit = userEvents.reduce((sum, event) => {
                const revenue = event.cost_tracker.reduce((s, i) => s + (i.client_price_sar || 0) * (i.quantity || 0), 0);
                const cost = event.cost_tracker.reduce((s, i) => s + (i.unit_cost_sar || 0) * (i.quantity || 0), 0);
                return sum + (revenue - cost);
            }, 0);

            const { totalCommission, paidCommission } = userEvents.reduce((acc, event) => {
                const eventProfit = event.cost_tracker.reduce((s, i) => s + (i.client_price_sar || 0) * (i.quantity || 0), 0) - event.cost_tracker.reduce((s, i) => s + (i.unit_cost_sar || 0) * (i.quantity || 0), 0);
                
                const commissionRate = (event.commissionRate ?? salesUser.commissionRate ?? 0) / 100;
                const eventCommission = eventProfit * commissionRate;

                acc.totalCommission += eventCommission;
                if (event.commissionPaid) {
                    acc.paidCommission += eventCommission;
                }
                
                return acc;
            }, { totalCommission: 0, paidCommission: 0 });

            const pendingCommission = totalCommission - paidCommission;
            
            return {
                userId: salesUser.userId,
                name: salesUser.name,
                totalRevenue,
                totalProfit,
                totalCommission,
                paidCommission,
                pendingCommission,
            };
        }).filter(data => data.totalCommission > 0);
    }, [events, users]);


    if (!user.permissions.canViewFinancials) {
        return (
            <div className="p-4 sm:p-6 text-center">
                 <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
                </div>
                <p className="mt-4" style={{ color: 'var(--text-secondary-color)'}}>{'You do not have permission to view this page.'}</p>
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 space-y-8">
            <div className="flex items-center gap-2">
                <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                    <MenuIcon className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Profitability Analysis</h1>
            </div>

            {/* Key Insights Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-secondary-color)' }}>Key Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {highestMarginItem ? (
                        <div className="animate-in-item" style={{ animationDelay: '0ms' }}>
                            <InsightCard 
                                title="Highest Margin Item"
                                item={highestMarginItem}
                                metric="Profit Margin"
                                metricValue={`${highestMarginItem.profitMargin.toFixed(1)}%`}
                                icon={<PercentageIcon className="h-6 w-6" />}
                            />
                        </div>
                    ) : <div className="p-4 backdrop-blur-xl border rounded-2xl shadow-lg text-center" style={{...themedContainerStyle, color: 'var(--text-secondary-color)'}}>{'No data for margin analysis.'}</div>}
                    
                    {highestProfitItem ? (
                         <div className="animate-in-item" style={{ animationDelay: '50ms' }}>
                            <InsightCard
                                title="Highest Profit Item"
                                item={highestProfitItem}
                                metric="Profit per Unit"
                                metricValue={`SAR ${(highestProfitItem.profit || 0).toLocaleString()}`}
                                icon={<CashIcon className="h-6 w-6" />}
                            />
                        </div>
                    ) : <div className="p-4 backdrop-blur-xl border rounded-2xl shadow-lg text-center" style={{...themedContainerStyle, color: 'var(--text-secondary-color)'}}>{'No data for profit analysis.'}</div>}
                </div>
            </div>

             {/* Visual Analytics Section */}
             <div className="space-y-4 animate-in-item" style={{ animationDelay: '100ms' }}>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-secondary-color)' }}>Visual Analytics</h2>
                <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
                    <BarChart 
                        data={categoryProfitData} 
                        title="Profit by Service Category (Completed Events)" 
                        yAxisLabel="Total Profit (SAR)" 
                    />
                    {categoryProfitData.length === 0 && (
                         <p className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary-color)' }}>
                             No completed events with cost data available to visualize.
                         </p>
                    )}
                </div>
            </div>

            {/* Service Profitability Table */}
            <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary-color)'}}>Service Profitability Breakdown</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Service Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Category</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Cost (SAR)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Client Price (SAR)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Profit (SAR)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Profit Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-color)'}}>
                            {analyzedData.map(item => (
                                <tr key={item.id} className="hover:bg-black/10">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary-color)'}}>{item.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm" style={{ color: 'var(--text-secondary-color)'}}>{item.category}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-400">{((item.basePrice || 0) * 0.6).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm" style={{ color: 'var(--text-secondary-color)'}}>{(item.basePrice || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-400">{(item.profit || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary-color)'}}>
                                        <div className="flex items-center">
                                            <div className="w-24 bg-black/20 rounded-full h-2.5 mr-3">
                                                <div className="bg-[var(--primary-accent-color)] h-2.5 rounded-full" style={{ width: `${item.profitMargin}%` }}></div>
                                            </div>
                                            <span>{item.profitMargin.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {analyzedData.length === 0 && <p className="text-center py-8" style={{ color: 'var(--text-secondary-color)'}}>{'No services with sufficient pricing data available for analysis.'}</p>}
            </div>

            {/* Sales Commission Report Table */}
            <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary-color)'}}>Sales Commission Report</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b" style={{ borderColor: 'var(--border-color)'}}>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Salesperson</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Total Revenue (SAR)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Total Profit (SAR)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Total Commission (SAR)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Paid Commission (SAR)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)'}}>Pending Commission (SAR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-color)'}}>
                            {commissionData.map(data => (
                                <tr key={data.userId} className="hover:bg-black/10">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--text-primary-color)'}}>{data.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm" style={{ color: 'var(--text-secondary-color)'}}>{(data.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-[var(--primary-accent-color)] font-semibold">{(data.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-400">{(data.totalCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-400">{(data.paidCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-yellow-400">{(data.pendingCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {commissionData.length === 0 && <p className="text-center py-8" style={{ color: 'var(--text-secondary-color)'}}>{'No sales data available for commission analysis.'}</p>}
            </div>

        </div>
    );
};
