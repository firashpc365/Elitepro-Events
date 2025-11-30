
// components/ClientEditor.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { Client, ClientStatus, DataSource, EventItem } from '../types';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { InlineSpinner } from './common/LoadingSpinner';
import { ConfirmationModal } from './common/ConfirmationModal';
import { autofillClientDetails, checkForDuplicateClient } from '../services/geminiService';
import { SparkleIcon, LockClosedIcon, CalendarIcon, BoltIcon, MapPinIcon, UsersIcon, BriefcaseIcon } from './common/icons';

interface ClientEditorProps {
  client: Client | null;
  allClients: Client[];
  events?: EventItem[];
  onClose: () => void;
  onSave: (idOrData: any, data?: any) => void;
  setError: (message: any) => void;
  setSuccess: (message: string) => void;
}

const statusColors: { [key: string]: string } = {
  'Draft': 'bg-amber-500/10 text-amber-500',
  'Quote Sent': 'bg-sky-500/10 text-sky-400',
  'Confirmed': 'bg-emerald-500/10 text-emerald-400',
  'Completed': 'bg-slate-500/10 text-slate-400',
  'Canceled': 'bg-rose-500/10 text-rose-400',
};

export const ClientEditor: React.FC<ClientEditorProps> = ({ client, allClients, events, onClose, onSave, setError, setSuccess }) => {
  const [localClient, setLocalClient] = useState<Partial<Client>>(client || { clientStatus: 'Lead' });
  const [isLoading, setIsLoading] = useState<'autofill' | 'duplicateCheck' | false>(false);
  const [duplicate, setDuplicate] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const clientEvents = useMemo(() => {
      if (!client || !events) return [];
      return events.filter(e => e.clientName.trim().toLowerCase() === client.companyName.trim().toLowerCase())
                   .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [client, events]);

  const totalRevenue = useMemo(() => {
      return clientEvents.reduce((acc, event) => {
          const revenue = event.cost_tracker.reduce((sum, i) => sum + (i.client_price_sar * i.quantity), 0);
          return acc + revenue;
      }, 0);
  }, [clientEvents]);

  const handleFieldChange = (field: keyof Client, value: any, source: DataSource = 'manual') => {
    setLocalClient(prev => ({
      ...prev,
      [field]: value,
      [`${field}_source`]: source
    }));
  };

  const handleAutofill = useCallback(async () => {
    if (!localClient.companyName) {
      setError(new Error("Please provide a company name or website to autofill."));
      return;
    }
    setIsLoading('autofill');
    setError(null);
    try {
      const details = await autofillClientDetails(localClient.companyName, localClient.websiteUrl);
      const updatedClient = { ...localClient };
      for (const [key, value] of Object.entries(details)) {
        if (value && !updatedClient[key as keyof Client]) {
          (updatedClient as any)[key] = value;
          (updatedClient as any)[`${key}_source`] = 'ai';
        }
      }
      setLocalClient(updatedClient);
      setSuccess("AI autofill complete. Please review the details.");
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [localClient.companyName, localClient.websiteUrl, setError, setSuccess]);

  const handleSave = async () => {
    if (!localClient.companyName || !localClient.primaryContactName || !localClient.email) {
      setError(new Error("Company Name, Primary Contact, and Email are required."));
      return;
    }

    if (!client) { // Only check for duplicates on new client creation
      setIsLoading('duplicateCheck');
      try {
        const potentialDuplicate = await checkForDuplicateClient(localClient, allClients);
        if (potentialDuplicate) {
          setDuplicate(potentialDuplicate);
          setIsLoading(false);
          return; // Stop save process, wait for user confirmation
        }
      } catch (e) {
        console.error("Duplicate check failed:", e);
      }
      setIsLoading(false);
    }

    if (client) {
      onSave(client.id, localClient);
    } else {
      onSave(localClient);
    }
    onClose();
  };

  const forceSave = () => {
    if (client) {
      onSave(client.id, localClient);
    } else {
      onSave(localClient);
    }
    setDuplicate(null);
    onClose();
  };

  const renderSourceIcon = (source: DataSource | undefined) => {
    if (source === 'ai') return <SparkleIcon className="h-4 w-4 text-purple-400" title="AI Generated" />;
    return null;
  };

  return (
    <>
      <Modal
        title={client ? `Edit Client: ${client.companyName}` : "Add New Client"}
        onClose={onClose}
        onSave={handleSave}
        saveText={client ? "Save Changes" : "Save Client"}
        size="lg"
        footer={activeTab === 'history' ? <div className="flex justify-end mt-4"><button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-black/20 transition rounded-lg text-[var(--text-primary-color)]">Close</button></div> : undefined}
      >
        {client && (
            <div className="border-b mb-6 flex gap-6" style={{borderColor: 'var(--border-color)'}}>
                <button 
                    onClick={() => setActiveTab('details')} 
                    className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'details' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white'}`}
                >
                    Details
                </button>
                <button 
                    onClick={() => setActiveTab('history')} 
                    className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'history' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)] hover:text-white'}`}
                >
                    History
                </button>
            </div>
        )}

        {activeTab === 'details' && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Company Information Section */}
                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] mb-4 flex items-center gap-2">
                        <BriefcaseIcon className="h-4 w-4"/> Company Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <InputField label="Company Name" value={localClient.companyName || ''} onChange={e => handleFieldChange('companyName', e.target.value)} required />
                            <div className="absolute top-8 right-2">{renderSourceIcon(localClient.companyName_source)}</div>
                        </div>
                        <div className="relative">
                            <InputField label="Website URL" value={localClient.websiteUrl || ''} onChange={e => handleFieldChange('websiteUrl', e.target.value)} placeholder="https://..." />
                            <div className="absolute top-8 right-2">{renderSourceIcon(localClient.websiteUrl_source)}</div>
                        </div>
                        <div className="md:col-span-2 relative">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>Address</label>
                                {localClient.address_source === 'ai' && renderSourceIcon('ai')}
                            </div>
                            <div className="relative">
                                <input 
                                    className="w-full p-2 border rounded text-sm bg-black/10 focus:border-[var(--primary-accent-color)] outline-none"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                    value={localClient.address || ''} 
                                    onChange={e => handleFieldChange('address', e.target.value)}
                                    placeholder="Full Address"
                                />
                                <MapPinIcon className="absolute top-2.5 right-3 h-4 w-4 text-[var(--text-secondary-color)]" />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAutofill}
                        disabled={isLoading === 'autofill' || !localClient.companyName}
                        className="mt-4 w-full text-xs flex items-center justify-center gap-2 py-2 px-3 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/40 disabled:opacity-50 transition border border-purple-500/30 font-semibold"
                    >
                        {isLoading === 'autofill' ? <InlineSpinner /> : <SparkleIcon className="h-3 w-3" />}
                        Autofill Details with AI
                    </button>
                </div>

                {/* Contact Details Section */}
                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] mb-4 flex items-center gap-2">
                        <UsersIcon className="h-4 w-4"/> Contact Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <InputField label="Primary Contact" value={localClient.primaryContactName || ''} onChange={e => handleFieldChange('primaryContactName', e.target.value)} required />
                            <div className="absolute top-8 right-2">{renderSourceIcon(localClient.primaryContactName_source)}</div>
                        </div>
                        <div className="relative">
                            <InputField label="Email" type="email" value={localClient.email || ''} onChange={e => handleFieldChange('email', e.target.value)} required />
                            <div className="absolute top-8 right-2">{renderSourceIcon(localClient.email_source)}</div>
                        </div>
                        <div className="relative">
                            <InputField label="Phone" type="tel" value={localClient.phone || ''} onChange={e => handleFieldChange('phone', e.target.value)} />
                            <div className="absolute top-8 right-2">{renderSourceIcon(localClient.phone_source)}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>Client Status</label>
                            <select 
                                value={localClient.clientStatus} 
                                onChange={e => handleFieldChange('clientStatus', e.target.value as ClientStatus)} 
                                className="w-full p-2 border rounded text-sm bg-black/10 focus:border-[var(--primary-accent-color)] outline-none"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                            >
                                <option>Lead</option><option>Active</option><option>Inactive</option><option>Archived</option><option>VIP</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Additional Info Section */}
                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] mb-4">Additional Information</h4>
                    <div className="relative">
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>Internal Notes</label>
                        <textarea 
                            value={localClient.internalNotes || ''} 
                            onChange={e => handleFieldChange('internalNotes', e.target.value)} 
                            rows={3} 
                            className="w-full p-2 border rounded text-sm bg-black/10 focus:border-[var(--primary-accent-color)] outline-none"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }} 
                        />
                        <div className="absolute top-8 right-2">{renderSourceIcon(localClient.internalNotes_source)}</div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Summary Header */}
                <div className="flex justify-between items-end p-4 rounded-xl bg-gradient-to-r from-[var(--primary-accent-color)]/20 to-transparent border border-[var(--primary-accent-color)]/30">
                    <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary-color)]">Event History</h3>
                        <span className="text-xs text-[var(--text-secondary-color)]">{clientEvents.length} Events on record</span>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-[var(--text-secondary-color)] uppercase tracking-wider mb-1">Total Lifetime Revenue</p>
                        <p className="text-2xl font-bold text-white">SAR {totalRevenue.toLocaleString()}</p>
                    </div>
                </div>
                
                {clientEvents.length === 0 ? (
                    <div className="p-12 text-center border border-dashed rounded-xl opacity-60 flex flex-col items-center justify-center" style={{ borderColor: 'var(--border-color)' }}>
                        <CalendarIcon className="h-12 w-12 mb-3 text-[var(--text-secondary-color)]" />
                        <p className="text-sm font-medium text-[var(--text-primary-color)]">No events recorded for this client yet.</p>
                        <p className="text-xs text-[var(--text-secondary-color)] mt-1">Once you create an event for this client, it will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {clientEvents.map(event => {
                            const revenue = event.cost_tracker.reduce((sum, i) => sum + (i.client_price_sar * i.quantity), 0);
                            return (
                                <div key={event.eventId} className="p-4 rounded-xl border bg-black/20 hover:bg-black/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border-color)' }}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${statusColors[event.status] || 'bg-gray-500/20 text-gray-400'}`}>
                                            <BoltIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[var(--text-primary-color)] text-lg">{event.name}</h4>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary-color)] mt-1">
                                                <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {new Date(event.date).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><MapPinIcon className="h-3 w-3" /> {event.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right pl-14 sm:pl-0">
                                        <p className="font-mono font-bold text-green-400 text-lg">SAR {revenue.toLocaleString()}</p>
                                        <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full mt-1 inline-block border ${statusColors[event.status]?.replace('bg-', 'border-') || 'border-gray-500'} ${statusColors[event.status] || 'bg-gray-500/10 text-gray-400'}`}>
                                            {event.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

      </Modal>
      {duplicate && (
        <ConfirmationModal
          title="Potential Duplicate Found"
          message={`An existing client "${duplicate.companyName}" with email "${duplicate.email}" was found. Do you want to continue creating a new client anyway?`}
          onConfirm={forceSave}
          onCancel={() => setDuplicate(null)}
          confirmText="Yes, Create New"
          cancelText="Cancel"
        />
      )}
    </>
  );
};
