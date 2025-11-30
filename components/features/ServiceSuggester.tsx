// components/features/ServiceSuggester.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import type { EventItem, AIInteraction } from '../../types';
import { getServiceSuggestions } from '../../services/geminiService';
import { SparkleIcon } from '../common/icons';

interface ServiceSuggesterProps {
  event: EventItem;
  onClose: () => void;
  setError: (error: any) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

interface Suggestion {
    service: string;
    description: string;
}

export const ServiceSuggester: React.FC<ServiceSuggesterProps> = ({ event, onClose, setError, onLogInteraction }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { suggestions: result, fullPrompt } = await getServiceSuggestions(event);
      
      onLogInteraction({
          feature: 'service_suggestions',
          promptSummary: `Service suggestions for ${event.name}`,
          fullPrompt: fullPrompt,
          response: JSON.stringify(result, null, 2),
          model: 'gemini-2.5-pro',
      });

      setSuggestions(result);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [event, setError, onLogInteraction]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <Modal title={`AI Service Ideas for ${event.name}`} onClose={onClose}>
      <div className="min-h-[300px] max-h-[60vh] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <InlineSpinner />
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary-color)' }}>Gemini is brainstorming service ideas...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary-color)'}}>
                <SparkleIcon className="h-5 w-5 text-[var(--primary-accent-color)]"/>
                {'Here are some ideas to enhance the event:'}
            </h4>
            {suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 border rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)'}}>
                    <p className="font-bold" style={{ color: 'var(--text-primary-color)'}}>{suggestion.service}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary-color)'}}>{suggestion.description}</p>
                </div>
            ))}
            {suggestions.length === 0 && <p className="text-center py-4" style={{ color: 'var(--text-secondary-color)'}}>{'No suggestions were generated.'}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
};
