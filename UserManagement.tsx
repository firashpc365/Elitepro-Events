// components/UserManagement.tsx
import React, { useState, useRef } from 'react';
import type { EventItem, User, RolesConfig, Role, Permissions } from '../types';
import { MenuIcon, EditIcon, UserCircleIcon, UserPlusIcon, DownloadIcon, UploadIcon } from './common/icons';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { ROLES } from '../constants';

interface UserManagementProps {
  currentUser: User & { permissions: Permissions };
  users: User[];
  roles: RolesConfig;
  onUpdateUser: (userId: string, data: Partial<User>) => void;
  onAddUser: (userData: Omit<User, 'userId' | 'permissions'>) => void;
  onUpdateRolePermissions: (role: Role, permissions: Permissions) => void;
  events: EventItem[];
  setError: (msg: string | null) => void;
  setSuccess: (msg: string | null) => void;
  onMenuClick: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
}

const allPermissionKeys: (keyof Permissions)[] = ['canCreateEvents', 'canManageServices', 'canViewFinancials', 'canManageUsers', 'canManageRFQs'];

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, roles, onUpdateUser, onAddUser, onUpdateRolePermissions, events, setError, setSuccess, onMenuClick, onBackup, onRestore }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState(currentUser.name);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onRestore(file);
      // Reset input value to allow re-uploading the same file
      event.target.value = '';
    }
  };

  const userEvents = events.filter(e => e.salespersonId === currentUser.userId);
  
  const themedContainerStyle = {
    backgroundColor: 'var(--card-container-color)',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--border-radius)',
  };

  const handleSaveProfile = () => {
    if (editingName.trim() === '') {
      setError("Name cannot be empty.");
      return;
    }
    onUpdateUser(currentUser.userId, { name: editingName });
    setIsEditingProfile(false);
  };
  
  const handleSaveUser = () => {
    if (!editingUser || !editingUser.name || !editingUser.role) {
      setError("Name and Role are required.");
      return;
    }
    
    if (editingUser.userId) { // Editing existing user
      onUpdateUser(editingUser.userId, { name: editingUser.name, role: editingUser.role, commissionRate: editingUser.commissionRate });
    } else { // Creating new user
      onAddUser(editingUser as Omit<User, 'userId' | 'permissions'>);
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };
  
  const handlePermissionChange = (role: Role, permission: keyof Permissions, value: boolean) => {
    const newPermissions = { ...roles[role], [permission]: value };
    onUpdateRolePermissions(role, newPermissions);
  };

  const TABS = ['profile', 'management'];

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Profile & Users</h1>
        </div>

        <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
            <button onClick={() => setActiveTab('profile')} data-active={activeTab === 'profile'} className="tab-button px-4 py-2 text-sm font-medium">My Profile</button>
            {currentUser.permissions.canManageUsers && (
                <button onClick={() => setActiveTab('management')} data-active={activeTab === 'management'} className="tab-button px-4 py-2 text-sm font-medium">User & Role Management</button>
            )}
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in-item">
            <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                      <UserCircleIcon className="h-16 w-16 text-slate-400" />
                      <div>
                          {isEditingProfile ? (
                              <InputField label="Full Name" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                          ) : (
                              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary-color)'}}>{currentUser.name}</h2>
                          )}
                          <p className="text-md text-[var(--primary-accent-color)]">{currentUser.role}</p>
                      </div>
                  </div>
                  {isEditingProfile ? (
                      <div className="flex gap-2">
                          <button onClick={() => { setIsEditingProfile(false); setEditingName(currentUser.name); }} className="px-3 py-1 text-sm rounded-lg hover:bg-black/20">Cancel</button>
                          <button onClick={handleSaveProfile} className="px-3 py-1 text-sm rounded-lg bg-[var(--primary-accent-color)] text-white">Save</button>
                      </div>
                  ) : (
                      <button onClick={() => setIsEditingProfile(true)} className="p-2 hover:bg-black/20 rounded-full"><EditIcon className="h-5 w-5"/></button>
                  )}
              </div>
              <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">My Permissions</h3>
                  <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(currentUser.permissions).map(([key, value]) => (
                          <li key={key} className={`flex items-center p-2 rounded-md ${value ? 'bg-green-500/10' : 'bg-red-500/10'}`} style={{ color: 'var(--text-secondary-color)'}}>
                              <span className={`h-2 w-2 rounded-full mr-2 ${value ? 'bg-green-400' : 'bg-red-400'}`}></span>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </li>
                      ))}
                  </ul>
              </div>
            </div>
            <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
                <h3 className="text-lg font-semibold mb-2">My Assigned Events ({userEvents.length})</h3>
                {userEvents.length > 0 ? (
                  <div className="overflow-x-auto max-h-60">
                    {/* Table content from old component */}
                  </div>
                ) : <p className="text-sm text-slate-400">You have no events assigned.</p>}
            </div>
          </div>
        )}

        {activeTab === 'management' && currentUser.permissions.canManageUsers && (
            <div className="space-y-8 animate-in-item">
                <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">User Management</h2>
                        <button onClick={() => { setEditingUser({}); setIsUserModalOpen(true); }} className="px-3 py-2 text-sm font-semibold text-white bg-[var(--primary-accent-color)] rounded-lg flex items-center gap-2"><UserPlusIcon className="h-5 w-5"/> Create User</button>
                    </div>
                    {/* User table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        {/* ... table headers ... */}
                        <tbody>
                          {users.map(user => (
                            <tr key={user.userId} className="border-b hover:bg-black/10" style={{borderColor: 'var(--border-color)'}}>
                              <td className="px-4 py-3">{user.name}</td>
                              <td className="px-4 py-3">{user.role}</td>
                              <td className="px-4 py-3">{user.commissionRate || 0}%</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => {setEditingUser(user); setIsUserModalOpen(true);}} className="p-2 hover:bg-black/20 rounded-full"><EditIcon className="h-5 w-5"/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
                <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
                    <h2 className="text-xl font-bold mb-4">Role & Permission Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(roles).map(([role, permissions]) => (
                            <div key={role} className={`p-4 rounded-lg ${role === 'Admin' ? 'bg-slate-700/30' : 'bg-black/10'}`}>
                                <h3 className="font-bold text-lg">{role} {role === 'Admin' && <span className="text-xs font-normal text-slate-400">(Read-only)</span>}</h3>
                                <div className="mt-3 space-y-2">
                                    {allPermissionKeys.map(key => (
                                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={permissions[key]}
                                                disabled={role === 'Admin'}
                                                onChange={(e) => handlePermissionChange(role as Role, key, e.target.checked)}
                                                className="h-4 w-4 rounded disabled:cursor-not-allowed"
                                            />
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="backdrop-blur-xl border shadow-lg p-6" style={themedContainerStyle}>
                    <h2 className="text-xl font-bold mb-4">Data Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-black/10">
                            <h3 className="font-semibold">Create System Backup</h3>
                            <p className="text-sm text-slate-400 mt-1 mb-3">Save a complete snapshot of the application data to a local file.</p>
                            <button
                                onClick={onBackup}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <DownloadIcon className="h-5 w-5" />
                                Create Local Backup
                            </button>
                        </div>
                        <div className="p-4 rounded-lg bg-black/10">
                            <h3 className="font-semibold">Restore from Backup</h3>
                            <p className="text-sm text-slate-400 mt-1 mb-3">
                                <span className="font-bold text-yellow-400">Warning:</span> This will overwrite all current data. Proceed with caution.
                            </p>
                            <button
                                onClick={handleRestoreClick}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <UploadIcon className="h-5 w-5" />
                                Restore from File
                            </button>
                            <input
                                type="file"
                                ref={restoreInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {isUserModalOpen && (
        <Modal
            title={editingUser?.userId ? "Edit User" : "Create New User"}
            onClose={() => setIsUserModalOpen(false)}
            onSave={handleSaveUser}
        >
            <div className="space-y-4">
                <InputField label="Full Name" value={editingUser?.name || ''} onChange={e => setEditingUser(p => ({...p, name: e.target.value}))} required />
                <div>
                  <label className="block text-sm font-medium">Role</label>
                  <select
                    value={editingUser?.role || ''}
                    onChange={e => setEditingUser(p => ({...p, role: e.target.value as Role}))}
                    className="mt-1 block w-full p-2 border rounded"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                  >
                    <option value="" disabled>Select a role</option>
                    {Object.keys(ROLES).map(key => <option key={key} value={ROLES[key]}>{ROLES[key]}</option>)}
                  </select>
                </div>
                <InputField label="Commission Rate (%)" type="number" value={editingUser?.commissionRate || ''} onChange={e => setEditingUser(p => ({...p, commissionRate: Number(e.target.value)}))} />
            </div>
        </Modal>
      )}
    </>
  );
};