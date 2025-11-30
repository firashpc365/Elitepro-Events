
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import type { EventItem, User, EventStatus, PaymentStatus, Task, AppSettings, RiskAnalysisResult } from '../types';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { ImageUploader } from './common/ImageUploader';
import { MenuIcon, DownloadIcon, PlusIcon, SparkleIcon, BoltIcon, EyeIcon, HeartIcon, BriefcaseIcon, CakeIcon, UsersIcon, StarIcon } from './common/icons';
import { analyzeEventRisks } from '../services/geminiService';
import { InlineSpinner } from './common/LoadingSpinner';

interface EventListProps {
  events: EventItem[];
  user: User;
  users: User[];
  setView: (view: string) => void;
  setSelectedEventId: (id: string) => void;
  onAddEvent: (eventData: Omit<EventItem, 'eventId' | 'cost_tracker' | 'commissionPaid' | 'tasks'> & { tasks?: Task[] }) => void;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
  onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
  isAddEventModalOpen: boolean;
  onToggleAddEventModal: (isOpen: boolean) => void;
  onMenuClick: () => void;
  appSettings?: AppSettings;
  onUpdateSettings?: (newSettings: Partial<AppSettings>) => void;
}

const statusColors: { [key: string]: string } = {
  'Draft': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Quote Sent': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Confirmed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Completed': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Canceled': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

interface ViewOptions {
    showDate: boolean;
    showLocation: boolean;
    showGuests: boolean;
    showPayment: boolean;
    showSalesperson: boolean;
}

const getEventTypeIcon = (type?: string) => {
    switch(type?.toLowerCase()) {
        case 'wedding': return { icon: <HeartIcon className="h-4 w-4" />, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', label: 'Wedding' };
        case 'corporate': return { icon: <BriefcaseIcon className="h-4 w-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Corporate' };
        case 'birthday': return { icon: <CakeIcon className="h-4 w-4" />, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Birthday' };
        case 'social': return { icon: <UsersIcon className="h-4 w-4" />, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Social' };
        default: return { icon: <StarIcon className="h-4 w-4" />, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: type || 'Other' };
    }
};

const EventCard: React.FC<{ event: EventItem; salesperson?: User; onClick: () => void; index: number; riskAnalysis?: RiskAnalysisResult; viewOptions: ViewOptions; isDragged: boolean; isDragOver: boolean; dragHandlers: any; }> = ({ event, salesperson, onClick, index, riskAnalysis, viewOptions, isDragged, isDragOver, dragHandlers }) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const keyServices = useMemo(() => {
      if (!event.cost_tracker || event.cost_tracker.length === 0) return null;
      const sorted = [...event.cost_tracker].sort((a, b) => (b.client_price_sar * b.quantity) - (a.client_price_sar * a.quantity));
      const topItems = sorted.slice(0, 2).map(i => i.name);
      const remaining = sorted.length - 2;
      return remaining > 0 ? `${topItems.join(', ')} +${remaining} others` : topItems.join(', ');
  }, [event.cost_tracker]);

  const riskBorderColor = riskAnalysis?.riskLevel === 'High' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 
                          riskAnalysis?.riskLevel === 'Medium' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-[var(--border-color)]';
  
  const riskBadgeColor = riskAnalysis?.riskLevel === 'High' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 
                         riskAnalysis?.riskLevel === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : '';

  const dynamicClasses = [
    'group', 'relative', 'flex', 'flex-col', 'justify-between', 'p-5', 'rounded-2xl', 'border',
    'transition-all', 'duration-300', 'hover:shadow-2xl', 'hover:-translate-y-1', 'overflow-hidden',
    'backdrop-blur-xl', 'animate-in-item', 'opacity-0'
  ];

  if (isDragged) {
      dynamicClasses.push('opacity-30', 'cursor-grabbing');
  } else {
      dynamicClasses.push('cursor-grab');
  }

  if (isDragOver) {
      dynamicClasses.push('scale-105', 'border-2', 'border-dashed', 'border-[var(--primary-accent-color)]');
  } else {
      dynamicClasses.push(riskBorderColor);
  }

  const typeConfig = getEventTypeIcon(event.eventType);

  return (
    <div
        onClick={onClick}
        draggable
        {...dragHandlers}
        className={dynamicClasses.join(' ')}
        style={{
            backgroundColor: 'var(--card-container-color)',
            borderRadius: 'var(--border-radius)',
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'forwards',
        }}
    >
        {/* Header: Status & Type */}
        <div className="flex justify-between items-start mb-3">
             <div className="flex gap-2">
                <span className={`flex-shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm uppercase tracking-wider ${statusColors[event.status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                    {event.status}
                </span>
                <span className={`flex items-center gap-1 flex-shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm uppercase tracking-wider ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}>
                    {typeConfig.icon} {typeConfig.label}
                </span>
             </div>
             {riskAnalysis && riskAnalysis.riskLevel !== 'Low' && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${riskBadgeColor}`}>
                    <BoltIcon className="h-3 w-3" /> {riskAnalysis.riskLevel} Risk
                </div>
            )}
        </div>

        {/* Main Content & Summary */}
        <div className="mb-4">
             <h3 className="text-xl font-extrabold leading-tight mb-3 line-clamp-2 group-hover:text-[var(--primary-accent-color)] transition-colors" style={{ color: 'var(--text-primary-color)'}}>
                {event.name}
            </h3>
            
            <div className="bg-black/20 rounded-lg p-3 text-xs space-y-2 border border-white/5">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary-color)' }}>{event.clientName}</span>
                    {viewOptions.showDate && (
                        <span style={{ color: 'var(--text-secondary-color)' }}>{formatDate(event.date)}</span>
                    )}
                </div>
                {viewOptions.showLocation && (
                    <div className="flex items-start gap-1.5 text-[var(--text-secondary-color)]">
                        <span className="flex-shrink-0">📍</span> <span className="truncate">{event.location}</span>
                    </div>
                )}
                {keyServices && (
                     <div className="pt-2 border-t border-dashed border-white/10" style={{ color: 'var(--text-secondary-color)' }}>
                        <span className="font-medium opacity-70 uppercase text-[10px] tracking-wide">Key Services:</span>
                        <p className="mt-0.5 line-clamp-2 leading-relaxed">{keyServices}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs pt-3 border-t border-dashed" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary-color)' }}>
             {viewOptions.showGuests && (
                <div className="flex items-center gap-1.5">
                    <span className="flex-shrink-0">👤</span> <span>{event.guestCount} Guests</span>
                </div>
             )}
             {viewOptions.showPayment && (
                <div className="flex items-center gap-1.5">
                    <span className="flex-shrink-0">💳</span> <span className={`${event.paymentStatus === 'Paid' ? 'text-green-400' : event.paymentStatus === 'Partially Paid' ? 'text-yellow-400' : ''}`}>{event.paymentStatus}</span>
                </div>
             )}
             {viewOptions.showSalesperson && salesperson && (
                <div className="flex items-center gap-1.5 overflow-hidden col-span-2">
                   <span className="flex-shrink-0">💼</span> <span className="truncate">Rep: {salesperson.name}</span>
                </div>
             )}
        </div>
        
        {riskAnalysis && (riskAnalysis.riskFactors.length > 0 || riskAnalysis.suggestedStatus) && (
            <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                {riskAnalysis.suggestedStatus && riskAnalysis.suggestedStatus !== event.status && (
                    <div className="flex items-center gap-1 text-cyan-400 mb-1 font-semibold">
                        <SparkleIcon className="h-3 w-3" /> Suggested: {riskAnalysis.suggestedStatus}
                    </div>
                )}
                {riskAnalysis.riskFactors.map((factor, idx) => (
                    <p key={idx} className="text-red-300/80 truncate">• {factor}</p>
                ))}
            </div>
        )}

        <div className={`absolute bottom-0 left-0 w-full h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${riskAnalysis?.riskLevel === 'High' ? 'bg-red-500' : riskAnalysis?.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-[var(--primary-accent-color)]'}`}></div>
    </div>
  );
};

export const EventList: React.FC<EventListProps> = ({ events, user, users, setView, setSelectedEventId, onAddEvent, setError, setSuccess, onUpdateEvent, isAddEventModalOpen, onToggleAddEventModal, onMenuClick, appSettings, onUpdateSettings }) => {
  const [newEvent, setNewEvent] = useState<Partial<Omit<EventItem, 'eventId' | 'cost_tracker' | 'commissionPaid'>>>({
    date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    paymentStatus: 'Unpaid',
    eventType: 'Other',
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskData, setRiskData] = useState<Record<string, RiskAnalysisResult>>({});
  
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverEventId, setDragOverEventId] = useState<string | null>(null);

  const defaultViewOptions: ViewOptions = {
      showDate: true, showLocation: true, showGuests: true, showPayment: true, showSalesperson: true
  };

  const [viewOptions, setViewOptions] = useState<ViewOptions>(appSettings?.userPreferences?.eventListViewOptions || defaultViewOptions);
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const salesUsers = useMemo(() => users.filter(u => u.role === 'Sales'), [users]);
  
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  // Smooth scroll to top when list updates (simulating a 'fresh' view motion)
  useLayoutEffect(() => {
      if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }, [sortedEvents.length, viewOptions]);

  useEffect(() => {
      if (onUpdateSettings && appSettings) {
           onUpdateSettings({ 
               userPreferences: { 
                   ...appSettings.userPreferences, 
                   eventListViewOptions: viewOptions 
               } as any 
           });
      }
  }, [viewOptions]);

  useEffect(() => {
    if (isAddEventModalOpen) {
      let defaultSalespersonId = user.userId;
      if (salesUsers.length > 0) {
        const currentUserIsSales = salesUsers.some(su => su.userId === user.userId);
        if (currentUserIsSales) {
          defaultSalespersonId = user.userId;
        } else {
          defaultSalespersonId = salesUsers[0].userId;
        }
      }
      setNewEvent({
        date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        paymentStatus: 'Unpaid',
        salespersonId: defaultSalespersonId,
        eventType: 'Other',
      });
    }
  }, [isAddEventModalOpen, user.userId, salesUsers]);

  const handleCardClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setView('EventDetail');
  };

  const handleSaveNewEvent = () => {
    if (!newEvent.name || !newEvent.clientName || !newEvent.date) {
      setError("Please fill all required fields (Event Name, Client Name, Date).");
      return;
    }

    if (!newEvent.location || newEvent.location.trim().length < 3) {
        setError("Please provide a valid location (at least 3 characters).");
        return;
    }

    onAddEvent({
      name: newEvent.name,
      clientName: newEvent.clientName,
      date: newEvent.date,
      location: newEvent.location.trim(),
      guestCount: Number(newEvent.guestCount) || 0,
      status: newEvent.status || 'Draft',
      clientContact: newEvent.clientContact || 'TBD',
      salespersonId: newEvent.salespersonId!,
      paymentStatus: newEvent.paymentStatus || 'Unpaid',
      imageUrl: newEvent.imageUrl,
      eventType: newEvent.eventType || 'Other',
    });
    onToggleAddEventModal(false);
  };
  
  const handleRunRiskAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const { analysis } = await analyzeEventRisks(events);
          setRiskData(analysis);
      } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to analyze risks.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Event Name', 'Client Name', 'Client Contact', 'Date', 'Location', 'Guest Count', 'Status', 'Payment Status', 'Salesperson', 'Remarks'];
    const escapeCSV = (str: string | undefined | null) => {
        if (str === null || str === undefined) return '';
        const s = String(str);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const rows = events.map(event => {
        const salesperson = users.find(u => u.userId === event.salespersonId);
        return [escapeCSV(event.eventId), escapeCSV(event.name), escapeCSV(event.clientName), escapeCSV(event.clientContact), escapeCSV(event.date), escapeCSV(event.location), event.guestCount, escapeCSV(event.status), escapeCSV(event.paymentStatus), escapeCSV(salesperson?.name || 'N/A'), escapeCSV(event.remarks)].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "events_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', eventId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
    e.preventDefault();
    if (eventId !== draggedEventId) {
      setDragOverEventId(eventId);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverEventId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetEventId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('application/json');

    if (draggedId && draggedId !== dropTargetEventId) {
      const draggedEvent = events.find(ev => ev.eventId === draggedId);
      const dropTargetEvent = events.find(ev => ev.eventId === dropTargetEventId);

      if (draggedEvent && dropTargetEvent && draggedEvent.date !== dropTargetEvent.date) {
        onUpdateEvent(draggedId, { date: dropTargetEvent.date });
        setSuccess(`Event "${draggedEvent.name}" rescheduled to ${new Date(dropTargetEvent.date).toLocaleDateString()}.`);
      }
    }
    
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedEventId(null);
    setDragOverEventId(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Events</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
             <div className="relative flex-grow sm:flex-grow-0">
                <button 
                    onClick={() => setIsViewOptionsOpen(!isViewOptionsOpen)}
                    className="w-full sm:w-auto justify-center px-3 py-2 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center rounded-lg"
                    style={{ backgroundColor: '#475569' }}
                >
                    <EyeIcon className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">View</span>
                </button>
                {isViewOptionsOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 p-3 space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Toggle Visibility</p>
                        {Object.keys(viewOptions).map(key => (
                            <label key={key} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer hover:text-white">
                                <input 
                                    type="checkbox" 
                                    checked={viewOptions[key as keyof ViewOptions]} 
                                    onChange={() => setViewOptions(prev => ({...prev, [key]: !prev[key as keyof ViewOptions]}))}
                                    className="rounded text-purple-500 focus:ring-0"
                                />
                                {key.replace('show', '')}
                            </label>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={handleRunRiskAnalysis}
                disabled={isAnalyzing}
                className="flex-grow sm:flex-grow-0 justify-center px-4 py-2 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center disabled:opacity-50 rounded-lg"
                style={{ backgroundColor: '#9333ea' }}
            >
                {isAnalyzing ? <InlineSpinner /> : <><SparkleIcon className="h-5 w-5 mr-2" /> <span className="hidden sm:inline">Risk </span>Analysis</>}
            </button>
            <button
                onClick={handleExportCSV}
                className="flex-grow sm:flex-grow-0 justify-center px-4 py-2 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center rounded-lg"
                style={{ backgroundColor: '#475569' }}
            >
                <DownloadIcon className="h-5 w-5 mr-2" /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
                onClick={() => onToggleAddEventModal(true)}
                className="flex-grow sm:flex-grow-0 justify-center px-4 py-2 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center rounded-lg"
                style={{ backgroundColor: 'var(--primary-accent-color)' }}
            >
                <PlusIcon className="h-5 w-5 mr-2" /> <span className="hidden sm:inline">New </span>Event
            </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-grow overflow-y-auto custom-scrollbar pb-20"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.map((event, index) => (
                <EventCard 
                    key={event.eventId} 
                    event={event} 
                    salesperson={users.find(u => u.userId === event.salespersonId)}
                    onClick={() => handleCardClick(event.eventId)}
                    index={index}
                    riskAnalysis={riskData[event.eventId]}
                    viewOptions={viewOptions}
                    isDragged={draggedEventId === event.eventId}
                    isDragOver={dragOverEventId === event.eventId && draggedEventId !== event.eventId}
                    dragHandlers={{
                      onDragStart: (e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, event.eventId),
                      onDragEnter: (e: React.DragEvent<HTMLDivElement>) => handleDragEnter(e, event.eventId),
                      onDragLeave: handleDragLeave,
                      onDragOver: handleDragOver,
                      onDrop: (e: React.DragEvent<HTMLDivElement>) => handleDrop(e, event.eventId),
                      onDragEnd: handleDragEnd,
                    }}
                />
            ))}
        </div>
        {events.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
                <SparkleIcon className="h-16 w-16 mb-4 text-[var(--text-secondary-color)]" />
                <p className="text-xl" style={{ color: 'var(--text-secondary-color)' }}>No events found.</p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary-color)' }}>Create your first event to get started.</p>
            </div>
        )}
      </div>

      {isAddEventModalOpen && (
        <Modal title="Create New Event" onClose={() => onToggleAddEventModal(false)} onSave={handleSaveNewEvent}>
          <div className="space-y-4">
            <InputField label="Event Name" value={newEvent.name || ''} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
                 <InputField label="Client Name" value={newEvent.clientName || ''} onChange={e => setNewEvent({ ...newEvent, clientName: e.target.value })} required />
                 <InputField label="Client Contact" value={newEvent.clientContact || ''} onChange={e => setNewEvent({ ...newEvent, clientContact: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <InputField label="Date" type="date" value={newEvent.date || ''} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required />
                </div>
                <InputField label="Location" value={newEvent.location || ''} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Guest Count" type="number" value={newEvent.guestCount || ''} onChange={e => setNewEvent({ ...newEvent, guestCount: Number(e.target.value) })} />
                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Event Type</label>
                  <select
                    value={newEvent.eventType}
                    onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
                    className="mt-1 block w-full p-2 border rounded"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Social">Social</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Status</label>
                    <select
                        value={newEvent.status}
                        onChange={e => setNewEvent({ ...newEvent, status: e.target.value as EventStatus })}
                        className="mt-1 block w-full p-2 border rounded"
                        style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                    >
                        <option>Draft</option>
                        <option>Quote Sent</option>
                        <option>Confirmed</option>
                    </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Salesperson</label>
                  <select
                    value={newEvent.salespersonId}
                    onChange={e => setNewEvent({ ...newEvent, salespersonId: e.target.value })}
                    className="mt-1 block w-full p-2 border rounded"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                  >
                    {users.map(u => (
                      <option key={u.userId} value={u.userId}>{u.name}</option>
                    ))}
                  </select>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Payment Status</label>
                <select
                    value={newEvent.paymentStatus}
                    onChange={e => setNewEvent({ ...newEvent, paymentStatus: e.target.value as PaymentStatus })}
                    className="mt-1 block w-full p-2 border rounded"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                </select>
            </div>
            <ImageUploader label="Event Image (Optional)" onImageSelected={b64 => setNewEvent({ ...newEvent, imageUrl: b64 })} />
          </div>
        </Modal>
      )}
    </div>
  );
};
