
// App.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import type { User, EventItem, ServiceItem, RFQItem, QuotationTemplate, CostTrackerItem, AIInteraction, AppSettings, ProposalTemplate, Client, Role, Permissions, RolesConfig, ThemePreset, Notification, Task, ProcurementDocument } from '../types';
import { DEFAULT_APP_STATE, defaultDarkTheme, defaultLightTheme, SYSTEM_THEMES } from '../constants';
import { QuotaExceededError } from '../services/geminiService';
import { runMigrations, DATA_VERSION } from '../migrations';

import { Sidebar } from '../components/Sidebar';
import { Dashboard } from '../components/Dashboard';
import { EventList } from '../components/EventList';
import { EventDetail } from '../components/EventDetail';
import { Services } from '../components/Services';
import { RFQList } from '../components/RFQList';
import { UserManagement } from '../components/UserManagement';
import { ClientList } from '../components/ClientList';
import { FinancialStudio } from '../components/FinancialStudio';
import { AppSettingsComponent } from '../components/AppSettings';
import { Reports } from '../components/Reports';
import { Portfolio } from '../components/Portfolio';
import { SupplierManagement } from '../components/SupplierManagement';
import { IntelligentCreator } from '../components/features/IntelligentCreator';
import { ImageGenerator } from '../components/features/ImageGenerator';
import { VideoGenerator } from '../components/features/VideoGenerator';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { SuccessBanner } from '../components/common/SuccessBanner';
import { QuotaErrorModal } from '../components/common/QuotaErrorModal';
import { WarningBanner } from '../components/common/WarningBanner';
import { LandingPage } from '../components/LandingPage';
import { HomePage } from '../components/HomePage';
import { Modal } from '../components/common/Modal';
import { InputField } from '../components/common/InputField';
import { MotionGraphicsOverlay } from '../components/common/MotionGraphicsOverlay';
import { LockClosedIcon } from '../components/common/icons';
import { SecurityGate } from '../components/common/SecurityGate';

// Error Boundary Component
interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-900 text-white p-6 text-center">
            <div className="max-w-xl w-full">
                <h2 className="text-4xl font-bold mb-4 text-red-400 tracking-tight">Something went wrong</h2>
                <p className="mb-6 text-slate-300 text-lg">The application encountered an unexpected error.</p>
                <pre className="bg-black/30 p-4 rounded text-left text-xs font-mono overflow-auto max-h-64 mx-auto mb-6 border border-white/10 shadow-inner">
                    {this.state.error?.toString()}
                </pre>
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-8 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 font-bold transition shadow-lg hover:shadow-blue-600/20"
                >
                    Reload Application
                </button>
            </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export const App: React.FC = () => {
  const [appState, setAppState, refreshState] = usePersistentState(DEFAULT_APP_STATE);
  // Safe destructuring with defaults to prevent crash on fresh init/migration lag
  const { 
      users = [], 
      events = [], 
      services = [], 
      clients = [], 
      rfqs = [], 
      quotationTemplates = [], 
      proposalTemplates = [], 
      roles = {}, 
      currentUserId = '', 
      settings = DEFAULT_APP_STATE.settings, 
      isLoggedIn = false, 
      customThemes = [], 
      notifications = [],
      suppliers = [],
      procurementDocuments = []
  } = appState || DEFAULT_APP_STATE;
  
  const [view, setView] = useState('Home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaExceededError | null>(null);
  const [aiFallbackActive, setAiFallbackActive] = useState(false);

  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [showIntelligentCreator, setShowIntelligentCreator] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  
  // Navigation & Layout Logic
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop mini-mode
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Admin PIN & Security Gate state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isAppLocked, setIsAppLocked] = useState(true); // Default locked for security

  const successSoundRef = useRef<HTMLAudioElement>(null);
  const errorSoundRef = useRef<HTMLAudioElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // @ts-ignore
    successSoundRef.current = document.getElementById('success-sound');
    // @ts-ignore
    errorSoundRef.current = document.getElementById('error-sound');
  }, []);

  // Automatic Layout Intelligence
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Intelligent Docking:
      // < 1280px (XL): Collapse sidebar to maximize canvas space for tables/grids.
      // > 1280px: Keep sidebar expanded for better navigation visibility.
      if (width < 1280 && width >= 768) { 
        setIsSidebarCollapsed(true);
      } else if (width >= 1280) {
        // Optional: Can auto-expand on huge screens, but let's respect user choice if they manually toggled it later.
        // For initial load, we default to collapsed on smaller desktops.
        // To force state sync on resize we can check if it wasn't manually set? 
        // For simplicity, let's just default to open on huge screens if not already set.
        setIsSidebarCollapsed(false);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Lenis for Smooth Scrolling
  useEffect(() => {
    // Only init if window.Lenis exists (loaded from CDN)
    if (typeof window !== 'undefined' && (window as any).Lenis && mainScrollRef.current) {
        const lenis = new (window as any).Lenis({
            wrapper: mainScrollRef.current,
            content: mainScrollRef.current.firstElementChild,
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            gestureDirection: 'vertical',
            smooth: true,
            smoothTouch: false,
            touchMultiplier: 2,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
        };
    }
  }, [view]); 

  // Listen for global fallback event from service layer
  useEffect(() => {
      const handleFallbackEvent = (e: CustomEvent) => {
          setAiFallbackActive(e.detail.active);
      };
      window.addEventListener('gemini-fallback-active' as any, handleFallbackEvent);
      return () => window.removeEventListener('gemini-fallback-active' as any, handleFallbackEvent);
  }, []);

  // Effect to apply theme settings dynamically
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    document.body.className = `theme-${settings.themeMode}`;
    
    if (settings.colors) {
        Object.entries(settings.colors).forEach(([key, value]) => {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-color`;
        root.style.setProperty(cssVar, value as string);
        });
        
         // Helper to set RGB components for opacity calculations
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };
        const primaryRgb = hexToRgb(settings.colors.primaryAccent);
        if (primaryRgb) root.style.setProperty('--primary-accent-color-rgb', primaryRgb);
    }
    
    if (settings.typography) root.style.setProperty('--font-family', settings.typography.applicationFont);
    if (settings.layout) {
        root.style.setProperty('--border-radius', `${settings.layout.borderRadius}px`);
        // Apply glass intensity blur globally to backdrop filters
        root.style.setProperty('--glass-blur', `${settings.layout.glassIntensity || 15}px`);
    }

    if (settings.motion) {
        const enableAnimations = settings.motion.enableAnimations;
        root.style.setProperty('--animation-duration', enableAnimations ? `${settings.motion.animationDuration}s` : '0s');
        root.style.setProperty('--transition-speed', enableAnimations ? `${settings.motion.transitionSpeed}s` : '0s');
        root.style.setProperty('--transition-easing', settings.motion.transitionEasing);
        root.style.setProperty('--entry-animation-name', settings.motion.defaultEntryAnimation);
        document.documentElement.style.scrollBehavior = settings.motion.smoothScrolling ? 'smooth' : 'auto';
        document.body.dataset.cardHoverEffect = enableAnimations ? settings.motion.cardHoverEffect : 'none';
        document.body.dataset.buttonHoverEffect = enableAnimations ? settings.motion.buttonHoverEffect : 'none';
    }

    if (settings.branding?.appBackgroundUrl) {
        document.body.style.backgroundImage = `url(${settings.branding.appBackgroundUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    } else {
        document.body.style.backgroundImage = '';
    }

  }, [settings]);


  const currentUser = useMemo(() => {
    if (!users || users.length === 0) return { userId: 'guest', name: 'Guest', role: 'Sales', permissions: {} } as any;
    const user = users.find((u: User) => u.userId === currentUserId) || users[0];
    const userRolePermissions = roles?.[user.role] || {}; 
    const defaultRolePermissions = DEFAULT_APP_STATE.roles[user.role] || {};
    
    const permissions = { ...defaultRolePermissions, ...userRolePermissions };
    
    return { ...user, permissions };
  }, [users, currentUserId, roles]);

  // --- Real-Time Simulation Engine & Task Monitoring ---
  // ... (keeping existing simulation/notification logic)
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          read: false,
          ...notification
      };
      setAppState(prev => {
          const exists = prev.notifications?.some(n => 
              n.title === newNotification.title && 
              n.message === newNotification.message &&
              (new Date().getTime() - new Date(n.timestamp).getTime() < 5000)
          );
          if (exists) return prev;

          return {
              ...prev,
              notifications: [newNotification, ...(prev.notifications || [])].slice(50) 
          };
      });
      
      if (notification.type === 'warning' || notification.type === 'error') {
          if (errorSoundRef.current) {
              errorSoundRef.current.volume = 0.2;
              errorSoundRef.current.play().catch(() => {});
          }
      }
  };

  const handleMarkNotificationRead = (id: string) => {
      setAppState(prev => ({
          ...prev,
          notifications: (prev.notifications || []).map(n => n.id === id ? { ...n, read: true } : n)
      }));
  };
  
  const handleViewNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification?.link) {
        if (notification.link.startsWith('event:')) {
            const eventId = notification.link.split(':')[1];
            setSelectedEventId(eventId);
            setView('EventDetail');
        }
    }
  };

  const handleClearNotifications = () => {
      setAppState(prev => ({
          ...prev,
          notifications: []
      }));
  };

  useEffect(() => {
      if (!isLoggedIn) return;

      const randomEvents = [
          { title: "New RFQ Received", message: "A new request for quote from TechCorp Inc. has arrived.", type: 'info' },
          { title: "Payment Confirmed", message: "Payment of SAR 15,000 received for 'Aramco Annual Gala'.", type: 'success' },
          { title: "System Update", message: "System maintenance scheduled for Sunday at 2:00 AM.", type: 'info' }
      ];

      const checkDeadlines = () => {
        const now = new Date();
        if (!events) return;
        
        events.forEach(event => {
            if (['Completed', 'Canceled'].includes(event.status)) return;

            (event.tasks || []).forEach(task => {
                if (task.isCompleted || !task.dueDate) return;

                const dueDate = new Date(task.dueDate);
                const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                
                const alreadyNotified = notifications?.some(n => n.link === `event:${event.eventId}` && n.message.includes(task.description));

                if (!alreadyNotified) {
                    if (hoursLeft < 0) {
                        addNotification({
                            title: "Task Overdue",
                            message: `Task "${task.description}" for ${event.name} is overdue!`,
                            type: 'error',
                            link: `event:${event.eventId}`
                        });
                    } else if (hoursLeft < 24) {
                        addNotification({
                            title: "Task Due Soon",
                            message: `Task "${task.description}" for ${event.name} is due in less than 24 hours.`,
                            type: 'warning',
                            link: `event:${event.eventId}`
                        });
                    }
                }
            });
        });
      };

      const interval = setInterval(() => {
          if (Math.random() > 0.90) {
              const randomEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)];
              addNotification({
                  title: randomEvent.title,
                  message: randomEvent.message,
                  type: randomEvent.type as any
              });
          }
          checkDeadlines();
      }, 60000);

      return () => clearInterval(interval);
  }, [isLoggedIn, events, notifications]);


  const setSuccessWithSound = (message: string | null) => {
    setSuccess(message);
    if (message && successSoundRef.current) {
        successSoundRef.current.volume = 0.4;
        successSoundRef.current.currentTime = 0;
        successSoundRef.current.play().catch(e => {
            if (e.name !== 'NotAllowedError') {
                console.error('Audio play failed', e);
            }
        });
    }
  };

  const setErrorWithSound = (e: any) => {
    console.error(e);
    if (e instanceof QuotaExceededError) {
      setQuotaError(e);
    } else {
      setErrorState(e instanceof Error ? e.message : String(e));
    }
     if (e && errorSoundRef.current) {
        errorSoundRef.current.volume = 0.3;
        errorSoundRef.current.currentTime = 0;
        errorSoundRef.current.play().catch(e => {
            if (e.name !== 'NotAllowedError') {
                console.error('Audio play failed', e);
            }
        });
    }
  };
  
  const handleAIFallback = (isActive: boolean) => {
    setAiFallbackActive(isActive);
  };

  const handleSimulateError = () => {
    const mockError = new QuotaExceededError(
        "[Processing Halted] Your account's API token has exceeded its usage limit for this billing cycle.",
        0,
        "QUOTA_EXCEEDED: Structured Content Compliance Kit subscription limit reached.",
        true,
        "Action Required: Please visit your account dashboard to upgrade your plan or wait for your quota to reset."
    );
    setQuotaError(mockError);
  };
  
  const handleLogin = (userId: string) => {
    setAppState(prev => ({ ...prev, isLoggedIn: true, currentUserId: userId }));
    const defaultView = settings?.userPreferences?.defaultView || 'Home';
    setView(defaultView);
    setIsAppLocked(true);
  };
  
  const handleLogout = () => {
    setAppState(prev => ({ ...prev, isLoggedIn: false }));
    setIsAppLocked(true);
  };
  
  const setCurrentUserId = (id: string) => {
    setAppState(prev => ({ ...prev, currentUserId: id }));
  };
  
  const handleUserSwitchRequest = (newUserId: string) => {
    const targetUser = users.find(u => u.userId === newUserId);
    if (targetUser?.role === 'Admin') {
        setPendingUserId(newUserId);
        setShowPinModal(true);
        setPinInput('');
        setPinError(null);
    } else {
        setCurrentUserId(newUserId);
    }
  };
  
  const handlePinVerify = () => {
    const adminPin = settings.adminPin || '1234';
    if (pinInput === adminPin) {
        if (pendingUserId) {
            setCurrentUserId(pendingUserId);
            setSuccessWithSound("Switched to Admin User");
        }
        setShowPinModal(false);
        setPendingUserId(null);
    } else {
        setPinError("Incorrect PIN");
        if (errorSoundRef.current) {
            errorSoundRef.current.volume = 0.3;
            errorSoundRef.current.currentTime = 0;
            errorSoundRef.current.play().catch(e => {
                if (e.name !== 'NotAllowedError') console.error(e);
            });
        }
        setPinInput('');
    }
  };
  
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      setPinInput(val);
      setPinError(null);
      
      if (val.length === 4) {
          const adminPin = settings.adminPin || '1234';
          if (val === adminPin) {
              if (pendingUserId) {
                  setCurrentUserId(pendingUserId);
                  setSuccessWithSound("Switched to Admin User");
              }
              setShowPinModal(false);
              setPendingUserId(null);
              setPinInput('');
          } else {
              setTimeout(() => {
                  setPinError("Incorrect PIN");
                  setPinInput('');
                  if (errorSoundRef.current) {
                      errorSoundRef.current.volume = 0.3;
                      errorSoundRef.current.currentTime = 0;
                      errorSoundRef.current.play().catch(err => {
                           if (err.name !== 'NotAllowedError') console.error(err);
                      });
                  }
              }, 300);
          }
      }
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    refreshState();
    setSuccessWithSound("Data Synced");
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleBackup = (stateToBackup: any) => {
    try {
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      const fileName = `KEH_Backup_${timestamp}.json`;

      const jsonString = JSON.stringify(stateToBackup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      setSuccessWithSound('System data backup created successfully.');
    } catch (e) {
      setErrorWithSound(e);
    }
  };

  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Failed to read file.');
        }
        const loadedData = JSON.parse(result);

        if (!loadedData || typeof loadedData.version !== 'number') {
          throw new Error('Invalid backup file. Version number is missing.');
        }

        const backupVersion = loadedData.version;
        let dataToRestore = loadedData;

        if (backupVersion < DATA_VERSION) {
          console.log(`Backup version (${backupVersion}) is older than current version (${DATA_VERSION}). Migrating...`);
          dataToRestore = runMigrations(loadedData, backupVersion);
        } else if (backupVersion > DATA_VERSION) {
          throw new Error(`Backup file version (${backupVersion}) is newer than the application version (${DATA_VERSION}). Please update the application.`);
        }
        
        setAppState(dataToRestore);
        setSuccessWithSound(`Data restored successfully from backup version ${backupVersion}.`);

      } catch (e) {
        setErrorWithSound(e);
      }
    };
    reader.onerror = () => {
      setErrorWithSound(new Error('Failed to read the backup file.'));
    };
    reader.readAsText(file);
  };


  // Data Handlers
  const handleUpdateEvent = (eventId: string, data: Partial<EventItem>) => {
    setAppState(prev => ({ ...prev, events: prev.events.map(e => e.eventId === eventId ? { ...e, ...data } : e) }));
  };

  const handleDeleteEvent = (eventId: string) => {
    setAppState(prev => ({
        ...prev,
        events: prev.events.filter(e => e.eventId !== eventId)
    }));
    setSuccessWithSound("Event permanently deleted.");
  };
  
  const handleLogAIInteraction = (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => {
      const newInteraction: AIInteraction = {
          ...interactionData,
          interactionId: `ai-${Date.now()}`,
          timestamp: new Date().toISOString(),
      };
      
      if (newInteraction.eventId) {
          setAppState(prev => ({
              ...prev,
              events: prev.events.map(e => 
                  e.eventId === newInteraction.eventId 
                  ? { ...e, aiInteractionHistory: [newInteraction, ...(e.aiInteractionHistory || [])] }
                  : e
              )
          }));
      }
      console.log("AI Interaction Logged:", newInteraction);
  };

  const handleAddEvent = (eventData: Omit<EventItem, 'eventId' | 'cost_tracker' | 'commissionPaid' | 'tasks'> & { cost_tracker?: CostTrackerItem[], aiInteractionHistory?: AIInteraction[], tasks?: Task[] }) => {
    const newEvent: EventItem = {
        ...eventData,
        eventId: `e${Date.now()}`,
        cost_tracker: eventData.cost_tracker || [],
        aiInteractionHistory: eventData.aiInteractionHistory || [],
        tasks: eventData.tasks || [],
        commissionPaid: false,
    };
    setAppState(prev => ({ ...prev, events: [newEvent, ...prev.events] }));
    setSuccessWithSound(`Event "${newEvent.name}" created successfully!`);
    addNotification({
        title: "Event Created",
        message: `Event '${newEvent.name}' was successfully created.`,
        type: 'success',
        link: `event:${newEvent.eventId}`
    });
  };

  const handleUpdateService = (serviceId: string, data: Partial<ServiceItem>) => {
    setAppState(prev => ({
        ...prev,
        services: prev.services.map(s => s.id === serviceId ? { ...s, ...data, lastModifiedAt: new Date().toISOString() } : s)
    }));
  };

  const handleAddService = (serviceData: Omit<ServiceItem, 'id'>) => {
    const newService: ServiceItem = {
      ...serviceData,
      id: `s-master-${Date.now()}`,
    };
    setAppState(prev => ({ ...prev, services: [newService, ...prev.services] }));
    setSuccessWithSound(`Service "${newService.name}" added successfully.`);
  };

  const handleBulkAddServices = (servicesData: Omit<ServiceItem, 'id'>[]) => {
    const now = new Date().toISOString();
    const newServices: ServiceItem[] = servicesData.map(data => ({
      ...data,
      id: `s-master-${Date.now()}-${Math.random()}`,
      status: 'Draft',
      createdAt: now,
      lastModifiedAt: now,
    }));
    setAppState(prev => ({ ...prev, services: [...prev.services, ...newServices] }));
    setSuccessWithSound(`${newServices.length} new services added as drafts.`);
  };

  const handleDeleteService = (serviceId: string) => {
    setAppState(prev => ({ ...prev, services: prev.services.filter(s => s.id !== serviceId) }));
    setSuccessWithSound(`Service deleted successfully.`);
  };

  const handleAddRfq = (rfqData: Omit<RFQItem, 'rfqId' | 'createdDate' | 'status'>) => {
    const newRfq: RFQItem = { ...rfqData, rfqId: `rfq${Date.now()}`, createdDate: new Date().toISOString(), status: 'New' };
    setAppState(prev => ({ ...prev, rfqs: [newRfq, ...prev.rfqs] }));
    addNotification({
        title: "New RFQ Added",
        message: `An RFQ for ${newRfq.clientName} has been added.`,
        type: 'info'
    });
  };

  const handleUpdateRfq = (rfqId: string, data: Partial<RFQItem>) => {
    setAppState(prev => ({ ...prev, rfqs: prev.rfqs.map(r => r.rfqId === rfqId ? { ...r, ...data } : r) }));
  };

  const handleConvertToEvent = (eventData: Omit<EventItem, 'eventId' | 'cost_tracker' | 'commissionPaid' | 'tasks'> & { tasks?: Task[] }) => {
    handleAddEvent(eventData);
  };
  
  const handleAddTemplate = (templateData: Omit<QuotationTemplate, 'templateId'>) => {
    const newTemplate: QuotationTemplate = { ...templateData, templateId: `t${Date.now()}` };
    setAppState(prev => ({ ...prev, quotationTemplates: [...prev.quotationTemplates, newTemplate] }));
    setSuccessWithSound(`Template "${newTemplate.templateName}" saved.`);
  };

  const handleUpdateTemplate = (templateId: string, data: Partial<QuotationTemplate>) => {
    setAppState(prev => ({ ...prev, quotationTemplates: prev.quotationTemplates.map(t => t.templateId === templateId ? { ...t, ...data } : t) }));
    setSuccessWithSound(`Template updated successfully.`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setAppState(prev => ({ ...prev, quotationTemplates: prev.quotationTemplates.filter(t => t.templateId !== templateId) }));
    setSuccessWithSound(`Template deleted.`);
  };
  
  const handleAddProposalTemplate = (templateData: Omit<ProposalTemplate, 'id'>) => {
    const newTemplate: ProposalTemplate = { ...templateData, id: `pt-${Date.now()}` };
    setAppState(prev => ({ ...prev, proposalTemplates: [...prev.proposalTemplates, newTemplate] }));
    setSuccessWithSound(`Proposal template "${newTemplate.name}" saved.`);
  };

  const handleDeleteProposalTemplate = (templateId: string) => {
    setAppState(prev => ({ ...prev, proposalTemplates: prev.proposalTemplates.filter(t => t.id !== templateId) }));
    setSuccessWithSound(`Proposal template deleted.`);
  };
  
  const handleAddUser = (userData: Omit<User, 'userId' | 'permissions'>) => {
    const newUser: User = {
      ...userData,
      userId: `u${Date.now()}`,
    };
    setAppState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    setSuccessWithSound(`User "${newUser.name}" created successfully.`);
  };

  const handleUpdateUser = (userId: string, data: Partial<User>) => {
    setAppState(prev => ({ ...prev, users: prev.users.map(u => u.userId === userId ? { ...u, ...data } : u) }));
    setSuccessWithSound(`User updated successfully.`);
  };

  const handleUpdateRolePermissions = (role: Role, permissions: Permissions) => {
    if (role === 'Admin') {
      setErrorWithSound("Admin role permissions cannot be changed.");
      return;
    }
    setAppState(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: permissions,
      }
    }));
    setSuccessWithSound(`Permissions for role "${role}" updated.`);
  };


  const handleAddClient = (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = { ...clientData, id: `c-${Date.now()}`, createdAt: new Date().toISOString(), lastModifiedAt: new Date().toISOString() };
    setAppState(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));
    setSuccessWithSound(`Client "${newClient.companyName}" added successfully.`);
  };

  const handleUpdateClient = (clientId: string, data: Partial<Client>) => {
    setAppState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c.id === clientId ? { ...c, ...data, lastModifiedAt: new Date().toISOString() } : c)
    }));
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setAppState(prev => {
        const updatedSettings = JSON.parse(JSON.stringify(prev.settings)); 
        const deepMerge = (target: any, source: any) => {
            for (const key in source) {
                if (source[key] instanceof Object && key in target) {
                    Object.assign(source[key], deepMerge(target[key], source[key]));
                }
            }
            Object.assign(target || {}, source);
            return target;
        };

        if (newSettings.themeMode && newSettings.themeMode !== prev.settings.themeMode) {
            const themeDefaults = newSettings.themeMode === 'light' ? defaultLightTheme : defaultDarkTheme;
            const merged = deepMerge(updatedSettings, themeDefaults);
            deepMerge(merged, newSettings);
            return { ...prev, settings: merged };
        } else {
             deepMerge(updatedSettings, newSettings);
             return { ...prev, settings: updatedSettings };
        }
    });
    setSuccessWithSound("Settings updated.");
  };

  // Theme Management Handlers
  const handleSaveTheme = (name: string) => {
      const themeSettings: Partial<AppSettings> = {
          themeMode: settings.themeMode,
          colors: settings.colors,
          typography: settings.typography,
          layout: settings.layout,
          motion: settings.motion,
          branding: settings.branding
      };
      const newTheme: ThemePreset = {
          id: `theme-${Date.now()}`,
          name,
          settings: themeSettings,
          createdAt: new Date().toISOString()
      };
      setAppState(prev => ({
          ...prev,
          customThemes: [...(prev.customThemes || []), newTheme]
      }));
      setSuccessWithSound(`Theme "${name}" saved.`);
  };

  const handleDeleteTheme = (themeId: string) => {
      setAppState(prev => ({
          ...prev,
          customThemes: (prev.customThemes || []).filter((t: ThemePreset) => t.id !== themeId)
      }));
      setSuccessWithSound("Theme deleted.");
  };

  const handleApplyTheme = (theme: ThemePreset) => {
      handleUpdateSettings(theme.settings);
  };
  
  // Supplier Document Handlers
  const handleAddDocument = (doc: ProcurementDocument) => {
      setAppState(prev => ({
          ...prev,
          procurementDocuments: [doc, ...(prev.procurementDocuments || [])]
      }));
  };
  
  const handleUpdateDocument = (id: string, data: Partial<ProcurementDocument>) => {
      setAppState(prev => ({
          ...prev,
          procurementDocuments: (prev.procurementDocuments || []).map(d => d.document_id === id ? { ...d, ...data } : d)
      }));
  };

  // Derived State
  const selectedEvent = useMemo(() => events.find(e => e.eventId === selectedEventId), [events, selectedEventId]);

  // View Component
  const renderView = () => {
    switch (view) {
      case 'Home':
        return <HomePage user={currentUser} setView={setView} onRequestNewEvent={() => setIsAddEventModalOpen(true)} onShowIntelligentCreator={() => setShowIntelligentCreator(true)} onShowImageGenerator={() => setShowImageGenerator(true)} />;
      case 'Dashboard':
        return <Dashboard user={currentUser} clients={clients} events={events} services={services} setView={setView} setSelectedEventId={setSelectedEventId} onRequestNewEvent={() => setIsAddEventModalOpen(true)} onShowIntelligentCreator={() => setShowIntelligentCreator(true)} onShowImageGenerator={() => setShowImageGenerator(true)} onMenuClick={() => setIsSidebarOpen(true)} appSettings={settings} onUpdateSettings={handleUpdateSettings} />;
      case 'Events':
        return <EventList events={events} user={currentUser} users={users} setView={setView} setSelectedEventId={setSelectedEventId} onAddEvent={handleAddEvent} setError={setErrorWithSound} isAddEventModalOpen={isAddEventModalOpen} onToggleAddEventModal={setIsAddEventModalOpen} onMenuClick={() => setIsSidebarOpen(true)} appSettings={settings} onUpdateSettings={handleUpdateSettings} />;
      case 'EventDetail':
        if (selectedEvent) {
          return (
            <EventDetail 
                event={selectedEvent} 
                services={services} 
                user={currentUser} 
                users={users} 
                clients={clients}
                appSettings={settings} 
                setView={setView} 
                setError={setErrorWithSound} 
                setSuccess={setSuccessWithSound} 
                onUpdateEvent={handleUpdateEvent} 
                onDeleteEvent={handleDeleteEvent} 
                onLogAIInteraction={(eventId, data) => handleLogAIInteraction({ ...data, eventId: eventId })} 
                quotationTemplates={quotationTemplates} 
                onAddTemplate={handleAddTemplate} 
                onUpdateTemplate={handleUpdateTemplate} 
                onDeleteTemplate={handleDeleteTemplate} 
                proposalTemplates={proposalTemplates} 
                onAddProposalTemplate={handleAddProposalTemplate} 
                onDeleteProposalTemplate={handleDeleteProposalTemplate} 
                onMenuClick={() => setIsSidebarOpen(true)} 
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
            />
          );
        }
        return <div>Event not found.</div>;
      case 'Services':
        return <Services services={services} events={events} user={currentUser} setError={setErrorWithSound} setSuccess={setSuccessWithSound} onAddItem={handleAddService} onUpdateService={handleUpdateService} onDeleteService={handleDeleteService} onBulkAddServices={handleBulkAddServices} onMenuClick={() => setIsSidebarOpen(true)} onLogAIInteraction={handleLogAIInteraction} settings={settings} onAIFallback={handleAIFallback} />;
      case 'Clients':
        return <ClientList clients={clients} events={events} onAddClient={handleAddClient} onUpdateClient={handleUpdateClient} onMenuClick={() => setIsSidebarOpen(true)} setError={setErrorWithSound} setSuccess={setSuccessWithSound} />;
      case 'RFQs':
        return <RFQList rfqs={rfqs} user={currentUser} onAddRfq={handleAddRfq} onUpdateRfq={handleUpdateRfq} onConvertToEvent={handleConvertToEvent} setError={setErrorWithSound} setSuccess={setSuccessWithSound} onMenuClick={() => setIsSidebarOpen(true)} services={services} clients={clients} onLogAIInteraction={handleLogAIInteraction} />;
      case 'FinancialStudio':
        return <FinancialStudio currentUser={currentUser} events={events} services={services} users={users} onUpdateEvent={handleUpdateEvent} onUpdateService={handleUpdateService} onMenuClick={() => setIsSidebarOpen(true)} onLogAIInteraction={handleLogAIInteraction} />;
      case 'SupplierManagement':
        return <SupplierManagement suppliers={suppliers} documents={procurementDocuments} events={events} user={currentUser} settings={settings} onMenuClick={() => setIsSidebarOpen(true)} onAddDocument={handleAddDocument} onUpdateDocument={handleUpdateDocument} onUpdateEvent={handleUpdateEvent} onLogAIInteraction={handleLogAIInteraction} setError={setErrorWithSound} setSuccess={setSuccessWithSound} />;
      case 'Reports':
        return <Reports events={events} services={services} users={users} currentUser={currentUser} onMenuClick={() => setIsSidebarOpen(true)} onBackup={() => handleBackup(appState)} onRestore={handleRestore} />;
      case 'Portfolio':
        return <Portfolio events={events} services={services} setView={setView} onMenuClick={() => setIsSidebarOpen(true)} />;
      case 'Profile':
        return <UserManagement currentUser={currentUser} users={users} roles={roles} events={events} onUpdateUser={handleUpdateUser} onAddUser={handleAddUser} onUpdateRolePermissions={handleUpdateRolePermissions} setError={setErrorWithSound} setSuccess={setSuccessWithSound} onMenuClick={() => setIsSidebarOpen(true)} onBackup={() => handleBackup(appState)} onRestore={handleRestore} />;
      case 'Settings':
        return <AppSettingsComponent 
            settings={settings} 
            currentUser={currentUser} 
            customThemes={customThemes} 
            onUpdateSettings={handleUpdateSettings} 
            onLogAIInteraction={handleLogAIInteraction} 
            onMenuClick={() => setIsSidebarOpen(true)} 
            onSaveTheme={handleSaveTheme} 
            onDeleteTheme={handleDeleteTheme} 
            onApplyTheme={handleApplyTheme}
            onSimulateError={handleSimulateError}
        />;
      default:
        return <div>View not found.</div>;
    }
  };
  
  if (!isLoggedIn) {
      return <ErrorBoundary><LandingPage users={users} onLogin={handleLogin} defaultUserId={currentUserId} settings={settings} /></ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
    <div className="flex h-screen relative" style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-primary-color)'}}>
      
      {/* Global Particle Overlay */}
      {settings.motion.enableAnimations && (
          <MotionGraphicsOverlay 
            config={{
                ...settings.motion,
                particleCount: 250, // Increased count for high visibility
                particleOpacity: 0.7, // Increased base opacity for clarity
                particleSpeed: 1.0 // Faster movement speed
            }}
            color={settings.colors.primaryAccent}
          />
      )}

      {/* Security Gate Wrapper */}
      <SecurityGate 
        isLocked={isAppLocked} 
        onUnlock={() => setIsAppLocked(false)} 
        currentUser={currentUser} 
        settings={settings}
      >
          {/* Global Overlays */}
          <div className="relative z-50 pointer-events-none">
            <ErrorBanner message={error} clearError={() => setErrorState(null)} />
            <SuccessBanner message={success} clearSuccess={() => setSuccess(null)} />
            <WarningBanner isVisible={aiFallbackActive} message="AI services are temporarily unavailable due to quota limits. Displaying mock data." />
          </div>

          {/* Quota Error Modal (Blocking) */}
          {quotaError && (
              <div className="relative z-[100]">
                <QuotaErrorModal error={quotaError} onClose={() => setQuotaError(null)} />
              </div>
          )}

          {/* Navigation Sidebar */}
          <Sidebar 
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              collapsed={isSidebarCollapsed}
              setCollapsed={setIsSidebarCollapsed}
              currentView={view}
              setView={setView}
              currentUser={currentUser}
              users={users}
              onUserSwitch={handleUserSwitchRequest}
              onLogout={handleLogout}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              appSettings={settings}
              notifications={notifications || []}
              onMarkAsRead={handleMarkNotificationRead}
              onClearAllNotifications={handleClearNotifications}
              onViewNotification={handleViewNotification}
          />

          {/* Main Content Area */}
          <main 
            ref={mainScrollRef}
            // Logic change here: If sidebar is collapsed (mini), allow content to be wider (ml-20).
            // When user hovers sidebar in mini-mode, it floats over, so content doesn't need to push to ml-72.
            // Only push to ml-72 if sidebar is explicitly NOT collapsed (pinned open).
            className={`flex-1 overflow-y-auto relative z-30 transition-[margin] duration-500 ease-[cubic-bezier(0.2,0.0,0,1.0)] ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'} ml-0`}
          >
            {renderView()}
          </main>

          {/* Global Modals */}
          <div className="relative z-50">
              {showIntelligentCreator && (
                <IntelligentCreator 
                    services={services}
                    clients={clients}
                    onClose={() => setShowIntelligentCreator(false)}
                    onConfirm={(eventData, createClient, interaction) => {
                    if (createClient && eventData.clientName) {
                        const clientExists = clients.some(c => c.companyName.toLowerCase() === eventData.clientName!.toLowerCase());
                        if (!clientExists) {
                            const now = new Date().toISOString();
                            handleAddClient({
                                companyName: eventData.clientName,
                                primaryContactName: eventData.clientContact || 'TBD',
                                email: eventData.clientContact || 'TBD',
                                clientStatus: 'Lead',
                                createdAt: now,
                                lastModifiedAt: now,
                            });
                        }
                    }

                    const interactionHistory: AIInteraction[] = interaction ? [{
                        ...interaction,
                        interactionId: `ai-create-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                    }] : [];

                    handleAddEvent({
                        name: eventData.name || 'New AI Event',
                        clientName: eventData.clientName || 'TBD',
                        clientContact: eventData.clientContact || 'TBD',
                        date: eventData.date || new Date().toISOString().split('T')[0],
                        location: eventData.location || 'TBD',
                        guestCount: eventData.guestCount || 0,
                        remarks: eventData.remarks,
                        status: 'Draft',
                        paymentStatus: 'Unpaid',
                        salespersonId: currentUser.userId,
                        cost_tracker: eventData.cost_tracker || [],
                        aiInteractionHistory: interactionHistory,
                        eventType: eventData.eventType || 'Other'
                    });
                    }}
                    setError={setErrorWithSound}
                />
              )}
              {showImageGenerator && (
                <ImageGenerator
                onClose={() => setShowImageGenerator(false)}
                setError={setErrorWithSound}
                onLogAIInteraction={handleLogAIInteraction}
                />
              )}
              {showVideoGenerator && (
                <VideoGenerator
                  onClose={() => setShowVideoGenerator(false)}
                  setError={setErrorWithSound}
                  onLogAIInteraction={handleLogAIInteraction}
                />
              )}
              
              {showPinModal && (
                <Modal title="" onClose={() => setShowPinModal(false)} footer={null}>
                    <div className="flex flex-col items-center p-6">
                        <div className="w-16 h-16 rounded-full bg-[var(--primary-accent-color)]/20 flex items-center justify-center mb-4 text-[var(--primary-accent-color)]">
                            <LockClosedIcon className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-1" style={{color: 'var(--text-primary-color)'}}>Admin Access</h3>
                        <p className="text-sm mb-6" style={{color: 'var(--text-secondary-color)'}}>Enter PIN to switch user</p>

                        <div className="relative w-full max-w-[240px] mb-6">
                            <div className="flex justify-between gap-2">
                                {[0, 1, 2, 3].map((index) => (
                                    <div 
                                    key={index}
                                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                                        pinInput.length === index ? 'border-[var(--primary-accent-color)] bg-[var(--primary-accent-color)]/10 shadow-[0_0_10px_rgba(var(--primary-accent-color-rgb),0.3)]' : 
                                        pinInput.length > index ? 'border-[var(--primary-accent-color)]/50 bg-[var(--primary-accent-color)]/5 text-[var(--primary-accent-color)]' : 
                                        'border-[var(--border-color)] bg-black/10'
                                    } ${pinError ? 'border-red-500' : ''}`}
                                    style={{
                                        color: pinInput.length > index ? 'var(--primary-accent-color)' : 'var(--text-primary-color)'
                                    }}
                                    >
                                    {pinInput.length > index ? '●' : ''}
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                autoComplete="one-time-code"
                                value={pinInput}
                                onChange={handlePinChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                autoFocus
                                onKeyDown={(e) => { if(e.key === 'Enter') handlePinVerify(); }}
                            />
                        </div>

                        {pinError && <p className="text-red-500 text-sm mb-4 animate-pulse">{pinError}</p>}

                        <button
                            onClick={handlePinVerify}
                            disabled={pinInput.length !== 4}
                            className="w-full py-3 text-white font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            style={{ backgroundColor: 'var(--primary-accent-color)' }}
                        >
                            Verify
                        </button>
                    </div>
                </Modal>
              )}
          </div>
      </SecurityGate>
    </div>
    </ErrorBoundary>
  );
};
