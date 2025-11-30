import { AppState, AppSettings, Role, ThemePreset, ServiceItem, Supplier, ProcurementDocument, Permissions, RolesConfig } from './types';

export const ROLES: Record<string, Role> = {
  Admin: 'Admin',
  Sales: 'Sales',
  Operations: 'Operations',
};

export const defaultDarkTheme: AppSettings = {
  themeMode: 'dark',
  adminPin: '1234',
  colors: {
    primaryAccent: '#8b5cf6',
    background: '#0f172a',
    cardContainer: 'rgba(15, 23, 42, 0.65)', // More transparent for glass effect
    primaryText: '#f8fafc',
    secondaryText: '#94a3b8',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typography: {
    applicationFont: 'Inter',
    headingFont: 'Poppins',
  },
  layout: {
    borderRadius: 16,
    sidebarWidth: 288,
    cardDensity: 'comfortable',
    glassIntensity: 20,
  },
  motion: {
    enableAnimations: true,
    transitionSpeed: 0.3,
    animationDuration: 0.5,
    transitionEasing: 'ease-in-out',
    defaultEntryAnimation: 'fadeIn',
    smoothScrolling: true,
    cardHoverEffect: 'lift',
    buttonHoverEffect: 'scale',
    particleCount: 60,
    particleSpeed: 0.5,
    particleOpacity: 0.4,
    particleStyle: 'particle-flow',
  },
  branding: {
    logoUrl: '',
    appBackgroundUrl: 'https://images.unsplash.com/photo-1531685250784-7569952593d2?q=80&w=2574&auto=format&fit=crop',
  },
  landingPage: {
    background: {
      type: 'image',
      imagePool: [
        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2670&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=2670&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1429514513361-8c332c3ca085?q=80&w=2670&auto=format&fit=crop',
      ],
    },
    motivationalQuotes: [
      "The secret of getting ahead is getting started.",
      "Excellence is not an act, but a habit.",
      "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work."
    ],
  },
  aiFallback: {
      enableGeminiQuotaFallback: true,
      fallbackMode: 'predefined'
  },
   userPreferences: {
      defaultView: 'Dashboard',
      dashboardWidgets: ['kpi', 'charts', 'alerts'],
       eventListViewOptions: {
        showDate: true,
        showLocation: true,
        showGuests: true,
        showPayment: true,
        showSalesperson: true,
      },
    },
};

export const defaultLightTheme: AppSettings = {
  ...defaultDarkTheme,
  themeMode: 'light',
  colors: {
    primaryAccent: '#7c3aed',
    background: '#f1f5f9',
    cardContainer: 'rgba(255, 255, 255, 0.7)',
    primaryText: '#0f172a',
    secondaryText: '#475569',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
};

export const SYSTEM_THEMES: ThemePreset[] = [
    {
        id: 'sys-default-dark',
        name: 'Default Dark',
        settings: defaultDarkTheme,
        createdAt: new Date().toISOString()
    },
    {
        id: 'sys-default-light',
        name: 'Default Light',
        settings: defaultLightTheme,
        createdAt: new Date().toISOString()
    }
];

const PERMISSIONS: RolesConfig = {
  Admin: { canCreateEvents: true, canManageServices: true, canViewFinancials: true, canManageUsers: true, canManageRFQs: true },
  Sales: { canCreateEvents: true, canManageServices: false, canViewFinancials: false, canManageUsers: false, canManageRFQs: true },
  Operations: { canCreateEvents: false, canManageServices: true, canViewFinancials: true, canManageUsers: false, canManageRFQs: false },
};

const now = new Date().toISOString();
const defaultServices: ServiceItem[] = [
    // Services from migrations are consolidated here for the default state
    {
        id: 's-mig-10-1', name: 'Morning Breakfast Buffet (VIP)', category: 'Catering', description: 'Comprehensive breakfast spread including bread display, croissants, rustic bites, mini manakish, foul & balila, hot display (grilled vegetables, halloumi), pancakes, waffles, and beverages.', basePrice: 180, pricingType: 'Per Person', status: 'Active', createdAt: now, lastModifiedAt: now, keyFeatures: ['Live Station', 'International Selection', 'Beverages Included'], menuOptions: ['Assortment of croissants', 'Rustic Bites', 'Mini manakish', 'Foul & balila', 'Grilled Halloumi', 'Pancakes', 'Cheese kunafa'], displayPrice: true
    },
    {
        id: 's-mig-10-2', name: 'Coffee Break (AM - Option A)', category: 'Catering', description: 'Premium morning refreshment break. Includes bread display, croissants, rustic bites, english cake, cookies, pancakes, yogurt jars, fruit display, and full beverage station.', basePrice: 120, pricingType: 'Per Person', status: 'Active', createdAt: now, lastModifiedAt: now, keyFeatures: ['Premium Selection', '3 Hour Duration'], menuOptions: ['Bread Display', 'Croissants', 'Rustic Bites', 'English Cake', 'Pancakes', 'Yogurt Jars', 'Fresh Juices'], displayPrice: true
    },
    {
        id: 's-ven-001', name: 'Venue Rental', category: 'Venue', description: 'Exclusive rental of our main ballroom with seating for up to 300 guests.', basePrice: 5000, pricingType: 'Flat Fee', status: 'Active', createdAt: now, lastModifiedAt: now, keyFeatures: ['300 Guests Capacity', 'Ballroom', 'Exclusive Use'], displayPrice: true
    },
    {
        id: 's-av-003', name: 'Projector & Screen Package', category: 'AV & Lighting', description: 'High-lumen projector with a portable 100-inch screen. Ideal for breakout rooms.', basePrice: 800, pricingType: 'Flat Fee', status: 'Active', createdAt: now, lastModifiedAt: now, keyFeatures: ['Full HD', 'HDMI/VGA', 'Portable'], displayPrice: true
    },
    { id: 's-ep-001', name: 'Large Naimi Lambs (18-20kg each) - Option A', category: 'Catering', description: 'Magnificent, perfectly roasted Naimi Lambs, serving as a captivating centerpiece that delivers exceptional tenderness, rich authentic flavors, and generous portions. Quantity: 2 units.', basePrice: 3000, pricingType: 'Per Unit', status: 'Active', createdAt: now, lastModifiedAt: now, keyFeatures: ['Roasted Whole', 'Authentic Flavor', 'Centerpiece'], displayPrice: true },
    { id: 's-ch-001', name: 'Lunch Buffet Option A', category: 'Catering', description: 'International Bread Selection, Cold Appetizers (Hummus, Vine Leaves, etc.), Salads (Tabbouleh, Rocca...), Hot Appetizers (Spinach Fatayer...), Main Courses (Baked Hamour, Butter Chicken...), Desserts (Cheesecake...), Beverages.', basePrice: 200, pricingType: 'Per Person', status: 'Active', createdAt: now, lastModifiedAt: now, keyFeatures: ['International Menu', 'Comprehensive Buffet'], menuOptions: ['Hummus Beiruty', 'Vine Leaves', 'Tabbouleh', 'Rocca Mushroom Salad', 'Spinach Fatayer', 'Baked Hamour Filet', 'Butter Chicken', 'Lamb Kabsa', 'Salted Caramel Cheesecake', 'Soft Drinks'], displayPrice: true
    },
    // Adding a few more for completeness
    { id: 's-photo-1', name: 'Event Photography (8 hours)', category: 'Photography', description: 'Full-day event coverage by a professional photographer. Includes edited high-resolution photos.', basePrice: 3000, pricingType: 'Flat Fee', status: 'Active', createdAt: now, lastModifiedAt: now },
    { id: 's-av-main', name: 'Main Stage AV Package', category: 'AV & Lighting', description: 'Complete package with large LED screen, sound system for 300 guests, and stage lighting.', basePrice: 15000, pricingType: 'Flat Fee', status: 'Active', createdAt: now, lastModifiedAt: now }
];

export const DEFAULT_APP_STATE: AppState = {
  users: [
    { userId: 'u_admin', name: 'Firash', role: 'Admin', commissionRate: 0 },
    { userId: 'u_paul', name: 'Paul bro', role: 'Sales', commissionRate: 15 }
  ],
  events: [],
  services: defaultServices,
  clients: [],
  rfqs: [],
  quotationTemplates: [],
  proposalTemplates: [],
  roles: PERMISSIONS,
  currentUserId: 'u_paul',
  settings: defaultDarkTheme,
  isLoggedIn: false,
  customThemes: [],
  notifications: [],
  savedCatalogues: [],
  suppliers: [],
  procurementDocuments: [],
};
