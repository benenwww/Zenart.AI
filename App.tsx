import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { PromptEditor } from './components/PromptEditor';
import { ResultDisplay } from './components/ResultDisplay';
import { generatePromptFromImage, generateImageFromPrompt, enhanceImageQuality, fixImageLighting, clarifyImage, generateVideoFromImageAndPrompt } from './services/geminiService';
import { GithubIcon, StarIcon, CreditIcon, BookOpenIcon, LayersIcon, FilmIcon } from './components/Icons';
import { PricingPage } from './components/PricingPage';
import { StoryToImageGenerator } from './components/StoryToImageGenerator';
import { BatchProcessor, BatchItem } from './components/BatchProcessor';
import { MusicPlayer } from './components/MusicPlayer';
import { CinemaPlayer, CinemaPlaylistItem } from './components/CinemaPlayer';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'main' | 'pricing'>('main');
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Mode states
  const [showStoryToImage, setShowStoryToImage] = useState<boolean>(false);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);

  // Load wallpaper from localStorage on initial render
  useEffect(() => {
      const savedWallpaper = localStorage.getItem('appWallpaper');
      if (savedWallpaper) {
          setWallpaper(savedWallpaper);
      }
  }, []);
  
  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
        batchItems.forEach(item => URL.revokeObjectURL(item.imageUrl));
        playlist.forEach(track => URL.revokeObjectURL(track.url));
        cinemaPlaylist.forEach(item => {
          if (item.type === 'file') URL.revokeObjectURL(item.url);
        });
    }
  }, []);

  // State for single image mode
  const [initialImage, setInitialImage] = useState<File | null>(null);
  const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [finalResult, setFinalResult] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [userCredits, setUserCredits] = useState<number>(15); // Mock credits
  const [isProUser, setIsProUser] = useState<boolean>(false); // Mock pro status for music player
  
  // State for batch mode
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  // State for music player
  const [playlist, setPlaylist] = useState<{ file: File, url: string }[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [showMusicControls, setShowMusicControls] = useState<boolean>(false);

  // State for cinema mode
  const [cinemaPlaylist, setCinemaPlaylist] = useState<CinemaPlaylistItem[]>([]);
  const [currentCinemaIndex, setCurrentCinemaIndex] = useState(0);

  // Generation settings
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [artStyle, setArtStyle] = useState<string>('automatic');
  const [enhanceDetail, setEnhanceDetail] = useState<boolean>(false);
  const [enhanceQuality, setEnhanceQuality] = useState<'4k' | '8k'>('4k');
  const [createVideo, setCreateVideo] = useState<boolean>(false);
  const [removeWatermark, setRemoveWatermark] = useState<boolean>(false);


  // Loading and error states
  const [isLoadingPrompt, setIsLoadingPrompt] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isFixingLighting, setIsFixingLighting] = useState<boolean>(false);
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState<string>('');
  const [promptGenerationCancelled, setPromptGenerationCancelled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadingMessageInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // --- MUSIC PLAYER EFFECTS ---
  
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (playlist.length > 0 && audioRef.current) {
        const currentTrack = playlist[currentTrackIndex];
        if (audioRef.current.src !== currentTrack.url) {
           audioRef.current.src = currentTrack.url;
        }
        if (isPlaying) {
            audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        } else {
            audioRef.current.pause();
        }
    }
  }, [currentTrackIndex, playlist, isPlaying]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if(audioElement) {
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        audioElement.addEventListener('play', handlePlay);
        audioElement.addEventListener('pause', handlePause);
        return () => {
            audioElement.removeEventListener('play', handlePlay);
            audioElement.removeEventListener('pause', handlePause);
        }
    }
  }, []);

  // --- END MUSIC PLAYER EFFECTS ---


  const handleTitleClick = () => {
    wallpaperInputRef.current?.click();
  };
  
  const handleClearWallpaper = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent file picker from opening on double click
      setWallpaper(null);
      localStorage.removeItem('appWallpaper');
  }

  const handleWallpaperSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              const newWallpaper = reader.result as string;
              setWallpaper(newWallpaper);
              localStorage.setItem('appWallpaper', newWallpaper);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleClear = useCallback(() => {
    setInitialImage(null);
    setInitialImageUrl(null);
    setGeneratedPrompt('');
    setFinalResult(null);
    setError(null);
    setIsLoadingPrompt(false);
    setIsGenerating(false);
    setIsEnhancing(false);
    setIsFixingLighting(false);
    setIsClarifying(false);
    setPromptGenerationCancelled(false);
    if (loadingMessageInterval.current) {
      clearInterval(loadingMessageInterval.current);
      loadingMessageInterval.current = null;
    }
    setVideoLoadingMessage('');
  }, []);

  const handleImageSelect = useCallback(async (file: File) => {
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
    const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

    if (!SUPPORTED_TYPES.includes(file.type)) {
      setError(`Unsupported file type. Please upload a PNG, JPG, WEBP, or HEIC image.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large. Please upload an image smaller than 4 MB.`);
      return;
    }

    setError(null);
    setInitialImage(file);
    setGeneratedPrompt('');
    setFinalResult(null);
    setPromptGenerationCancelled(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const url = reader.result as string;
      setInitialImageUrl(url);
      setIsLoadingPrompt(true);
      try {
        const prompt = await generatePromptFromImage(file);
        setGeneratedPrompt(prompt);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to generate prompt. Please check the console for details.');
        setPromptGenerationCancelled(true);
      } finally {
        setIsLoadingPrompt(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleEnhanceImage = useCallback(async () => {
    if (!initialImage) {
      setError('An image must be uploaded first.');
      return;
    }
    setError(null);
    setFinalResult(null);
    setIsEnhancing(true);

    try {
      const imageB64 = await enhanceImageQuality(initialImage, enhanceQuality, aspectRatio, removeWatermark);
      setFinalResult({ url: `data:image/jpeg;base64,${imageB64}`, type: 'image' });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to enhance image. Please check the console for details.');
    } finally {
      setIsEnhancing(false);
    }
  }, [initialImage, enhanceQuality, aspectRatio, removeWatermark]);

  const handleFixLighting = useCallback(async () => {
    if (!initialImage) {
      setError('An image must be uploaded first.');
      return;
    }
    setError(null);
    setFinalResult(null);
    setIsFixingLighting(true);

    try {
      const imageB64 = await fixImageLighting(initialImage, aspectRatio, removeWatermark);
      setFinalResult({ url: `data:image/jpeg;base64,${imageB64}`, type: 'image' });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to fix lighting. Please check the console for details.');
    } finally {
      setIsFixingLighting(false);
    }
  }, [initialImage, aspectRatio, removeWatermark]);
  
  const handleClarifyImage = useCallback(async () => {
    if (!initialImage) {
      setError('An image must be uploaded first.');
      return;
    }
    setError(null);
    setFinalResult(null);
    setIsClarifying(true);

    try {
      const imageB64 = await clarifyImage(initialImage, aspectRatio, removeWatermark);
      setFinalResult({ url: `data:image/jpeg;base64,${imageB64}`, type: 'image' });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to clarify image. Please check the console for details.');
    } finally {
      setIsClarifying(false);
    }
  }, [initialImage, aspectRatio, removeWatermark]);

  const handleGenerate = useCallback(async () => {
    if (!generatedPrompt) {
      setError('Prompt cannot be empty.');
      return;
    }
    if (createVideo && !initialImage) {
      setError('An image is required to generate a video.');
      return;
    }

    setError(null);
    setFinalResult(null);
    setIsGenerating(true);

    let finalPrompt = generatedPrompt;

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
    
    if (enhanceDetail) {
      const qualityEnhancers = "intricate details, sharp focus, professional lighting, masterpiece, ultra high resolution";
      if (finalPrompt.trim().length > 0 && !finalPrompt.trim().endsWith(',')) {
        finalPrompt += ', ';
      }
      finalPrompt += qualityEnhancers;
    }

    try {
      if (createVideo) {
        const messages = [
            'Warming up the video engine...',
            'Consulting with the digital director...',
            'Casting pixel-perfect actors...',
            'Setting up virtual cameras...',
            'Rendering the first few frames...',
            'Applying special effects...',
            'Finalizing the digital masterpiece...',
        ];
        let messageIndex = 0;
        setVideoLoadingMessage(messages[messageIndex]);
        
        if (loadingMessageInterval.current) clearInterval(loadingMessageInterval.current);
        loadingMessageInterval.current = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setVideoLoadingMessage(messages[messageIndex]);
        }, 4000);

        const videoUrl = await generateVideoFromImageAndPrompt(initialImage!, finalPrompt, aspectRatio, removeWatermark);
        setFinalResult({ url: videoUrl, type: 'video'});

      } else {
        const imageB64 = await generateImageFromPrompt(finalPrompt, aspectRatio, removeWatermark);
        setFinalResult({ url: `data:image/jpeg;base64,${imageB64}`, type: 'image' });
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : `Failed to generate ${createVideo ? 'video' : 'image'}. Please check the console.`);
    } finally {
      if (loadingMessageInterval.current) clearInterval(loadingMessageInterval.current);
      setVideoLoadingMessage('');
      setIsGenerating(false);
    }
  }, [generatedPrompt, aspectRatio, artStyle, enhanceDetail, createVideo, initialImage, removeWatermark]);

  const handleCancelPromptGeneration = useCallback(() => {
    setIsLoadingPrompt(false);
    setPromptGenerationCancelled(true);
  }, []);

  const handleRetryPromptGeneration = useCallback(async () => {
    if (!initialImage) return;
    
    setPromptGenerationCancelled(false);
    setIsLoadingPrompt(true);
    setGeneratedPrompt('');

    try {
      const prompt = await generatePromptFromImage(initialImage);
      setGeneratedPrompt(prompt);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to generate prompt. Please check the console for details.');
      setPromptGenerationCancelled(true);
    } finally {
      setIsLoadingPrompt(false);
    }
  }, [initialImage]);

  // --- BATCH MODE HANDLERS ---
  
  const handleBatchFilesSelect = useCallback((files: File[]) => {
    setError(null);
    const newItems: BatchItem[] = files.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      imageUrl: URL.createObjectURL(file),
      prompt: '',
      resultUrl: null,
      isLoadingPrompt: false,
      isGenerating: false,
      promptGenerationCancelled: false,
      error: null,
    }));
    setBatchItems(prev => [...prev, ...newItems]);
  }, []);

  const handleGenerateSinglePrompt = useCallback(async (id: string) => {
    setBatchItems(prev => prev.map(item => item.id === id ? { ...item, isLoadingPrompt: true, error: null, promptGenerationCancelled: false } : item));
    
    const itemToProcess = batchItems.find(item => item.id === id);
    if (!itemToProcess) return;

    try {
      const prompt = await generatePromptFromImage(itemToProcess.file);
      setBatchItems(prev => prev.map(item => item.id === id ? { ...item, prompt } : item));
    } catch (e) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : 'Failed to generate prompt.';
      setBatchItems(prev => prev.map(item => item.id === id ? { ...item, error: errorMsg, promptGenerationCancelled: true } : item));
    } finally {
      setBatchItems(prev => prev.map(item => item.id === id ? { ...item, isLoadingPrompt: false } : item));
    }
  }, [batchItems]);

  const handleGenerateSingleImage = useCallback(async (id: string) => {
    const itemToProcess = batchItems.find(item => item.id === id);
    if (!itemToProcess || !itemToProcess.prompt) {
        setBatchItems(prev => prev.map(item => item.id === id ? { ...item, error: 'Prompt is empty.' } : item));
        return;
    }

    setBatchItems(prev => prev.map(item => item.id === id ? { ...item, isGenerating: true, error: null } : item));

    let finalPrompt = itemToProcess.prompt;
    const styleKeywords: { [key: string]: string } = {
        'photorealistic': 'photorealistic, realistic, photography, 8k',
        'anime': 'anime style, vibrant colors, detailed line art, studio ghibli inspired',
        'cartoon': 'classic cartoon style, bold outlines, simplified shapes, vibrant colors',
        'fantasy': 'digital fantasy art, epic, detailed, magical atmosphere, trending on artstation',
        'cyberpunk': 'cyberpunk style, neon lighting, futuristic city, dystopian, blade runner aesthetic',
        'antropomorph': 'anthropomorphic character, furry art style, detailed fur, expressive eyes'
    };
    if (artStyle !== 'automatic' && styleKeywords[artStyle]) finalPrompt += `, ${styleKeywords[artStyle]}`;
    if (enhanceDetail) finalPrompt += ', intricate details, sharp focus, professional lighting, masterpiece, ultra high resolution';

    try {
      const imageB64 = await generateImageFromPrompt(finalPrompt, aspectRatio, removeWatermark);
      const url = `data:image/jpeg;base64,${imageB64}`;
      setBatchItems(prev => prev.map(item => item.id === id ? { ...item, resultUrl: url } : item));
    } catch (e) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : 'Failed to generate image.';
      setBatchItems(prev => prev.map(item => item.id === id ? { ...item, error: errorMsg } : item));
    } finally {
      setBatchItems(prev => prev.map(item => item.id === id ? { ...item, isGenerating: false } : item));
    }
  }, [batchItems, aspectRatio, artStyle, enhanceDetail, removeWatermark]);
  
  const handleRemoveBatchItem = useCallback((id: string) => {
    setBatchItems(prev => {
        const itemToRemove = prev.find(item => item.id === id);
        if (itemToRemove) {
            URL.revokeObjectURL(itemToRemove.imageUrl);
        }
        return prev.filter(item => item.id !== id);
    });
  }, []);

  const handleUpdateBatchItemPrompt = useCallback((id: string, prompt: string) => {
    setBatchItems(prev => prev.map(item => item.id === id ? { ...item, prompt } : item));
  }, []);

  const handleClearBatch = useCallback(() => {
    batchItems.forEach(item => URL.revokeObjectURL(item.imageUrl));
    setBatchItems([]);
  }, [batchItems]);

  const handleClearCinemaPlaylist = useCallback(() => {
    cinemaPlaylist.forEach(item => {
        if (item.type === 'file') {
            URL.revokeObjectURL(item.url);
        }
    });
    setCinemaPlaylist([]);
    setCurrentCinemaIndex(0);
  }, [cinemaPlaylist]);

  // --- MODE TOGGLE HANDLERS ---

  const handleBatchModeToggle = (checked: boolean) => {
    setIsBatchMode(checked);
    if(checked) {
        setShowStoryToImage(false);
        setIsCinemaMode(false);
        handleClear();
    }
  }
  const handleStoryModeToggle = (checked: boolean) => {
    setShowStoryToImage(checked);
    if(checked) {
        setIsBatchMode(false);
        setIsCinemaMode(false);
        handleClearBatch();
    }
  }
  const handleCinemaModeToggle = (checked: boolean) => {
    setIsCinemaMode(checked);
    if (checked) {
        setIsBatchMode(false);
        setShowStoryToImage(false);
        handleClear();
        handleClearBatch();
    } else {
        // Clean up when exiting cinema mode
        handleClearCinemaPlaylist();
    }
  }
  
  // --- END BATCH MODE HANDLERS ---
  
  // --- MUSIC PLAYER HANDLERS ---
  const handleAddTracks = useCallback((files: File[]) => {
    const maxTracks = isProUser ? 50 : 10;
    const availableSlots = maxTracks - playlist.length;
    
    if (files.length > availableSlots) {
        alert(`You can only add ${availableSlots} more tracks. (Max ${maxTracks})`);
    }

    const newTracks = files.slice(0, availableSlots).map(file => ({
        file,
        url: URL.createObjectURL(file)
    }));

    setPlaylist(prev => [...prev, ...newTracks]);
    if (playlist.length === 0 && newTracks.length > 0) {
        setIsPlaying(true); // Autoplay if it's the first track
    }
    setShowMusicControls(true);
  }, [playlist, isProUser]);

  const handlePlayPause = useCallback(() => {
    if (playlist.length > 0) {
        setIsPlaying(prev => !prev);
    }
  }, [playlist.length]);

  const handleNextTrack = useCallback(() => {
    if (playlist.length > 0) {
        setCurrentTrackIndex(prev => (prev + 1) % playlist.length);
        setIsPlaying(true);
    }
  }, [playlist.length]);

  const handlePrevTrack = useCallback(() => {
    if (playlist.length > 0) {
        setCurrentTrackIndex(prev => (prev - 1 + playlist.length) % playlist.length);
        setIsPlaying(true);
    }
  }, [playlist.length]);
  
  const handleClearPlaylist = useCallback(() => {
      setIsPlaying(false);
      playlist.forEach(track => URL.revokeObjectURL(track.url));
      setPlaylist([]);
      setCurrentTrackIndex(0);
      if(audioRef.current) {
        // Pause and remove src to prevent "no supported source" errors on cleanup.
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      setShowMusicControls(false);
  }, [playlist]);

  // --- END MUSIC PLAYER HANDLERS ---
  

  const isBusy = isLoadingPrompt || isGenerating || isEnhancing || isFixingLighting || isClarifying;

  const panelClasses = wallpaper
    ? "bg-slate-900/60 backdrop-blur-lg border border-slate-500/50 rounded-xl p-6 shadow-lg h-full transition-all duration-500"
    : "bg-slate-800/50 rounded-xl p-6 shadow-lg border border-slate-700 h-full transition-all duration-500";
    
  const activeMode = isBatchMode || showStoryToImage || isCinemaMode;

  return (
    <div 
      className="bg-slate-900 text-white min-h-screen p-4 sm:p-8 font-sans bg-cover bg-center bg-fixed"
      style={{ backgroundImage: wallpaper ? `url(${wallpaper})` : 'none' }}
    >
      <main className="container mx-auto max-w-7xl">
        <header className="text-center mb-10 relative">
          <h1 
            className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 pb-2 cursor-pointer"
            title="Click to change wallpaper, double-click to remove"
            onClick={handleTitleClick}
            onDoubleClick={handleClearWallpaper}
          >
            Zenart AI
          </h1>
          <input
              type="file"
              ref={wallpaperInputRef}
              onChange={handleWallpaperSelected}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
          />
          <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
            Turn any image into a creative prompt, enhance its quality, or bring it to life as a video.
          </p>
          <div className="absolute top-0 right-0 flex items-start space-x-2">
             <div className="hidden sm:flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 text-sm h-10">
                 <CreditIcon className="w-5 h-5 text-yellow-400" />
                 <span className="text-white font-semibold">{userCredits}</span>
                 <span className="text-slate-400">Credits</span>
             </div>
             <MusicPlayer
                playlist={playlist}
                currentTrackIndex={currentTrackIndex}
                isPlaying={isPlaying}
                volume={volume}
                setVolume={setVolume}
                onPlayPause={handlePlayPause}
                onNext={handleNextTrack}
                onPrev={handlePrevTrack}
                onAddTracks={handleAddTracks}
                onClearPlaylist={handleClearPlaylist}
                isProUser={isProUser}
                showControls={showMusicControls}
                setShowControls={setShowMusicControls}
             />
            <button
              onClick={() => setCurrentPage('pricing')}
              className="inline-flex items-center px-4 py-2 border border-yellow-500/50 text-base font-medium rounded-md shadow-sm text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-slate-900 transition-all duration-300 h-10"
            >
              <StarIcon className="w-5 h-5 mr-2" />
              Go Pro
            </button>
          </div>
        </header>

        {error && currentPage === 'main' && !isBatchMode && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6 max-w-3xl mx-auto text-center" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {currentPage === 'main' ? (
          <>
            <div className="flex flex-wrap justify-center sm:justify-end mb-6 gap-x-6 gap-y-4">
                <label htmlFor="batch-mode-toggle" className="flex items-center cursor-pointer group">
                    <LayersIcon className="w-6 h-6 mr-3 text-slate-400 group-hover:text-purple-400 transition-colors" />
                    <span className="text-md font-medium text-slate-300 group-hover:text-white transition-colors">
                    Batch Mode
                    </span>
                    <div className="relative inline-flex items-center ml-4">
                    <input
                        type="checkbox"
                        id="batch-mode-toggle"
                        className="sr-only peer"
                        checked={isBatchMode}
                        onChange={(e) => handleBatchModeToggle(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </div>
                </label>
                <label htmlFor="story-mode-toggle" className="flex items-center cursor-pointer group">
                    <BookOpenIcon className="w-6 h-6 mr-3 text-slate-400 group-hover:text-green-400 transition-colors" />
                    <span className="text-md font-medium text-slate-300 group-hover:text-white transition-colors">
                    Story to Image
                    </span>
                    <div className="relative inline-flex items-center ml-4">
                    <input
                        type="checkbox"
                        id="story-mode-toggle"
                        className="sr-only peer"
                        checked={showStoryToImage}
                        onChange={(e) => handleStoryModeToggle(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-500 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </div>
                </label>
                <label htmlFor="cinema-mode-toggle" className="flex items-center cursor-pointer group">
                    <FilmIcon className="w-6 h-6 mr-3 text-slate-400 group-hover:text-red-400 transition-colors" />
                    <span className="text-md font-medium text-slate-300 group-hover:text-white transition-colors">
                    Cinema Mode
                    </span>
                    <div className="relative inline-flex items-center ml-4">
                    <input
                        type="checkbox"
                        id="cinema-mode-toggle"
                        className="sr-only peer"
                        checked={isCinemaMode}
                        onChange={(e) => handleCinemaModeToggle(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </div>
                </label>
            </div>
            
            {isCinemaMode ? (
                <CinemaPlayer
                    playlist={cinemaPlaylist}
                    setPlaylist={setCinemaPlaylist}
                    currentIndex={currentCinemaIndex}
                    setCurrentIndex={setCurrentCinemaIndex}
                    onClearPlaylist={handleClearCinemaPlaylist}
                    onExit={() => handleCinemaModeToggle(false)}
                    hasWallpaper={!!wallpaper}
                />
            ) : isBatchMode ? (
                <BatchProcessor
                    items={batchItems}
                    onFilesSelect={handleBatchFilesSelect}
                    onGeneratePrompt={handleGenerateSinglePrompt}
                    onGenerateImage={handleGenerateSingleImage}
                    onUpdatePrompt={handleUpdateBatchItemPrompt}
                    onRemoveItem={handleRemoveBatchItem}
                    onClearBatch={handleClearBatch}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    artStyle={artStyle}
                    setArtStyle={setArtStyle}
                    enhanceDetail={enhanceDetail}
                    setEnhanceDetail={setEnhanceDetail}
                    removeWatermark={removeWatermark}
                    setRemoveWatermark={setRemoveWatermark}
                    hasWallpaper={!!wallpaper}
                />
            ) : (
                <>
                    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 items-start transition-opacity duration-500 ${showStoryToImage ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className={panelClasses}>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-400 flex items-center">
                            <span className="bg-cyan-400 text-slate-900 rounded-full h-8 w-8 text-lg flex items-center justify-center mr-3">1</span>
                            Upload Image
                            </h2>
                            <ImageUploader 
                            onImageSelect={handleImageSelect} 
                            imageUrl={initialImageUrl}
                            onEnhance={handleEnhanceImage}
                            onFixLighting={handleFixLighting}
                            onClarify={handleClarifyImage}
                            onClear={handleClear}
                            isEnhancing={isEnhancing}
                            isFixingLighting={isFixingLighting}
                            isClarifying={isClarifying}
                            isBusy={isBusy}
                            enhanceQuality={enhanceQuality}
                            setEnhanceQuality={setEnhanceQuality}
                            />
                        </div>

                        <div className={panelClasses}>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-400 flex items-center">
                            <span className="bg-cyan-400 text-slate-900 rounded-full h-8 w-8 text-lg flex items-center justify-center mr-3">2</span>
                            Generate New Media
                            </h2>
                            <PromptEditor
                            prompt={generatedPrompt}
                            setPrompt={setGeneratedPrompt}
                            onGenerate={handleGenerate}
                            isLoadingPrompt={isLoadingPrompt}
                            isGenerating={isGenerating}
                            isImageUploaded={!!initialImage}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            artStyle={artStyle}
                            setArtStyle={setArtStyle}
                            enhanceDetail={enhanceDetail}
                            setEnhanceDetail={setEnhanceDetail}
                            onCancel={handleCancelPromptGeneration}
                            onRetry={handleRetryPromptGeneration}
                            promptGenerationCancelled={promptGenerationCancelled}
                            createVideo={createVideo}
                            setCreateVideo={setCreateVideo}
                            removeWatermark={removeWatermark}
                            setRemoveWatermark={setRemoveWatermark}
                            />
                        </div>

                        <div className={panelClasses}>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-400 flex items-center">
                            <span className="bg-cyan-400 text-slate-900 rounded-full h-8 w-8 text-lg flex items-center justify-center mr-3">3</span>
                            View Result
                            </h2>
                            <ResultDisplay 
                            result={finalResult} 
                            isLoading={isGenerating || isEnhancing || isFixingLighting || isClarifying} 
                            prompt={generatedPrompt} 
                            loadingMessage={videoLoadingMessage}
                            />
                        </div>
                    </div>
                    {showStoryToImage && <StoryToImageGenerator hasWallpaper={!!wallpaper} removeWatermark={removeWatermark} setRemoveWatermark={setRemoveWatermark} />}
                </>
            )}
          </>
        ) : (
          <PricingPage onBack={() => setCurrentPage('main')} />
        )}
      </main>
      <audio ref={audioRef} onEnded={handleNextTrack} />
      <footer className="text-center mt-12 py-6 border-t border-slate-800">
        <p className="text-slate-500 text-sm mb-4">
          Creative tools powered by AI. Built with passion by Zenart AI.
        </p>
        <a 
          href="https://github.com/google/aistudio-web-apps"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <GithubIcon className="w-5 h-5 mr-2" />
          View Project on GitHub
        </a>
      </footer>
    </div>
  );
};

export default App;