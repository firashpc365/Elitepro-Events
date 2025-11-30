// components/common/InputField.tsx
import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const InputField: React.FC<InputFieldProps> = ({ label, id, required, ...props }) => {
  const inputId = id || label.toLowerCase().replace(/\s/g, '-');
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)'}}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        id={inputId}
        className="mt-1 block w-full p-2 border shadow-sm focus:ring-[var(--primary-accent-color)] focus:border-[var(--primary-accent-color)] placeholder:text-slate-400"
        style={{
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderColor: 'var(--border-color)',
          borderRadius: 'calc(var(--border-radius) / 2)',
          color: 'var(--text-primary-color)',
        }}
        required={required}
        {...props}
      />
    </div>
  );
};