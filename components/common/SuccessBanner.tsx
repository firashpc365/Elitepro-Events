// components/common/SuccessBanner.tsx
import React, { useEffect, useState } from 'react';

interface SuccessBannerProps {
  message: string | null;
  clearSuccess: () => void;
}

export const SuccessBanner: React.FC<SuccessBannerProps> = ({ message, clearSuccess }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleClose = () => {
    setIsVisible(false);
    // Allow animation to finish before clearing the message
    setTimeout(() => {
        clearSuccess();
    }, 300);
  };

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
        {message && (
            <div className="max-w-sm w-full alert alert-success px-4 py-3 rounded-xl shadow-lg flex justify-between items-center">
                <p className="text-sm font-semibold">{message}</p>
                <button onClick={handleClose} className="ml-4 hover:opacity-80 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                </button>
            </div>
        )}
    </div>
  );
};