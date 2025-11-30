
export type Role = 'Admin' | 'Sales' | 'Operations';

export interface Permissions {
  canCreateEvents: boolean;
  canManageServices: boolean;
  canViewFinancials: boolean;
  canManageUsers: boolean;
  canManageRFQs: boolean;
}

export interface RolesConfig {
  [key: string]: Permissions;
}

export type EventStatus = 'Draft' | 'Quote Sent' | 'Confirmed' | 'Completed' | 'Canceled';
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';
export type ServiceStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';
export type PricingType = 'Flat Fee' | 'Per Unit' | 'Per Hour' | 'Per Person' | 'Custom';
export type ClientStatus = 'Lead' | 'Active' | 'Inactive' | 'Archived' | 'VIP';
export type RFQStatus = 'New' | 'Quoted' | 'Closed - Won' | 'Closed - Lost';
export type DataSource = 'manual' | 'ai' | 'mock_data';

export interface SubItem {
    subItemId: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
    image?: string;
    description_source?: DataSource;
}

export interface ServiceVariant {
    id: string;
    name: string;
    price: number;
    sku?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  imageUrl?: string;
  pricingType?: PricingType;
  status: ServiceStatus;
  minQuantity?: number;
  tags?: string[];
  createdAt: string;
  lastModifiedAt: string;
  keyFeatures?: string[];
  description_source?: DataSource;
  description_locked?: boolean;
  internalNotes?: string;
  subItems?: SubItem[];
  isFeatured?: boolean;
  displayPrice?: boolean;
  menuOptions?: string[];
  variants?: ServiceVariant[];
  profitMarginPercentage?: number; // For analysis
  defaultCost?: number; // For margin calculation
}

export interface CostTrackerItem {
  itemId: string;
  masterServiceId?: string; // Link back to master service if applicable
  name: string;
  description?: string;
  quantity: number;
  unit_cost_sar: number;
  client_price_sar: number;
  category?: string; // Optional override
  imageUrl?: string;
  costType?: 'Fixed' | 'Variable' | 'Compliance'; // For detailed breakdown
}

export interface Task {
    id: string;
    description: string;
    isCompleted: boolean;
    dueDate?: string;
    createdAt: string;
}

export interface ProposalContentData {
    themeTitle?: string;
    themeDescription?: string;
    introduction?: string;
    conclusion?: string;
    coverTitle?: string;
    coverSubtitle?: string;
    themeImage?: string;
}

export interface EventItem {
  eventId: string;
  name: string;
  clientName: string;
  clientContact: string;
  date: string;
  location: string;
  guestCount: number;
  status: EventStatus;
  paymentStatus: PaymentStatus;
  salespersonId: string;
  remarks?: string;
  imageUrl?: string;
  eventBrief?: string; // Added for AI context
  eventType?: string; // Wedding, Corporate, etc.
  cost_tracker: CostTrackerItem[];
  commissionPaid: boolean;
  commissionRate?: number; // Override per event
  aiInteractionHistory?: AIInteraction[];
  proposalContent?: ProposalContentData;
  quotationId?: string;
  tasks: Task[];
}

export interface CustomField {
    id: string;
    label: string;
    value: string;
}

export interface RFQItem {
  rfqId: string;
  clientName: string;
  clientContact: string;
  eventBrief: string;
  status: RFQStatus;
  createdDate: string;
  items?: CostTrackerItem[];
  customFields?: CustomField[];
}

export interface Client {
  id: string;
  companyName: string;
  primaryContactName: string;
  email: string;
  phone?: string;
  clientStatus: ClientStatus;
  createdAt: string;
  lastModifiedAt: string;
  websiteUrl?: string;
  address?: string;
  internalNotes?: string;
  // AI Metadata
  companyName_source?: DataSource;
  primaryContactName_source?: DataSource;
  email_source?: DataSource;
  phone_source?: DataSource;
  websiteUrl_source?: DataSource;
  internalNotes_source?: DataSource;
}

export interface User {
  userId: string;
  name: string;
  role: Role;
  // permissions: Permissions; // Moved to global config
  commissionRate?: number; // Default commission rate %
}

export interface AIInteraction {
  interactionId: string;
  timestamp: string;
  feature: 'theme' | 'budget' | 'schedule' | 'risk' | 'general' | 'image_analysis' | 'suggestions' | 'description' | 'pricing' | 'sub_items' | 'image_generation' | 'service_suggestions' | 'proposal_review' | 'pricing_suggestion' | 'financial_studio_analysis' | 'theme_audit' | 'curate_catalogue' | 'catalogue_content' | 'item_image' | 'terms' | 'service_image_prompt' | 'procurement_analysis';
  promptSummary: string;
  fullPrompt: string;
  response: string;
  model?: string;
  parameters?: any;
  eventId?: string; // Optional context
}

export interface QuotationDetails {
    quotationId: string;
    companyName: string;
    companyAddress?: string;
    contactPerson: string;
    contactEmail: string;
    website?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    companyLogo?: string;
    partnerLogo1?: string;
    partnerLogo2?: string;
    primaryColor: string;
    validUntil: string;
    termsAndConditions: string;
    taxRate: number;
    otherCharges: {
        description: string;
        amount: number;
    };
}

export interface QuotationTemplate {
    templateId: string;
    templateName: string;
    details: Partial<QuotationDetails>;
    lineItems: Partial<CostTrackerItem>[];
}

export interface ProposalTemplateStyle {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamilyHeading: string;
    fontFamilyBody: string;
    backgroundImageUrl?: string;
}

export interface ProposalTemplate {
    id: string;
    name: string;
    description: string;
    templateType: 'system_default' | 'user_custom';
    style: ProposalTemplateStyle;
    structure?: string; // JSON string defining sections
    imageGenerationPrompt?: string; // Specific style prompt for AI images
}

export interface ProposalLineItem extends CostTrackerItem {
    key: string; // Unique key for UI list management
    finalSalePrice?: number; // Optional override
    subItems?: SubItem[];
    generatedImage?: string; // Base64 or URL
    description_source?: DataSource;
}

export interface ProposalFinancials {
    totalEstimatedCost: number;
    totalEstimatedRevenue: number;
    projectedMargin: number;
}

export interface SavedCatalogue {
  id: string;
  name: string;
  layout: 'boutique' | 'ledger' | 'spotlight';
  serviceIds: string[];
  config: {
    showPrices: boolean;
    showMenuDetails: boolean;
    customTitle?: string;
    coverImage?: string;
    introText?: string;
  };
  createdAt: string;
  coverImage?: string;
  introText?: string;
}

// --- Supplier Management Module Interfaces ---

export interface Supplier {
    supplier_id: string;
    name: string;
    payment_terms: string;
    performance_rating: number; // 1.0 to 5.0
    contact_email: string;
    category: string;
}

export type DocumentType = 'Quote' | 'Invoice' | 'Purchase Order' | 'Receipt';
export type GeminiStatus = 'Pending' | 'Processing' | 'Review Needed' | 'Verified' | 'Rejected';
export type MatchStatus = 'FULL_MATCH' | 'MINOR_VARIANCE' | 'MAJOR_DISCREPANCY' | 'NO_PO_FOUND';

export interface ProcurementDocumentAnalysis {
    extraction_status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    extracted_details: {
        supplier_name: string;
        document_number: string;
        document_date: string;
        total_amount: number;
        currency: string;
        line_items: { description: string; quantity: number; unit_price: number; total: number }[];
    };
    reconciliation_match: {
        match_status: MatchStatus;
        total_variance_amount: number;
        variance_reason: string;
        related_po_number?: string;
    };
}

export interface ProcurementDocument {
    document_id: string;
    document_type: DocumentType;
    document_number: string; // Extracted or Entered
    file_url: string; // Base64 or URL
    supplier_id?: string;
    related_po_id?: string; // If invoice, link to PO
    related_event_id?: string; // New: Link to Event
    upload_date: string;
    
    // Gemini Results
    gemini_results?: ProcurementDocumentAnalysis;
    gemini_status: GeminiStatus;
    
    // Payment Tracking (Embedded for simplicity)
    payment_status: 'Unpaid' | 'Scheduled' | 'Paid' | 'Cancelled';
    due_date?: string;
    payment_date?: string;
}

export interface ThemePreset {
    id: string;
    name: string;
    settings: Partial<AppSettings>;
    createdAt: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string; // e.g., "event:123"
}

export interface RiskAnalysisResult {
    riskLevel: 'Low' | 'Medium' | 'High';
    riskFactors: string[];
    suggestedStatus?: string;
}

export interface AppSettings {
    themeMode: 'light' | 'dark';
    adminPin?: string;
    colors: {
        primaryAccent: string;
        background: string;
        cardContainer: string;
        primaryText: string;
        secondaryText: string;
        borderColor: string;
    };
    typography: {
        applicationFont: string;
        headingFont: string;
    };
    layout: {
        borderRadius: number;
        sidebarWidth: number;
        cardDensity: 'compact' | 'comfortable' | 'spacious';
        glassIntensity?: number; // New: Control blur strength
    };
    motion: {
        enableAnimations: boolean;
        transitionSpeed: number; // seconds
        animationDuration: number; // seconds
        transitionEasing: string;
        defaultEntryAnimation: 'fadeIn' | 'slideUp' | 'zoomIn';
        smoothScrolling: boolean;
        cardHoverEffect: 'lift' | 'scale' | 'glow' | 'none';
        buttonHoverEffect: 'lift' | 'scale' | 'glow' | 'none';
        // Particle System Config
        particleCount?: number;
        particleSpeed?: number;
        particleOpacity?: number;
        particleStyle?: 'particle-flow' | 'light-flares' | 'abstract-lines' | 'golden-sparkles';
        particleDirection?: 'up' | 'down' | 'left' | 'right' | 'random';
        particleShape?: 'circle' | 'square' | 'star';
        motionSensitivity?: number;
        responsiveSensitivity?: number;
        enableOverlap?: boolean;
        overlayMode?: boolean;
    };
    branding: {
        logoUrl?: string;
        appBackgroundUrl?: string; // New global background
    };
    landingPage?: {
        background: {
             type: 'image' | 'video' | 'gradient';
             imagePool?: string[];
        };
        motivationalQuotes: string[];
    };
    aiFallback?: {
        enableGeminiQuotaFallback: boolean;
        fallbackMode: 'predefined' | 'dynamic_placeholder';
    };
    userPreferences?: {
      defaultView: 'Home' | 'Dashboard' | 'Events';
      dashboardWidgets?: string[]; // 'kpi', 'charts', 'alerts'
      eventListViewOptions?: {
        showDate: boolean;
        showLocation: boolean;
        showGuests: boolean;
        showPayment: boolean;
        showSalesperson: boolean;
      };
    };
}

export interface AppState {
  users: User[];
  events: EventItem[];
  services: ServiceItem[];
  clients: Client[];
  rfqs: RFQItem[];
  quotationTemplates: QuotationTemplate[];
  proposalTemplates: ProposalTemplate[];
  roles: RolesConfig;
  currentUserId: string;
  settings: AppSettings;
  isLoggedIn: boolean;
  customThemes?: ThemePreset[];
  notifications?: Notification[];
  savedCatalogues?: SavedCatalogue[];
  // Supplier Management Module
  suppliers?: Supplier[];
  procurementDocuments?: ProcurementDocument[];
}
