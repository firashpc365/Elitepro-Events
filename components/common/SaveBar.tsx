// components/common/SaveBar.tsx
import React from 'react';

interface SaveBarProps {
  isVisible: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export const SaveBar: React.FC<SaveBarProps> = ({ isVisible, onSave, onDiscard }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md animate-in-item">
      <div 
        className="backdrop-blur-md rounded-xl shadow-2xl p-3 flex justify-between items-center border"
        style={{
          backgroundColor: 'var(--card-container-color)',
          borderColor: 'var(--border-color)',
          borderRadius: 'var(--border-radius)',
        }}
      >
        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary-color)' }}>You have unsaved changes.</p>
        <div className="flex gap-2">
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-black/20 transition"
            style={{ 
              color: 'var(--text-secondary-color)',
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: 'calc(var(--border-radius) / 2)'
            }}
          >
            Discard
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition"
            style={{ 
              backgroundColor: 'var(--primary-accent-color)',
              borderRadius: 'calc(var(--border-radius) / 2)'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};