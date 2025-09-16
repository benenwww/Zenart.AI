import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { VideoIcon, InfoIcon } from './Icons';

interface PromptEditorProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isLoadingPrompt: boolean;
  isGenerating: boolean;
  isImageUploaded: boolean;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  artStyle: string;
  setArtStyle: (style: string) => void;
  enhanceDetail: boolean;
  setEnhanceDetail: (value: boolean) => void;
  onCancel: () => void;
  onRetry: () => void;
  promptGenerationCancelled: boolean;
  createVideo: boolean;
  setCreateVideo: (value: boolean) => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ 
  prompt, 
  setPrompt, 
  onGenerate,
  isLoadingPrompt, 
  isGenerating,
  isImageUploaded, 
  aspectRatio, 
  setAspectRatio,
  artStyle,
  setArtStyle,
  enhanceDetail,
  setEnhanceDetail,
  onCancel,
  onRetry,
  promptGenerationCancelled,
  createVideo,
  setCreateVideo,
}) => {
  const isControlDisabled = !isImageUploaded || isLoadingPrompt || isGenerating;
  const showRetry = isImageUploaded && promptGenerationCancelled && !prompt && !isLoadingPrompt;

  const placeholderText = isLoadingPrompt 
    ? "Analyzing image and generating prompt..." 
    : isImageUploaded 
    ? "Edit your generated prompt here..."
    : "Upload an image to generate a prompt.";

  const handleCreateVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setCreateVideo(isChecked);
  };

  const buttonClass = createVideo
    ? "bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500"
    : "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500";
    
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="relative flex-grow">
        {showRetry ? (
          <div className="w-full h-full min-h-[170px] p-3 text-slate-300 bg-slate-900/70 border border-slate-600 rounded-lg flex flex-col items-center justify-center text-center">
            <p className="text-slate-400 mb-3">Prompt generation was cancelled.</p>
            <button
              onClick={onRetry}
              className="inline-flex justify-center items-center px-5 py-2 border border-transparent font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 transition-colors"
            >
              Generate Prompt Again
            </button>
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholderText}
            className="w-full h-full min-h-[170px] p-3 text-slate-300 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-300 resize-none"
            disabled={isLoadingPrompt || !isImageUploaded}
          />
        )}
        {isLoadingPrompt && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 rounded-lg">
            <LoadingSpinner />
            <p className="text-sm text-slate-400 mt-3">Generating prompt...</p>
            <button
              onClick={onCancel}
              className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 bg-slate-700/50 hover:bg-slate-700 px-3 py-1 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-3 border-t border-slate-700/60 py-4">
        <label htmlFor="create-video-toggle" className={`flex items-center justify-between py-1 ${!isImageUploaded ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <span className={`text-sm font-medium ${!isImageUploaded ? 'text-slate-500' : 'text-slate-400'}`}>
            Create Video
            <p className="text-xs text-slate-500 font-normal">Generate a video instead of an image.</p>
          </span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id="create-video-toggle"
              className="sr-only peer"
              checked={createVideo}
              onChange={handleCreateVideoChange}
              disabled={!isImageUploaded}
            />
            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </div>
        </label>
        
        {createVideo && (
           <div className="bg-slate-700/30 border border-cyan-700/50 rounded-lg p-3 text-xs text-slate-400 space-y-2">
            <div className="flex items-start">
              <InfoIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-cyan-400" />
              <div>
                <h4 className="font-bold text-slate-300">Helpful Tips for Video</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong>Focus on atmosphere & camera moves:</strong> "slow zoom in", "pan left", "make mist swirl".</li>
                  <li><strong>Avoid complex actions:</strong> Prompts like "make it open its mouth" can be difficult as the AI must guess what's inside.</li>
                  <li><strong>Best results:</strong> Use prompts that animate the existing scene, like "make the leaves rustle".</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="aspect-ratio" className="block text-sm font-medium text-slate-400 mb-1">
              Aspect Ratio
            </label>
            <select
              id="aspect-ratio"
              name="aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={isControlDisabled}
              className="w-full bg-slate-900/70 border border-slate-600 text-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 p-2.5 transition-colors duration-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="1:1">Square (1:1)</option>
              <option value="16:9">Widescreen (16:9)</option>
              <option value="9:16">Portrait (9:16)</option>
              <option value="4:3">Landscape (4:3)</option>
              <option value="3:4">Portrait (3:4)</option>
            </select>
          </div>
          <div>
            <label htmlFor="art-style" className="block text-sm font-medium text-slate-400 mb-1">
              Art Style
            </label>
            <select
              id="art-style"
              name="art-style"
              value={artStyle}
              onChange={(e) => setArtStyle(e.target.value)}
              disabled={isControlDisabled}
              className="w-full bg-slate-900/70 border border-slate-600 text-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 p-2.5 transition-colors duration-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
                <option value="automatic">Automatic (AI Decides)</option>
                <option value="photorealistic">Photorealistic</option>
                <option value="anime">Anime</option>
                <option value="cartoon">Cartoon</option>
                <option value="fantasy">Fantasy Art</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="antropomorph">Antropomorph</option>
                <option value="none">Use Prompt Only</option>
            </select>
          </div>
        </div>

        <label htmlFor="enhance-detail-toggle" className={`flex items-center justify-between py-1 ${isControlDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <span className={`text-sm font-medium ${isControlDisabled ? 'text-slate-500' : 'text-slate-400'}`}>
            Enhanced Detail
            <p className="text-xs text-slate-500 font-normal">Adds keywords for higher detail and quality.</p>
          </span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id="enhance-detail-toggle"
              className="sr-only peer"
              checked={enhanceDetail}
              onChange={(e) => setEnhanceDetail(e.target.checked)}
              disabled={isControlDisabled}
            />
            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </div>
        </label>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onGenerate}
          disabled={!prompt || isLoadingPrompt || isGenerating}
          className={`w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 ${buttonClass}`}
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="w-5 h-5 mr-2" />
              Generating...
            </>
          ) : createVideo ? (
            <>
              <VideoIcon className="w-5 h-5 mr-2" />
              Generate Video
            </>
          ) : (
            'Generate Image'
          )}
        </button>
      </div>
    </div>
  );
};
