// components/features/SubItemEditor.tsx
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { InputField } from '../common/InputField';
import { InlineSpinner } from '../common/LoadingSpinner';
import { ImageUploader } from '../common/ImageUploader';
import { SparkleIcon } from '../common/icons';
import type { SubItem, AIInteraction } from '../../types';
import { generateSubItemDescription } from '../../services/geminiService';

interface SubItemEditorProps {
  subItem: Partial<SubItem> | null;
  parentContext: { name: string; event?: any }; // Simplified context
  onClose: () => void;
  onSave: (subItem: SubItem) => void;
  setError: (e: any) => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const SubItemEditor: React.FC<SubItemEditorProps> = ({ subItem, parentContext, onClose, onSave, setError, onLogAIInteraction }) => {
  const [localSubItem, setLocalSubItem] = useState<Partial<SubItem>>(subItem || { quantity: 1, unitPrice: 0 });
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const handleSave = () => {
    if (!localSubItem.name || localSubItem.quantity == null || localSubItem.unitPrice == null) {
      setError(new Error("Sub-item name, quantity, and unit price are required."));
      return;
    }
    const finalSubItem: SubItem = {
      subItemId: localSubItem.subItemId || `sub-${Date.now()}`,
      name: localSubItem.name,
      description: localSubItem.description || '',
      quantity: localSubItem.quantity,
      unitPrice: localSubItem.unitPrice,
      ...localSubItem,
    };
    onSave(finalSubItem);
  };

  const handleGenerateDescription = async () => {
    if (!localSubItem.name) {
      setError(new Error("Please provide a name for the sub-item first."));
      return;
    }
    setIsGeneratingDesc(true);
    try {
      // The service for generating sub-item descriptions needs a simplified parent context
      // In a real app, you might pass more details from the parent service or event
      const mockParent = { name: parentContext.name, eventId: parentContext.event?.eventId || '' };
      const mockEvent = parentContext.event || { name: 'General Context' };

      const result = await generateSubItemDescription(localSubItem.name, mockParent as any, mockEvent);

      onLogAIInteraction({
        feature: 'sub_item_description',
        promptSummary: `Generate description for sub-item ${localSubItem.name}`,
        fullPrompt: `Sub-item: ${localSubItem.name}, Parent: ${parentContext.name}`,
        response: result
      });
      setLocalSubItem(prev => ({ ...prev, description: result, description_source: 'ai' }));
    } catch (e) {
      setError(e);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  return (
    <Modal title={localSubItem.subItemId ? "Edit Sub-Item" : "Add Sub-Item"} onClose={onClose} onSave={handleSave}>
      <div className="space-y-4">
        <InputField label="Sub-Item Name" value={localSubItem.name || ''} onChange={e => setLocalSubItem(p => ({ ...p, name: e.target.value }))} required autoFocus />
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea value={localSubItem.description || ''} onChange={e => setLocalSubItem(p => ({ ...p, description: e.target.value, description_source: 'manual' }))} rows={4} className="mt-1 block w-full p-2 border rounded" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }} />
          <button onClick={handleGenerateDescription} disabled={isGeneratingDesc} className="text-xs text-purple-400 flex items-center gap-1 mt-1 hover:text-purple-300">
            {isGeneratingDesc ? <InlineSpinner /> : <><SparkleIcon className="h-4 w-4" /> Generate with AI</>}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Quantity" type="number" value={localSubItem.quantity || ''} onChange={e => setLocalSubItem(p => ({ ...p, quantity: Number(e.target.value) }))} required />
          <InputField label="Unit Price (SAR)" type="number" value={localSubItem.unitPrice || ''} onChange={e => setLocalSubItem(p => ({ ...p, unitPrice: Number(e.target.value) }))} required />
        </div>
        <ImageUploader label="Sub-Item Image" onImageSelected={b64 => setLocalSubItem(p => ({ ...p, image: b64 }))} initialImage={localSubItem.image} />
      </div>
    </Modal>
  );
};