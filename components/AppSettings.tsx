// components/AppSettings.tsx
import React, { useState } from 'react';
import type { AppSettings, User, ThemePreset, AIInteraction } from '../types';
import { MenuIcon, SparkleIcon, TrashIcon, PlusIcon, SettingsIcon, LockClosedIcon, RefreshIcon, MoonIcon, SunIcon, BoltIcon, NetworkIcon, DocumentTextIcon, CodeIcon, DatabaseIcon, ServerIcon } from './common/icons';
import { InputField } from './common/InputField';
import { Modal } from './common/Modal';
import { DATA_VERSION } from '../migrations';

interface AppSettingsComponentProps {
    settings: AppSettings;
    currentUser: User;
    customThemes: ThemePreset[];
    onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
    onLogAIInteraction: (data: any) => void;
    onMenuClick: () => void;
    onSaveTheme: (name: string) => void;
    onDeleteTheme: (id: string) => void;
    onApplyTheme: (theme: ThemePreset) => void;
    onSimulateError?: () => void; // Added prop for simulation
}

// Matches fonts loaded in index.html
const availableFonts = [
    'Inter', 'Poppins', 'Dancing Script', 'Lato', 'Montserrat', 
    'Roboto', 'Playfair Display', 'Source Sans Pro', 'Fira Code', 
    'Didot', 'Garamond', 'Cinzel'
];

const themedContainerStyle = {
    backgroundColor: 'var(--card-container-color)',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--border-radius)',
};

// Helper to parse RGBA or Hex to separated hex + alpha
const parseColor = (color: string) => {
    if (color.startsWith('#')) return { hex: color, alpha: 1 };
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return { hex: '#000000', alpha: 1 };
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    const alpha = match[4] ? parseFloat(match[4]) : 1;
    return { hex: `#${r}${g}${b}`, alpha };
};

const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 7), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SelectInput = ({ label, value, onChange, options }: any) => (
    <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>{label}</label>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 rounded border bg-black/10 border-white/10 text-[var(--text-primary-color)] focus:border-[var(--primary-accent-color)] outline-none"
        >
            {options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const SliderInput = ({ label, value, min, max, step, unit, onChange }: any) => (
    <div>
        <div className="flex justify-between text-sm mb-1">
            <label style={{ color: 'var(--text-secondary-color)' }}>{label}</label>
            <span className="font-mono text-[var(--primary-accent-color)]">{value}{unit}</span>
        </div>
        <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-accent-color)]"
        />
    </div>
);

const ColorInput = ({ label, value, onChange, hasOpacity = false }: any) => {
    const { hex, alpha } = parseColor(value);

    const handleHexChange = (newHex: string) => {
        if (hasOpacity) {
            onChange(hexToRgba(newHex, alpha));
        } else {
            onChange(newHex);
        }
    };

    const handleAlphaChange = (newAlpha: number) => {
        onChange(hexToRgba(hex, newAlpha));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>{label}</label>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono opacity-50">{value}</span>
                    <input 
                        type="color" 
                        value={hex} 
                        onChange={(e) => handleHexChange(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                </div>
            </div>
            {hasOpacity && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-secondary-color)] w-12">Opacity</span>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={alpha} 
                        onChange={(e) => handleAlphaChange(Number(e.target.value))}
                        className="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-accent-color)]"
                    />
                    <span className="font-mono w-8 text-right">{(alpha * 100).toFixed(0)}%</span>
                </div>
            )}
        </div>
    );
};

// --- BLUEPRINT DEFINITIONS ---
const eventSchema = `
interface EventItem {
  eventId: string; // Unique ID
  name: string;
  clientName: string;
  date: string; // ISO 8601 (YYYY-MM-DD)
  location: string;
  status: 'Draft' | 'Confirmed' | 'Completed' | 'Canceled';
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  cost_tracker: CostTrackerItem[]; // Line items
  salespersonId: string;
  // ... optional fields
}
`;

const clientSchema = `
interface Client {
  id: string;
  companyName: string;
  primaryContactName: string;
  email: string;
  clientStatus: 'Lead' | 'Active' | 'Inactive' | 'VIP';
  // ... contact details
}
`;

const serviceSchema = `
interface ServiceItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  pricingType: 'Flat Fee' | 'Per Unit' | 'Per Hour' | 'Per Person';
  status: 'Active' | 'Draft' | 'Inactive';
  // ... inventory metadata
}
`;

export const AppSettingsComponent: React.FC<AppSettingsComponentProps> = ({ 
    settings, currentUser, customThemes, onUpdateSettings, onLogAIInteraction, onMenuClick, onSaveTheme, onDeleteTheme, onApplyTheme, onSimulateError 
}) => {
    const [activeTab, setActiveTab] = useState('appearance');
    const [newThemeName, setNewThemeName] = useState('');
    const [isSaveThemeOpen, setIsSaveThemeOpen] = useState(false);
    const [activeSchema, setActiveSchema] = useState<'event' | 'client' | 'service'>('event');

    const handleSaveThemeSubmit = () => {
        if (newThemeName.trim()) {
            onSaveTheme(newThemeName);
            setNewThemeName('');
            setIsSaveThemeOpen(false);
        }
    };

    const TABS = ['appearance', 'motion', 'admin', 'themes', 'developer'];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-2">
                <button onClick={onMenuClick} className="p-1 rounded-md md:hidden">
                    <MenuIcon className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary-color)' }}>Application Settings</h1>
            </div>

            <div className="border-b overflow-x-auto flex whitespace-nowrap" style={{ borderColor: 'var(--border-color)' }}>
                {TABS.map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab)} 
                        data-active={activeTab === tab} 
                        className="tab-button px-6 py-3 text-sm font-medium capitalize tracking-wide"
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'appearance' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in-item">
                    <div className="space-y-6">
                         <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">Theme Base</h3>
                            <div className="flex gap-4 mb-6">
                                <button 
                                    onClick={() => onUpdateSettings({ themeMode: 'light' })}
                                    className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${settings.themeMode === 'light' ? 'bg-[var(--primary-accent-color)] text-white border-transparent shadow-md' : 'bg-black/5 border-white/10 text-[var(--text-secondary-color)] hover:bg-white/5'}`}
                                >
                                    <SunIcon className="h-6 w-6" />
                                    <span className="font-bold">Light Mode</span>
                                </button>
                                <button 
                                    onClick={() => onUpdateSettings({ themeMode: 'dark' })}
                                    className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${settings.themeMode === 'dark' ? 'bg-[var(--primary-accent-color)] text-white border-transparent shadow-md' : 'bg-black/5 border-white/10 text-[var(--text-secondary-color)] hover:bg-white/5'}`}
                                >
                                    <MoonIcon className="h-6 w-6" />
                                    <span className="font-bold">Dark Mode</span>
                                </button>
                            </div>
                            
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-[var(--text-secondary-color)]">Typography</h4>
                            <SelectInput
                                label="Application Font"
                                value={settings.typography.applicationFont}
                                onChange={(val: string) => onUpdateSettings({ typography: { ...settings.typography, applicationFont: val } })}
                                options={availableFonts.map(f => ({ value: f, label: f }))}
                            />
                         </div>

                        <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                           <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">Layout Geometry</h3>
                           <div className="space-y-6">
                               <SliderInput 
                                    label="Global Border Radius" 
                                    value={settings.layout.borderRadius} 
                                    min={0} max={32} step={4} unit="px"
                                    onChange={(val: number) => onUpdateSettings({ layout: { ...settings.layout, borderRadius: val } })} 
                               />
                               <SliderInput 
                                    label="Glass Blur Intensity" 
                                    value={settings.layout.glassIntensity || 15} 
                                    min={0} max={50} step={5} unit="px"
                                    onChange={(val: number) => onUpdateSettings({ layout: { ...settings.layout, glassIntensity: val } })} 
                               />
                           </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">Color Palette</h3>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Brand Identity</h4>
                                    <ColorInput label="Primary Accent" value={settings.colors.primaryAccent} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, primaryAccent: val } })} />
                                    <ColorInput label="Background Color" value={settings.colors.background} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, background: val } })} />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">UI Elements</h4>
                                    <ColorInput label="Card Container" value={settings.colors.cardContainer} hasOpacity={true} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, cardContainer: val } })} />
                                    <ColorInput label="Border Color" value={settings.colors.borderColor} hasOpacity={true} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, borderColor: val } })} />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Typography Colors</h4>
                                    <ColorInput label="Primary Text" value={settings.colors.primaryText} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, primaryText: val } })} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'motion' && (
                <div className="max-w-2xl mx-auto animate-in-item">
                    <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">
                            <SparkleIcon className="h-5 w-5" /> Animation Engine
                        </h3>
                        
                        <div className="flex items-center justify-between mb-6">
                            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Enable Animations</label>
                            <div 
                                onClick={() => onUpdateSettings({ motion: { ...settings.motion, enableAnimations: !settings.motion.enableAnimations } })}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.motion.enableAnimations ? 'bg-[var(--primary-accent-color)]' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.motion.enableAnimations ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        {settings.motion.enableAnimations && (
                            <div className="space-y-6">
                                <SliderInput 
                                    label="Particle Count" 
                                    value={settings.motion.particleCount || 60} 
                                    min={0} max={200} step={10} unit=""
                                    onChange={(val: number) => onUpdateSettings({ motion: { ...settings.motion, particleCount: val } })} 
                                />
                                <SliderInput 
                                    label="Animation Speed" 
                                    value={settings.motion.transitionSpeed} 
                                    min={0.1} max={1.0} step={0.1} unit="s"
                                    onChange={(val: number) => onUpdateSettings({ motion: { ...settings.motion, transitionSpeed: val } })} 
                                />
                                <SelectInput
                                    label="Particle Style"
                                    value={settings.motion.particleStyle || 'particle-flow'}
                                    onChange={(val: any) => onUpdateSettings({ motion: { ...settings.motion, particleStyle: val } })}
                                    options={[
                                        { value: 'particle-flow', label: 'Standard Flow' },
                                        { value: 'light-flares', label: 'Light Flares' },
                                        { value: 'abstract-lines', label: 'Abstract Lines' },
                                        { value: 'golden-sparkles', label: 'Golden Sparkles' }
                                    ]}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'admin' && (
                <div className="max-w-xl mx-auto animate-in-item">
                    <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">
                            <LockClosedIcon className="h-5 w-5" /> Security & Admin
                        </h3>
                        <div className="space-y-4">
                            <InputField 
                                label="Admin Access PIN" 
                                type="password" 
                                maxLength={4}
                                placeholder="Enter 4-digit PIN"
                                value={settings.adminPin || ''} 
                                onChange={(e) => onUpdateSettings({ adminPin: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} 
                            />
                            <p className="text-xs text-slate-500">This PIN is required to switch to the Admin user role.</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'themes' && (
                <div className="space-y-6 animate-in-item">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary-color)'}}>Saved Themes</h3>
                        <button onClick={() => setIsSaveThemeOpen(true)} className="px-4 py-2 bg-[var(--primary-accent-color)] text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 flex items-center gap-2">
                            <PlusIcon className="h-4 w-4" /> Save Current
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {customThemes.length === 0 && (
                            <div className="col-span-3 p-8 text-center border border-dashed rounded-xl border-slate-500/30 text-slate-500">
                                No custom themes saved yet. Customize your settings and save them here!
                            </div>
                        )}
                        {customThemes.map(theme => (
                            <div key={theme.id} className="p-4 rounded-xl border relative group transition-transform hover:-translate-y-1" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                                <h4 className="font-bold text-[var(--text-primary-color)]">{theme.name}</h4>
                                <div className="flex gap-2 mt-2 mb-4">
                                    <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: theme.settings.colors?.primaryAccent }}></div>
                                    <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: theme.settings.colors?.background }}></div>
                                    <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: theme.settings.colors?.cardContainer }}></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onApplyTheme(theme)} className="flex-1 py-2 text-xs font-bold bg-[var(--primary-accent-color)] text-white rounded hover:opacity-90 shadow-md">Apply</button>
                                    <button onClick={() => onDeleteTheme(theme.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'developer' && (
                <div className="max-w-6xl mx-auto animate-in-item space-y-8 pb-20">
                    {/* Header / Intro */}
                    <div className="p-8 rounded-xl border shadow-lg" style={themedContainerStyle}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-[var(--text-primary-color)]">
                                    <NetworkIcon className="h-6 w-6 text-blue-400" /> Developer Integration Hub
                                </h3>
                                <p className="text-sm text-[var(--text-secondary-color)] leading-relaxed max-w-3xl">
                                    This section provides the architectural blueprint and data schemas required for integrating external ERP, CRM, or Inventory systems. 
                                    Use the JSON models below to map internal data structures to your external APIs.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 text-xs font-mono text-right">
                                <span className="text-slate-400">Version: <span className="text-green-400">v{DATA_VERSION}</span></span>
                                <span className="text-slate-400">Env: <span className="text-blue-400">Production</span></span>
                                <span className="text-slate-400">Stack: <span className="text-purple-400">React 19 / Gemini</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Application Blueprint */}
                        <div className="space-y-6">
                            <div className="p-6 rounded-xl border shadow-lg h-full" style={themedContainerStyle}>
                                <h4 className="text-md font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-[var(--text-secondary-color)]">
                                    <ServerIcon className="h-4 w-4" /> Architecture Blueprint
                                </h4>
                                <div className="space-y-4 text-sm text-[var(--text-primary-color)]">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded bg-blue-900/30 text-blue-400 flex items-center justify-center font-bold">1</div>
                                        <div>
                                            <p className="font-bold">Frontend Core</p>
                                            <p className="text-xs text-slate-400">React 19 + Vite. State is managed locally via <code>usePersistentState</code> hook which wraps <code>localStorage</code>.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded bg-purple-900/30 text-purple-400 flex items-center justify-center font-bold">2</div>
                                        <div>
                                            <p className="font-bold">AI Intelligence Layer</p>
                                            <p className="text-xs text-slate-400">Direct integration with Google Gemini API (Flash 2.5 & Pro 2.5) for reasoning, and Imagen 3 for visuals.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded bg-green-900/30 text-green-400 flex items-center justify-center font-bold">3</div>
                                        <div>
                                            <p className="font-bold">ERP Integration Points</p>
                                            <p className="text-xs text-slate-400">External systems should hook into the <code>EventDetail</code> component for order syncing and <code>FinancialStudio</code> for invoice reconciliation.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <h5 className="text-xs font-bold mb-3 text-[var(--text-secondary-color)]">RECOMMENDED INTEGRATION HOOKS</h5>
                                    <ul className="space-y-2 text-xs font-mono text-slate-300">
                                        <li className="bg-black/20 p-2 rounded border border-white/5">POST /api/erp/sync-event (Trigger: Status Change to 'Confirmed')</li>
                                        <li className="bg-black/20 p-2 rounded border border-white/5">GET /api/erp/inventory-check (Trigger: Adding Service Items)</li>
                                        <li className="bg-black/20 p-2 rounded border border-white/5">POST /api/finance/invoice (Trigger: Proposal Acceptance)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Data Schemas */}
                        <div className="space-y-6">
                             <div className="p-6 rounded-xl border shadow-lg h-full" style={themedContainerStyle}>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-md font-bold uppercase tracking-wider flex items-center gap-2 text-[var(--text-secondary-color)]">
                                        <DatabaseIcon className="h-4 w-4" /> Data Schemas
                                    </h4>
                                    <div className="flex bg-black/20 p-1 rounded-lg border border-white/10">
                                        {['event', 'client', 'service'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setActiveSchema(s as any)}
                                                className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${activeSchema === s ? 'bg-[var(--primary-accent-color)] text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="relative group">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white">TypeScript Interface</span>
                                    </div>
                                    <pre className="bg-slate-900 p-4 rounded-lg border border-white/10 text-xs font-mono text-blue-300 overflow-x-auto custom-scrollbar leading-relaxed">
                                        {activeSchema === 'event' && eventSchema.trim()}
                                        {activeSchema === 'client' && clientSchema.trim()}
                                        {activeSchema === 'service' && serviceSchema.trim()}
                                    </pre>
                                </div>
                                <p className="mt-4 text-xs text-slate-500">
                                    * Copy these interfaces to your ERP middleware to ensure type safety when syncing JSON payloads.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Diagnostics Section */}
                    <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-[var(--text-secondary-color)] flex items-center gap-2">
                            <BoltIcon className="h-4 w-4 text-yellow-500" /> System Diagnostics
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-yellow-900/10 border border-yellow-600/20 rounded-lg">
                                <h5 className="text-sm font-bold text-yellow-400 mb-2">Error Handling</h5>
                                <p className="text-xs text-yellow-200/70 mb-3">
                                    Test the application's resilience to various API errors. This cycles through 403, 429, 500, and 503 errors.
                                </p>
                                {onSimulateError ? (
                                    <button
                                        onClick={onSimulateError}
                                        className="px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/40 rounded-lg text-xs font-bold hover:bg-yellow-600/30 transition flex items-center gap-2"
                                    >
                                        Trigger API Error Simulation
                                    </button>
                                ) : (
                                    <p className="text-xs text-red-400">Handler not connected.</p>
                                )}
                            </div>
                             <div className="p-4 bg-blue-900/10 border border-blue-600/20 rounded-lg">
                                <h5 className="text-sm font-bold text-blue-400 mb-2">Raw Data Export</h5>
                                <p className="text-xs text-blue-200/70 mb-3">
                                    Download the entire application state tree as a raw JSON file for debugging or manual migration.
                                </p>
                                <button
                                    onClick={() => {
                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ settings, currentUser, customThemes }, null, 2));
                                        const downloadAnchorNode = document.createElement('a');
                                        downloadAnchorNode.setAttribute("href", dataStr);
                                        downloadAnchorNode.setAttribute("download", "app_debug_dump.json");
                                        document.body.appendChild(downloadAnchorNode);
                                        downloadAnchorNode.click();
                                        downloadAnchorNode.remove();
                                    }}
                                    className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/40 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition flex items-center gap-2"
                                >
                                    Download State Dump
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isSaveThemeOpen && (
                <Modal title="Save Custom Theme" onClose={() => setIsSaveThemeOpen(false)} onSave={handleSaveThemeSubmit} saveText="Save Theme">
                    <InputField 
                        label="Theme Name" 
                        value={newThemeName} 
                        onChange={(e) => setNewThemeName(e.target.value)} 
                        placeholder="e.g., Midnight Blue"
                        autoFocus
                    />
                </Modal>
            )}
        </div>
    );
};