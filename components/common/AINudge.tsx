// components/common/AINudge.tsx
import React from 'react';
import { SparkleIcon } from './icons';

interface AINudgeProps {
  message: string;
  onDismiss: () => void;
  onClick?: () => void;
}

export const AINudge: React.FC<AINudgeProps> = ({ message, onDismiss, onClick }) => {
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  const handleDismissClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  return (
    <div
      className="ai-nudge absolute -top-12 right-0 w-64 p-2.5 bg-white/70 backdrop-blur-lg rounded-lg shadow-xl border border-white/30 cursor-pointer"
      onClick={handleContainerClick}
    >
      <button
        onClick={handleDismissClick}
        className="absolute -top-1 -right-1 bg-slate-200/80 rounded-full h-4 w-4 text-xs text-slate-600 flex items-center justify-center hover:bg-slate-300"
        aria-label="Dismiss"
      >
        &times;
      </button>
      <div className="flex items-start gap-2">
        <SparkleIcon className="h-5 w-5 text-[var(--primary-accent-color)] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 font-medium">{message}</p>
      </div>
    </div>
  );
};