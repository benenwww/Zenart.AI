import React, { useState, useCallback } from 'react';
import { UploadIcon, CloseIcon, LayersIcon, ImageIcon } from './Icons';
import { LoadingSpinner } from './LoadingSpinner';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export interface BatchItem {
  id: string;
  file: File;
  imageUrl: string;
  prompt: string;
  resultUrl: string | null;
  isLoadingPrompt: boolean;
  isGenerating: boolean;
  promptGenerationCancelled: boolean;
  error: string | null;
}

interface BatchProcessorProps {
  items: BatchItem[];
  onFilesSelect: (files: File[]) => void;
  onGeneratePrompt: (id: string) => void;
  onGenerateImage: (id: string) => void;
  onUpdatePrompt: (id: string, prompt: string) => void;
  onRemoveItem: (id: string) => void;
  onClearBatch: () => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  artStyle: string;
  setArtStyle: (style: string) => void;
  enhanceDetail: boolean;
  setEnhanceDetail: (value: boolean) => void;
  removeWatermark: boolean;
  setRemoveWatermark: (value: boolean) => void;
  hasWallpaper: boolean;
}

const BatchItemCard: React.FC<{
    item: BatchItem;
    onGeneratePrompt: (id: string) => void;
    onGenerateImage: (id: string) => void;
    onUpdatePrompt: (id: string, prompt: string) => void;
    onRemoveItem: (id: string) => void;
}> = ({ item, onGeneratePrompt, onGenerateImage, onUpdatePrompt, onRemoveItem }) => {
    const isBusy = item.isLoadingPrompt || item.isGenerating;
    return (
        <div className="bg-slate-800/50 rounded-xl p-4 shadow-lg border border-slate-700 transition-all duration-500 flex flex-col md:flex-row gap-4">
            {/* Image Preview */}
            <div className="w-full md:w-1/4 flex-shrink-0">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden group">
                    <img src={item.imageUrl} alt={item.file.name} className="w-full h-full object-cover" />
                    <button
                        onClick={() => onRemoveItem(item.id)}
                        disabled={isBusy}
                        className="absolute top-2 right-2 p-1.5 bg-slate-800/80 rounded-full text-white hover:bg-red-500/80 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all z-10"
                        aria-label="Remove image"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 truncate" title={item.file.name}>{item.file.name}</p>
                 {item.error && (
                    <div className="bg-red-900/50 text-red-200 px-2 py-1 rounded-md mt-2 text-xs" role="alert">
                        {item.error}
                    </div>
                )}
            </div>

            {/* Prompt Area */}
            <div className="w-full md:w-2/4 flex flex-col gap-2">
                <textarea
                    value={item.prompt}
                    onChange={(e) => onUpdatePrompt(item.id, e.target.value)}
                    placeholder={item.isLoadingPrompt ? "Generating..." : "AI generated prompt will appear here..."}
                    className="w-full h-full flex-grow p-2 text-sm text-slate-300 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 resize-none"
                    disabled={isBusy}
                />
                <button
                    onClick={() => onGeneratePrompt(item.id)}
                    disabled={isBusy}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-900 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                    {item.isLoadingPrompt ? <LoadingSpinner className="w-5 h-5" /> : 'Generate Prompt'}
                </button>
            </div>

            {/* Result Area */}
            <div className="w-full md:w-1/4 flex flex-col gap-2">
                <div className="w-full aspect-square bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden">
                    {item.isGenerating ? <LoadingSpinner /> 
                    : item.resultUrl ? <img src={item.resultUrl} alt="Generated result" className="w-full h-full object-cover" /> 
                    : <ImageIcon className="w-10 h-10 text-slate-600" />}
                </div>
                <button
                    onClick={() => onGenerateImage(item.id)}
                    disabled={isBusy || !item.prompt}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                    {item.isGenerating ? <LoadingSpinner className="w-5 h-5" /> : 'Generate Image'}
                </button>
            </div>
        </div>
    );
};

const BatchUploader: React.FC<{ onFilesSelect: (files: File[]) => void; currentFileCount: number }> = ({ onFilesSelect, currentFileCount }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const processFiles = useCallback((fileList: FileList) => {
        setError(null);
        const files = Array.from(fileList);
        if (files.length + currentFileCount > MAX_FILES) {
            setError(`You can only upload up to ${MAX_FILES} images in total.`);
            return;
        }
        const validFiles = files.filter(file => {
             if (!SUPPORTED_TYPES.includes(file.type)) {
                setError(`File type ${file.type} is not supported.`);
                return false;
             }
             if (file.size > MAX_FILE_SIZE) {
                setError(`File ${file.name} is too large (max 4MB).`);
                return false;
             }
             return true;
        });
        if (validFiles.length > 0) {
            onFilesSelect(validFiles);
        }
    }, [onFilesSelect, currentFileCount]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
    };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            processFiles(e.dataTransfer.files);
        }
    };

    const uploaderClasses = `flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
    ${isDragging ? 'border-purple-400 bg-slate-700/50' : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/80'}`;

    return (
        <div className="w-full max-w-3xl mx-auto">
            <label
                htmlFor="batch-dropzone-file"
                className={uploaderClasses}
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <LayersIcon className="w-10 h-10 mb-4 text-slate-400" />
                    <p className="mb-2 text-lg text-slate-300"><span className="font-semibold">Upload Multiple Images</span></p>
                    <p className="text-sm text-slate-400">Drag & drop or click to select files</p>
                    <p className="text-xs text-slate-500 mt-2">Up to {MAX_FILES} images (PNG, JPG, WEBP, HEIC), max 4MB each.</p>
                </div>
                <input ref={inputRef} id="batch-dropzone-file" type="file" className="hidden" accept={SUPPORTED_TYPES.join(',')} onChange={handleFileChange} multiple />
            </label>
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mt-4 text-center" role="alert">
                    {error}
                </div>
            )}
        </div>
    )
};

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
    items, onFilesSelect, onGeneratePrompt, onGenerateImage, onUpdatePrompt, onRemoveItem, onClearBatch,
    aspectRatio, setAspectRatio, artStyle, setArtStyle, enhanceDetail, setEnhanceDetail, removeWatermark, setRemoveWatermark, hasWallpaper
}) => {
    const panelClasses = hasWallpaper
    ? "bg-slate-900/60 backdrop-blur-lg border border-slate-500/50 rounded-xl p-4 shadow-lg transition-all duration-500"
    : "bg-slate-800/50 rounded-xl p-4 shadow-lg border border-slate-700 transition-all duration-500";
    
    return (
        <section className="animate-fade-in space-y-6">
            <div className={panelClasses}>
                <h2 className="text-2xl font-semibold mb-4 text-purple-400">Global Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="batch-aspect-ratio" className="block text-sm font-medium text-slate-400 mb-1">Aspect Ratio</label>
                        <select id="batch-aspect-ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-slate-900/70 border border-slate-600 text-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 p-2.5">
                            <option value="1:1">Square (1:1)</option>
                            <option value="16:9">Widescreen (16:9)</option>
                            <option value="9:16">Portrait (9:16)</option>
                            <option value="4:3">Landscape (4:3)</option>
                            <option value="3:4">Portrait (3:4)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="batch-art-style" className="block text-sm font-medium text-slate-400 mb-1">Art Style</label>
                        <select id="batch-art-style" value={artStyle} onChange={(e) => setArtStyle(e.target.value)} className="w-full bg-slate-900/70 border border-slate-600 text-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 p-2.5">
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
                    <label htmlFor="batch-enhance-detail" className="flex items-center justify-center cursor-pointer h-full pb-1">
                        <span className="text-sm font-medium text-slate-400 mr-3">Enhanced Detail</span>
                        <div className="relative inline-flex items-center">
                            <input type="checkbox" id="batch-enhance-detail" className="sr-only peer" checked={enhanceDetail} onChange={(e) => setEnhanceDetail(e.target.checked)}/>
                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </div>
                    </label>
                    <label htmlFor="batch-remove-watermark" className="flex items-center justify-center cursor-pointer h-full pb-1">
                        <span className="text-sm font-medium text-slate-400 mr-3">Remove Watermark</span>
                        <div className="relative inline-flex items-center">
                            <input type="checkbox" id="batch-remove-watermark" className="sr-only peer" checked={removeWatermark} onChange={(e) => setRemoveWatermark(e.target.checked)}/>
                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </div>
                    </label>
                </div>
            </div>

            {items.length === 0 ? (
                <BatchUploader onFilesSelect={onFilesSelect} currentFileCount={items.length} />
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-slate-300">Your Batch ({items.length}/{MAX_FILES})</h3>
                        <div className="flex gap-2">
                             <button onClick={onClearBatch} className="px-4 py-2 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-red-600/50">Clear All</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {items.map(item => (
                            <BatchItemCard
                                key={item.id}
                                item={item}
                                onGeneratePrompt={onGeneratePrompt}
                                onGenerateImage={onGenerateImage}
                                onUpdatePrompt={onUpdatePrompt}
                                onRemoveItem={onRemoveItem}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};