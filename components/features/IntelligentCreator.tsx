
import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { InputField } from '../common/InputField';
import { createEventFromInput } from '../../services/geminiService';
import type { EventItem, ServiceItem, CostTrackerItem, AIInteraction, Client } from '../../types';
import { PlusIcon, TrashIcon, DocumentTextIcon, SparkleIcon, NetworkIcon } from '../common/icons';
import { ProgressBar } from '../common/ProgressBar';

interface IntelligentCreatorProps {
  services: ServiceItem[];
  clients: Client[];
  onClose: () => void;
  onConfirm: (eventData: Partial<Omit<EventItem, 'eventId'>>, createClient: boolean, interaction?: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
  setError: (error: any) => void;
  mode?: 'event' | 'rfq';
}

type ParsedData = Partial<Omit<EventItem, 'eventId'>>;

export const IntelligentCreator: React.FC<IntelligentCreatorProps> = ({ services, clients, onClose, onConfirm, setError, mode = 'event' }) => {
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ name: string; data: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Analyzing...');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [interactionLog, setInteractionLog] = useState<Omit<AIInteraction, 'interactionId' | 'timestamp'> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Default to true for better accuracy as requested
  const [useDeepThinking, setUseDeepThinking] = useState(true);

  const [manualItem, setManualItem] = useState({ name: '', quantity: 1, client_price_sar: 0 });
  
  const [shouldCreateClient, setShouldCreateClient] = useState(true);
  const [existingClient, setExistingClient] = useState<Client | null>(null);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgress(10);
      setLoadingText("Scanning Documents...");
      
      // Phase 1
      setTimeout(() => setLoadingText("Forensic Analysis: Deciphering Tables..."), 2000);
      // Phase 2
      setTimeout(() => setLoadingText("Logic Check: Validating Dates & Locations..."), 5000);
      // Phase 3
      setTimeout(() => setLoadingText("Finalizing: Contextual Pricing..."), 8000);

      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 5 : prev));
      }, 500);
    } else if (!isLoading && progress > 0) {
        setProgress(100);
        setLoadingText("Complete!");
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

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
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
    setParsedData(null);
    setInteractionLog(null);
    setError(null);
    try {
      const { eventData, interaction } = await createEventFromInput({ text: inputText, files: files }, services, useDeepThinking);
      setParsedData(eventData);
      setInteractionLog(interaction);

      if (eventData.clientName) {
          const clientExists = clients.find(c => c.companyName.toLowerCase() === eventData.clientName!.toLowerCase());
          if (clientExists) {
              setExistingClient(clientExists);
              setShouldCreateClient(false); // Default to not creating if exists
          } else {
              setExistingClient(null);
              setShouldCreateClient(true); // Default to creating if new
          }
      }

    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, files, setError, services, clients, useDeepThinking]);
  
  const handleConfirmAndCreate = () => {
    if (!parsedData) return;
    
    if (!parsedData.location || parsedData.location.trim().length < 3) {
        setError(new Error("Please confirm a valid location (at least 3 characters)."));
        return;
    }

    onConfirm(parsedData, shouldCreateClient && !existingClient, interactionLog || undefined);
    onClose();
  };

  const handleAddItem = () => {
    if (!manualItem.name || manualItem.quantity <= 0) {
        setError(new Error('Please provide a valid item name and quantity.'));
        return;
    }

    const newItem: CostTrackerItem = {
        itemId: `manual-${Date.now()}`,
        name: manualItem.name,
        quantity: manualItem.quantity,
        unit_cost_sar: 0, // Cost is unknown at this stage
        client_price_sar: manualItem.client_price_sar,
        description: 'Manually added item.'
    };

    setParsedData(prev => {
        if (!prev) return null;
        const newTracker = [...(prev.cost_tracker || []), newItem];
        return { ...prev, cost_tracker: newTracker };
    });

    // Reset form
    setManualItem({ name: '', quantity: 1, client_price_sar: 0 });
  };

  const handleRemoveItem = (index: number) => {
    setParsedData(prev => {
        if (!prev || !prev.cost_tracker) return prev;
        const newTracker = prev.cost_tracker.filter((_, i) => i !== index);
        return { ...prev, cost_tracker: newTracker };
    });
  };

  const title = mode === 'rfq' ? 'Create RFQ with Gemini' : 'Create Event with Gemini';
  const saveText = isLoading ? (useDeepThinking ? 'Thinking Deeply...' : 'Analyzing...') : parsedData ? (mode === 'rfq' ? 'Confirm & Create RFQ' : 'Confirm & Create Event') : (useDeepThinking ? 'Deep Reason & Extract' : 'Analyze & Extract');
  const placeholderText = mode === 'rfq' 
    ? "Paste RFQ text (e.g., 'Need a quote for a 3-day conference in Riyadh...')" 
    : "Paste event request (from email, message, etc.)";

  const renderInputView = () => (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
          <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${useDeepThinking ? 'bg-purple-900/30 border-purple-500/50' : 'bg-slate-800/30 border-slate-600/30'}`}>
              <label htmlFor="deep-think" className={`text-xs font-bold flex items-center gap-1 cursor-pointer select-none ${useDeepThinking ? 'text-purple-200' : 'text-slate-400'}`}>
                  <NetworkIcon className="h-4 w-4" /> Deep Thinking Mode (Pro)
              </label>
              <button
                  id="deep-think"
                  type="button"
                  role="switch"
                  aria-checked={useDeepThinking}
                  onClick={() => setUseDeepThinking(!useDeepThinking)}
                  className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${useDeepThinking ? 'bg-purple-500' : 'bg-slate-600'}`}
              >
                  <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${useDeepThinking ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
          </div>
      </div>

      <div>
        <label htmlFor="request-text" className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>{mode === 'rfq' ? 'Paste RFQ details or email content' : 'Paste event request'}</label>
        <textarea
          id="request-text"
          rows={6}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="mt-1 block w-full p-2 border rounded-lg shadow-sm"
          placeholder={placeholderText}
          style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
        />
      </div>
       <div className="text-center text-sm" style={{color: 'var(--text-secondary-color)'}}>OR</div>
      <div>
        <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Upload {mode === 'rfq' ? 'RFQ documents' : 'files'} (TXT, PDF, DOCX, Images)</label>
         <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-[var(--primary-accent-color)] bg-cyan-500/10' : 'border-[var(--border-color)]'}`}
        >
            <div className="space-y-1 text-center">
                 <svg className="mx-auto h-12 w-12" style={{color: 'var(--text-secondary-color)'}} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm" style={{color: 'var(--text-secondary-color)'}}>
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-[var(--primary-accent-color)] hover:text-cyan-400 focus-within:outline-none">
                        <span>Upload files</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} multiple accept="image/*,application/pdf,.doc,.docx,.txt,.md" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs" style={{color: 'var(--text-secondary-color)'}}>Images, PDF, DOCX, TXT</p>
            </div>
        </div>
        
        {previews.length > 0 && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md" style={{borderColor: 'var(--border-color)'}}>
                {previews.map((preview, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-md" style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                        <div className="flex items-center gap-2">
                           {preview.data ? (
                                <img src={preview.data} alt="Preview" className="h-10 w-10 rounded object-cover" />
                           ) : (
                                <div className="h-10 w-10 bg-black/10 rounded flex items-center justify-center">
                                    <DocumentTextIcon className="h-6 w-6" style={{color: 'var(--text-secondary-color)'}}/>
                                </div>
                           )}
                           <span className="text-sm truncate">{preview.name}</span>
                        </div>
                        <button onClick={() => handleRemoveFile(index)} className="p-1 text-red-500 hover:text-red-400"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
  
  const renderConfirmationView = () => (
    <div className="space-y-4">
        <h3 className="font-semibold text-lg">Please confirm the {mode === 'rfq' ? 'RFQ' : 'Event'} details:</h3>
        <InputField label="Event Name" value={parsedData?.name || ''} onChange={e => setParsedData(p => ({...p, name: e.target.value}))} />
        <InputField label="Client Name" value={parsedData?.clientName || ''} onChange={e => setParsedData(p => ({...p, clientName: e.target.value}))} />
        <InputField label="Client Contact" value={parsedData?.clientContact || ''} onChange={e => setParsedData(p => ({...p, clientContact: e.target.value}))} />
        <div className="grid grid-cols-2 gap-4">
             <InputField label="Event Date" type="date" value={parsedData?.date || ''} onChange={e => setParsedData(p => ({...p, date: e.target.value}))} />
             <InputField label="Location" value={parsedData?.location || ''} onChange={e => setParsedData(p => ({...p, location: e.target.value}))} />
        </div>
        <InputField label="Guest Count" type="number" value={parsedData?.guestCount || ''} onChange={e => setParsedData(p => ({...p, guestCount: Number(e.target.value)}))} />
        
        <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
                <label htmlFor="create-client-toggle" className="font-medium">
                    Create new client record?
                    {existingClient && (
                        <span className="block text-xs" style={{ color: 'var(--text-secondary-color)' }}>
                            Client "{existingClient.companyName}" already exists.
                        </span>
                    )}
                </label>
                <button
                    id="create-client-toggle"
                    type="button"
                    role="switch"
                    aria-checked={shouldCreateClient}
                    onClick={() => setShouldCreateClient(!shouldCreateClient)}
                    disabled={!!existingClient}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-accent-color)] disabled:opacity-50 disabled:cursor-not-allowed ${shouldCreateClient && !existingClient ? 'bg-[var(--primary-accent-color)]' : 'bg-slate-600'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${shouldCreateClient && !existingClient ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>
        
        <div>
            <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>Items Detected</label>
            {parsedData?.cost_tracker && parsedData.cost_tracker.length > 0 ? (
                <ul className="mt-1 border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                    {parsedData.cost_tracker.map((item, index) => (
                        <li key={index} className="text-sm py-1 flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                            <div>
                                <span className="font-semibold">{item.name}</span>
                                <span className="ml-2" style={{ color: 'var(--text-secondary-color)' }}>{`(Qty: ${item.quantity})`}</span>
                            </div>
                            <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon className="h-4 w-4"/></button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm mt-1 p-2 rounded-lg" style={{ color: 'var(--text-secondary-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>No specific items were detected. Add them manually below.</p>
            )}
        </div>

        <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <h4 className="text-sm font-medium mb-2">Manually Add Item</h4>
            <div className="flex gap-2 items-end">
                <div className="flex-grow"><InputField label="Item Name" value={manualItem.name} onChange={e => setManualItem({...manualItem, name: e.target.value})} /></div>
                <div className="w-20"><InputField label="Quantity" type="number" value={manualItem.quantity} onChange={e => setManualItem({...manualItem, quantity: Number(e.target.value)})} /></div>
                <div className="w-28"><InputField label="Client Price" type="number" value={manualItem.client_price_sar} onChange={e => setManualItem({...manualItem, client_price_sar: Number(e.target.value)})} /></div>
                <button onClick={handleAddItem} className="px-3 py-2 text-white rounded-lg h-10" style={{backgroundColor: 'var(--primary-accent-color)'}}><PlusIcon className="h-5 w-5"/></button>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium" style={{color: 'var(--text-secondary-color)'}}>{mode === 'rfq' ? 'Event Brief / Requirements' : 'Remarks'}</label>
            <textarea
                rows={4}
                value={parsedData?.remarks || ''}
                onChange={e => setParsedData(p => ({...p, remarks: e.target.value}))}
                className="mt-1 block w-full p-2 border rounded-lg shadow-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
            />
        </div>
    </div>
  );

  return (
    <Modal
      title={title}
      onClose={onClose}
      onSave={parsedData ? handleConfirmAndCreate : handleAnalyze}
      saveText={saveText}
      size="lg"
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <InlineSpinner />
          <p className="mt-4 font-medium animate-pulse" style={{color: 'var(--text-primary-color)'}}>
            {loadingText}
          </p>
          <div className="w-64 mt-4">
              <ProgressBar progress={progress} label="Deep Analysis" />
          </div>
          {useDeepThinking && (
              <p className="text-xs mt-2 text-purple-400">Gemini 2.5 Pro is processing complex logic...</p>
          )}
        </div>
      ) : parsedData ? (
        renderConfirmationView()
      ) : (
        renderInputView()
      )}
    </Modal>
  );
};
