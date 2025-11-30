
import React, { useState, useEffect } from 'react';
import type { QuotaExceededError } from '../../services/geminiService';
import { BoltIcon, LockClosedIcon } from './icons';

interface QuotaErrorModalProps {
  error: QuotaExceededError;
  onClose: () => void;
}

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const QuotaErrorModal: React.FC<QuotaErrorModalProps> = ({ error, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(error.retryAfter || 60);

  useEffect(() => {
    if (timeLeft > 0 && !error.isHardLimit) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, error.isHardLimit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const radius = 18; 
  const circumference = 2 * Math.PI * 15.9155; 
  const totalDuration = error.retryAfter || 60;
  const strokeDashoffset = circumference - ((timeLeft / totalDuration) * circumference);

  // --- VIEW 1: HARD QUOTA LIMIT (BILLING) ---
  if (error.isHardLimit) {
      return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div 
                className="relative w-full max-w-md p-8 text-center border-2 border-red-500/40 rounded-2xl shadow-2xl animate-in-item"
                style={{
                    backgroundColor: 'var(--card-container-color)',
                    boxShadow: '0 0 50px rgba(220, 38, 38, 0.2)'
                }}
            >
                <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full mb-6 bg-red-500/10 border-4 border-red-500/30">
                    <LockClosedIcon className="h-10 w-10 text-red-500" />
                </div>

                <h3 className="text-2xl font-extrabold mb-3 text-white">Account Limit Reached</h3>
                
                <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-xl mb-6">
                     <p className="text-sm font-bold text-red-200 mb-1">QUOTA_EXCEEDED</p>
                     <p className="text-xs text-red-300/70">{error.message}</p>
                </div>
                
                {error.userAction && (
                    <p className="text-sm mb-8 text-[var(--text-secondary-color)] leading-relaxed font-medium">
                        {error.userAction}
                    </p>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => window.open('https://ai.google.dev/pricing', '_blank')}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
                    >
                        <BoltIcon className="h-5 w-5" /> Upgrade Subscription
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 text-sm font-medium text-[var(--text-secondary-color)] hover:text-white transition-colors"
                    >
                        Return to Dashboard (Restricted Mode)
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- VIEW 2: TEMPORARY RATE LIMIT (RETRY) ---
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="backdrop-blur-xl shadow-2xl w-full max-w-md transform transition-all p-8 text-center border rounded-2xl"
        style={{
          backgroundColor: 'var(--card-container-color)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full mb-6 relative">
            {/* Background Circle */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
               <path
                  className="text-slate-700/30"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                {/* Progress Circle */}
                {timeLeft > 0 && (
                    <path
                      className="text-yellow-500 transition-all duration-1000 ease-linear"
                      strokeDasharray={`${circumference}, ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                )}
            </svg>
            
            <WarningIcon className="h-8 w-8 text-yellow-500 relative z-10" />
        </div>

        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary-color)' }}>System Busy</h3>
        
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary-color)' }}>
          {error.message || "We're experiencing high traffic. Please wait a moment."}
        </p>

        {timeLeft > 0 ? (
            <div className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
                <span className="mr-2 h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <p className="text-lg font-mono font-semibold text-yellow-400">
                   Cooling down: {formatTime(timeLeft)}
                </p>
            </div>
        ) : (
             <div className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                <p className="text-lg font-semibold text-green-400">
                    Ready to Retry
                </p>
            </div>
        )}
        
        <div className="grid gap-3">
          <button
            onClick={onClose}
            disabled={timeLeft > 0}
            className={`w-full inline-flex justify-center px-4 py-3 text-base font-semibold text-white transition rounded-xl shadow-lg ${timeLeft > 0 ? 'opacity-50 cursor-not-allowed bg-slate-700' : 'bg-[var(--primary-accent-color)] hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {timeLeft > 0 ? 'Please Wait...' : 'Retry Request Now'}
          </button>
           
           <button onClick={onClose} className="text-xs text-slate-500 hover:text-white mt-2">
               Dismiss
           </button>
        </div>
      </div>
    </div>
  );
};
