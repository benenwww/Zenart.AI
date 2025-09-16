import React, { useState, useCallback } from 'react';
import { UploadIcon, CloseIcon } from './Icons';
import { LoadingSpinner } from './LoadingSpinner';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  imageUrl: string | null;
  onEnhance: () => void;
  onFixLighting: () => void;
  onClarify: () => void;
  onClear: () => void;
  isEnhancing: boolean;
  isFixingLighting: boolean;
  isClarifying: boolean;
  isBusy: boolean;
  enhanceQuality: '4k' | '8k';
  setEnhanceQuality: (quality: '4k' | '8k') => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageSelect, 
  imageUrl, 
  onEnhance,
  onFixLighting, 
  onClarify,
  onClear,
  isEnhancing,
  isFixingLighting,
  isClarifying,
  isBusy,
  enhanceQuality,
  setEnhanceQuality
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelect(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const uploaderClasses = `flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
    ${isDragging ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 bg-slate-800 hover:bg-slate-700/80'}`;

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4">
      <div className="w-full">
        {imageUrl ? (
          <div className="relative w-full h-64 rounded-lg overflow-hidden group">
            <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
            <label htmlFor="dropzone-file" className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-white font-semibold">Change Image</span>
            </label>
            <button
                onClick={onClear}
                disabled={isBusy}
                className="absolute top-2 right-2 p-1.5 bg-slate-800/80 rounded-full text-white hover:bg-red-500/80 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all z-10"
                aria-label="Clear image"
            >
                <CloseIcon className="w-5 h-5" />
            </button>
            <input id="dropzone-file" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/heic, .heic" onChange={handleFileChange} disabled={isBusy} />
          </div>
        ) : (
          <label
            htmlFor="dropzone-file"
            className={uploaderClasses}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadIcon className="w-8 h-8 mb-4 text-slate-400" />
              <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-slate-500">PNG, JPG, WEBP, or HEIC (Max 4MB)</p>
            </div>
            <input id="dropzone-file" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/heic, .heic" onChange={handleFileChange} />
          </label>
        )}
      </div>

      {imageUrl && (
        <div className="w-full text-center space-y-4 pt-2">
           <div>
              <p className="text-sm text-slate-500 mb-2">Enhance quality</p>
              <div className="flex items-center space-x-2">
                <select
                  value={enhanceQuality}
                  onChange={(e) => setEnhanceQuality(e.target.value as '4k' | '8k')}
                  disabled={isBusy}
                  className="w-full bg-slate-900/70 border border-slate-600 text-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 p-2.5 transition-colors duration-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                  aria-label="Select enhancement quality"
                >
                  <option value="4k">Upscale to 4K</option>
                  <option value="8k">Upscale to 8K</option>
                </select>
                <button
                  onClick={onEnhance}
                  disabled={isBusy}
                  className="w-auto flex-shrink-0 inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isEnhancing ? (
                    <LoadingSpinner className="w-5 h-5" />
                  ) : (
                    'Upscale'
                  )}
                </button>
              </div>
            </div>

            <div>
                 <p className="text-sm text-slate-500 mb-2">Or fix common issues</p>
                 <div className="space-y-2">
                    <button
                        onClick={onFixLighting}
                        disabled={isBusy}
                        className="w-full inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isFixingLighting ? (
                            <LoadingSpinner className="w-5 h-5" />
                        ) : (
                            'Fix Lighting'
                        )}
                    </button>
                    <button
                        onClick={onClarify}
                        disabled={isBusy}
                        className="w-full inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isClarifying ? (
                            <LoadingSpinner className="w-5 h-5" />
                        ) : (
                            'Clarify Image'
                        )}
                    </button>
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};
