
import React, { useState, useMemo } from 'react';
import type { EventItem, ServiceItem, User, Client, AppSettings, QuotationTemplate, ProposalTemplate, CostTrackerItem, Task, AIInteraction, PaymentStatus, EventStatus } from '../types';
import { MenuIcon, SparkleIcon, PlusIcon, EditIcon, TrashIcon, DocumentTextIcon, ChartBarIcon, BoltIcon, CalendarIcon, MapPinIcon, UsersIcon, CreditCardIcon, EyeIcon, DownloadIcon, XIcon, CheckCircleIcon } from './common/icons';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { ConfirmationModal } from './common/ConfirmationModal';
import { QuotationGenerator } from './features/QuotationGenerator';
import { ProposalGenerator } from './features/ProposalGenerator';
import { ServiceSuggester } from './features/ServiceSuggester';
import { EventSuggester } from './features/EventSuggester';
import { ImageAnalyzer } from './features/ImageAnalyzer';
import { AIInteractionHistory } from './features/AIInteractionHistory';
import { BulkServiceAdder } from './features/BulkServiceAdder';
import { PromptItemEditor } from './features/PromptItemEditor';
import { SmartItemImporter } from './features/SmartItemImporter';
import { generateEventTheme, generateImageForPrompt } from '../../services/geminiService';
import { InlineSpinner } from './common/LoadingSpinner';

interface EventDetailProps {
  event: EventItem;
  services: ServiceItem[];
  user: User;
  users: User[];
  clients: Client[];
  appSettings: AppSettings;
  setView: (view: string) => void;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
  onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
  onDeleteEvent: (eventId: string) => void;
  onLogAIInteraction: (eventId: string, interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
  quotationTemplates: QuotationTemplate[];
  onAddTemplate: (templateData: Omit<QuotationTemplate, 'templateId'>) => void;
  onUpdateTemplate: (templateId: string, data: Partial<QuotationTemplate>) => void;
  onDeleteTemplate: (templateId: string) => void;
  proposalTemplates: ProposalTemplate[];
  onAddProposalTemplate: (templateData: Omit<ProposalTemplate, 'id'>) => void;
  onDeleteProposalTemplate: (templateId: string) => void;
  onMenuClick: () => void;
  onAddClient: (clientData: Omit<Client, 'id'>) => void;
  onUpdateClient: (clientId: string, data: Partial<Client>) => void;
}

const statusColors: { [key: string]: string } = {
  'Draft': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Quote Sent': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Confirmed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Completed': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Canceled': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export const EventDetail: React.FC<EventDetailProps> = ({
    event, services, user, users, clients, appSettings, setView, setError, setSuccess,
    onUpdateEvent, onDeleteEvent, onLogAIInteraction,
    quotationTemplates, onAddTemplate, onUpdateTemplate, onDeleteTemplate,
    proposalTemplates, onAddProposalTemplate, onDeleteProposalTemplate, onMenuClick, onAddClient, onUpdateClient
}) => {
    // Modals State
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
    const [showServiceSuggester, setShowServiceSuggester] = useState(false);
    const [showEventSuggester, setShowEventSuggester] = useState(false);
    const [showImageAnalyzer, setShowImageAnalyzer] = useState(false);
    const [showBulkServiceAdder, setShowBulkServiceAdder] = useState(false);
    const [showSmartItemImporter, setShowSmartItemImporter] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Editing States
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editedEvent, setEditedEvent] = useState<EventItem>(event);
    const [editingItem, setEditingItem] = useState<CostTrackerItem | null>(null);
    const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
    
    // Task State
    const [newTask, setNewTask] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');

    // Derived Data
    const totalCost = (event.cost_tracker || []).reduce((sum, item) => sum + (item.unit_cost_sar || 0) * (item.quantity || 0), 0);
    const totalRevenue = (event.cost_tracker || []).reduce((sum, item) => sum + (item.client_price_sar || 0) * (item.quantity || 0), 0);
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Handlers
    const handleSaveDetails = () => {
        onUpdateEvent(event.eventId, editedEvent);
        setIsEditingDetails(false);
        setSuccess("Event details updated.");
    };

    const handleAddItem = (items: CostTrackerItem[]) => {
        const itemsWithUniqueIds = items.map(item => ({
            ...item,
            itemId: item.itemId || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        
        const updatedTracker = [...(event.cost_tracker || []), ...itemsWithUniqueIds];
        onUpdateEvent(event.eventId, { cost_tracker: updatedTracker });
        setSuccess(`${items.length} items added.`);
        setShowBulkServiceAdder(false);
        setShowSmartItemImporter(false);
    };

    const handleRemoveItem = (itemId: string) => {
        const updatedTracker = (event.cost_tracker || []).filter(i => i.itemId !== itemId);
        onUpdateEvent(event.eventId, { cost_tracker: updatedTracker });
    };

    const handleUpdateItem = (updatedItem: CostTrackerItem) => {
        if (!updatedItem.itemId) return;
        
        const updatedTracker = (event.cost_tracker || []).map(i => 
            i.itemId === updatedItem.itemId ? { ...i, ...updatedItem } : i
        );
        onUpdateEvent(event.eventId, { cost_tracker: updatedTracker });
        setEditingItem(null); 
        setSuccess("Item updated successfully.");
    };

    const handleAddTask = () => {
        if (!newTask.trim()) return;
        const task: Task = {
            id: `t-${Date.now()}`,
            description: newTask,
            isCompleted: false,
            dueDate: newTaskDueDate || undefined,
            createdAt: new Date().toISOString()
        };
        onUpdateEvent(event.eventId, { tasks: [task, ...(event.tasks || [])] });
        setNewTask('');
        setNewTaskDueDate('');
    };

    const handleToggleTask = (taskId: string) => {
        const updatedTasks = (event.tasks || []).map(t => 
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        );
        onUpdateEvent(event.eventId, { tasks: updatedTasks });
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedTasks = (event.tasks || []).filter(t => t.id !== taskId);
        onUpdateEvent(event.eventId, { tasks: updatedTasks });
    };

    const handleDeleteEvent = () => {
        onDeleteEvent(event.eventId);
        setView('Events');
    };
    
    const handleGenerateTheme = async () => {
        setIsGeneratingTheme(true);
        setError(null);
        try {
            const themeData = await generateEventTheme(event);
            const imageBytes = await generateImageForPrompt(themeData.imagePrompt);
            const themeImage = `data:image/jpeg;base64,${imageBytes}`;

            onUpdateEvent(event.eventId, {
                proposalContent: {
                    ...event.proposalContent,
                    themeTitle: themeData.title,
                    themeDescription: themeData.description,
                    themeImage: themeImage
                }
            });

            onLogAIInteraction(event.eventId, {
                feature: 'theme',
                promptSummary: `Generate theme for ${event.name}`,
                fullPrompt: `Generate theme for event: ${JSON.stringify({name: event.name, type: event.eventType})}`,
                response: JSON.stringify(themeData),
                model: 'gemini-2.5-pro'
            });
            
            setSuccess("New Event Theme Generated!");

        } catch (e: any) {
            setError(e);
        } finally {
            setIsGeneratingTheme(false);
        }
    };

    const logInteraction = (data: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => {
        onLogAIInteraction(event.eventId, data);
    };

    const getTaskStatus = (task: Task) => {
        if (task.isCompleted) return 'completed';
        if (!task.dueDate) return 'pending';
        
        const today = new Date().toISOString().split('T')[0];
        if (task.dueDate < today) return 'overdue';
        if (task.dueDate === today) return 'due-today';
        return 'upcoming';
    };

    const sortedTasks = useMemo(() => {
        return [...(event.tasks || [])].sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
            if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [event.tasks]);

    const hasTheme = !!event.proposalContent?.themeTitle;

    return (
        <div className="p-4 sm:p-6 space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex items-center gap-2 w-full xl:w-auto">
                    <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold break-words" style={{ color: 'var(--text-primary-color)' }}>{event.name}</h1>
                            <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-bold uppercase rounded border ${statusColors[event.status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                {event.status}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 flex flex-wrap items-center gap-2 mt-1" style={{ color: 'var(--text-secondary-color)' }}>
                             <span className="flex items-center gap-1"><CalendarIcon className="h-4 w-4"/> {new Date(event.date).toLocaleDateString()}</span>
                             <span className="hidden sm:inline">•</span> 
                             <span className="flex items-center gap-1"><MapPinIcon className="h-4 w-4"/> {event.location}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full xl:w-auto justify-start xl:justify-end flex-wrap">
                    {event.status === 'Draft' && (
                        <button 
                            onClick={() => onUpdateEvent(event.eventId, { status: 'Quote Sent' })}
                            className="px-3 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center shadow-lg"
                        >
                            <CheckCircleIcon className="h-4 w-4"/> Mark Quote Sent
                        </button>
                    )}
                    <button onClick={() => setIsProposalModalOpen(true)} className="px-3 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center shadow-lg">
                        <SparkleIcon className="h-4 w-4"/> Proposal Studio
                    </button>
                    <button onClick={() => setIsQuotationModalOpen(true)} className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center shadow-lg">
                        <DocumentTextIcon className="h-4 w-4"/> Generate Quote
                    </button>
                    <div className="w-px h-8 bg-white/10 hidden sm:block mx-1"></div>
                    <button onClick={() => setIsEditingDetails(true)} className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center">
                        <EditIcon className="h-4 w-4"/> Edit
                    </button>
                     <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center">
                        <TrashIcon className="h-4 w-4"/>
                    </button>
                </div>
            </div>

            {/* AI Toolbar */}
            <div className="p-4 rounded-xl border bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-white/10 overflow-x-auto custom-scrollbar">
                <div className="flex gap-3 items-center min-w-max">
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-300 flex items-center gap-2 mr-2">
                        <SparkleIcon className="h-4 w-4"/> AI Agents
                    </span>
                    <button onClick={handleGenerateTheme} disabled={isGeneratingTheme} className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-full hover:bg-purple-700 shadow-lg transition transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                         {isGeneratingTheme ? <InlineSpinner /> : <SparkleIcon className="h-3 w-3" />}
                         {hasTheme ? 'Regenerate Theme' : 'Generate Theme'}
                    </button>
                    <button onClick={() => setShowEventSuggester(true)} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transition transform active:scale-95">
                        Quick Ideas
                    </button>
                    <button onClick={() => setShowServiceSuggester(true)} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transition transform active:scale-95">
                        Suggest Services
                    </button>
                    <button onClick={() => setShowImageAnalyzer(true)} className="px-3 py-1.5 text-xs font-semibold bg-cyan-600 text-white rounded-full hover:bg-cyan-700 shadow-lg transition transform active:scale-95">
                        Analyze Image
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Generated Theme Card */}
                {hasTheme && (
                    <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border group shadow-xl" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                        {event.proposalContent?.themeImage && (
                            <div className="absolute inset-0 z-0">
                                <img 
                                    src={event.proposalContent.themeImage} 
                                    alt="Theme Concept" 
                                    className="w-full h-full object-cover opacity-40 transition-transform duration-[20s] ease-linear group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
                            </div>
                        )}
                        <div className="relative z-10 p-6 sm:p-8 max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-accent-color)]/20 border border-[var(--primary-accent-color)]/30 backdrop-blur-md mb-4">
                                <SparkleIcon className="h-3 w-3 text-[var(--primary-accent-color)]" />
                                <span className="text-xs font-bold uppercase tracking-widest text-[var(--primary-accent-color)]">AI Theme Concept</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight drop-shadow-lg">{event.proposalContent?.themeTitle}</h2>
                            <p className="text-base sm:text-lg text-slate-200 leading-relaxed drop-shadow-md">{event.proposalContent?.themeDescription}</p>
                        </div>
                    </div>
                )}

                {/* Left Column: Client, Financials & Tasks */}
                <div className="space-y-6">
                     {/* Client Info (Moved to Top) */}
                    <div className="p-6 rounded-xl border shadow-lg" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                         <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary-color)' }}>
                            <UsersIcon className="h-5 w-5 text-blue-400"/> Client Details
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start justify-between">
                                <span className="opacity-60">Organization</span>
                                <span className="font-semibold text-right">{event.clientName}</span>
                            </div>
                            <div className="flex items-start justify-between">
                                <span className="opacity-60">Primary Contact</span>
                                <span className="text-right">{event.clientContact}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                                <span className="opacity-60">Payment Status</span>
                                <span className={`font-bold px-2 py-0.5 rounded text-xs ${event.paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{event.paymentStatus}</span>
                            </div>
                        </div>
                    </div>

                    {/* Financial Overview */}
                    <div className="p-6 rounded-xl border shadow-lg" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary-color)' }}>
                            <ChartBarIcon className="h-5 w-5 text-[var(--primary-accent-color)]"/> Financials
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm opacity-70">Revenue</span>
                                <span className="font-bold text-green-400">SAR {totalRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm opacity-70">Cost</span>
                                <span className="font-bold text-red-400">SAR {totalCost.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                <span className="text-sm font-bold">Net Profit</span>
                                <span className="font-bold text-[var(--primary-accent-color)]">SAR {profit.toLocaleString()}</span>
                            </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="opacity-70">Margin</span>
                                <span className={`font-bold ${margin < 20 ? 'text-yellow-400' : 'text-green-400'}`}>{margin.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Task Manager */}
                    <div className="p-6 rounded-xl border shadow-lg flex flex-col" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)', minHeight: '400px' }}>
                        <div className="flex items-center justify-between mb-4">
                             <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary-color)' }}>
                                <BoltIcon className="h-5 w-5 text-yellow-400"/> Tasks
                            </h3>
                            <span className="text-xs font-medium px-2 py-1 rounded bg-white/5 border border-white/10 text-[var(--text-secondary-color)]">
                                {(event.tasks || []).filter(t => !t.isCompleted).length} Pending
                            </span>
                        </div>

                        <div className="flex flex-col gap-3 mb-4 bg-black/20 p-3 rounded-lg border border-white/5">
                            <input 
                                type="text" 
                                value={newTask} 
                                onChange={e => setNewTask(e.target.value)}
                                placeholder="Add a new task..."
                                className="w-full bg-transparent border-b border-white/20 p-2 text-sm focus:border-[var(--primary-accent-color)] outline-none transition-colors"
                                style={{ color: 'var(--text-primary-color)' }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            />
                            <div className="flex gap-2 items-center flex-wrap">
                                <input 
                                    type="date" 
                                    value={newTaskDueDate} 
                                    onChange={e => setNewTaskDueDate(e.target.value)}
                                    className="bg-transparent text-xs text-[var(--text-secondary-color)] border border-white/10 rounded p-1.5 focus:border-[var(--primary-accent-color)] outline-none cursor-pointer flex-grow sm:flex-grow-0"
                                />
                                <button 
                                    onClick={handleAddTask} 
                                    disabled={!newTask.trim()}
                                    className="flex-grow sm:flex-grow-0 px-3 py-1.5 bg-[var(--primary-accent-color)] text-white rounded text-xs font-bold hover:opacity-90 disabled:opacity-50 uppercase tracking-wide transition-all shadow-md whitespace-nowrap"
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>
                        
                        <ul className="space-y-2 overflow-y-auto custom-scrollbar flex-grow pr-1 max-h-[300px]">
                            {sortedTasks.map(task => {
                                const status = getTaskStatus(task);
                                return (
                                    <li 
                                        key={task.id} 
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all group ${
                                            status === 'completed' ? 'bg-white/5 border-transparent opacity-50' :
                                            status === 'overdue' ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' :
                                            status === 'due-today' ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50' :
                                            'bg-black/20 border-transparent hover:border-white/10'
                                        }`}
                                    >
                                        <div className="pt-0.5 flex-shrink-0">
                                            <input 
                                                type="checkbox" 
                                                checked={task.isCompleted} 
                                                onChange={() => handleToggleTask(task.id)}
                                                className={`w-4 h-4 rounded cursor-pointer border-2 transition-colors focus:ring-0 focus:ring-offset-0 ${
                                                    status === 'overdue' && !task.isCompleted ? 'border-red-400 text-red-500' : 
                                                    'border-slate-500 text-[var(--primary-accent-color)] bg-transparent'
                                                }`}
                                            />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className={`text-sm leading-snug transition-all break-words ${task.isCompleted ? 'line-through text-slate-500' : 'text-[var(--text-primary-color)]'}`}>
                                                {task.description}
                                            </p>
                                            {task.dueDate && (
                                                <div className={`text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ${
                                                    status === 'overdue' ? 'text-red-400' : 
                                                    status === 'due-today' ? 'text-amber-400' : 
                                                    task.isCompleted ? 'text-slate-600' : 'text-slate-400'
                                                }`}>
                                                    {(status === 'overdue' || status === 'due-today') && !task.isCompleted && <BoltIcon className="h-3 w-3" />}
                                                    <span>
                                                        {status === 'overdue' ? 'Overdue ' : status === 'due-today' ? 'Due Today ' : 'Due '}
                                                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteTask(task.id)} 
                                            className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-all transform sm:hover:scale-110"
                                            title="Delete Task"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5"/>
                                        </button>
                                    </li>
                                );
                            })}
                             {sortedTasks.length === 0 && (
                                 <div className="flex flex-col items-center justify-center py-8 text-[var(--text-secondary-color)] opacity-50 border border-dashed border-white/10 rounded-lg">
                                     <BoltIcon className="h-6 w-6 mb-2" />
                                     <p className="text-xs">No tasks yet.</p>
                                 </div>
                             )}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Services & Costs */}
                <div className="lg:col-span-2 space-y-6">
                     <div className="p-4 sm:p-6 rounded-xl border shadow-lg min-h-[500px] flex flex-col" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary-color)' }}>Services & Costs</h2>
                            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                                <button onClick={() => setShowSmartItemImporter(true)} className="flex-grow sm:flex-grow-0 px-4 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 border border-white/10">
                                    <SparkleIcon className="h-4 w-4"/> <span className="hidden sm:inline">Smart</span> Import
                                </button>
                                <button onClick={() => setShowBulkServiceAdder(true)} className="flex-grow sm:flex-grow-0 px-3 py-2 text-sm bg-[var(--primary-accent-color)] text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95">
                                    <PlusIcon className="h-4 w-4"/> Add Services
                                </button>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto flex-grow border rounded-lg" style={{borderColor: 'var(--border-color)'}}>
                            <table className="min-w-full text-sm">
                                <thead className="border-b bg-black/20" style={{ borderColor: 'var(--border-color)' }}>
                                    <tr>
                                        <th className="text-left py-2 px-4 opacity-60 min-w-[200px]">Item</th>
                                        <th className="text-center py-2 px-4 opacity-60">Qty</th>
                                        <th className="text-right py-2 px-4 opacity-60 min-w-[100px]">Unit Cost</th>
                                        <th className="text-right py-2 px-4 opacity-60 min-w-[100px]">Price</th>
                                        <th className="text-right py-2 px-4 opacity-60 min-w-[100px]">Total</th>
                                        <th className="text-right py-2 px-4 opacity-60">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                                    {(event.cost_tracker || []).map((item, index) => (
                                        <tr key={item.itemId || index} className="hover:bg-black/10 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-[var(--text-primary-color)] line-clamp-2">{item.name}</div>
                                                <div className="text-xs opacity-60 truncate max-w-[200px]" style={{ color: 'var(--text-secondary-color)' }}>{item.description}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center">{item.quantity || 0}</td>
                                            <td className="py-3 px-4 text-right text-red-400">{(item.unit_cost_sar || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right text-green-400">{(item.client_price_sar || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right font-bold">SAR {((item.client_price_sar || 0) * (item.quantity || 0)).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingItem(item)} className="p-1 hover:bg-white/10 rounded text-blue-400"><EditIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => handleRemoveItem(item.itemId)} className="p-1 hover:bg-white/10 rounded text-red-400"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(event.cost_tracker || []).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 opacity-50">No items added yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                     </div>
                </div>
            </div>
            
            <div className="mt-6 flex justify-end">
                <div className="text-xs text-[var(--text-secondary-color)] opacity-60">
                    Last updated: {new Date().toLocaleString()}
                </div>
            </div>

            {/* Modals */}
            {isEditingDetails && (
                <Modal title="Edit Event Details" onClose={() => setIsEditingDetails(false)} onSave={handleSaveDetails}>
                    <div className="space-y-4">
                        <InputField label="Event Name" value={editedEvent.name} onChange={e => setEditedEvent({...editedEvent, name: e.target.value})} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Client Name" value={editedEvent.clientName} onChange={e => setEditedEvent({...editedEvent, clientName: e.target.value})} />
                            <InputField label="Client Contact" value={editedEvent.clientContact} onChange={e => setEditedEvent({...editedEvent, clientContact: e.target.value})} />
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Date" type="date" value={editedEvent.date} onChange={e => setEditedEvent({...editedEvent, date: e.target.value})} />
                            <InputField label="Location" value={editedEvent.location} onChange={e => setEditedEvent({...editedEvent, location: e.target.value})} />
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Guest Count" type="number" value={editedEvent.guestCount} onChange={e => setEditedEvent({...editedEvent, guestCount: Number(e.target.value)})} />
                             <div>
                                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Payment Status</label>
                                <select
                                    value={editedEvent.paymentStatus}
                                    onChange={e => setEditedEvent({...editedEvent, paymentStatus: e.target.value as PaymentStatus})}
                                    className="mt-1 block w-full p-2 border shadow-sm rounded"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                >
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Partially Paid">Partially Paid</option>
                                    <option value="Paid">Paid</option>
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Status</label>
                            <select
                                value={editedEvent.status}
                                onChange={e => setEditedEvent({...editedEvent, status: e.target.value as EventStatus})}
                                className="mt-1 block w-full p-2 border shadow-sm rounded"
                                style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                            >
                                <option>Draft</option>
                                <option>Quote Sent</option>
                                <option>Confirmed</option>
                                <option>Completed</option>
                                <option>Canceled</option>
                            </select>
                        </div>
                    </div>
                </Modal>
            )}

            {showBulkServiceAdder && (
                <BulkServiceAdder 
                    services={services} 
                    existingItemIds={new Set(event.cost_tracker.map(i => i.masterServiceId).filter(Boolean) as string[])}
                    onClose={() => setShowBulkServiceAdder(false)} 
                    onAddItems={handleAddItem} 
                />
            )}

            {showSmartItemImporter && (
                <SmartItemImporter
                    onClose={() => setShowSmartItemImporter(false)}
                    onAddItems={handleAddItem}
                    setError={setError}
                    onLogInteraction={logInteraction}
                />
            )}

            {editingItem && (
                <PromptItemEditor 
                    item={editingItem}
                    event={event}
                    onClose={() => setEditingItem(null)}
                    setError={setError}
                    onUpdateItem={handleUpdateItem}
                    onLogInteraction={logInteraction}
                />
            )}

            {isQuotationModalOpen && (
                <QuotationGenerator 
                    event={event} 
                    services={services}
                    templates={quotationTemplates}
                    appSettings={appSettings}
                    onClose={() => setIsQuotationModalOpen(false)} 
                    setError={setError} 
                    setSuccess={setSuccess}
                    onUpdateEvent={onUpdateEvent}
                    onLogInteraction={logInteraction}
                    onAddTemplate={onAddTemplate}
                    onUpdateTemplate={onUpdateTemplate}
                    onDeleteTemplate={onDeleteTemplate}
                />
            )}

            {isProposalModalOpen && (
                <ProposalGenerator 
                    event={event}
                    appSettings={appSettings}
                    onClose={() => setIsProposalModalOpen(false)}
                    setError={setError}
                    onLogInteraction={logInteraction}
                />
            )}

            {showServiceSuggester && (
                <ServiceSuggester 
                    event={event} 
                    onClose={() => setShowServiceSuggester(false)} 
                    setError={setError}
                    onLogInteraction={logInteraction}
                />
            )}

            {showEventSuggester && (
                <EventSuggester 
                    event={event} 
                    onClose={() => setShowEventSuggester(false)} 
                    setError={setError}
                    onLogInteraction={logInteraction}
                />
            )}
            
             {showImageAnalyzer && (
                <ImageAnalyzer 
                    onClose={() => setShowImageAnalyzer(false)} 
                    setError={setError}
                    onLogInteraction={logInteraction}
                    eventId={event.eventId}
                />
            )}
            
            {showDeleteConfirm && (
                <ConfirmationModal
                    title="Delete Event"
                    message={`Are you sure you want to delete "${event.name}"? This action cannot be undone.`}
                    onConfirm={handleDeleteEvent}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmText="Delete"
                    cancelText="Cancel"
                />
            )}
            
            <div className="mt-8">
                <AIInteractionHistory history={event.aiInteractionHistory || []} />
            </div>
        </div>
    );
};
