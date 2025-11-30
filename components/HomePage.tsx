
// components/HomePage.tsx
import React, { useEffect, useState } from 'react';
import type { User } from '../types';
import { PlusIcon, SparkleIcon, TrendingUpIcon, ImageIcon, BoltIcon, ChartBarIcon, DocumentTextIcon } from './common/icons';

interface HomePageProps {
  user: User;
  setView: (view: string) => void;
  onRequestNewEvent: () => void;
  onShowIntelligentCreator: () => void;
  onShowImageGenerator: () => void;
}

// --- Holographic Central HUD ---
const CentralHUD = () => (
  <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
      <style>{`
          .hud-ring {
              border: 1px solid rgba(8, 145, 178, 0.3);
              border-radius: 50%;
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
          }
          .spin-cw { animation: spin 20s linear infinite; }
          .spin-ccw { animation: spin-rev 30s linear infinite; }
          @keyframes spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
          @keyframes spin-rev { 100% { transform: translate(-50%, -50%) rotate(-360deg); } }
          
          .hud-dot {
              width: 4px; height: 4px;
              background: var(--primary-accent-color);
              border-radius: 50%;
              position: absolute;
              box-shadow: 0 0 10px var(--primary-accent-color);
          }
      `}</style>
      
      {/* Background Glow */}
      <div className="absolute w-32 h-32 bg-[var(--primary-accent-color)] opacity-20 blur-[60px] rounded-full"></div>

      {/* Rings */}
      <div className="hud-ring w-full h-full border-dashed border-opacity-20 spin-cw"></div>
      <div className="hud-ring w-3/4 h-3/4 border-t-transparent border-b-transparent border-l-cyan-500 border-r-cyan-500 opacity-40 spin-ccw" style={{borderWidth: '2px'}}></div>
      <div className="hud-ring w-1/2 h-1/2 border-[var(--primary-accent-color)] opacity-30 spin-cw"></div>
      
      {/* Central Data Core */}
      <div className="absolute z-10 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(8,145,178,0.3)]">
              <SparkleIcon className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono text-cyan-300 tracking-widest uppercase">System Active</span>
          <span className="text-xs text-slate-400 mt-1">AI Core Online</span>
      </div>
      
      {/* Floating Satellite Nodes */}
      <div className="absolute w-full h-full spin-cw" style={{animationDuration: '15s'}}>
          <div className="hud-dot" style={{top: '10%', left: '50%'}}></div>
      </div>
      <div className="absolute w-3/4 h-3/4 spin-ccw" style={{animationDuration: '25s'}}>
          <div className="hud-dot bg-purple-400" style={{bottom: '10%', right: '20%'}}></div>
      </div>
  </div>
);

// --- Glass Action Card ---
const GlassCard: React.FC<{ 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    onClick: () => void; 
    delay?: string;
}> = ({ title, description, icon, onClick, delay }) => (
    <button 
        onClick={onClick}
        className="group relative p-6 rounded-2xl backdrop-blur-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-500 text-left overflow-hidden flex flex-col justify-between h-full hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] animate-in-item"
        style={{ animationDelay: delay }}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="mb-4 p-3 rounded-xl bg-black/20 w-fit border border-white/5 group-hover:scale-110 transition-transform duration-500 shadow-inner">
            {icon}
        </div>
        <div className="relative z-10">
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[var(--primary-accent-color)] transition-colors">{title}</h3>
            <p className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed">{description}</p>
        </div>
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white/20 group-hover:bg-[var(--primary-accent-color)] transition-colors duration-500"></div>
    </button>
);

export const HomePage: React.FC<HomePageProps> = ({ user, setView, onRequestNewEvent, onShowIntelligentCreator, onShowImageGenerator }) => {
  const [greeting, setGreeting] = useState('Welcome');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
      const updateTime = () => setTime(new Date());
      const interval = setInterval(updateTime, 60000);
      
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
      
      return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-full w-full text-white overflow-hidden flex flex-col items-center justify-center p-6 md:p-12">
        
        {/* Content Container */}
        <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            
            {/* Left Column: Welcome & Status */}
            <div className="flex-1 text-center lg:text-left space-y-8 animate-in-item w-full">
                 <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                         <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
                             {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • HQ Link Established
                         </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-thin tracking-tighter text-white mb-2">
                        {greeting},
                    </h1>
                    <h2 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
                        {user.name.split(' ')[0]}
                    </h2>
                    <p className="mt-6 text-lg text-slate-300 max-w-lg mx-auto lg:mx-0 font-light border-l-2 border-[var(--primary-accent-color)] pl-6">
                        Operational status is nominal. 
                        <br/><span className="text-[var(--primary-accent-color)] font-bold">4 priority events</span> require review.
                    </p>
                </div>

                {/* Quick Stats Row (Glass) */}
                {user.permissions.canViewFinancials && (
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0 pt-4">
                        <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center gap-4">
                            <div className="p-2 bg-green-500/20 rounded-lg"><TrendingUpIcon className="w-5 h-5 text-green-400"/></div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Revenue</p>
                                <p className="text-xl font-bold text-white">+12.5%</p>
                            </div>
                        </div>
                         <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg"><ChartBarIcon className="w-5 h-5 text-blue-400"/></div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Pipeline</p>
                                <p className="text-xl font-bold text-white">8 Active</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Center/Right Column: HUD & Actions */}
            <div className="flex-1 flex flex-col items-center lg:items-end w-full relative">
                
                {/* Decorative HUD Background Element */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60 pointer-events-none hidden lg:block">
                    <CentralHUD />
                </div>

                {/* Grid of Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl relative z-10">
                     <GlassCard 
                        title="Intelligence Hub" 
                        description="View your command dashboard and key metrics."
                        icon={<SparkleIcon className="w-6 h-6 text-purple-400" />}
                        onClick={() => setView('Dashboard')}
                        delay="100ms"
                    />
                    
                    {user.permissions.canCreateEvents && (
                         <GlassCard 
                            title="Create Event" 
                            description="Initialize a new project workspace."
                            icon={<PlusIcon className="w-6 h-6 text-blue-400" />}
                            onClick={onRequestNewEvent}
                            delay="200ms"
                        />
                    )}
                    
                    {user.permissions.canCreateEvents && (
                        <GlassCard 
                            title="AI Creator" 
                            description="Auto-generate plans from raw documents."
                            icon={<BoltIcon className="w-6 h-6 text-amber-400" />}
                            onClick={onShowIntelligentCreator}
                            delay="300ms"
                        />
                    )}
                    
                     {user.permissions.canCreateEvents && (
                         <GlassCard 
                            title="Visual Studio" 
                            description="Generate concepts with Gemini Imagen 3."
                            icon={<ImageIcon className="w-6 h-6 text-cyan-400" />}
                            onClick={onShowImageGenerator}
                            delay="400ms"
                        />
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
