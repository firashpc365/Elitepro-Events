import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { InputField } from '../common/InputField';
import { extractEventItemsFromInput } from '../../services/geminiService';
import type { CostTrackerItem, AIInteraction } from '../../types';
import { TrashIcon, DocumentTextIcon, NetworkIcon, SparkleIcon, UploadIcon } from '../common/icons';
import { ProgressBar } from '../common/ProgressBar';

interface SmartItemImporterProps {
  onClose: () => void;
  onAddItems: (items: CostTrackerItem[]) => void;
  setError: (error: any) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const SmartItemImporter: React.FC<SmartItemImporterProps> = ({ onClose, onAddItems, setError, onLogInteraction }) => {
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ name: string; data: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedItems, setParsedItems] = useState<CostTrackerItem[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(true); // Default to TRUE for better extraction

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 5 : prev));
      }, 800); // Slower progress for deeper thinking
    } else if (!isLoading && progress > 0) {
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const processFiles = (fileList: FileList | null) => {
    if (fileList) {
        const newFiles = Array.from(fileList);
        setFiles(prev => [...prev, ...newFiles]);

        newFiles.forEach((file: File) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => [...prev, { name: file.name, data: reader.result as string }]);
                };
                reader.readAsDataURL(file);
            } else {
                setPreviews(prev => [...prev, { name: file.name, data: null }]);
            }
        });
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  };

  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(isEntering);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleAnalyze = useCallback(async () => {
    if (!inputText && files.length === 0) {
      setError(new Error('Please provide text or a file to analyze.'));
      return;
    }
    setIsLoading(true);
    setParsedItems(null);
    setError(null);
    try {
      const { items, interaction } = await extractEventItemsFromInput({ text: inputText, files: files }, useDeepThinking);
      onLogInteraction(interaction);
      setParsedItems(items);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, files, useDeepThinking, setError, onLogInteraction]);

  const handleUpdateItem = (index: number, field: keyof CostTrackerItem, value: any) => {
      setParsedItems(prev => {
          if (!prev) return null;
          const updated = [...prev];
          updated[index] = { ...updated[index], [field]: value };
          return updated;
      });
  };
  
  const handleRemoveItem = (index: number) => {
      setParsedItems(prev => prev ? prev.filter((_, i) => i !== index) : null);
  };

  const handleConfirm = () => {
    // FIX: Robust check for array type before confirming
    if (parsedItems && Array.isArray(parsedItems)) {
        onAddItems(parsedItems);
        onClose();
    } else {
        // Fallback or error handling if data is malformed
        setError("Invalid item data. Please retry extraction.");
    }
  };
  
  const renderInputView = () => (
    <div className="space-y-6">
       {/* Deep Thinking Toggle */}
       <div className="flex justify-end">
          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${useDeepThinking ? 'bg-purple-900/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-black/20 border-white/10'}`}>
              <div className="flex items-center gap-2">
                 <div className={`p-2 rounded-lg ${useDeepThinking ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                     <NetworkIcon className="h-5 w-5" />
                 </div>
                 <div>
                     <label htmlFor="deep-think-import" className={`text-sm font-bold cursor-pointer select-none ${useDeepThinking ? 'text-purple-200' : 'text-slate-400'}`}>
                         Deep Thinking Mode
                     </label>
                     <p className="text-[10px] text-slate-500 leading-tight">
                         Using Gemini 2.5 Pro for complex formatting & reasoning
                     </p>
                 </div>
              </div>
              <button
                  id="deep-think-import"
                  type="button"
                  role="switch"
                  aria-checked={useDeepThinking}
                  onClick={() => setUseDeepThinking(!useDeepThinking)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${useDeepThinking ? 'bg-purple-600' : 'bg-slate-600'}`}
              >
                  <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${useDeepThinking ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
          </div>
      </div>

      {/* Text Input */}
      <div>
        <label htmlFor="request-text" className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary-color)'}}>
            Paste content from an invoice, quote, or menu.
        </label>
        <textarea
          id="request-text"
          rows={6}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full p-3 border rounded-xl shadow-inner focus:ring-2 focus:ring-[var(--primary-accent-color)] focus:border-transparent transition-all"
          placeholder="e.g., 2x LED Screen 5x3m @ SAR 1500, 1x Sound System..."
          style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
        />
      </div>
      
      <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OR Upload Files</span>
          <div className="flex-grow border-t border-white/10"></div>
      </div>

      {/* File Upload */}
      <div>
         <div
            onDragEnter={e => handleDragEvents(e, true)}
            onDragOver={e => handleDragEvents(e, true)}
            onDragLeave={e => handleDragEvents(e, false)}
            onDrop={handleDrop}
            className={`group relative flex flex-col items-center justify-center px-6 py-10 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${isDragging ? 'border-[var(--primary-accent-color)] bg-[var(--primary-accent-color)]/10 scale-[1.02]' : 'border-slate-600 hover:border-slate-400 hover:bg-white/5'}`}
        >
            <input id="file-upload-import" name="file-upload-import" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} multiple />
            
            <div className={`p-4 rounded-full bg-black/30 mb-3 transition-transform group-hover:scale-110 ${isDragging ? 'text-[var(--primary-accent-color)]' : 'text-slate-400'}`}>
                 <UploadIcon className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-center" style={{color: 'var(--text-primary-color)'}}>
                <span className="text-[var(--primary-accent-color)]">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs mt-1 text-slate-500">PDF, Images (PNG, JPG), DOCX, TXT</p>
        </div>
        
        {/* File Previews */}
        {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {previews.map((preview, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-black/20 animate-in-item">
                        <div className="flex items-center gap-3 overflow-hidden">
                           {preview.data ? (
                                <img src={preview.data} alt="Preview" className="h-10 w-10 rounded-md object-cover border border-white/10" />
                           ) : (
                                <div className="h-10 w-10 bg-slate-800 rounded-md flex items-center justify-center border border-white/10">
                                    <DocumentTextIcon className="h-5 w-5 text-slate-400"/>
                                </div>
                           )}
                           <span className="text-xs font-medium truncate text-slate-300">{preview.name}</span>
                        </div>
                        <button onClick={() => handleRemoveFile(index)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                            <TrashIcon className="h-4 w-4"/>
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
  
  const renderConfirmationView = () => (
    <div className="space-y-4 h-full flex flex-col">
        <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
                <SparkleIcon className="h-5 w-5 text-green-400" />
                <h3 className="font-bold text-green-100">Extraction Complete</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
                {Array.isArray(parsedItems) ? parsedItems.length : 0} Items Found
            </span>
        </div>

        <p className="text-sm text-slate-400">
            Review the extracted items below. You can edit descriptions, quantities, and prices before importing.
        </p>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-3 border rounded-xl p-2" style={{borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)'}}>
            {Array.isArray(parsedItems) && parsedItems.map((item, index) => (
                <div key={index} className="p-4 rounded-xl border bg-black/20 hover:bg-black/30 transition-colors group" style={{borderColor: 'var(--border-color)'}}>
                    <div className="flex items-start gap-3 mb-3">
                        <div className="flex-grow">
                            <InputField 
                                label="Item Name" 
                                value={item.name} 
                                onChange={e => handleUpdateItem(index, 'name', e.target.value)} 
                                className="font-bold w-full bg-transparent border-b border-white/10 focus:border-[var(--primary-accent-color)] text-sm py-1"
                            />
                        </div>
                        <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <TrashIcon className="h-4 w-4"/>
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <InputField 
                            label="Quantity" 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                            className="text-xs"
                        />
                         <InputField 
                            label="Unit Price (SAR)" 
                            type="number" 
                            value={item.client_price_sar} 
                            onChange={e => handleUpdateItem(index, 'client_price_sar', Number(e.target.value))}
                             className="text-xs"
                        />
                        <InputField 
                            label="Unit Cost (SAR)" 
                            type="number" 
                            value={item.unit_cost_sar} 
                            onChange={e => handleUpdateItem(index, 'unit_cost_sar', Number(e.target.value))}
                             className="text-xs"
                        />
                    </div>
                    
                     <div>
                         <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Description</label>
                         <textarea 
                            value={item.description || ''} 
                            onChange={e => handleUpdateItem(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full p-2 text-xs rounded-lg border bg-black/20 border-white/5 text-slate-300 focus:border-[var(--primary-accent-color)] focus:ring-1 focus:ring-[var(--primary-accent-color)] outline-none resize-none"
                        />
                     </div>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <Modal
      title="Smart Item Importer"
      onClose={onClose}
      onSave={parsedItems ? handleConfirm : handleAnalyze}
      saveText={isLoading ? 'Analyzing...' : parsedItems ? `Import ${Array.isArray(parsedItems) ? parsedItems.length : 0} Items` : (useDeepThinking ? 'Deep Extract Items' : 'Extract Items')}
      size="lg"
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"></div>
              <InlineSpinner />
          </div>
          <h3 className="mt-6 text-lg font-bold text-white">
              {useDeepThinking ? "Gemini Pro is Thinking..." : "Analyzing Document..."}
          </h3>
          <p className="mt-2 text-sm text-slate-400 max-w-xs text-center leading-relaxed">
              {useDeepThinking 
                ? "Reasoning through complex layouts, nested menus, and pricing logic." 
                : "Scanning text and identifying line items..."}
          </p>
          <div className="w-64 mt-4">
              <ProgressBar progress={progress} label="Deep Analysis in Progress" />
          </div>
          {useDeepThinking && (
              <div className="mt-6 flex gap-1">
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
              </div>
          )}
        </div>
      ) : parsedItems ? (
        renderConfirmationView()
      ) : (
        renderInputView()
      )}
    </Modal>
  );
};