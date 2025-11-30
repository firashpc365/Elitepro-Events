
// components/AppSettings.tsx
import React, { useState } from 'react';
import type { AppSettings, User, ThemePreset, AIInteraction } from '../types';
import { MenuIcon, SparkleIcon, TrashIcon, PlusIcon, SettingsIcon, LockClosedIcon, RefreshIcon, MoonIcon, SunIcon } from './common/icons';
import { InputField } from './common/InputField';
import { Modal } from './common/Modal';

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
}

const fonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins'];

const themedContainerStyle = {
    backgroundColor: 'var(--card-container-color)',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--border-radius)',
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

const ColorInput = ({ label, value, onChange }: any) => (
    <div className="flex items-center justify-between">
        <label className="text-sm" style={{ color: 'var(--text-secondary-color)' }}>{label}</label>
        <div className="flex items-center gap-2">
            <span className="text-xs font-mono opacity-70">{value}</span>
            <input 
                type="color" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            />
        </div>
    </div>
);

export const AppSettingsComponent: React.FC<AppSettingsComponentProps> = ({ 
    settings, currentUser, customThemes, onUpdateSettings, onLogAIInteraction, onMenuClick, onSaveTheme, onDeleteTheme, onApplyTheme 
}) => {
    const [activeTab, setActiveTab] = useState('appearance');
    const [newThemeName, setNewThemeName] = useState('');
    const [isSaveThemeOpen, setIsSaveThemeOpen] = useState(false);

    const handleSaveThemeSubmit = () => {
        if (newThemeName.trim()) {
            onSaveTheme(newThemeName);
            setNewThemeName('');
            setIsSaveThemeOpen(false);
        }
    };

    const TABS = ['appearance', 'motion', 'admin', 'themes'];

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
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">Theme Mode</h3>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => onUpdateSettings({ themeMode: 'light' })}
                                    className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${settings.themeMode === 'light' ? 'bg-[var(--primary-accent-color)] text-white border-transparent' : 'bg-black/10 border-white/10 text-[var(--text-secondary-color)] hover:bg-white/5'}`}
                                >
                                    <SunIcon className="h-6 w-6" />
                                    <span className="font-bold">Light Mode</span>
                                </button>
                                <button 
                                    onClick={() => onUpdateSettings({ themeMode: 'dark' })}
                                    className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${settings.themeMode === 'dark' ? 'bg-[var(--primary-accent-color)] text-white border-transparent' : 'bg-black/10 border-white/10 text-[var(--text-secondary-color)] hover:bg-white/5'}`}
                                >
                                    <MoonIcon className="h-6 w-6" />
                                    <span className="font-bold">Dark Mode</span>
                                </button>
                            </div>
                         </div>

                        <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">Color Palette</h3>
                            <div className="space-y-4">
                                <ColorInput label="Primary Accent" value={settings.colors.primaryAccent} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, primaryAccent: val } })} />
                                <ColorInput label="Background" value={settings.colors.background} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, background: val } })} />
                                <ColorInput label="Card Container" value={settings.colors.cardContainer} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, cardContainer: val } })} />
                                <ColorInput label="Primary Text" value={settings.colors.primaryText} onChange={(val: string) => onUpdateSettings({ colors: { ...settings.colors, primaryText: val } })} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                       <div className="p-6 rounded-xl border shadow-lg" style={themedContainerStyle}>
                           <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary-color)] border-b border-white/10 pb-2">Typography & Layout</h3>
                           <div className="space-y-6">
                               <SelectInput
                                    label="Font Family"
                                    value={settings.typography.applicationFont}
                                    onChange={(val: string) => onUpdateSettings({ typography: { ...settings.typography, applicationFont: val } })}
                                    options={fonts.map(f => ({ value: f, label: f }))}
                               />
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
                            <div key={theme.id} className="p-4 rounded-xl border relative group" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
                                <h4 className="font-bold text-[var(--text-primary-color)]">{theme.name}</h4>
                                <div className="flex gap-2 mt-2 mb-4">
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.settings.colors?.primaryAccent }}></div>
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.settings.colors?.background }}></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onApplyTheme(theme)} className="flex-1 py-2 text-xs font-bold bg-[var(--primary-accent-color)] text-white rounded hover:opacity-90">Apply</button>
                                    <button onClick={() => onDeleteTheme(theme.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                        ))}
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
