// components/ClientList.tsx
import React, { useState, useMemo } from 'react';
import type { Client, ClientStatus, EventItem } from '../types';
import { ClientEditor } from './ClientEditor';
import { MenuIcon, PlusIcon } from './common/icons';

interface ClientListProps {
  clients: Client[];
  events: EventItem[];
  onAddClient: (clientData: Omit<Client, 'id'>) => void;
  onUpdateClient: (clientId: string, data: Partial<Client>) => void;
  onMenuClick: () => void;
  setError: (message: any) => void;
  setSuccess: (message: string) => void;
}

const statusColors: { [key in ClientStatus]: string } = {
  'Active': 'bg-green-500/20 text-green-300',
  'Lead': 'bg-blue-500/20 text-blue-300',
  'Inactive': 'bg-slate-500/20 text-slate-400',
  'Archived': 'bg-red-500/20 text-red-400',
  'VIP': 'bg-purple-500/20 text-purple-300',
};

export const ClientList: React.FC<ClientListProps> = ({ clients, events, onAddClient, onUpdateClient, onMenuClick, setError, setSuccess }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenEditor = (client: Client | null) => {
    setEditingClient(client);
    setIsEditorOpen(true);
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const lowerSearch = searchTerm.toLowerCase();
    return clients.filter(c =>
      c.companyName.toLowerCase().includes(lowerSearch) ||
      c.primaryContactName.toLowerCase().includes(lowerSearch) ||
      c.email.toLowerCase().includes(lowerSearch)
    );
  }, [clients, searchTerm]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Clients & Contacts</h1>
        </div>
        <button
          onClick={() => handleOpenEditor(null)}
          className="px-4 py-2 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center"
          style={{ backgroundColor: 'var(--primary-accent-color)', borderRadius: 'var(--border-radius)' }}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New Client
        </button>
      </div>

      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--card-container-color)' }}>
        <input
          type="text"
          placeholder="Search clients by name, contact, or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 text-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', borderRadius: 'calc(var(--border-radius) / 2)' }}
        />
      </div>

      <div className="backdrop-blur-xl border shadow-lg" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)', borderRadius: 'var(--border-radius)' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)' }}>Company Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)' }}>Primary Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)' }}>Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)' }}>Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)' }}>Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {filteredClients.map((client, index) => (
                <tr key={client.id} onClick={() => handleOpenEditor(client)} className="hover:bg-black/10 cursor-pointer animate-in-item" style={{ animationDelay: `${index * 30}ms` }}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--text-primary-color)' }}>{client.companyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-secondary-color)' }}>{client.primaryContactName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-secondary-color)' }} title={client.email}>{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[client.clientStatus] || 'bg-gray-700'}`}>{client.clientStatus}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm" style={{ color: 'var(--text-secondary-color)' }}>{new Date(client.lastModifiedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClients.length === 0 && <p className="text-center py-8" style={{ color: 'var(--text-secondary-color)' }}>No clients found.</p>}
        </div>
      </div>

      {isEditorOpen && (
        <ClientEditor
          client={editingClient}
          allClients={clients}
          events={events}
          onClose={() => setIsEditorOpen(false)}
          onSave={editingClient ? onUpdateClient : onAddClient}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </div>
  );
};