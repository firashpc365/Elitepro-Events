import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import type { EventItem, AIInteraction } from '../../types';
import { getFastSuggestions } from '../../services/geminiService';
import { BoltIcon } from '../common/icons';

interface EventSuggesterProps {
  event: EventItem;
  onClose: () => void;
  setError: (error: any) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const EventSuggester: React.FC<EventSuggesterProps> = ({ event, onClose, setError, onLogInteraction }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState('');

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { result, fullPrompt } = await getFastSuggestions(event);
      
      onLogInteraction({
          feature: 'suggestions',
          promptSummary: `Fast suggestions for ${event.name}`,
          fullPrompt: fullPrompt,
          response: result,
          model: 'gemini-2.5-flash',
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
    <Modal title={`Fast Suggestions for ${event.name}`} onClose={onClose}>
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <InlineSpinner />
            <p className="text-sm text-gray-500 mt-2">Gemini is thinking fast...</p>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 flex items-center"><BoltIcon className="h-5 w-5 mr-2"/>Here are some quick ideas:</h4>
            <div className="prose prose-sm max-w-none mt-2 whitespace-pre-wrap">{suggestions}</div>
          </div>
        )}
      </div>
    </Modal>
  );
};
