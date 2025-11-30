
// components/common/ImageUploader.tsx
import React, { useState, useRef } from 'react';
import { ProgressBar } from './ProgressBar';

interface ImageUploaderProps {
  label: string;
  onImageSelected: (base64: string) => void;
  initialImage?: string;
  maxSize?: number; // Optional prop to override default 4K limit
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, onImageSelected, initialImage, maxSize }) => {
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default to 4K (3840px) if not specified
  const MAX_DIMENSION = maxSize || 3840;

  const resizeImage = (base64Str: string, maxWidth = MAX_DIMENSION, maxHeight = MAX_DIMENSION): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Dynamic quality: Lower quality for very large images to keep size manageable for LocalStorage
        // If resizing to > 2000px, compress more aggressively (0.6), otherwise 0.7
        const quality = width > 2000 || height > 2000 ? 0.6 : 0.7;
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setUploadProgress(0);
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
            setUploadProgress((e.loaded / e.total) * 100);
        }
      };

      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        setUploadProgress(100); // Reading done, now processing
        try {
            // Optimize image before setting state
            const optimizedBase64 = await resizeImage(rawBase64);
            setPreview(optimizedBase64);
            onImageSelected(optimizedBase64);
        } catch (e) {
            console.error("Image processing failed", e);
            // Fallback to raw if canvas fails (unlikely)
            setPreview(rawBase64);
            onImageSelected(rawBase64);
        } finally {
            setIsProcessing(false);
            setUploadProgress(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onImageSelected('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <div
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300/20 border-dashed rounded-md cursor-pointer hover:border-[var(--primary-accent-color)] bg-slate-900/50 transition-colors ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <div className="space-y-1 text-center w-full">
          {preview ? (
            <div className="relative group">
              <img src={preview} alt="Preview" className="mx-auto h-32 w-auto rounded-md shadow-md object-contain" />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:bg-red-700 transition-all opacity-0 group-hover:opacity-100"
                title="Remove image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
                {isProcessing ? (
                    <div className="w-full max-w-xs">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-accent-color)] mb-2 mx-auto"></div>
                        <ProgressBar progress={uploadProgress} label={uploadProgress < 100 ? "Uploading..." : "Optimizing..."} />
                    </div>
                ) : (
                    <>
                    <svg
                    className="mx-auto h-12 w-12 text-slate-400 mb-2"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                    >
                    <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                    />
                    </svg>
                    <div className="flex text-sm text-slate-400">
                        <p className="relative bg-transparent rounded-md font-medium text-[var(--primary-accent-color)] hover:text-cyan-400 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input ref={fileInputRef} id={label.replace(/\s+/g, '-')} name={label.replace(/\s+/g, '-')} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" disabled={isProcessing} />
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">High Res Supported (Up to 4K)</p>
                    </>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
