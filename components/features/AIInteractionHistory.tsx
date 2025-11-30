// components/features/AIInteractionHistory.tsx
import React, { useState } from 'react';
import type { AIInteraction } from '../../types';

interface AIInteractionHistoryProps {
  history: AIInteraction[];
}

const InteractionCard: React.FC<{ interaction: AIInteraction }> = ({ interaction }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="p-3 border rounded-lg shadow-sm" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)'}}>
            <div className="flex justify-between items-start cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div>
                    <p className="font-semibold text-sm capitalize" style={{ color: 'var(--text-primary-color)'}}>{interaction.feature.replace('_', ' ')}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary-color)'}}>{new Date(interaction.timestamp).toLocaleString()}</p>
                    <p className="text-xs italic mt-1" style={{ color: 'var(--text-primary-color)'}}>"{interaction.promptSummary}"</p>
                </div>
                <button className="text-xs text-[var(--primary-accent-color)] font-semibold">
                    {isExpanded ? 'Collapse' : 'Details'}
                </button>
            </div>
            {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-2 text-xs" style={{ borderColor: 'var(--border-color)'}}>
                    {(interaction.model || interaction.parameters) && (
                        <div className="flex gap-4" style={{ color: 'var(--text-secondary-color)'}}>
                            {interaction.model && <span>Model: <code className="text-xs bg-black/20 p-1 rounded">{interaction.model}</code></span>}
                            {interaction.parameters && <span>Params: <code className="text-xs bg-black/20 p-1 rounded">{JSON.stringify(interaction.parameters)}</code></span>}
                        </div>
                    )}
                    <div>
                        <h4 className="font-bold" style={{ color: 'var(--text-primary-color)'}}>Full Prompt:</h4>
                        <pre className="mt-1 p-2 bg-black/20 rounded whitespace-pre-wrap font-mono max-h-40 overflow-y-auto" style={{ color: 'var(--text-secondary-color)'}}>{interaction.fullPrompt}</pre>
                    </div>
                    <div>
                        <h4 className="font-bold" style={{ color: 'var(--text-primary-color)'}}>Gemini's Response:</h4>
                        <pre className="mt-1 p-2 bg-black/20 rounded whitespace-pre-wrap font-mono max-h-40 overflow-y-auto" style={{ color: 'var(--text-secondary-color)'}}>{interaction.response}</pre>
                    </div>
                </div>
            )}
        </div>
    )
};

export const AIInteractionHistory: React.FC<AIInteractionHistoryProps> = ({ history }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div 
      className="backdrop-blur-xl border shadow-lg p-6"
      style={{
        backgroundColor: 'var(--card-container-color)',
        borderColor: 'var(--border-color)',
        borderRadius: 'var(--border-radius)',
      }}
    >
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary-color)'}}>AI Interaction History ({history.length})</h2>
        <button className="text-[var(--primary-accent-color)] font-semibold">{isOpen ? 'Hide' : 'Show'}</button>
      </div>
      {isOpen && (
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-2">
            {history.map(item => <InteractionCard key={item.interactionId} interaction={item} />)}
        </div>
      )}
    </div>
  );
};