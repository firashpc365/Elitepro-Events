
// components/common/SecurityGate.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { LockClosedIcon, LockOpenIcon, BackspaceIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { MotionGraphicsOverlay } from './MotionGraphicsOverlay';
import type { AppSettings, User } from '../../types';

interface SecurityGateProps {
  children: React.ReactNode;
  isLocked: boolean;
  onUnlock: () => void;
  currentUser: User;
  settings: AppSettings;
}

export const SecurityGate: React.FC<SecurityGateProps> = ({ children, isLocked, onUnlock, currentUser, settings }) => {
  // State for the PIN entry
  const [input, setInput] = useState("");
  const [errorState, setErrorState] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Default PIN is 1234 if not set in settings
  const correctPin = settings.adminPin || "1234";

  // Handle Input Logic
  const handlePress = useCallback((num: string) => {
    if (isUnlocking || errorState) return;
    if (input.length < 4) {
        setInput((prev) => prev + num);
    }
  }, [input, isUnlocking, errorState]);

  const handleDelete = useCallback(() => {
    if (isUnlocking || errorState) return;
    setInput((prev) => prev.slice(0, -1));
  }, [isUnlocking, errorState]);

  // Auto-check when PIN reaches 4 digits
  useEffect(() => {
    if (input.length === 4) {
      if (input === correctPin) {
        // Success
        setIsUnlocking(true);
        setTimeout(() => {
            onUnlock();
            setInput("");
            setIsUnlocking(false);
        }, 600); // Wait for success animation
      } else {
        // Error
        setErrorState(true);
        setTimeout(() => {
          setInput("");
          setErrorState(false);
        }, 500); // Wait for shake animation
      }
    }
  }, [input, correctPin, onUnlock]);

  // Keyboard Support (Auto-focus simulation)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isLocked) return;

          if (/^[0-9]$/.test(e.key)) {
              handlePress(e.key);
          } else if (e.key === 'Backspace') {
              handleDelete();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, handlePress, handleDelete]);

  // If not locked, just render children
  if (!isLocked) return <>{children}</>;

  // Dynamic styling from settings
  const glassBg = settings.colors?.cardContainer || 'rgba(15, 23, 42, 0.65)';
  const borderColor = settings.colors?.borderColor || 'rgba(255, 255, 255, 0.1)';
  const accentColor = settings.colors?.primaryAccent || '#8b5cf6';
  const textColor = settings.colors?.primaryText || '#f8fafc';
  const secondaryText = settings.colors?.secondaryText || '#94a3b8';
  const bgColor = settings.colors?.background || '#0f172a';

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center select-none font-sans transition-colors duration-500"
      style={{ backgroundColor: bgColor }}
    >
      {/* 1. Particle Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         {settings.motion?.enableAnimations && (
            <MotionGraphicsOverlay 
                config={{...settings.motion, particleCount: 60, particleOpacity: 0.4}}
                color={accentColor}
            />
         )}
      </div>

      {/* 2. Ambient Blobs (Glass Aesthetic) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* 3. The Glass Card Container */}
      <div 
        className={`
          relative z-10 p-8 w-full max-w-sm rounded-[24px] backdrop-blur-2xl border transition-all duration-300 transform
          ${errorState ? 'animate-shake border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : isUnlocking ? 'border-green-500/50 scale-105 shadow-[0_0_50px_rgba(74,222,128,0.4)]' : 'border-white/10'}
        `}
        style={{ 
          backgroundColor: glassBg,
          borderColor: errorState ? '#ef4444' : isUnlocking ? '#4ade80' : borderColor,
          boxShadow: errorState || isUnlocking ? undefined : `0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.05)`
        }}
      >
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div 
            className={`p-4 rounded-full bg-white/5 mb-4 transition-all duration-500 border border-white/5 shadow-inner relative overflow-hidden
                ${isUnlocking ? 'bg-green-500/20 text-green-400' : errorState ? 'bg-red-500/20 text-red-400' : ''}
            `}
            style={{ color: isUnlocking ? '#4ade80' : errorState ? '#ef4444' : accentColor }}
          >
            {isUnlocking ? <CheckCircleIcon className="h-8 w-8 animate-bounce" /> : errorState ? <XCircleIcon className="h-8 w-8 animate-pulse" /> : <LockClosedIcon className="h-8 w-8" />}
          </div>
          
          <h2 className="text-xl font-bold tracking-tight text-center transition-colors duration-300" style={{ color: errorState ? '#ef4444' : isUnlocking ? '#4ade80' : textColor }}>
            {isUnlocking ? 'Access Granted' : errorState ? 'Incorrect PIN' : `Welcome Back`}
          </h2>
          
          <p className="text-sm mt-1 font-medium opacity-60 transition-opacity duration-300" style={{ color: secondaryText }}>
             {isUnlocking ? 'Entering workspace...' : errorState ? 'Please try again' : 'Enter Admin PIN to Unlock'}
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex justify-center gap-4 mb-10 h-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`
                w-4 h-4 rounded-full transition-all duration-300 border
                ${i < input.length 
                  ? 'scale-125 border-transparent' 
                  : 'bg-white/5 border-white/10 scale-100'}
                ${errorState ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : ''}
                ${isUnlocking ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)]' : ''}
              `}
              style={{ 
                  backgroundColor: !errorState && !isUnlocking && i < input.length ? accentColor : undefined,
                  boxShadow: !errorState && !isUnlocking && i < input.length ? `0 0 10px ${accentColor}` : undefined
              }}
            />
          ))}
        </div>

        {/* Number Pad Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePress(num.toString())}
              className="
                h-16 w-16 rounded-2xl bg-white/5 hover:bg-white/10 
                text-2xl font-light transition-all duration-200 border border-white/5
                active:scale-95 hover:scale-105 flex items-center justify-center
                hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none
              "
              style={{ color: textColor }}
            >
              {num}
            </button>
          ))}
          
          {/* Empty Spacer */}
          <div /> 
          
          {/* Zero Button */}
          <button
            onClick={() => handlePress("0")}
            className="
              h-16 w-16 rounded-2xl bg-white/5 hover:bg-white/10 
              text-2xl font-light transition-all duration-200 border border-white/5
              active:scale-95 hover:scale-105 flex items-center justify-center
              hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none
            "
            style={{ color: textColor }}
          >
            0
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="
              h-16 w-16 rounded-2xl bg-transparent hover:bg-white/5 
              transition-all duration-200
              active:scale-95 flex items-center justify-center opacity-70 hover:opacity-100
              focus:outline-none
            "
            style={{ color: secondaryText }}
          >
            <BackspaceIcon className="h-8 w-8" />
          </button>
        </div>
      </div>
      
      <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
};
