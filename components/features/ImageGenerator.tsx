// components/features/ImageGenerator.tsx
import React, { useState, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { generateCustomImage } from '../../services/geminiService';
import type { AIInteraction } from '../../types';
import { SparkleIcon, DownloadIcon } from '../common/icons';

interface ImageGeneratorProps {
  onClose: () => void;
  setError: (error: any) => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

const aspectRatios: { label: string, value: AspectRatio }[] = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: 'Standard (4:3)', value: '4:3' },
    { label: 'Tall (3:4)', value: '3:4' },
];

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onClose, setError, onLogAIInteraction }) => {
  const [prompt, setPrompt] = useState('A futuristic cityscape at dusk, with flying vehicles and neon signs, photorealistic style.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError(new Error('Please enter a prompt to generate an image.'));
      return;
    }
    setIsLoading(true);
    setGeneratedImage(null);
    setError(null);
    try {
      const result = await generateCustomImage(prompt, aspectRatio);
      onLogAIInteraction({
        feature: 'image_generation',
        promptSummary: `Generate image: ${prompt.substring(0, 50)}...`,
        fullPrompt: prompt,
        response: '[Image Data]',
        model: 'imagen-4.0-generate-001',
        parameters: { aspectRatio },
      });
      setGeneratedImage(result);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, setError, onLogAIInteraction]);
  
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${generatedImage}`;
    link.download = `${prompt.substring(0, 20).replace(/\s/g, '_') || 'generated-image'}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const footer = (
    <div className="flex justify-between items-center mt-6 w-full">
        <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-black/20 transition rounded-lg"
        >
            Close
        </button>
        {generatedImage && (
            <div className="flex gap-2">
                 <button onClick={handleGenerate} className="px-4 py-2 text-sm font-medium hover:bg-black/20 transition rounded-lg">
                    Generate Again
                </button>
                <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 flex items-center gap-2"
                >
                    <DownloadIcon className="h-5 w-5"/> Download Image
                </button>
            </div>
        )}
    </div>
  );

  return (
    <Modal title="AI Image Studio" onClose={onClose} size="full" footer={footer}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[80vh]">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>
              Describe the image you want to create
            </label>
            <textarea
              rows={8}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A majestic golden lion wearing a crown, sitting on a throne, cinematic lighting..."
              className="mt-1 block w-full p-2 border rounded-lg shadow-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary-color)' }}>
              Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map(ar => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition ${aspectRatio === ar.value ? 'text-white shadow-md' : 'bg-black/20'}`}
                  style={{ backgroundColor: aspectRatio === ar.value ? 'var(--primary-accent-color)' : '' }}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg shadow-md transition"
            style={{ backgroundColor: 'var(--primary-accent-color)' }}
          >
            <SparkleIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Generating...' : 'Generate Image'}
          </button>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-8 bg-black/20 rounded-lg flex items-center justify-center p-4">
          {isLoading ? (
            <div className="text-center">
              <InlineSpinner />
              <p className="mt-2" style={{ color: 'var(--text-secondary-color)' }}>Conjuring your vision... this can take a moment.</p>
            </div>
          ) : generatedImage ? (
            <img
              src={`data:image/jpeg;base64,${generatedImage}`}
              alt={prompt}
              className="max-h-full max-w-full object-contain rounded-md"
            />
          ) : (
            <div className="text-center" style={{ color: 'var(--text-secondary-color)' }}>
                <p className="text-lg font-semibold">Image preview will appear here</p>
                <p className="text-sm mt-1">Describe your idea and click "Generate Image"</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
