import React, { useState, useCallback } from 'react';
import { generateImageFromPrompt } from '../services/geminiService';
import { ResultDisplay } from './ResultDisplay';
import { LoadingSpinner } from './LoadingSpinner';

interface StoryToImageGeneratorProps {
    hasWallpaper: boolean;
    removeWatermark: boolean;
    setRemoveWatermark: (value: boolean) => void;
}

export const StoryToImageGenerator: React.FC<StoryToImageGeneratorProps> = ({ hasWallpaper, removeWatermark, setRemoveWatermark }) => {
    const [storyText, setStoryText] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<string>('16:9');
    const [artStyle, setArtStyle] = useState<string>('automatic');
    const [finalResult, setFinalResult] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        if (!storyText.trim()) {
            setError('Story text cannot be empty.');
            return;
        }
        setError(null);
        setFinalResult(null);
        setIsGenerating(true);

        let finalPrompt = storyText;
        const styleKeywords: { [key: string]: string } = {
            'photorealistic': 'photorealistic, realistic, photography, 8k',
            'anime': 'anime style, vibrant colors, detailed line art, studio ghibli inspired',
            'cartoon': 'classic cartoon style, bold outlines, simplified shapes, vibrant colors',
            'fantasy': 'digital fantasy art, epic, detailed, magical atmosphere, trending on artstation',
            'cyberpunk': 'cyberpunk style, neon lighting, futuristic city, dystopian, blade runner aesthetic',
            'antropomorph': 'anthropomorphic character, furry art style, detailed fur, expressive eyes'
        };

        if (artStyle && artStyle !== 'none' && artStyle !== 'automatic' && styleKeywords[artStyle]) {
            if (finalPrompt.trim().length > 0 && !finalPrompt.trim().endsWith(',')) {
                finalPrompt += ', ';
            }
            finalPrompt += styleKeywords[artStyle];
        }

        try {
            const imageB64 = await generateImageFromPrompt(finalPrompt, aspectRatio, removeWatermark);
            setFinalResult({ url: `data:image/jpeg;base64,${imageB64}`, type: 'image' });
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Failed to generate image. Please check the console.');
        } finally {
            setIsGenerating(false);
        }
    }, [storyText, aspectRatio, artStyle, removeWatermark]);
    
    // A simple fade-in animation
    const animationStyle = {
        animation: `fadeIn 0.5s ease-in-out`
    };
    
    const keyframes = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;

    const panelClasses = hasWallpaper
        ? "bg-slate-900/60 backdrop-blur-lg border border-slate-500/50 rounded-xl p-6 shadow-lg h-full transition-all duration-500"
        : "bg-slate-800/50 rounded-xl p-6 shadow-lg border border-slate-700 h-full transition-all duration-500";

    return (
        <>
            <style>{keyframes}</style>
            <section style={animationStyle} className="mt-12 pt-8 border-t border-slate-800">
                <div className="text-center mb-10">
                    <h2 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 pb-2">
                        Story to Image
                    </h2>
                    <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
                        Paste a scene from a story or book, and watch the AI bring it to life as a vivid image.
                    </p>
                </div>
                
                {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6 max-w-3xl mx-auto text-center" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className={panelClasses}>
                        <div className="flex flex-col h-full space-y-4">
                            <div>
                                <h3 className="text-2xl font-semibold mb-4 text-green-400 flex items-center">
                                    <span className="bg-green-400 text-slate-900 rounded-full h-8 w-8 text-lg flex items-center justify-center mr-3">1</span>
                                    Your Story
                                </h3>
                                <textarea
                                    value={storyText}
                                    onChange={(e) => setStoryText(e.target.value)}
                                    placeholder="Paste your story or a descriptive scene here..."
                                    className="w-full h-48 p-3 text-slate-300 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300 resize-none"
                                    disabled={isGenerating}
                                    aria-label="Story input"
                                />
                            </div>
                            <div>
                                <h3 className="text-2xl font-semibold mb-4 text-green-400 flex items-center">
                                    <span className="bg-green-400 text-slate-900 rounded-full h-8 w-8 text-lg flex items-center justify-center mr-3">2</span>
                                    Customize
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="story-aspect-ratio" className="block text-sm font-medium text-slate-400 mb-1">
                                        Aspect Ratio
                                        </label>
                                        <select
                                            id="story-aspect-ratio"
                                            value={aspectRatio}
                                            onChange={(e) => setAspectRatio(e.target.value)}
                                            disabled={isGenerating}
                                            className="w-full bg-slate-900/70 border border-slate-600 text-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 p-2.5 transition-colors duration-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                                            aria-label="Select aspect ratio for story image"
                                        >
                                            <option value="1:1">Square (1:1)</option>
                                            <option value="16:9">Widescreen (16:9)</option>
                                            <option value="9:16">Portrait (9:16)</option>
                                            <option value="4:3">Landscape (4:3)</option>
                                            <option value="3:4">Portrait (3:4)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="story-art-style" className="block text-sm font-medium text-slate-400 mb-1">
                                        Art Style
                                        </label>
                                        <select
                                            id="story-art-style"
                                            value={artStyle}
                                            onChange={(e) => setArtStyle(e.target.value)}
                                            disabled={isGenerating}
                                            className="w-full bg-slate-900/70 border border-slate-600 text-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 p-2.5 transition-colors duration-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                                            aria-label="Select art style for story image"
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
                                    <label htmlFor="story-remove-watermark-toggle" className={`flex items-center justify-between py-1 ${isGenerating ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <span className={`text-sm font-medium ${isGenerating ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Remove Watermark
                                        </span>
                                        <div className="relative inline-flex items-center">
                                            <input
                                            type="checkbox"
                                            id="story-remove-watermark-toggle"
                                            className="sr-only peer"
                                            checked={removeWatermark}
                                            onChange={(e) => setRemoveWatermark(e.target.checked)}
                                            disabled={isGenerating}
                                            />
                                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-500 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="flex-grow flex items-end">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!storyText.trim() || isGenerating}
                                    className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-900 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    {isGenerating ? (
                                        <>
                                        <LoadingSpinner className="w-5 h-5 mr-2" />
                                        Generating...
                                        </>
                                    ) : (
                                        'Generate Image from Story'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className={panelClasses}>
                        <h3 className="text-2xl font-semibold mb-4 text-green-400 flex items-center">
                            <span className="bg-green-400 text-slate-900 rounded-full h-8 w-8 text-lg flex items-center justify-center mr-3">3</span>
                            View Result
                        </h3>
                        <ResultDisplay 
                            result={finalResult} 
                            isLoading={isGenerating} 
                            prompt={storyText} 
                            loadingMessage="Crafting your story into an image..."
                        />
                    </div>
                </div>
            </section>
        </>
    );
};