
// components/features/VideoGenerator.tsx
import React, { useState, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { generateVideoPreview } from '../../services/geminiService';
import type { AIInteraction } from '../../types';
import { SparkleIcon, DownloadIcon } from '../common/icons';

interface VideoGeneratorProps {
  onClose: () => void;
  setError: (error: any) => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onClose, setError, onLogAIInteraction }) => {
  const [prompt, setPrompt] = useState('A cinematic drone shot of a luxury wedding setup in the desert at sunset, 4k, hyperrealistic.');
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError(new Error('Please enter a prompt to generate a video.'));
      return;
    }
    setIsLoading(true);
    setVideoUrl(null);
    setError(null);
    try {
      const resultUrl = await generateVideoPreview(prompt);
      onLogAIInteraction({
        feature: 'image_generation', // Re-using similar category or add 'video_generation' to types if needed
        promptSummary: `Generate video: ${prompt.substring(0, 50)}...`,
        fullPrompt: prompt,
        response: 'Video Generated',
        model: 'veo-3.1-fast-generate-preview',
      });
      setVideoUrl(resultUrl);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, setError, onLogAIInteraction]);

  return (
    <Modal title="Veo Video Studio" onClose={onClose} size="lg">
      <div className="space-y-6">
        <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>
                Describe the video scene (Veo)
            </label>
            <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A neon hologram of a cat driving at top speed..."
                className="mt-1 block w-full p-2 border rounded-lg shadow-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
            />
        </div>

        <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg shadow-md transition"
            style={{ backgroundColor: 'var(--primary-accent-color)' }}
        >
            <SparkleIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Generating Video (this may take a minute)...' : 'Generate Video'}
        </button>

        <div className="bg-black/20 rounded-lg flex items-center justify-center p-4 min-h-[300px]">
            {isLoading ? (
                <div className="text-center">
                    <InlineSpinner />
                    <p className="mt-2" style={{ color: 'var(--text-secondary-color)' }}>Creating your video with Veo...</p>
                </div>
            ) : videoUrl ? (
                <div className="w-full">
                    <video controls autoPlay loop className="w-full rounded-lg shadow-lg">
                        <source src={videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <div className="flex justify-end mt-4">
                        <a 
                            href={videoUrl} 
                            download={`veo-video-${Date.now()}.mp4`}
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                        >
                            <DownloadIcon className="h-4 w-4" /> Download MP4
                        </a>
                    </div>
                </div>
            ) : (
                <p style={{ color: 'var(--text-secondary-color)' }}>Video preview will appear here.</p>
            )}
        </div>
      </div>
    </Modal>
  );
};
