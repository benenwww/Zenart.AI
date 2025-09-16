import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ImageIcon, DownloadIcon, FullscreenIcon, CloseIcon } from './Icons';

interface ResultDisplayProps {
  result: { url: string; type: 'image' | 'video' } | null;
  isLoading: boolean;
  prompt: string;
  loadingMessage: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, isLoading, prompt, loadingMessage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');

  const fileExtension = result?.type === 'video' ? 'mp4' : 'jpeg';
  const mediaType = result?.type === 'video' ? 'Video' : 'Image';

  useEffect(() => {
    if (prompt && result) {
      const friendlyName = prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
      setFileName(friendlyName || `generated-${result.type}`);
    } else {
      setFileName(`generated-${result?.type || 'media'}`);
    }
  }, [prompt, result]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDownload = () => {
    if (!result?.url) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `${fileName}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center text-slate-400 text-center px-4">
          <LoadingSpinner />
          <p className="mt-2">{loadingMessage || 'Processing your masterpiece...'}</p>
        </div>
      );
    }
    if (result?.url) {
      return (
        <div className="w-full h-full relative group">
          {result.type === 'image' ? (
            <img src={result.url} alt="Generated result" className="w-full h-full object-cover" />
          ) : (
            <video src={result.url} controls autoPlay loop className="w-full h-full object-cover" />
          )}
          {result.type === 'image' && (
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <button
                onClick={() => setIsModalOpen(true)}
                className="p-3 bg-slate-800/80 rounded-full text-white hover:bg-cyan-500/80 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                aria-label="View fullscreen"
                >
                <FullscreenIcon className="w-6 h-6" />
                </button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center text-slate-500">
        <ImageIcon className="w-12 h-12 mb-2" />
        <p>Your generated media will appear here.</p>
      </div>
    );
  };

  return (
    <>
      <div className="w-full h-64 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden">
        {containerContent()}
      </div>
      {result && !isLoading && (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="filename" className="block text-sm font-medium text-slate-400 mb-1">
              Filename
            </label>
            <input
              type="text"
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full p-2.5 text-slate-300 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-300"
              placeholder="Enter a filename"
            />
          </div>
          <button
            onClick={handleDownload}
            className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-slate-900 bg-cyan-400 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-colors duration-300"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Download {mediaType}
          </button>
        </div>
      )}

      {isModalOpen && result?.type === 'image' && result.url && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-white bg-slate-800/80 rounded-full p-2 hover:bg-red-500/80 transition-colors"
            aria-label="Close fullscreen view"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
          <img
            src={result.url}
            alt="Fullscreen generated result"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
};
