// components/features/AISubItemSuggester.tsx
import React, { useState } from 'react';
import { Modal } from '../common/Modal';

interface AISubItemSuggesterProps {
  suggestions: { name: string, description: string }[];
  onClose: () => void;
  onConfirm: (selected: { name: string, description: string }[]) => void;
}

export const AISubItemSuggester: React.FC<AISubItemSuggesterProps> = ({ suggestions, onClose, onConfirm }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => 
    suggestions.reduce((acc, s) => ({ ...acc, [s.name]: true }), {})
  );

  const handleToggle = (name: string) => {
    setSelected(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleConfirm = () => {
    const selectedSuggestions = suggestions.filter(s => selected[s.name]);
    onConfirm(selectedSuggestions);
  };
  
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Modal title="AI Sub-Item Suggestions" onClose={onClose} onSave={handleConfirm} saveText={`Add ${selectedCount} item(s)`}>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary-color)' }}>Select the sub-items you'd like to add to this service.</p>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-3 p-3 border rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)'}}>
            <input type="checkbox" className="mt-1 h-4 w-4 rounded flex-shrink-0" onChange={() => handleToggle(s.name)} checked={!!selected[s.name]} />
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary-color)' }}>{s.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary-color)' }}>{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};