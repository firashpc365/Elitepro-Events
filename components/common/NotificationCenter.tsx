
// components/common/NotificationCenter.tsx
import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, TrashIcon, BoltIcon, SparkleIcon, DocumentTextIcon } from './icons';
import type { Notification } from '../../types';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onViewNotification: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  onMarkAsRead, 
  onClearAll, 
  onViewNotification 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    onMarkAsRead(notification.id);
    onViewNotification(notification.id);
    // Keep open if it's just marking read, close if it navigates? 
    // Actually better to keep open so user can triage, but for navigation usually we close.
    if (notification.link) setIsOpen(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };
  
  const getIconForType = (type: string) => {
      switch (type) {
          case 'error': return <div className="p-2 rounded-full bg-red-500/20 text-red-400"><BoltIcon className="h-4 w-4" /></div>;
          case 'warning': return <div className="p-2 rounded-full bg-amber-500/20 text-amber-400"><BoltIcon className="h-4 w-4" /></div>;
          case 'success': return <div className="p-2 rounded-full bg-green-500/20 text-green-400"><SparkleIcon className="h-4 w-4" /></div>;
          default: return <div className="p-2 rounded-full bg-blue-500/20 text-blue-400"><DocumentTextIcon className="h-4 w-4" /></div>;
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-[var(--text-secondary-color)] hover:bg-[var(--card-container-color)] hover:text-[var(--primary-accent-color)] transition-colors"
        title="Notifications"
      >
        <BellIcon className={`h-6 w-6 ${unreadCount > 0 ? 'animate-pulse text-[var(--primary-accent-color)]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl backdrop-blur-xl border border-[var(--border-color)] bg-[var(--card-container-color)] z-50 overflow-hidden transform origin-top-right transition-all animate-in-item">
          <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-black/10">
            <h3 className="font-bold text-[var(--text-primary-color)] flex items-center gap-2">
                Notifications 
                {unreadCount > 0 && <span className="text-xs bg-[var(--primary-accent-color)] text-white px-2 py-0.5 rounded-full">{unreadCount} new</span>}
            </h3>
            {notifications.length > 0 && (
              <button 
                onClick={onClearAll} 
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
              >
                <TrashIcon className="h-3 w-3" /> Clear All
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary-color)] flex flex-col items-center justify-center h-40">
                <BellIcon className="h-12 w-12 mb-2 opacity-20" />
                <p>All caught up!</p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {sortedNotifications.map(notification => (
                  <li 
                    key={notification.id} 
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-white/5 cursor-pointer transition-colors relative group ${!notification.read ? 'bg-[var(--primary-accent-color)]/5' : ''}`}
                  >
                    <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 mt-1">
                            {getIconForType(notification.type)}
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <p className={`text-sm font-semibold truncate pr-2 ${!notification.read ? 'text-[var(--text-primary-color)]' : 'text-[var(--text-secondary-color)]'}`}>
                                {notification.title}
                                </p>
                                <span className="text-[10px] text-[var(--text-secondary-color)] whitespace-nowrap opacity-70">
                                {formatTime(notification.timestamp)}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary-color)] line-clamp-2 leading-relaxed">
                                {notification.message}
                            </p>
                            {notification.link && (
                                <p className="text-[10px] mt-2 text-[var(--primary-accent-color)] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to view details &rarr;
                                </p>
                            )}
                        </div>
                        {!notification.read && (
                            <div className="flex-shrink-0 self-center">
                                <span className="block w-2 h-2 rounded-full bg-[var(--primary-accent-color)] shadow-glow"></span>
                            </div>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
