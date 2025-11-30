// components/common/ConfirmationModal.tsx
import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="backdrop-blur-xl shadow-2xl w-full max-w-md transform transition-all p-6 border"
        style={{
          backgroundColor: 'var(--card-container-color)',
          borderColor: 'var(--border-color)',
          borderRadius: 'var(--border-radius)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary-color)' }}>{title}</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary-color)' }}>{message}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium hover:bg-black/20 transition"
            style={{ 
              color: 'var(--text-primary-color)',
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: 'calc(var(--border-radius) / 2)'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
            style={{ 
              borderRadius: 'calc(var(--border-radius) / 2)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
