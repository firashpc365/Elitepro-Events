
import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
  color?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, color, className }) => {
  return (
    <div className={`w-full ${className || ''}`}>
      <div className="flex justify-between mb-1">
        {label && <span className="text-xs font-medium text-slate-300">{label}</span>}
        <span className="text-xs font-medium text-slate-400">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
        <div 
          className="h-1.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color || 'var(--primary-accent-color)' }}
        ></div>
      </div>
    </div>
  );
};
