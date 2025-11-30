
// components/Dashboard.tsx
import React, { useMemo, useState } from 'react';
import type { EventItem, ServiceItem, User, AppSettings, Client } from '../types';
import { PlusIcon, SparkleIcon, MenuIcon, TrendingUpIcon, CashIcon, DocumentTextIcon, ImageIcon, ExpandIcon, CollapseIcon, SettingsIcon, ChartBarIcon, BoltIcon } from './common/icons';
import { NoAlertsIllustration, IntelligenceHubIllustration } from './common/MotionGraphicsOverlay';
import { Modal } from './common/Modal';
import { BarChart } from './common/BarChart';
import { generateReportInsight } from '../services/geminiService';
import { InlineSpinner } from './common/LoadingSpinner';
import { VideoGenerator } from './features/VideoGenerator';

interface ExpandableInsightCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    note?: string;
    data?: { label: string; value: number; color?: string }[];
    reportType: string;
    aiContextData: any;
    onLogInteraction?: (data: any) => void;
}

const ExpandableInsightCard: React.FC<ExpandableInsightCardProps> = ({ title, value, icon, note, data, reportType, aiContextData, onLogInteraction }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            const { result, fullPrompt } = await generateReportInsight(reportType, aiContextData);
            setReport(result);
            if (onLogInteraction) {
                onLogInteraction({
                    feature: 'dashboard_report',
                    promptSummary: `Generate ${reportType} report`,
                    fullPrompt,
                    response: result
                });
            }
        } catch (e) {
            console.error(e);
            setReport("Failed to generate report. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
        <div 
            className="relative p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(var(--primary-accent-color-rgb),0.15)] group cursor-pointer overflow-hidden"
            style={{ 
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                minHeight: '170px'
            }}
            onClick={() => setIsExpanded(true)}
        >
            {/* Hover Glow Effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[var(--primary-accent-color)] opacity-10 blur-3xl rounded-full group-hover:opacity-20 transition-opacity duration-500"></div>

            <div className="flex justify-between items-start relative z-10">
                <div className="p-3.5 rounded-xl transition-colors group-hover:bg-white/10 shadow-inner" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    {icon}
                </div>
                <button className="text-[var(--text-secondary-color)] group-hover:text-[var(--primary-accent-color)] transition-colors bg-white/5 p-1.5 rounded-lg hover:bg-white/10">
                    <ExpandIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="mt-5 relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: 'var(--text-secondary-color)' }}>{title}</p>
                <p className="text-2xl md:text-3xl font-black mt-1 tracking-tight leading-none break-words" style={{ color: 'var(--text-primary-color)' }}>{value}</p>
                {note && <p className="text-xs mt-2 opacity-80 font-medium" style={{ color: 'var(--text-secondary-color)' }}>{note}</p>}
            </div>
            {/* Decorative bottom bar */}
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[var(--primary-accent-color)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>

        {isExpanded && (
            <Modal title={`${title} - Deep Dive`} onClose={() => setIsExpanded(false)} size="xl">
                <div className="space-y-6">
                    {/* Header Metrics */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-black/20 to-transparent border border-white/5 gap-4">
                         <div className="flex items-center gap-5">
                            <div className="p-4 rounded-full bg-[var(--primary-accent-color)]/20 text-[var(--primary-accent-color)] border border-[var(--primary-accent-color)]/30 shadow-[0_0_15px_rgba(var(--primary-accent-color-rgb),0.3)]">
                                {React.cloneElement(icon as React.ReactElement, { className: 'h-8 w-8' })}
                            </div>
                            <div>
                                <p className="text-sm text-[var(--text-secondary-color)] uppercase font-bold tracking-widest">{title}</p>
                                <p className="text-5xl font-black tracking-tight mt-1">{value}</p>
                            </div>
                         </div>
                         {note && <div className="text-left sm:text-right max-w-xs text-sm text-[var(--text-secondary-color)] font-medium px-4 py-2 bg-white/5 rounded-lg">{note}</div>}
                    </div>

                    {/* Chart Section */}
                    {data && data.length > 0 && (
                         <div className="p-6 rounded-2xl border border-white/10 bg-black/20">
                            <h4 className="text-lg font-bold mb-6 flex items-center gap-2"><ChartBarIcon className="h-5 w-5 text-blue-400"/> Trend Analysis</h4>
                            <BarChart data={data} title="" yAxisLabel="Value" />
                        </div>
                    )}

                    {/* AI Analyst Section */}
                    <div className="p-1 rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30">
                        <div className="bg-slate-900/90 p-6 rounded-xl h-full relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                <SparkleIcon className="h-48 w-48 text-purple-400" />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                                    <h3 className="text-xl font-bold flex items-center gap-3 text-purple-100">
                                        <SparkleIcon className="h-6 w-6 text-purple-400 animate-pulse" /> 
                                        AI Executive Analyst
                                    </h3>
                                    {!report && !isGenerating && (
                                        <button 
                                            onClick={handleGenerateReport}
                                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-105 flex items-center gap-2"
                                        >
                                            <SparkleIcon className="h-4 w-4" /> Generate Report
                                        </button>
                                    )}
                                </div>
                                
                                {isGenerating ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <InlineSpinner />
                                        <p className="mt-6 text-purple-300 font-medium animate-pulse">Analyzing data patterns and generating insights...</p>
                                    </div>
                                ) : report ? (
                                    <div className="prose prose-sm prose-invert max-w-none bg-black/30 p-6 rounded-xl border border-purple-500/20 shadow-inner">
                                        <div dangerouslySetInnerHTML={{ __html: report.replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300">$1</strong>').replace(/\n/g, '<br/>') }} />
                                        <div className="mt-4 flex justify-end">
                                            <button onClick={handleGenerateReport} className="text-xs text-purple-400 hover:text-purple-300 font-bold underline uppercase tracking-wide">Regenerate Analysis</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-purple-200/80 text-sm leading-relaxed max-w-2xl">
                                        Unlock deeper insights. Our AI Analyst can review this data to identify trends, operational bottlenecks, and strategic opportunities for growth.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        )}
        </>
    );
};


export const Dashboard: React.FC<{
  user: User & { permissions: any };
  events: EventItem[];
  services: ServiceItem[];
  clients: Client[];
  setView: (view: string) => void;
  setSelectedEventId: (id: string) => void;
  onRequestNewEvent: () => void;
  onShowIntelligentCreator: () => void;
  onShowImageGenerator: () => void;
  onMenuClick: () => void;
  appSettings: AppSettings;
  onUpdateSettings?: (newSettings: Partial<AppSettings>) => void;
}> = ({ user, events, services, clients, setView, setSelectedEventId, onRequestNewEvent, onShowIntelligentCreator, onShowImageGenerator, onMenuClick, appSettings, onUpdateSettings }) => {
  const now = new Date();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);

  // Filter events based on permissions. 
  const visibleEvents = useMemo(() => {
      if (user.permissions.canViewFinancials) {
          return events;
      }
      return events.filter(e => e.salespersonId === user.userId);
  }, [events, user]);

  const isUserView = !user.permissions.canViewFinancials;

  const eventFinancials = useMemo(() => {
    return visibleEvents.map(event => {
      const revenue = event.cost_tracker.reduce((sum, item) => sum + item.client_price_sar * item.quantity, 0);
      const cost = event.cost_tracker.reduce((sum, item) => sum + item.unit_cost_sar * item.quantity, 0);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { ...event, revenue, cost, profit, margin };
    });
  }, [visibleEvents]);

  const kpis = useMemo(() => {
    const completedEvents = eventFinancials.filter(e => e.status === 'Completed');
    const totalRevenue = completedEvents.reduce((sum, e) => sum + e.revenue, 0);

    const openPipelineEvents = eventFinancials.filter(e => ['Draft', 'Quote Sent'].includes(e.status));
    const openPipelineValue = openPipelineEvents.reduce((sum, e) => sum + e.revenue, 0);
    
    const eventsWithRevenue = eventFinancials.filter(e => e.revenue > 0);
    const totalMargin = eventsWithRevenue.reduce((sum, e) => sum + e.margin, 0);
    const averageMargin = eventsWithRevenue.length > 0 ? totalMargin / eventsWithRevenue.length : 0;
    
    const upcomingEventsCount = visibleEvents.filter(e => new Date(e.date) >= now && !['Completed', 'Canceled'].includes(e.status)).length;
    
    return { totalRevenue, openPipelineValue, averageMargin, upcomingEventsCount };
  }, [eventFinancials, now, visibleEvents]);

  const alerts = useMemo(() => {
    const allAlerts: { id: string, type: 'info' | 'warning' | 'error' | 'success', message: string, eventId?: string }[] = [];
    
    if (user.permissions.canViewFinancials) {
        eventFinancials.forEach(event => {
            if (event.status === 'Confirmed' && event.margin < 15) {
                allAlerts.push({
                    id: `margin-${event.eventId}`,
                    type: 'warning',
                    message: `<b>Low Margin Alert:</b> "${event.name}" is confirmed with only a <b>${event.margin.toFixed(1)}%</b> margin. Review costs immediately.`,
                    eventId: event.eventId
                });
            }
        });
    }

    if (user.role === 'Sales') {
        eventFinancials.forEach(event => {
            if (event.status === 'Completed' && event.salespersonId === user.userId && !event.commissionPaid) {
                 allAlerts.push({
                    id: `comm-${event.eventId}`,
                    type: 'success',
                    message: `<b>Commission Ready:</b> Commission for the completed event "${event.name}" is pending payment.`,
                    eventId: event.eventId
                });
            }
        });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const clientLastEvent: Record<string, string> = {};
    visibleEvents.forEach(event => {
      const client = clients.find(c => c.companyName === event.clientName);
      if (client) {
        if (!clientLastEvent[client.id] || new Date(event.date) > new Date(clientLastEvent[client.id])) {
          clientLastEvent[client.id] = event.date;
        }
      }
    });

    Object.entries(clientLastEvent).forEach(([clientId, lastDate]) => {
      if (new Date(lastDate) < sixMonthsAgo) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            allAlerts.push({
                id: `engage-${clientId}`,
                type: 'info',
                message: `<b>Client Engagement:</b> It's been over 6 months since the last event with <b>${client.companyName}</b>. Time to follow up!`
            });
        }
      }
    });

    return allAlerts.sort((a,b) => {
        const order = { 'error': 0, 'warning': 1, 'success': 2, 'info': 3 };
        return order[a.type] - order[b.type];
    });

  }, [eventFinancials, user, clients, now, visibleEvents]);
  
  const monthlyRevenue = useMemo(() => {
      const months: Record<string, number> = {};
      eventFinancials.forEach(e => {
        if (e.status === 'Completed') {
           const m = new Date(e.date).toLocaleString('default', { month: 'short' });
           months[m] = (months[m] || 0) + e.revenue;
        }
      });
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Object.entries(months)
        .sort((a,b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
        .map(([label, value]) => ({ label, value, color: 'var(--primary-accent-color)' }));
  }, [eventFinancials]);

  const pipelineData = useMemo(() => {
      const counts = { 'Draft': 0, 'Quote Sent': 0, 'Confirmed': 0 };
      eventFinancials.forEach(e => {
          if (e.status in counts) counts[e.status as keyof typeof counts]++;
      });
      return Object.entries(counts).map(([label, value]) => ({ label, value, color: '#3b82f6' }));
  }, [eventFinancials]);


  const handleAlertClick = (eventId?: string) => {
    if (eventId) {
      setSelectedEventId(eventId);
      setView('EventDetail');
    }
  };

  const handleWidgetToggle = (widgetId: string) => {
      if (onUpdateSettings) {
          const currentWidgets = appSettings.userPreferences?.dashboardWidgets || ['kpi', 'charts', 'alerts'];
          let newWidgets;
          if (currentWidgets.includes(widgetId)) {
              newWidgets = currentWidgets.filter(w => w !== widgetId);
          } else {
              newWidgets = [...currentWidgets, widgetId];
          }
          onUpdateSettings({ userPreferences: { ...appSettings.userPreferences, dashboardWidgets: newWidgets } as any });
      }
  };

  const activeWidgets = appSettings.userPreferences?.dashboardWidgets || ['kpi', 'charts', 'alerts'];

  return (
    <div className="relative p-4 sm:p-8 space-y-10 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-y-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onMenuClick} className="p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 md:hidden transition-colors">
                <MenuIcon className="h-6 w-6" />
            </button>
            <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    {isUserView ? 'My Intelligence Hub' : 'Intelligence Hub'}
                </h1>
                <p className="text-xs md:text-sm text-[var(--text-secondary-color)] font-medium mt-1">
                    Real-time operational insights and performance metrics
                </p>
            </div>
        </div>
        
        <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto items-center">
             <button onClick={() => setIsCustomizeOpen(true)} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-white/10" title="Customize Layout">
                <SettingsIcon className="h-5 w-5 text-[var(--text-secondary-color)]" />
            </button>
            
            {user.permissions.canCreateEvents && (
                <>
                    <div className="hidden md:block h-8 w-px bg-white/10 mx-1"></div>
                    <div className="flex flex-wrap gap-2 flex-grow md:flex-grow-0">
                        <button
                            onClick={() => setShowVideoGenerator(true)}
                            className="flex-grow sm:flex-grow-0 px-3 py-2.5 bg-pink-600/20 text-pink-300 border border-pink-500/30 rounded-xl hover:bg-pink-600/30 transition flex items-center justify-center text-sm font-bold shadow-sm whitespace-nowrap"
                        >
                            <SparkleIcon className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Video </span>Studio
                        </button>
                        <button
                            onClick={onShowImageGenerator}
                            className="flex-grow sm:flex-grow-0 px-3 py-2.5 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 rounded-xl hover:bg-cyan-600/30 transition flex items-center justify-center text-sm font-bold shadow-sm whitespace-nowrap"
                        >
                            <ImageIcon className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">AI </span>Image Studio
                        </button>
                        <button
                            onClick={onShowIntelligentCreator}
                            className="flex-grow sm:flex-grow-0 px-3 py-2.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl hover:bg-purple-600/30 transition flex items-center justify-center text-sm font-bold shadow-sm whitespace-nowrap"
                        >
                            <BoltIcon className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">AI </span>Creator
                        </button>
                        <button
                            onClick={onRequestNewEvent}
                            className="flex-grow sm:flex-grow-0 px-4 py-2.5 text-white font-bold shadow-lg shadow-[var(--primary-accent-color)]/20 hover:opacity-90 hover:scale-105 transition-all flex items-center justify-center text-sm rounded-xl bg-[var(--primary-accent-color)] whitespace-nowrap"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" /> <span className="hidden sm:inline">New </span>Event
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>

      {/* Welcome Banner */}
      <div
        className="flex items-center justify-between p-6 md:p-8 rounded-3xl animate-in-item relative overflow-hidden group border"
        style={{
          background: 'linear-gradient(135deg, rgba(var(--primary-accent-color-rgb), 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderColor: 'rgba(var(--primary-accent-color-rgb), 0.2)',
          animationDelay: '100ms',
        }}
      >
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-accent-color)] opacity-5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 opacity-5 blur-[60px] rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

        <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome back, {user.name.split(' ')[0]}</h2>
            <p style={{ color: 'var(--text-secondary-color)' }} className="text-sm md:text-lg max-w-xl">
                {isUserView 
                    ? "Your sales performance metrics are ready for review. You have pending tasks." 
                    : "System status is nominal. Overview of company performance updated."}
            </p>
        </div>
        <IntelligenceHubIllustration className="h-32 w-auto hidden md:block opacity-80 group-hover:scale-110 transition-transform duration-700" />
      </div>
      
      {/* KPI Grid */}
      {activeWidgets.includes('kpi') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in-item" style={{ animationDelay: '150ms' }}>
            <ExpandableInsightCard 
                title={isUserView ? "My Revenue" : "Total Revenue"} 
                value={`SAR ${kpis.totalRevenue.toLocaleString()}`} 
                icon={<CashIcon className="h-6 w-6 text-[var(--primary-accent-color)]"/>}
                data={monthlyRevenue}
                reportType="Financial Performance Report"
                aiContextData={{ 
                    totalRevenue: kpis.totalRevenue, 
                    monthlyBreakdown: monthlyRevenue,
                    period: "Current Fiscal Year",
                    context: isUserView ? "Individual Sales Performance" : "Company Performance"
                }}
            />
            <ExpandableInsightCard 
                title={isUserView ? "My Pipeline" : "Pipeline Value"} 
                value={`SAR ${kpis.openPipelineValue.toLocaleString()}`} 
                icon={<TrendingUpIcon className="h-6 w-6 text-[var(--primary-accent-color)]"/>}
                data={pipelineData}
                reportType="Sales Pipeline Analysis"
                aiContextData={{
                    openPipelineValue: kpis.openPipelineValue,
                    eventCounts: pipelineData,
                    totalEvents: visibleEvents.length
                }}
            />
            <ExpandableInsightCard 
                title={isUserView ? "Est. Commission" : "Avg Profit Margin"} 
                value={isUserView ? `${(kpis.averageMargin * 0.15).toFixed(1)}%` : `${kpis.averageMargin.toFixed(1)}%`} 
                icon={<SparkleIcon className="h-6 w-6 text-[var(--primary-accent-color)]"/>}
                note={isUserView ? "Based on 15% rate" : "Completed Events"}
                reportType="Profitability Analysis"
                aiContextData={{
                    averageMargin: kpis.averageMargin,
                    totalRevenue: kpis.totalRevenue,
                    topEvents: eventFinancials.filter(e=>e.status==='Completed').sort((a,b)=>b.margin-a.margin).slice(0,3).map(e=>({name:e.name, margin:e.margin}))
                }}
            />
            <ExpandableInsightCard 
                title={isUserView ? "Upcoming" : "Active Events"} 
                value={kpis.upcomingEventsCount.toString()} 
                note="Scheduled" 
                icon={<DocumentTextIcon className="h-6 w-6 text-[var(--primary-accent-color)]"/>}
                reportType="Operational Workload Forecast"
                aiContextData={{
                    upcomingCount: kpis.upcomingEventsCount,
                    nextEvents: visibleEvents.filter(e => new Date(e.date) >= now && e.status !== 'Completed').slice(0, 5).map(e => ({name: e.name, date: e.date}))
                }}
            />
        </div>
      )}

      {/* Visual Analytics */}
      {activeWidgets.includes('charts') && (
        <div className="space-y-6 animate-in-item" style={{ animationDelay: '200ms' }}>
            <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary-color)'}}>
                <div className="p-2 bg-white/5 rounded-lg border border-white/10"><ChartBarIcon className="h-5 w-5 text-[var(--primary-accent-color)]" /></div>
                Visual Analytics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="p-6 rounded-2xl border shadow-xl bg-black/20 backdrop-blur-lg border-white/5 min-h-[300px]">
                    <BarChart 
                        data={monthlyRevenue} 
                        title="Monthly Revenue Trend" 
                        yAxisLabel="Amount (SAR)" 
                    />
                 </div>
                 <div className="p-6 rounded-2xl border shadow-xl bg-black/20 backdrop-blur-lg border-white/5 min-h-[300px]">
                    <BarChart 
                        data={pipelineData} 
                        title="Event Status Distribution" 
                        yAxisLabel="Count" 
                    />
                 </div>
            </div>
        </div>
      )}

      {/* Real-time Alerts */}
      {activeWidgets.includes('alerts') && (
        <div className="space-y-6 animate-in-item" style={{ animationDelay: '250ms' }}>
            <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary-color)'}}>
                 <div className="p-2 bg-white/5 rounded-lg border border-white/10"><BoltIcon className="h-5 w-5 text-yellow-400" /></div>
                Real-time Alerts 
                <span className="text-xs font-normal px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[var(--text-secondary-color)]">Live Feed</span>
            </h2>
            <div className="grid gap-4">
            {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                <div 
                    key={alert.id} 
                    className={`p-5 rounded-xl border flex items-start gap-4 transition-all hover:translate-x-1 cursor-pointer ${
                        alert.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                        alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                        alert.type === 'success' ? 'bg-green-500/10 border-green-500/20' :
                        'bg-blue-500/10 border-blue-500/20'
                    }`}
                    onClick={() => handleAlertClick(alert.eventId)}
                >
                    <div className={`p-2 rounded-full flex-shrink-0 ${
                         alert.type === 'error' ? 'bg-red-500/20 text-red-400' :
                         alert.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                         alert.type === 'success' ? 'bg-green-500/20 text-green-400' :
                         'bg-blue-500/20 text-blue-400'
                    }`}>
                        <BoltIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary-color)' }} dangerouslySetInnerHTML={{ __html: alert.message }}></p>
                        {alert.eventId && <p className="text-xs font-bold mt-2 uppercase tracking-wide opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1">View Details &rarr;</p>}
                    </div>
                </div>
                ))
            ) : (
                <div className="p-8 rounded-xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
                    <NoAlertsIllustration className="h-32 w-32 opacity-50 mb-4" />
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary-color)' }}>All Systems Nominal</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary-color)' }}>No urgent alerts requiring attention.</p>
                </div>
            )}
            </div>
        </div>
      )}
      
      {/* Video Generator Modal */}
      {showVideoGenerator && (
        <VideoGenerator
          onClose={() => setShowVideoGenerator(false)}
          setError={(msg) => console.error(msg)} 
          onLogAIInteraction={(data) => console.log("Video Gen Interaction", data)}
        />
      )}

       {/* Customize Modal */}
      {isCustomizeOpen && (
        <Modal title="Customize Dashboard" onClose={() => setIsCustomizeOpen(false)}>
            <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary-color)]">Select the widgets you want to see on your dashboard.</p>
                {[
                    { id: 'kpi', label: 'Key Performance Indicators (KPIs)' },
                    { id: 'charts', label: 'Visual Analytics Charts' },
                    { id: 'alerts', label: 'Real-time Alerts & Notifications' }
                ].map(widget => (
                    <label key={widget.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer hover:bg-black/30">
                        <input 
                            type="checkbox" 
                            checked={activeWidgets.includes(widget.id)}
                            onChange={() => handleWidgetToggle(widget.id)}
                            className="w-5 h-5 rounded border-gray-500 text-[var(--primary-accent-color)] focus:ring-[var(--primary-accent-color)]"
                        />
                        <span className="font-medium" style={{ color: 'var(--text-primary-color)' }}>{widget.label}</span>
                    </label>
                ))}
            </div>
        </Modal>
      )}
    </div>
  );
};
