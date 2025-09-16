import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FilmIcon, PlayIcon, PauseIcon, NextTrackIcon, PrevTrackIcon, Rewind10Icon, Forward10Icon, FullscreenIcon, FullscreenExitIcon, CloseIcon, CogIcon, TrashIcon } from './Icons';

export interface CinemaPlaylistItem {
    url: string;
    name: string;
    type: 'file' | 'url';
}

interface CinemaPlayerProps {
    playlist: CinemaPlaylistItem[];
    setPlaylist: (playlist: CinemaPlaylistItem[]) => void;
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
    onClearPlaylist: () => void;
    onExit: () => void;
    hasWallpaper: boolean;
}

const MAX_VIDEOS = 5;
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({ playlist, setPlaylist, currentIndex, setCurrentIndex, onClearPlaylist, onExit, hasWallpaper }) => {
    const [urlInput, setUrlInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [areControlsVisible, setAreControlsVisible] = useState(true);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressRef = useRef<HTMLInputElement>(null);

    const currentVideo = playlist[currentIndex];

    // --- PLAYBACK LOGIC ---

    // Effect 1: Handles loading a new video when the source changes.
    useEffect(() => {
        const video = videoRef.current;
        if (video && currentVideo) {
            // The `src` attribute is already updated by React's render.
            // Explicitly call load() to interrupt any current playback and tell the browser to fetch the new source.
            video.load();
            // Set our state to indicate we want to play this new video.
            setIsPlaying(true);
        }
    }, [currentVideo]); // This ONLY runs when the video object itself changes.

    // Effect 2: Synchronizes the video element's play/pause state with our `isPlaying` state.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Auto-play was prevented by the browser.", error);
                    // Update our state to reflect that it's not actually playing.
                    setIsPlaying(false);
                });
            }
        } else {
            video.pause();
        }
    }, [isPlaying]); // This runs ONLY when the isPlaying boolean changes.
    
    // Handler to clear the playlist and reset the player state
    const handleClearAndReset = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            video.pause();
            // Setting the src to empty can cause a "no supported source" console error.
            // Instead, we just pause the video. The component will unmount shortly after
            // the playlist is cleared, and the browser will handle resource cleanup.
        }
        setIsPlaying(false);
        setProgress(0);
        setDuration(0);
        onClearPlaylist();
    }, [onClearPlaylist]);


    // Player controls visibility logic
    const showControls = useCallback(() => {
        setAreControlsVisible(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setAreControlsVisible(false);
            }, 4000);
        }
    }, [isPlaying]);

    useEffect(() => {
        // Show controls when playback state changes (e.g., pausing)
        showControls();
        // Cleanup timeout on unmount
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [showControls, isPlaying]);

    const handleMouseMove = () => {
        showControls();
    };

    // Fullscreen handler
    const handleToggleFullScreen = useCallback(() => {
        const elem = playerContainerRef.current;
        if (!elem) return;

        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);
    
    useEffect(() => {
        const onFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
    }, []);

    const handlePlayPause = () => setIsPlaying(prev => !prev);
    const handleNext = () => setCurrentIndex((currentIndex + 1) % playlist.length);
    const handlePrev = () => setCurrentIndex((currentIndex - 1 + playlist.length) % playlist.length);
    
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setProgress(videoRef.current.currentTime);
            if (progressRef.current) {
                 const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                 progressRef.current.style.setProperty('--progress', `${percentage}%`);
            }
        }
    };
    
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };
    
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Number(e.target.value);
            setProgress(videoRef.current.currentTime);
        }
    };

    const handleRewind = () => {
        if (videoRef.current) videoRef.current.currentTime -= 10;
    };
    const handleForward = () => {
        if (videoRef.current) videoRef.current.currentTime += 10;
    };

    // File handling
    const processFiles = useCallback((files: FileList) => {
        setError(null);
        const newFiles = Array.from(files);
        if (newFiles.length > MAX_VIDEOS) {
            setError(`You can only upload a maximum of ${MAX_VIDEOS} videos.`);
            return;
        }

        const validFiles = newFiles.filter(file => {
            if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
                setError(`File type for ${file.name} is not supported.`);
                return false;
            }
            return true;
        });

        const newPlaylistItems: CinemaPlaylistItem[] = validFiles.map(file => ({
            url: URL.createObjectURL(file),
            name: file.name,
            type: 'file',
        }));
        setPlaylist(newPlaylistItems);
        setCurrentIndex(0);
    }, [setPlaylist, setCurrentIndex]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
    };

    const handleConfirmUrl = () => {
        if (!urlInput.trim()) {
            setError('URL cannot be empty.');
            return;
        }
        setError(null);
        setPlaylist([{ url: urlInput, name: urlInput, type: 'url' }]);
        setCurrentIndex(0);
    };

    const panelClasses = hasWallpaper
        ? "bg-slate-900/60 backdrop-blur-lg border border-slate-500/50"
        : "bg-slate-800/50 border border-slate-700";
    
    const uploaderClasses = `flex flex-col items-center justify-center w-full min-h-[15rem] border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
    ${isDragging ? 'border-red-400 bg-slate-700/50' : 'border-slate-600 bg-slate-800/80 hover:bg-slate-700/80'}`;

    if (playlist.length === 0) {
        return (
            <section className={`animate-fade-in p-6 rounded-xl shadow-lg ${panelClasses}`}>
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-red-400 mb-2">Cinema Mode</h2>
                    <p className="text-slate-400 mb-6">Upload your own video files or paste a direct video link to watch.</p>
                     {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4 text-center" role="alert">
                            {error}
                        </div>
                    )}
                    <div className="space-y-6">
                        <label
                            htmlFor="cinema-dropzone"
                            className={uploaderClasses}
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={handleDrop}
                        >
                            <FilmIcon className="w-12 h-12 mb-4 text-slate-500" />
                            <p className="font-semibold text-slate-300">Upload video files</p>
                            <p className="text-sm text-slate-400">Drag & drop or click (up to {MAX_VIDEOS})</p>
                            <input id="cinema-dropzone" type="file" multiple className="hidden" accept={SUPPORTED_VIDEO_TYPES.join(',')} onChange={handleFileChange} />
                        </label>

                        <div className="flex items-center">
                           <hr className="flex-grow border-slate-600" />
                           <span className="px-4 text-slate-500 font-semibold">OR</span>
                           <hr className="flex-grow border-slate-600" />
                        </div>

                        <div className="flex gap-2">
                             <input
                                type="text"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="Enter a direct video URL (.mp4, .webm)"
                                className="w-full p-3 text-slate-300 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                            <button onClick={handleConfirmUrl} className="px-6 py-2 font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700">Confirm</button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
    
    return (
        <section className="animate-fade-in">
            <div
                ref={playerContainerRef}
                className="w-full aspect-video bg-black rounded-lg relative overflow-hidden group/player"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setAreControlsVisible(false)}
            >
                <video
                    ref={videoRef}
                    src={currentVideo?.url || ''}
                    className="w-full h-full object-contain"
                    onClick={handlePlayPause}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleNext}
                />

                {/* Controls Overlay */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${areControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                     {/* Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                    
                    {/* Top Bar */}
                     <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-auto">
                        <h3 className="text-white text-lg font-semibold truncate max-w-full md:max-w-[60%]">{currentVideo?.name}</h3>
                        <div className="flex items-center gap-x-2">
                            <button onClick={handleClearAndReset} title="Clear playlist and return to uploader" className="p-1.5 bg-slate-800/60 rounded-full text-white hover:bg-yellow-500/80 transition-colors">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                            <button onClick={onExit} title="Exit Cinema Mode" className="p-1.5 bg-slate-800/60 rounded-full text-white hover:bg-red-500/80 transition-colors">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Middle Controls */}
                    <div className="absolute inset-0 flex items-center justify-center gap-12 pointer-events-none">
                        <button onClick={handleRewind} className="text-white/80 hover:text-white transition-colors p-2 pointer-events-auto"><Rewind10Icon className="w-10 h-10" /></button>
                        <button onClick={handlePlayPause} className="text-white/80 hover:text-white transition-colors p-2 pointer-events-auto">{isPlaying ? <PauseIcon className="w-16 h-16" /> : <PlayIcon className="w-16 h-16" />}</button>
                        <button onClick={handleForward} className="text-white/80 hover:text-white transition-colors p-2 pointer-events-auto"><Forward10Icon className="w-10 h-10" /></button>
                    </div>

                    {/* Bottom Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 pointer-events-auto">
                        <input
                            ref={progressRef}
                            type="range"
                            min="0"
                            max={duration || 1}
                            value={progress}
                            onChange={handleSeek}
                            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer 
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full"
                             style={{'--progress': '0%'} as React.CSSProperties}
                        />

                        <div className="flex justify-between items-center text-white text-sm">
                            <div className="w-1/3 text-left">
                                <span className="font-mono">{formatTime(progress)} / {formatTime(duration)}</span>
                            </div>
                            
                            <div className="w-1/3 flex justify-center items-center gap-4">
                                <button onClick={handlePrev}><PrevTrackIcon className="w-6 h-6" /></button>
                                <button onClick={handlePlayPause}>{isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}</button>
                                <button onClick={handleNext}><NextTrackIcon className="w-6 h-6" /></button>
                            </div>
                            
                            <div className="w-1/3 flex justify-end items-center gap-4 relative">
                               <div className="relative">
                                    <button onClick={() => setShowQualityMenu(prev => !prev)}>
                                        <CogIcon className="w-6 h-6" />
                                    </button>
                                    {showQualityMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-900/80 backdrop-blur-md rounded-md p-2 text-sm z-10">
                                            <p className="text-slate-400 px-2 pb-1 text-xs border-b border-slate-600">Quality</p>
                                            <ul className="text-slate-200">
                                                {['1080p', '720p', '480p', '360p'].map(q => (
                                                    <li key={q} onClick={() => setShowQualityMenu(false)} className="px-2 py-1 hover:bg-slate-700 rounded cursor-pointer">
                                                        {q}
                                                    </li>
                                                ))}
                                                <li className="px-2 py-1 text-slate-500 text-xs">Local file quality is fixed.</li>
                                            </ul>
                                        </div>
                                    )}
                               </div>
                               <button onClick={handleToggleFullScreen}>
                                    {isFullScreen ? <FullscreenExitIcon className="w-6 h-6" /> : <FullscreenIcon className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thumbnails */}
            {playlist.length > 1 && (
                <div className={`mt-4 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 ${panelClasses}`}>
                    {playlist.map((item, index) => (
                        <button key={index} onClick={() => setCurrentIndex(index)} className={`relative aspect-video rounded-md overflow-hidden ring-2 transition-all ${index === currentIndex ? 'ring-red-500 scale-105' : 'ring-transparent hover:ring-red-500/50'}`}>
                           <div className="absolute inset-0 bg-black/50" />
                           <FilmIcon className="w-1/3 h-1/3 text-slate-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                           <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-xs text-left truncate">{item.name}</p>
                           </div>
                           {index === currentIndex && isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <PauseIcon className="w-8 h-8 text-white" />
                                </div>
                           )}
                           {index === currentIndex && !isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <PlayIcon className="w-8 h-8 text-white" />
                                </div>
                           )}
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
};