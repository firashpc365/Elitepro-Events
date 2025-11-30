
// components/features/PromptItemEditor.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { InputField } from '../common/InputField';
import type { CostTrackerItem, EventItem, AIInteraction } from '../../types';
import { enhanceLineItem, analyzeMarketRate } from '../../services/geminiService';
import { SparkleIcon, TrendingUpIcon, ChartBarIcon } from '../common/icons';

interface PromptItemEditorProps {
  item: CostTrackerItem;
  event: EventItem;
  onClose: () => void;
  setError: (error: any) => void;
  onUpdateItem: (updatedItem: CostTrackerItem) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const PromptItemEditor: React.FC<PromptItemEditorProps> = ({ item, event, onClose, setError, onUpdateItem, onLogInteraction }) => {
  const [localItem, setLocalItem] = useState<CostTrackerItem>(item);
  const [isLoading, setIsLoading] = useState<'description' | 'pricing' | 'market' | null>(null);
  const [marketAnalysis, setMarketAnalysis] = useState<{ priceRange: string, reasoning: string } | null>(null);

  // Real-time Margin Calculation
  const marginStats = useMemo(() => {
      const cost = localItem.unit_cost_sar || 0;
      const price = localItem.client_price_sar || 0;
      const profit = price - cost;
      const marginPercent = price > 0 ? (profit / price) * 100 : 0;
      return { profit, marginPercent };
  }, [localItem.unit_cost_sar, localItem.client_price_sar]);

  const handleEnhance = useCallback(async (enhancementType: 'description' | 'pricing') => {
    setIsLoading(enhancementType);
    setError(null);
    try {
      const { result, fullPrompt } = await enhanceLineItem(localItem, event, enhancementType);
      
      onLogInteraction({
          feature: enhancementType,
          promptSummary: `Enhance ${enhancementType} for ${localItem.name}`,
          fullPrompt: fullPrompt,
          response: result,
          model: 'gemini-2.5-flash',
      });

      if (enhancementType === 'description') {
        setLocalItem(prev => ({ ...prev, description: result }));
      } else {
        // Robust number parsing to strip currency symbols and text
        const cleanNumber = result.replace(/[^0-9.]/g, '');
        const newPrice = parseFloat(cleanNumber);
        
        if (!isNaN(newPrice)) {
          setLocalItem(prev => ({ ...prev, client_price_sar: newPrice }));
        } else {
          setError(new Error(`Gemini returned an invalid price format: "${result}". Please try again.`));
        }
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(null);
    }
  }, [localItem, event, setError, onLogInteraction]);

  const handleCheckMarketRate = useCallback(async () => {
      if (!localItem.name) return;
      setIsLoading('market');
      setMarketAnalysis(null);
      try {
          const { priceRange, reasoning, fullPrompt } = await analyzeMarketRate(localItem.name, event.location);
          setMarketAnalysis({ priceRange, reasoning });
          onLogInteraction({
              feature: 'pricing_suggestion',
              promptSummary: `Check market rate for ${localItem.name} in ${event.location}`,
              fullPrompt,
              response: priceRange,
              model: 'gemini-2.5-flash (Search)',
          });
      } catch (e: any) {
          setError(e);
      } finally {
          setIsLoading(null);
      }
  }, [localItem.name, event.location, setError, onLogInteraction]);
  
  const handleSave = () => {
      if (!localItem.name) {
          setError("Item name is required.");
          return;
      }
      // Ensure numbers are valid before saving
      const finalItem = {
          ...localItem,
          quantity: Number(localItem.quantity) || 0,
          unit_cost_sar: Number(localItem.unit_cost_sar) || 0,
          client_price_sar: Number(localItem.client_price_sar) || 0,
      };
      onUpdateItem(finalItem);
  };

  return (
    <Modal title={`Edit Item: ${item.name}`} onClose={onClose} onSave={handleSave} saveText="Apply Changes">
      <div className="space-y-5">
        <InputField label="Item Name" value={localItem.name} onChange={e => setLocalItem(prev => ({...prev, name: e.target.value}))} />
        
        <div>
          <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary-color)'}}>Description (Proposal Ready)</label>
          <div className="relative">
            <textarea
              rows={3}
              value={localItem.description || ''}
              onChange={(e) => setLocalItem(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--primary-accent-color)] focus:outline-none"
              style={{
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary-color)',
              }}
            />
             <button
              onClick={() => handleEnhance('description')}
              disabled={!!isLoading}
              className="absolute bottom-2 right-2 flex items-center px-2 py-1 bg-purple-600/20 text-purple-300 text-xs font-semibold rounded-md hover:bg-purple-600/40 transition-colors"
            >
              {isLoading === 'description' ? <InlineSpinner/> : <><SparkleIcon className="h-3 w-3 mr-1"/> Enhance</>}
            </button>
          </div>
        </div>
        
        <div className="p-4 rounded-xl bg-black/10 border border-white/5">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{color: 'var(--text-primary-color)'}}>
                <ChartBarIcon className="h-4 w-4 text-[var(--primary-accent-color)]"/> Financial Configuration
            </h4>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
                <InputField 
                    label="Quantity" 
                    type="number" 
                    min={1}
                    value={localItem.quantity} 
                    onChange={e => setLocalItem(prev => ({...prev, quantity: parseFloat(e.target.value)}))} 
                />
                <InputField 
                    label="Unit Cost (SAR)" 
                    type="number" 
                    min={0}
                    value={localItem.unit_cost_sar} 
                    onChange={e => setLocalItem(prev => ({...prev, unit_cost_sar: parseFloat(e.target.value)}))} 
                />
                 <InputField 
                    label="Client Price (SAR)" 
                    type="number" 
                    min={0}
                    value={localItem.client_price_sar} 
                    onChange={e => setLocalItem(prev => ({...prev, client_price_sar: parseFloat(e.target.value)}))} 
                />
            </div>

            {/* Margin Indicator */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-xs text-slate-400">Profit Margin:</span>
                <div className="flex items-center gap-3">
                     <span className={`text-sm font-mono ${marginStats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {marginStats.profit >= 0 ? '+' : ''}SAR {(marginStats.profit * localItem.quantity).toLocaleString(undefined, {maximumFractionDigits: 2})}
                     </span>
                     <span className={`text-xs font-bold px-2 py-0.5 rounded ${marginStats.marginPercent >= 30 ? 'bg-green-500/20 text-green-300' : marginStats.marginPercent > 0 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                        {marginStats.marginPercent.toFixed(1)}%
                     </span>
                </div>
            </div>
            {/* Margin Visual Bar */}
             <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${marginStats.marginPercent >= 30 ? 'bg-green-500' : marginStats.marginPercent > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.max(marginStats.marginPercent, 0), 100)}%` }}
                ></div>
            </div>
        </div>

        {/* Intelligent Pricing Tools */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{color: 'var(--text-secondary-color)'}}>AI Pricing Intelligence</label>
          <div className="flex gap-3">
                <button
                    onClick={handleCheckMarketRate}
                    disabled={!!isLoading || !localItem.name}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600/20 text-blue-300 text-xs font-semibold rounded-lg hover:bg-blue-600/40 transition-colors border border-blue-500/30"
                    title="Search online for current market rates"
                >
                    {isLoading === 'market' ? <InlineSpinner/> : <><TrendingUpIcon className="h-4 w-4 mr-2"/> Check Market Rate</>}
                </button>
                <button
                    onClick={() => handleEnhance('pricing')}
                    disabled={!!isLoading || !localItem.name}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-600/20 text-purple-300 text-xs font-semibold rounded-lg hover:bg-purple-600/40 transition-colors border border-purple-500/30"
                >
                    {isLoading === 'pricing' ? <InlineSpinner/> : <><SparkleIcon className="h-4 w-4 mr-2"/> Suggest Price</>}
                </button>
          </div>
          
          {marketAnalysis && (
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm animate-in-item">
                  <p className="font-bold text-blue-300 flex items-center gap-2">
                      <TrendingUpIcon className="h-4 w-4" /> Market Insight:
                  </p>
                  <p className="mt-1 text-slate-300 font-medium">{marketAnalysis.priceRange}</p>
                  <p className="text-xs text-slate-400 mt-1 italic leading-relaxed">{marketAnalysis.reasoning}</p>
              </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
