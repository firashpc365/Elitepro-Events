
// components/Sidebar.tsx
import React, { useState } from 'react';
import type { User, Permissions, AppSettings, Notification } from '../types';
import { 
    HomeIcon, 
    SparkleIcon, 
    DocumentTextIcon, 
    UsersIcon, 
    NetworkIcon, 
    TrendingUpIcon, 
    ChartBarIcon, 
    SettingsIcon, 
    RefreshIcon, 
    LogoutIcon,
    BriefcaseIcon,
    ExpandIcon,
    CollapseIcon,
    CubeTransparentIcon
} from './common/icons';
import { NotificationCenter } from './common/NotificationCenter';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentView: string;
  setView: (view: string) => void;
  currentUser: User & { permissions: Permissions };
  users: User[];
  onUserSwitch: (userId: string) => void;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  appSettings: AppSettings;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onViewNotification: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen, 
  collapsed,
  setCollapsed,
  currentView, 
  setView, 
  currentUser, 
  users, 
  onUserSwitch, 
  onLogout, 
  onRefresh, 
  isRefreshing,
  notifications,
  onMarkAsRead,
  onClearAllNotifications,
  onViewNotification
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Logical State: "Mini Mode" is when pinned collapsed AND user isn't actively interacting
  const isMiniMode = collapsed && !isHovered;
  
  // Docking State:
  // 1. Collapsed + Idle = Width 20 (Mini)
  // 2. Collapsed + Hovered = Width 72 (Floating expansion over content)
  // 3. Expanded (Not collapsed) = Width 72 (Pinned, pushes content)
  const effectiveWidthClass = (collapsed && !isHovered) ? 'w-20' : 'w-72';
  const shadowClass = (collapsed && isHovered) ? 'shadow-2xl shadow-black/50' : 'shadow-xl';

  const handleNavClick = (viewName: string) => {
    setView(viewName);
    // Close sidebar on mobile selection
    if (window.innerWidth < 768) {
       setIsOpen(false); 
    }
  };
  
  const NavItem: React.FC<{ viewName: string; children: React.ReactNode; icon: React.ReactNode }> = ({ viewName, children, icon }) => {
    const isActive = currentView === viewName;
    return (
      <button 
        onClick={() => handleNavClick(viewName)}
        className={`group relative flex items-center w-full transition-all duration-300 rounded-xl mb-1.5 overflow-hidden
        ${isMiniMode ? 'justify-center px-2 py-3' : 'px-4 py-3'}
        ${isActive 
          ? 'text-white shadow-lg shadow-[var(--primary-accent-color)]/20' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'}
        `}
        role="link"
        aria-label={viewName}
      >
        {/* Active Background Layer with Gradient */}
        {isActive && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--primary-accent-color)] to-[var(--primary-accent-color)]/60 opacity-100 transition-opacity duration-300"></div>
        )}

        {/* Icon */}
        <div className={`relative z-10 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            {React.cloneElement(icon as React.ReactElement, { 
                className: `h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}` 
            })}
        </div>
        
        {/* Label (Hidden in Mini Mode) */}
        <span 
          className={`relative z-10 whitespace-nowrap font-medium tracking-wide ml-3 transition-all duration-300 origin-left
          ${isMiniMode ? 'opacity-0 w-0 translate-x-[-10px]' : 'opacity-100 w-auto translate-x-0'}`}
        >
          {children}
        </span>
      </button>
    );
  };

  const NavGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
      <div className="mb-4">
          <div className={`px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all duration-300 ${isMiniMode ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
              {title}
          </div>
          {children}
      </div>
  );

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div 
        onClick={() => setIsOpen(false)} 
        className={`fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      ></div>

      {/* Sidebar Container */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 z-[70] h-full border-r transition-all duration-300 ease-[cubic-bezier(0.2,0.0,0,1.0)] flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
        ${effectiveWidthClass} ${shadowClass}
        `}
        style={{ 
            backgroundColor: 'rgba(10, 15, 30, 0.95)', // Increased opacity for float readability
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)'
        }}
      >
            {/* 1. Header Area */}
            <div className="relative flex items-center h-20 px-6 flex-shrink-0 overflow-hidden">
                <div className="flex items-center gap-3 whitespace-nowrap">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-accent-color)] to-indigo-600 flex items-center justify-center shadow-lg shadow-[var(--primary-accent-color)]/20 flex-shrink-0 relative group cursor-pointer" onClick={() => setView('Home')}>
                        <span className="text-xl font-extrabold text-white font-dancing-script relative z-10">K</span>
                        <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    
                    <div className={`flex flex-col transition-all duration-300 origin-left ${isMiniMode ? 'opacity-0 scale-90 w-0' : 'opacity-100 scale-100 w-auto'}`}>
                        <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-dancing-script leading-none">
                            Kanchana
                        </h1>
                        <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--primary-accent-color)] font-bold mt-1">
                            Events Hub
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Refresh & Notifications */}
            <div className={`mx-4 mb-6 transition-all duration-300 ${isMiniMode ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                 <div className="flex items-center justify-between bg-white/5 rounded-xl p-1.5 border border-white/5 backdrop-blur-md">
                     <div className="flex items-center gap-2 px-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-yellow-400 animate-ping' : 'bg-green-400 shadow-[0_0_5px_#4ade80]'}`}></div>
                         <span className="text-[10px] font-mono font-medium text-slate-400 tracking-wide">{isRefreshing ? 'SYNCING...' : 'SYSTEM ONLINE'}</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <button onClick={onRefresh} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors group" title="Refresh Data">
                            <RefreshIcon className={`h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="h-4 w-px bg-white/10 mx-0.5"></div>
                        <div className="scale-90">
                            <NotificationCenter 
                                notifications={notifications} 
                                onMarkAsRead={onMarkAsRead}
                                onClearAll={onClearAllNotifications}
                                onViewNotification={onViewNotification}
                            />
                        </div>
                     </div>
                 </div>
            </div>

            {/* 3. Navigation Scroll Area */}
            <div className="flex-grow px-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
                <NavGroup title="Overview">
                    <NavItem viewName="Home" icon={<HomeIcon />}>Home</NavItem>
                    <NavItem viewName="Dashboard" icon={<SparkleIcon />}>Intelligence Hub</NavItem>
                    <NavItem viewName="Events" icon={<DocumentTextIcon />}>Events & Projects</NavItem>
                </NavGroup>

                <NavGroup title="Management">
                     <NavItem viewName="Clients" icon={<UsersIcon />}>Clients & CRM</NavItem>
                     {currentUser.permissions.canManageServices && <NavItem viewName="Services" icon={<NetworkIcon />}>Service Master</NavItem>}
                     {currentUser.permissions.canManageRFQs && <NavItem viewName="RFQs" icon={<DocumentTextIcon />}>RFQs</NavItem>}
                     <NavItem viewName="Portfolio" icon={<BriefcaseIcon />}>Portfolio</NavItem>
                </NavGroup>

                <NavGroup title="Procurement">
                     {currentUser.permissions.canViewFinancials && <NavItem viewName="SupplierManagement" icon={<CubeTransparentIcon />}>Suppliers & Invoices</NavItem>}
                </NavGroup>

                <NavGroup title="Analytics">
                     {currentUser.permissions.canViewFinancials && <NavItem viewName="FinancialStudio" icon={<TrendingUpIcon />}>Financial Studio</NavItem>}
                     {currentUser.permissions.canViewFinancials && <NavItem viewName="Reports" icon={<ChartBarIcon />}>Reports & Data</NavItem>}
                </NavGroup>

                <NavGroup title="System">
                    <NavItem viewName="Profile" icon={<UsersIcon />}>Profile & Users</NavItem>
                    <NavItem viewName="Settings" icon={<SettingsIcon />}>App Settings</NavItem>
                </NavGroup>
            </div>

            {/* 4. Footer / User Card */}
            <div className={`p-4 mt-auto transition-all duration-300 ${isMiniMode ? 'px-2' : 'px-4'}`}>
                <div className={`relative rounded-2xl bg-gradient-to-b from-white/5 to-black/20 border border-white/5 p-3 transition-all duration-300 group ${isMiniMode ? 'bg-transparent border-transparent p-0' : 'shadow-lg'}`}>
                    
                    <div className={`flex items-center gap-3 ${isMiniMode ? 'justify-center flex-col' : ''}`}>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold shadow-inner ring-1 ring-white/10">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>

                        <div className={`flex-grow min-w-0 transition-all duration-300 ${isMiniMode ? 'w-0 h-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                             <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                             <p className="text-[10px] text-[var(--primary-accent-color)] font-medium uppercase tracking-wide truncate">{currentUser.role}</p>
                        </div>

                        <button 
                            onClick={onLogout} 
                            className={`text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-lg ${isMiniMode ? 'mt-2' : ''}`}
                            title="Logout"
                        >
                            <LogoutIcon className="h-5 w-5" />
                        </button>
                    </div>

                     {!isMiniMode && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <select 
                                value={currentUser.userId} 
                                onChange={e => onUserSwitch(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 text-[10px] font-medium text-slate-300 rounded-lg py-1.5 px-2 focus:ring-1 focus:ring-[var(--primary-accent-color)] outline-none cursor-pointer hover:bg-black/40 transition-colors appearance-none"
                                style={{ backgroundImage: 'none' }} 
                            >
                                {users.map(u => <option key={u.userId} value={u.userId} className="bg-slate-900 text-white">Switch to: {u.name}</option>)}
                            </select>
                        </div>
                     )}
                </div>
            </div>

            {/* 5. Collapse Toggle Handle (Hidden on Mobile) */}
            <button 
                onClick={() => setCollapsed(!collapsed)}
                className="absolute top-1/2 -right-3 z-[80] w-6 h-12 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--primary-accent-color)] transition-all duration-300 shadow-xl hidden md:flex group"
                aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {collapsed ? <ExpandIcon className="h-3 w-3 group-hover:scale-110 transition-transform"/> : <CollapseIcon className="h-3 w-3 group-hover:scale-110 transition-transform"/>}
            </button>
      </aside>
    </>
  );
};
