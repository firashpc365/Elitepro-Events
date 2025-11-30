
import React, { useState, useMemo } from 'react';
import type { EventItem, ServiceItem } from '../types';
import { MenuIcon, SparkleIcon, ChartBarIcon } from './common/icons';
import { Modal } from './common/Modal';
import { BarChart } from './common/BarChart';

interface PortfolioProps {
    events: EventItem[];
    services: ServiceItem[];
    setView: (view: string) => void;
    onMenuClick: () => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ events, services, setView, onMenuClick }) => {
    const [filter, setFilter] = useState<'All' | 'Completed' | 'Upcoming'>('Completed');
    const [showAnalytics, setShowAnalytics] = useState(false);

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (filter === 'All') return true;
            if (filter === 'Completed') return e.status === 'Completed';
            if (filter === 'Upcoming') return new Date(e.date) >= new Date();
            return true;
        });
    }, [events, filter]);

    // Analytics Logic
    const { monthlyPerformance, categoryProfit } = useMemo(() => {
        const months: { [key: string]: { revenue: number, profit: number } } = {};
        const categories: { [key: string]: number } = {};

        filteredEvents.forEach(event => {
            // Monthly Calc
            const date = new Date(event.date);
            if (!isNaN(date.getTime())) {
                const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!months[month]) months[month] = { revenue: 0, profit: 0 };
                
                const revenue = event.cost_tracker.reduce((sum, i) => sum + i.client_price_sar * i.quantity, 0);
                const cost = event.cost_tracker.reduce((sum, i) => sum + i.unit_cost_sar * i.quantity, 0);
                const profit = revenue - cost;
                
                months[month].revenue += revenue;
                months[month].profit += profit;
            }

            // Category Calc
            if (event.cost_tracker.length > 0) {
                event.cost_tracker.forEach(item => {
                    let cat = item.category;
                    if (!cat && item.masterServiceId) {
                        const service = services.find(s => s.id === item.masterServiceId);
                        if (service) cat = service.category;
                    }
                    cat = cat || 'Uncategorized';
                    
                    const itemRev = item.client_price_sar * item.quantity;
                    const itemCost = item.unit_cost_sar * item.quantity;
                    const itemProfit = itemRev - itemCost;

                    categories[cat] = (categories[cat] || 0) + itemProfit;
                });
            }
        });

        const monthlyData = Object.entries(months)
            .map(([label, vals]) => ({
                label,
                values: [
                     { label: 'Revenue', value: vals.revenue, color: 'var(--primary-accent-color)' },
                     { label: 'Profit', value: vals.profit, color: '#16a34a' }
                ]
            }))
            .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime()); // Approximate sort

        const categoryData = Object.entries(categories)
            .map(([label, value]) => ({ label, value, color: 'var(--primary-accent-color)' }))
            .sort((a, b) => b.value - a.value);

        return { monthlyPerformance: monthlyData, categoryProfit: categoryData };

    }, [filteredEvents, services]);


    return (
        <div className="p-4 sm:p-6 space-y-8 min-h-full">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Event Portfolio</h1>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                     <button 
                        onClick={() => setShowAnalytics(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-md text-sm font-semibold"
                    >
                        <ChartBarIcon className="h-5 w-5" />
                        Analytics
                    </button>
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        {['All', 'Completed', 'Upcoming'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === f ? 'bg-[var(--primary-accent-color)] text-white shadow-md' : 'text-[var(--text-secondary-color)] hover:text-white'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map((event, index) => (
                    <div 
                        key={event.eventId} 
                        className="group relative rounded-xl overflow-hidden shadow-lg cursor-pointer aspect-[4/3] animate-in-item"
                        style={{ animationDelay: `${index * 100}ms` }}
                        onClick={() => { setView('EventDetail'); /* In real app pass ID via context or URL */ }}
                    >
                        <img 
                            src={event.imageUrl || `https://picsum.photos/seed/${event.eventId}/800/600`} 
                            alt={event.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${event.eventId}/800/600`; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />
                        
                        <div className="absolute bottom-0 left-0 p-6 w-full translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <p className="text-[var(--primary-accent-color)] text-xs font-bold uppercase tracking-wider mb-1">{event.eventType || 'Event'}</p>
                            <h3 className="text-white text-2xl font-bold mb-2 leading-tight">{event.name}</h3>
                            <p className="text-slate-300 text-sm line-clamp-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                {event.remarks || event.eventBrief || `A spectacular event for ${event.clientName} hosted in ${event.location}.`}
                            </p>
                            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-3">
                                <span>{new Date(event.date).toLocaleDateString(undefined, {year: 'numeric', month: 'long'})}</span>
                                <span>{event.location}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredEvents.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary-color)]">
                    <SparkleIcon className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg">No events found in this category.</p>
                 </div>
            )}

            {showAnalytics && (
                <Modal title="Portfolio Analytics" onClose={() => setShowAnalytics(false)} size="xl">
                    <div className="space-y-8">
                        <p className="text-sm" style={{ color: 'var(--text-secondary-color)' }}>
                            Analysis based on {filteredEvents.length} {filter.toLowerCase()} events.
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             <BarChart 
                                data={monthlyPerformance} 
                                title="Monthly Performance (Rev vs Profit)" 
                                yAxisLabel="Amount (SAR)" 
                            />
                             <BarChart 
                                data={categoryProfit} 
                                title="Total Profit by Category" 
                                yAxisLabel="Profit (SAR)" 
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
