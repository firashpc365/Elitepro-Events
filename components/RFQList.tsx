
import React, { useState, useEffect } from 'react';
import type { RFQItem, RFQStatus, EventItem, User, Task, CostTrackerItem, ServiceItem, Client, AIInteraction, CustomField } from '../types';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { MenuIcon, SparkleIcon, PlusIcon, TrashIcon, EditIcon } from './common/icons';
import { IntelligentCreator } from './features/IntelligentCreator';
import { PromptItemEditor } from './features/PromptItemEditor';

interface RFQListProps {
  rfqs: RFQItem[];
  user: User;
  onAddRfq: (rfq: Omit<RFQItem, 'rfqId' | 'createdDate' | 'status' | 'items'> & { items?: CostTrackerItem[] }) => void;
  onUpdateRfq: (rfqId: string, data: Partial<RFQItem>) => void;
  onConvertToEvent: (eventData: Omit<EventItem, 'eventId' | 'cost_tracker' | 'tasks'> & { cost_tracker: CostTrackerItem[], tasks?: Task[] }) => void;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
  onMenuClick: () => void;
  services: ServiceItem[];
  clients: Client[];
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

const RFQCard: React.FC<{ rfq: RFQItem; canManage: boolean; onUpdate: (id: string, data: Partial<RFQItem>) => void; onConvert: () => void; onEdit: () => void; }> = ({ rfq, canManage, onUpdate, onConvert, onEdit }) => {
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(rfq.rfqId, { status: e.target.value as RFQStatus });
  };
  
  const itemCount = rfq.items ? rfq.items.length : 0;
    
  return (
    <div 
      className="backdrop-blur-xl border shadow-lg p-5 space-y-4 card-hover-effect h-full flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--card-container-color)',
        borderColor: 'var(--border-color)',
        borderRadius: 'var(--border-radius)',
      }}
    >
        <div>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary-color)'}}>{rfq.clientName}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary-color)'}}>{rfq.clientContact}</p>
                </div>
                <button onClick={onEdit} className="text-gray-400 hover:text-[var(--primary-accent-color)] p-1">
                    <EditIcon className="h-4 w-4" />
                </button>
            </div>
            <p className="text-sm mt-3 mb-3 line-clamp-3" style={{ color: 'var(--text-primary-color)'}}>{rfq.eventBrief}</p>
            
            {rfq.customFields && rfq.customFields.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                    {rfq.customFields.slice(0, 4).map(field => (
                        <div key={field.id} className="text-xs bg-black/10 p-1 rounded border border-white/5">
                            <span className="opacity-60 block font-mono">{field.label}</span>
                            <span className="font-medium">{field.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {itemCount > 0 && (
                 <div className="flex items-center gap-2 text-xs font-medium bg-black/20 px-3 py-1.5 rounded-full w-fit border border-white/5" style={{ color: 'var(--text-secondary-color)'}}>
                    <span className="w-2 h-2 rounded-full bg-[var(--primary-accent-color)]"></span>
                    {itemCount} Potential Items Detected
                </div>
            )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border-color)'}}>
             <select 
                value={rfq.status} 
                onChange={handleStatusChange} 
                disabled={!canManage} 
                className="p-2 border rounded-lg text-sm disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary-color)',
                }}
              >
                <option>New</option>
                <option>Quoted</option>
                <option>Closed - Won</option>
                <option>Closed - Lost</option>
            </select>
            {canManage && rfq.status !== 'Closed - Won' && (
                <button 
                    onClick={onConvert}
                    className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition shadow-md"
                >
                    Convert to Event
                </button>
            )}
        </div>
    </div>
  );
};

const RFQEditorModal: React.FC<{
    rfq: Partial<RFQItem>;
    onClose: () => void;
    onSave: (rfq: Partial<RFQItem>) => void;
    setError: (e: any) => void;
    onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}> = ({ rfq, onClose, onSave, setError, onLogInteraction }) => {
    const [localRfq, setLocalRfq] = useState<Partial<RFQItem>>({ ...rfq, items: rfq.items || [], customFields: rfq.customFields || [] });
    
    // State for new item
    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemBudget, setNewItemBudget] = useState(0);
    
    // State for editing item (AI Enhancement)
    const [editingItem, setEditingItem] = useState<CostTrackerItem | null>(null);

    // State for custom field
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');

    const handleAddItem = () => {
        if (!newItemName) return;
        const newItem: CostTrackerItem = {
            itemId: `rfq-item-${Date.now()}`,
            name: newItemName,
            quantity: newItemQty,
            unit_cost_sar: 0,
            client_price_sar: newItemBudget, // Treat budget as target price
            description: 'Custom item added to RFQ'
        };
        setLocalRfq(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        setNewItemName('');
        setNewItemQty(1);
        setNewItemBudget(0);
    };

    const handleRemoveItem = (itemId: string) => {
        setLocalRfq(prev => ({ ...prev, items: (prev.items || []).filter(i => i.itemId !== itemId) }));
    };
    
    const handleUpdateItem = (updatedItem: CostTrackerItem) => {
        setLocalRfq(prev => ({
            ...prev,
            items: (prev.items || []).map(i => i.itemId === updatedItem.itemId ? updatedItem : i)
        }));
        setEditingItem(null);
    };

    const handleAddCustomField = () => {
        if (!newFieldLabel || !newFieldValue) return;
        const newField: CustomField = {
            id: `cf-${Date.now()}`,
            label: newFieldLabel,
            value: newFieldValue
        };
        setLocalRfq(prev => ({ ...prev, customFields: [...(prev.customFields || []), newField] }));
        setNewFieldLabel('');
        setNewFieldValue('');
    };

    const handleRemoveCustomField = (id: string) => {
        setLocalRfq(prev => ({ ...prev, customFields: (prev.customFields || []).filter(f => f.id !== id) }));
    };

    // Mock Event context for PromptItemEditor to work with RFQ data
    const mockContextEvent = {
        eventId: 'rfq-mock',
        name: `RFQ: ${localRfq.clientName || 'Draft'}`,
        clientName: localRfq.clientName || '',
        eventType: 'Other',
        location: 'TBD',
        eventBrief: localRfq.eventBrief
    } as unknown as EventItem;

    return (
        <>
        <Modal title={rfq.rfqId ? "Edit RFQ Details" : "Create New RFQ"} onClose={onClose} onSave={() => onSave(localRfq)} size="lg">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Client Name" value={localRfq.clientName || ''} onChange={e => setLocalRfq({...localRfq, clientName: e.target.value})} required />
                    <InputField label="Client Contact" value={localRfq.clientContact || ''} onChange={e => setLocalRfq({...localRfq, clientContact: e.target.value})} required />
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)'}}>Event Brief</label>
                    <textarea 
                        value={localRfq.eventBrief || ''} 
                        onChange={e => setLocalRfq({...localRfq, eventBrief: e.target.value})}
                        rows={3}
                        className="w-full p-2 border rounded-lg"
                        style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                    />
                </div>

                 {/* Custom Fields Section */}
                 <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border-color)' }}>
                     <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary-color)' }}>Custom Data Fields</h4>
                     <div className="flex gap-2 mb-4 items-end">
                        <div className="flex-1"><InputField label="Label (e.g. Source)" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} /></div>
                        <div className="flex-1"><InputField label="Value (e.g. LinkedIn)" value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} /></div>
                        <button onClick={handleAddCustomField} className="h-10 px-3 bg-[var(--primary-accent-color)] text-white rounded-lg hover:opacity-90"><PlusIcon className="h-5 w-5"/></button>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         {(localRfq.customFields || []).map(field => (
                             <div key={field.id} className="flex justify-between items-center p-2 rounded bg-black/10 border border-white/5 text-sm">
                                 <div>
                                     <span className="opacity-60 mr-2 font-mono text-xs">{field.label}:</span>
                                     <span>{field.value}</span>
                                 </div>
                                 <button onClick={() => handleRemoveCustomField(field.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="h-3 w-3"/></button>
                             </div>
                         ))}
                     </div>
                </div>

                {/* Items Section */}
                <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border-color)' }}>
                    <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary-color)' }}>Customizable Event Items</h4>
                    
                    <div className="flex gap-2 mb-4 items-end">
                        <div className="flex-grow"><InputField label="Item Name" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g., Stage Setup" /></div>
                        <div className="w-20"><InputField label="Qty" type="number" value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value))} /></div>
                        <div className="w-28"><InputField label="Target (SAR)" type="number" value={newItemBudget} onChange={e => setNewItemBudget(Number(e.target.value))} /></div>
                        <button onClick={handleAddItem} className="h-10 px-3 bg-[var(--primary-accent-color)] text-white rounded-lg hover:opacity-90"><PlusIcon className="h-5 w-5"/></button>
                    </div>

                    <ul className="space-y-2">
                        {(localRfq.items || []).map((item, idx) => (
                            <li key={item.itemId} className="flex justify-between items-center p-3 rounded bg-black/10 border border-white/5">
                                <div>
                                    <span className="font-medium">{item.name}</span>
                                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{item.description}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400">x{item.quantity}</span>
                                    <span className="text-sm font-mono text-green-400">SAR {item.client_price_sar.toLocaleString()}</span>
                                    <button onClick={() => setEditingItem(item)} className="text-slate-400 hover:text-white p-1"><EditIcon className="h-4 w-4"/></button>
                                    <button onClick={() => handleRemoveItem(item.itemId)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </li>
                        ))}
                         {(localRfq.items || []).length === 0 && (
                            <li className="text-center text-sm text-slate-500 py-4">No items added yet. Add manual items or import intelligently.</li>
                        )}
                    </ul>
                </div>
            </div>
        </Modal>
        
        {editingItem && (
            <PromptItemEditor
                item={editingItem}
                event={mockContextEvent} 
                onClose={() => setEditingItem(null)}
                setError={setError}
                onUpdateItem={handleUpdateItem}
                onLogInteraction={onLogInteraction}
            />
        )}
        </>
    );
};


export const RFQList: React.FC<RFQListProps> = ({ rfqs, user, onAddRfq, onUpdateRfq, onConvertToEvent, setError, setSuccess, onMenuClick, services, clients, onLogAIInteraction }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingRfq, setEditingRfq] = useState<Partial<RFQItem> | null>(null);

  const handleOpenEditor = (rfq: RFQItem | null) => {
      setEditingRfq(rfq || {});
      setIsEditorOpen(true);
  };

  const handleSaveRfq = (rfqData: Partial<RFQItem>) => {
    if(!rfqData.clientName || !rfqData.clientContact) {
        setError("Client Name and Contact are required.");
        return;
    }

    if (rfqData.rfqId) {
        onUpdateRfq(rfqData.rfqId, {
            clientName: rfqData.clientName,
            clientContact: rfqData.clientContact,
            eventBrief: rfqData.eventBrief,
            items: rfqData.items,
            customFields: rfqData.customFields
        });
        setSuccess("RFQ updated successfully.");
    } else {
        onAddRfq({
            clientName: rfqData.clientName,
            clientContact: rfqData.clientContact,
            eventBrief: rfqData.eventBrief || '',
            items: rfqData.items || [],
            customFields: rfqData.customFields || []
        });
        setSuccess("New RFQ added successfully.");
    }
    setIsEditorOpen(false);
  };

  const handleAiImport = (eventData: any) => {
      // Construct a detailed brief from parsed data to preserve context
      const autoBrief = [
          eventData.remarks,
          eventData.date ? `Target Date: ${eventData.date}` : '',
          eventData.location ? `Location: ${eventData.location}` : '',
          eventData.guestCount ? `Est. Guests: ${eventData.guestCount}` : ''
      ].filter(Boolean).join('\n\n');

      onAddRfq({
          clientName: eventData.clientName || 'Unknown Client',
          clientContact: eventData.clientContact || 'TBD',
          eventBrief: autoBrief || 'Imported via AI',
          items: eventData.cost_tracker || [],
          customFields: []
      });
      setSuccess("RFQ intelligently created from file.");
      setIsAiModalOpen(false);
  };

  const handleConvertToEvent = (rfq: RFQItem) => {
    onConvertToEvent({
        name: `${rfq.clientName} Event`,
        date: new Date().toISOString().split('T')[0], // Default to today
        location: 'TBD',
        guestCount: 0,
        status: 'Draft',
        paymentStatus: 'Unpaid',
        clientName: rfq.clientName,
        clientContact: rfq.clientContact,
        salespersonId: user.userId,
        commissionPaid: false,
        cost_tracker: rfq.items || [] // Map RFQ items to Event cost tracker
    });
    onUpdateRfq(rfq.rfqId, { status: 'Closed - Won' });
    setSuccess(`Event created from RFQ for ${rfq.clientName}. Items have been transferred.`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
            <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Request for Quotations</h1>
        </div>
        {user.permissions.canManageRFQs && (
            <div className="flex gap-2">
                 <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 text-white font-semibold shadow-md hover:bg-purple-700 transition flex items-center gap-2"
                    style={{ borderRadius: 'var(--border-radius)' }}
                >
                    <SparkleIcon className="h-5 w-5"/> Smart Import
                </button>
                <button
                    onClick={() => handleOpenEditor(null)}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 transition flex items-center gap-2"
                    style={{ borderRadius: 'var(--border-radius)' }}
                >
                <PlusIcon className="h-5 w-5" /> New RFQ
                </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rfqs.map((rfq, index) => (
            <div key={rfq.rfqId} className="animate-in-item" style={{ animationDelay: `${index * 50}ms` }}>
                <RFQCard 
                    rfq={rfq} 
                    canManage={user.permissions.canManageRFQs}
                    onUpdate={onUpdateRfq}
                    onConvert={() => handleConvertToEvent(rfq)}
                    onEdit={() => handleOpenEditor(rfq)}
                />
            </div>
        ))}
        {rfqs.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 opacity-50">
                <SparkleIcon className="h-12 w-12 mb-4" />
                <p>No RFQs found. Try the 'Smart Import' to create one from a document!</p>
            </div>
        )}
      </div>

      {isEditorOpen && editingRfq && (
          <RFQEditorModal 
            rfq={editingRfq}
            onClose={() => setIsEditorOpen(false)}
            onSave={handleSaveRfq}
            setError={setError}
            onLogInteraction={onLogAIInteraction}
          />
      )}

      {isAiModalOpen && (
          <IntelligentCreator 
            services={services}
            clients={clients}
            onClose={() => setIsAiModalOpen(false)}
            onConfirm={handleAiImport}
            setError={setError}
            mode="rfq"
          />
      )}
    </div>
  );
};
