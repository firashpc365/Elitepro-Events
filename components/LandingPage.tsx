
// components/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import type { User, AppSettings } from '../types';
import { QuoteOfTheDay } from './common/QuoteOfTheDay';
import { MotionGraphicsOverlay } from './common/MotionGraphicsOverlay';
import { Modal } from './common/Modal';
import { LockClosedIcon, SparkleIcon, UserCircleIcon, BoltIcon, DocumentTextIcon, TrendingUpIcon, EyeIcon } from './common/icons';

interface LandingPageProps {
    users: User[];
    defaultUserId: string;
    onLogin: (userId: string) => void;
    settings: AppSettings;
    isExiting?: boolean;
}

// --- Typewriter Effect Component ---
const TypewriterEffect: React.FC<{ text: string; delay?: number }> = ({ text, delay = 50 }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(text.substring(0, i + 1));
                i++;
            } else {
                clearInterval(timer);
            }
        }, delay);
        return () => clearInterval(timer);
    }, [text, delay]);

    return <span>{displayedText}<span className="animate-pulse">|</span></span>;
};

// --- Animated AI Illustration Component ---
const AIOrb = () => (
    <svg viewBox="0 0 200 200" className="w-64 h-64 md:w-96 md:h-96 animate-float opacity-90">
        <defs>
            <radialGradient id="core-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                <stop offset="40%" stopColor="var(--primary-accent-color)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--primary-accent-color)" stopOpacity="0" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        {/* Orbiting Rings */}
        <circle cx="100" cy="100" r="70" fill="none" stroke="url(#core-grad)" strokeWidth="1" opacity="0.3" className="animate-spin-slow" style={{transformOrigin: 'center'}} />
        <circle cx="100" cy="100" r="50" fill="none" stroke="url(#core-grad)" strokeWidth="2" opacity="0.5" className="animate-spin-reverse" style={{transformOrigin: 'center'}} />
        
        {/* Core */}
        <circle cx="100" cy="100" r="30" fill="url(#core-grad)" filter="url(#glow)" className="animate-pulse-slow" />
        
        {/* Satellite Nodes */}
        <g className="animate-spin-slow" style={{transformOrigin: 'center', animationDuration: '10s'}}>
            <circle cx="100" cy="20" r="4" fill="white" opacity="0.8" />
            <circle cx="100" cy="180" r="4" fill="white" opacity="0.8" />
        </g>
        <g className="animate-spin-reverse" style={{transformOrigin: 'center', animationDuration: '15s'}}>
            <circle cx="20" cy="100" r="6" fill="var(--primary-accent-color)" opacity="0.6" />
            <circle cx="180" cy="100" r="6" fill="var(--primary-accent-color)" opacity="0.6" />
        </g>
    </svg>
);

// --- Live Activity Ticker ---
const ActivityTicker = () => {
    return (
        <div className="overflow-hidden whitespace-nowrap w-full py-2 bg-black/30 backdrop-blur-sm border-t border-white/5">
            <div className="inline-block animate-marquee">
                <span className="mx-8 text-xs font-mono text-cyan-300">● SYSTEM: AI Agent 'Gemini-Pro' active</span>
                <span className="mx-8 text-xs font-mono text-purple-300">● EVENT: Neom Gala proposal generated (2m ago)</span>
                <span className="mx-8 text-xs font-mono text-green-300">● FINANCE: Q3 Revenue Forecast Updated</span>
                <span className="mx-8 text-xs font-mono text-blue-300">● ALERT: Vendor cost analysis complete</span>
                <span className="mx-8 text-xs font-mono text-cyan-300">● SYSTEM: All systems nominal</span>
                <span className="mx-8 text-xs font-mono text-purple-300">● EVENT: Red Sea Film Fest assets loaded</span>
            </div>
             <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    )
}

export const LandingPage: React.FC<LandingPageProps> = ({ users, defaultUserId, onLogin, settings, isExiting }) => {
    const [selectedUserId, setSelectedUserId] = useState(defaultUserId);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [bgImageIndex, setBgImageIndex] = useState(0);
    const [isLoginHovered, setIsLoginHovered] = useState(false);

    // Background Image Rotation
    useEffect(() => {
        const imagePool = settings.landingPage?.background?.imagePool || [];
        if (imagePool.length > 1) {
            const interval = setInterval(() => {
                setBgImageIndex(prev => (prev + 1) % imagePool.length);
            }, 8000); // Change every 8 seconds
            return () => clearInterval(interval);
        }
    }, [settings]);

    const bgImage = settings.landingPage?.background?.imagePool?.[bgImageIndex];

    const handleLoginClick = () => {
        const user = users.find(u => u.userId === selectedUserId);
        if (user?.role === 'Admin') {
            setShowPinModal(true);
            setPinInput('');
            setPinError(null);
        } else {
            onLogin(selectedUserId);
        }
    };

    const handlePinVerify = () => {
        const adminPin = settings.adminPin || '1234';
        if (pinInput === adminPin) {
            onLogin(selectedUserId);
            setShowPinModal(false);
        } else {
            setPinError('Incorrect PIN');
            setPinInput('');
        }
    };
    
    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      setPinInput(val);
      setPinError(null);
      const adminPin = settings.adminPin || '1234';
      if (val.length === 4) {
          if (val === adminPin) {
             onLogin(selectedUserId);
             setShowPinModal(false);
          } else {
              setTimeout(() => { setPinError('Incorrect PIN'); setPinInput(''); }, 300);
          }
      }
    };

    const selectedUser = users.find(u => u.userId === selectedUserId);

    return (
        <div className={`relative min-h-screen w-full flex flex-col overflow-hidden text-white font-sans selection:bg-[var(--primary-accent-color)] selection:text-white ${isExiting ? 'animate-warp-out' : ''}`}>
            
            {/* --- Animated Background Layer --- */}
            <div className="absolute inset-0 z-0 bg-slate-900">
                 {settings.landingPage?.background?.imagePool?.map((img, index) => (
                    <div 
                        key={img}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out ${index === bgImageIndex ? 'opacity-40' : 'opacity-0'}`}
                        style={{ backgroundImage: `url(${img})` }}
                    />
                 ))}
                 <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-[var(--primary-accent-color)]/20 mix-blend-overlay" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />
            </div>

            {/* Motion Graphics Overlay */}
            <div className="absolute inset-0 z-1 pointer-events-none">
                 <MotionGraphicsOverlay 
                    config={{...settings.motion, particleCount: 60, particleOpacity: 0.6}}
                    color={settings.colors.primaryAccent} 
                />
            </div>

            {/* --- Main Content Container --- */}
            <div className="relative z-10 flex-grow flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 gap-12 lg:gap-24">
                
                {/* LEFT COLUMN: Brand & Value Prop */}
                <div className="flex-1 text-center lg:text-left space-y-8 animate-in-item" style={{ animationDelay: '0ms' }}>
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg hover:bg-white/10 transition-colors cursor-default">
                        <SparkleIcon className="h-4 w-4 text-[var(--primary-accent-color)] animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Powered by Gemini 1.5 Pro</span>
                    </div>

                    <div>
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                            Orchestrate the <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent-color)] to-cyan-300">
                                <TypewriterEffect text="Extraordinary" />
                            </span>
                        </h1>
                        <p className="mt-6 text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Kanchana Events Hub combines elite event management with cutting-edge AI. Generate proposals, analyze finances, and visualize themes in seconds.
                        </p>
                    </div>

                    {/* Desktop-only AI Illustration */}
                    <div className="hidden lg:flex justify-center lg:justify-start pt-8">
                        <div className="relative">
                            <div className="absolute -left-20 -top-20 w-96 h-96 bg-[var(--primary-accent-color)] opacity-20 blur-[100px] rounded-full pointer-events-none"></div>
                            <AIOrb />
                            
                            {/* Floating Labels */}
                            <div className="absolute top-10 right-0 bg-black/60 backdrop-blur-md p-2 rounded border border-white/10 text-xs font-mono text-cyan-300 animate-float" style={{animationDelay: '1s'}}>
                                Analyzing Trends...
                            </div>
                            <div className="absolute bottom-20 -right-10 bg-black/60 backdrop-blur-md p-2 rounded border border-white/10 text-xs font-mono text-purple-300 animate-float" style={{animationDelay: '2.5s'}}>
                                Optimizing Costs...
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Login & Features */}
                <div className="flex-1 w-full max-w-md space-y-8">
                    
                    {/* Login Card */}
                    <div 
                        className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] p-8 animate-in-item relative overflow-hidden group" 
                        style={{ animationDelay: '150ms' }}
                    >
                        {/* Glass Reflection Effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white">Access Hub</h2>
                            <p className="text-sm text-slate-400">Select your profile to continue.</p>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div className="relative">
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-xl text-white appearance-none focus:ring-2 focus:ring-[var(--primary-accent-color)] focus:border-transparent outline-none transition-all cursor-pointer hover:bg-black/40 font-medium text-lg"
                                >
                                    {users.map(u => (
                                        <option key={u.userId} value={u.userId} className="bg-slate-900 text-white">
                                            {u.name} &mdash; {u.role}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--primary-accent-color)] pointer-events-none">
                                    <UserCircleIcon className="h-6 w-6" />
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>

                            <button
                                onClick={handleLoginClick}
                                onMouseEnter={() => setIsLoginHovered(true)}
                                onMouseLeave={() => setIsLoginHovered(false)}
                                className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform hover:-translate-y-1 hover:shadow-[var(--primary-accent-color)]/40 active:translate-y-0 active:scale-95 relative overflow-hidden group"
                                style={{ 
                                    background: `linear-gradient(135deg, var(--primary-accent-color), #4f46e5)` 
                                }}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {selectedUser?.role === 'Admin' ? <LockClosedIcon className="h-5 w-5"/> : <BoltIcon className="h-5 w-5"/>}
                                    {selectedUser?.role === 'Admin' ? 'Authenticate' : 'Enter Dashboard'}
                                </span>
                                {/* Button Shine Effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                
                                {/* Biometric Scan Effect */}
                                <div className={`absolute top-0 left-0 w-full h-1 bg-white/50 transition-all duration-500 ${isLoginHovered ? 'translate-y-14 opacity-0' : 'translate-y-0 opacity-0'}`}></div>
                            </button>
                        </div>
                    </div>

                    {/* Feature Micro-Cards */}
                    <div className="grid grid-cols-3 gap-3 animate-in-item" style={{ animationDelay: '300ms' }}>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md text-center hover:bg-white/10 transition-colors cursor-default group">
                            <DocumentTextIcon className="h-6 w-6 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Smart Proposals</p>
                        </div>
                         <div className="p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md text-center hover:bg-white/10 transition-colors cursor-default group">
                            <TrendingUpIcon className="h-6 w-6 mx-auto mb-2 text-green-400 group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Profit Forecast</p>
                        </div>
                         <div className="p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md text-center hover:bg-white/10 transition-colors cursor-default group">
                            <EyeIcon className="h-6 w-6 mx-auto mb-2 text-cyan-400 group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Visual AI</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer Area */}
            <div className="relative z-10 mt-auto w-full bg-black/40 backdrop-blur-md">
                <ActivityTicker />
                <div className="border-t border-white/5 max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xs text-slate-400 text-center md:text-left">
                         <p>&copy; {new Date().getFullYear()} Kanchana Events Hub. All rights reserved.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <QuoteOfTheDay quotes={settings.landingPage?.motivationalQuotes || []} />
                    </div>
                </div>
            </div>

            {/* --- Admin PIN Modal --- */}
            {showPinModal && (
                <Modal title="" onClose={() => setShowPinModal(false)} footer={null}>
                    <div className="flex flex-col items-center p-6">
                        <div className="w-16 h-16 rounded-full bg-[var(--primary-accent-color)]/20 flex items-center justify-center mb-4 text-[var(--primary-accent-color)] animate-pulse ring-4 ring-[var(--primary-accent-color)]/10">
                            <LockClosedIcon className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">Admin Access</h3>
                        <p className="text-sm mb-8 text-center text-slate-500 dark:text-slate-400">
                            Secure Area. Enter your 4-digit PIN.
                        </p>

                        <div className="relative w-full max-w-[240px] mb-4">
                            <div className="flex justify-between gap-3">
                                {[0, 1, 2, 3].map((index) => (
                                    <div 
                                        key={index}
                                        className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                                            pinInput.length === index 
                                                ? 'border-[var(--primary-accent-color)] bg-[var(--primary-accent-color)]/10 shadow-[0_0_15px_rgba(var(--primary-accent-color-rgb),0.3)] scale-110' 
                                                : pinInput.length > index 
                                                    ? 'border-[var(--primary-accent-color)]/50 bg-[var(--primary-accent-color)]/5 text-[var(--primary-accent-color)]' 
                                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white'
                                        } ${pinError ? 'border-red-500 animate-shake' : ''}`}
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

                        <div className="h-6 mb-2 text-center">
                            {pinError && <p className="text-red-500 text-xs font-bold uppercase tracking-wide">{pinError}</p>}
                        </div>

                        <button
                            onClick={handlePinVerify}
                            disabled={pinInput.length !== 4}
                            className="w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                            style={{ backgroundColor: 'var(--primary-accent-color)' }}
                        >
                            Verify
                        </button>
                    </div>
                </Modal>
            )}
            
            <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                @keyframes pulse-slow { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
                .animate-spin-reverse { animation: spin-reverse 25s linear infinite; }
                .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
                .animate-float { animation: float 6s ease-in-out infinite; }
            `}</style>
        </div>
    );
};
