
import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { analyzeImageContent } from '../../services/geminiService';
import { SparkleIcon, EyeIcon, DocumentScannerIcon } from '../common/icons';
import type { AIInteraction } from '../../types';
import { ProgressBar } from '../common/ProgressBar';

interface ImageAnalyzerProps {
  onClose: () => void;
  setError: (error: any) => void;
  onLogInteraction: (data: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
  eventId?: string;
}

export const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ onClose, setError, onLogInteraction, eventId }) => {
  const [prompt, setPrompt] = useState('Describe the visual elements, mood, and potential theme of this image.');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 15 : prev));
      }, 600);
    } else if (!isLoading && progress > 0) {
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResult(null); // Clear previous results
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!file) {
      setError(new Error('Please upload an image to analyze.'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeImageContent(prompt, file);
      
      onLogInteraction({
        feature: 'image_analysis',
        promptSummary: `Analyze image for event ${eventId || 'general'}`,
        fullPrompt: prompt,
        response: analysisResult,
        model: 'gemini-2.5-flash',
        eventId: eventId
      });

      setResult(analysisResult);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [file, prompt, eventId, setError, onLogInteraction]);

  return (
    <Modal title="AI Visual Analyzer" onClose={onClose} size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>
                Upload Image
              </label>
              <div className="relative flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md hover:border-[var(--primary-accent-color)] transition-colors" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <div className="space-y-1 text-center">
                  {preview ? (
                    <img src={preview} alt="Preview" className="mx-auto h-40 object-contain rounded-md mb-2" />
                  ) : (
                    <DocumentScannerIcon className="mx-auto h-12 w-12 text-slate-400" />
                  )}
                  <div className="flex text-sm text-slate-400 justify-center">
                    <label htmlFor="file-upload-analyzer" className="relative cursor-pointer font-medium text-[var(--primary-accent-color)] hover:text-cyan-400 focus-within:outline-none">
                      <span>{preview ? 'Change image' : 'Upload a file'}</span>
                      <input id="file-upload-analyzer" name="file-upload-analyzer" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                    </label>
                  </div>
                  {!preview && <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>
                What do you want to know?
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 border shadow-sm rounded-lg focus:ring-2 focus:ring-[var(--primary-accent-color)] focus:outline-none"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={() => setPrompt("Suggest a creative event theme based on this image's style.")} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full transition">Theme Idea</button>
                <button onClick={() => setPrompt("List the visible items and suggest 3 complementary services.")} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full transition">Identify Items</button>
                <button onClick={() => setPrompt("Describe the mood and color palette.")} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full transition">Mood & Color</button>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !file}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--primary-accent-color)' }}
            >
              {isLoading ? <InlineSpinner /> : <EyeIcon className="h-5 w-5" />}
              {isLoading ? 'Analyzing...' : 'Analyze Image'}
            </button>
          </div>

          {/* Output Section */}
          <div className="bg-black/20 rounded-lg p-4 border overflow-y-auto max-h-[500px]" style={{ borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary-color)' }}>
              <SparkleIcon className="h-5 w-5 text-purple-400" /> Analysis Result
            </h4>
            
            {result ? (
              <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">
                {result}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                {isLoading ? (
                   <>
                    <p className="animate-pulse">Gemini is studying your image...</p>
                    <div className="w-48 mt-4">
                        <ProgressBar progress={progress} label="Analyzing" />
                    </div>
                   </>
                ) : (
                   <p>Upload an image and click analyze to see AI insights here.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
