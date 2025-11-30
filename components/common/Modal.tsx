
// components/common/Modal.tsx
import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saveText?: string;
  size?: 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose, onSave, saveText = "Save", size = 'md', footer }) => {
  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[95vw] lg:max-w-7xl h-[95vh]', // Adjusted full size for better containment
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`flex items-center justify-center min-h-full p-2 sm:p-4 ${size === 'full' ? 'h-full' : ''}`}>
        <div 
          className={`backdrop-blur-xl shadow-2xl w-full mx-auto transform transition-all border flex flex-col max-h-[95vh]`}
          style={{ 
            backgroundColor: 'var(--card-container-color)',
            borderColor: 'var(--border-color)',
            borderRadius: 'var(--border-radius)',
            maxWidth: size === 'full' ? '95vw' : undefined, // Explicit inline fallback
            ... (size !== 'full' ? { maxWidth: sizeClasses[size] } : {}),
            height: size === 'full' ? '90vh' : undefined
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b p-4 sm:p-6 shrink-0" style={{ borderColor: 'var(--border-color)'}}>
              <h3 className="text-lg sm:text-xl font-bold truncate pr-4" style={{ color: 'var(--text-primary-color)'}}>{title}</h3>
              <button onClick={onClose} className="text-2xl font-light hover:opacity-70 transition-opacity w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10" style={{ color: 'var(--text-secondary-color)'}}>&times;</button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-grow">
            {children}
          </div>

          {/* Footer */}
          {footer ? (
             <div className="p-4 sm:p-6 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
               {footer}
             </div>
          ) : (
            (onClose || onSave) && (
              <div className="flex justify-end gap-3 p-4 sm:p-6 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium hover:bg-black/20 transition"
                  style={{ 
                    color: 'var(--text-primary-color)',
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderRadius: 'calc(var(--border-radius) / 2)'
                  }}
                >
                  Cancel
                </button>
                {onSave && (
                    <button
                    onClick={onSave}
                    className="px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition shadow-lg"
                    style={{ 
                      backgroundColor: 'var(--primary-accent-color)',
                      borderRadius: 'calc(var(--border-radius) / 2)'
                    }}
                    >
                    {saveText}
                    </button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
