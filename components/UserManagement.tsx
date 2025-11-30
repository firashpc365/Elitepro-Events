
// components/UserManagement.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { EventItem, User, RolesConfig, Role, Permissions } from '../types';
import { MenuIcon, EditIcon, UserCircleIcon, UserPlusIcon, DownloadIcon, UploadIcon } from './common/icons';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { ROLES } from '../constants';
import { ConfirmationModal } from './common/ConfirmationModal';
import { ProgressBar } from './common/ProgressBar';

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

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [backupLocations, setBackupLocations] = useState({ local: true, drive: false });
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);
  
  // Progress State for Restore
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileToRestore(file);
      setIsRestoreModalOpen(false); // Close selection modal to show confirmation
      event.target.value = '';
    }
  };
  
  const handleRunBackup = () => {
      if (backupLocations.local) {
          onBackup();
      }
      // Future: if (backupLocations.drive) { onBackupToDrive(); }
      setIsBackupModalOpen(false);
  }

  const handleConfirmRestore = () => {
      if (!fileToRestore) return;
      setIsRestoring(true);
      setRestoreProgress(0);

      // Simulate upload/read progress
      const interval = setInterval(() => {
          setRestoreProgress(prev => {
              const next = prev + Math.random() * 20;
              if (next >= 100) {
                  clearInterval(interval);
                  return 100;
              }
              return next;
          });
      }, 200);

      // Trigger actual restore after animation
      setTimeout(() => {
          clearInterval(interval);
          onRestore(fileToRestore);
          setFileToRestore(null);
          setIsRestoring(false);
          setRestoreProgress(0);
      }, 1500);
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
                         <thead>
                            <tr className="border-b" style={{borderColor: 'var(--border-color)'}}>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{color: 'var(--text-secondary-color)'}}>Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{color: 'var(--text-secondary-color)'}}>Role</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{color: 'var(--text-secondary-color)'}}>Commission</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{color: 'var(--text-secondary-color)'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                          {users.map((user, index) => (
                            <tr key={user.userId} className="border-b hover:bg-black/10 animate-in-item" style={{borderColor: 'var(--border-color)', animationDelay: `${index * 30}ms`}}>
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
                    <h2 className="text-xl font-bold mb-4">Data Continuity</h2>
                    <p className="text-sm text-slate-400 mb-4">Create a complete backup of your application state, or restore from a previous backup. Use this for data portability or disaster recovery.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => setIsBackupModalOpen(true)}
                            className="px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <DownloadIcon className="h-5 w-5" />
                            Create System Backup
                        </button>
                        <button
                            onClick={() => setIsRestoreModalOpen(true)}
                            className="px-4 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                        >
                            <UploadIcon className="h-5 w-5" />
                            Restore from Backup
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <input type="file" ref={restoreInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {isBackupModalOpen && (
        <Modal
            title="Create System Backup"
            onClose={() => setIsBackupModalOpen(false)}
            onSave={handleRunBackup}
            saveText="Run Backup"
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-300">Select where you want to save the backup file. The backup includes all events, clients, services, settings, and user data.</p>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-black/20 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={backupLocations.local}
                        onChange={e => setBackupLocations(p => ({ ...p, local: e.target.checked }))}
                        className="h-5 w-5 rounded"
                    />
                    <div>
                        <span className="font-semibold">Save to Local Computer</span>
                        <p className="text-xs text-slate-400">A JSON file will be downloaded to your machine.</p>
                    </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-black/20 cursor-not-allowed opacity-50">
                    <input
                        type="checkbox"
                        checked={backupLocations.drive}
                        className="h-5 w-5 rounded"
                        disabled
                    />
                    <div>
                        <span className="font-semibold">Save to Google Drive</span>
                        <p className="text-xs text-slate-400">Coming soon.</p>
                    </div>
                </label>
            </div>
        </Modal>
      )}

      {isRestoreModalOpen && (
        <Modal
            title="Restore Data from Backup File"
            onClose={() => setIsRestoreModalOpen(false)}
            footer={null}
        >
            <div className="space-y-4">
                <div className="text-sm text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                    <p><strong>Warning:</strong> Restoring from a backup will completely overwrite all current data in the application. This action cannot be undone.</p>
                </div>
                <button
                    onClick={handleRestoreClick}
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                    <UploadIcon className="h-5 w-5" />
                    Browse Local Files...
                </button>
                <button
                    disabled
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-slate-600 rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                >
                    Select from Google Drive (Coming Soon)
                </button>
            </div>
        </Modal>
      )}
      
      {fileToRestore && (
        <Modal
            title="Confirm Data Restore"
            onClose={() => setFileToRestore(null)}
            footer={null} // Custom footer below
        >
            <div className="space-y-4">
                {isRestoring ? (
                    <div className="py-8">
                        <div className="mb-4 text-center">
                            <p className="text-sm font-semibold text-[var(--primary-accent-color)] animate-pulse">Restoring System Data...</p>
                        </div>
                        <ProgressBar progress={restoreProgress} label="Reading Backup File" />
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-slate-300">
                            This will overwrite all current data with the contents of <strong>"{fileToRestore.name}"</strong>. 
                            Are you sure you want to proceed?
                        </p>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setFileToRestore(null)}
                                className="px-4 py-2 text-sm font-medium hover:bg-black/20 transition rounded-lg text-[var(--text-secondary-color)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRestore}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition rounded-lg shadow-lg"
                            >
                                Load and Overwrite
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
      )}

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
