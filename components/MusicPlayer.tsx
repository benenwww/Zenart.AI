import React, { useRef } from 'react';
import { MusicNoteIcon, PlayIcon, PauseIcon, NextTrackIcon, PrevTrackIcon, CloseIcon, TrashIcon, CogIcon } from './Icons';

interface MusicPlayerProps {
  playlist: { file: File, url: string }[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  setVolume: (volume: number) => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onAddTracks: (files: File[]) => void;
  onClearPlaylist: () => void;
  isProUser: boolean;
  showControls: boolean;
  // FIX: Updated type to allow functional updates like `setShowControls(prev => !prev)`
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  playlist,
  currentTrackIndex,
  isPlaying,
  volume,
  setVolume,
  onPlayPause,
  onNext,
  onPrev,
  onAddTracks,
  onClearPlaylist,
  isProUser,
  showControls,
  setShowControls
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClick = () => {
    if (playlist.length > 0) {
      if (window.confirm("This will clear your current playlist. Do you want to continue?")) {
        onClearPlaylist();
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onAddTracks(Array.from(event.target.files));
    }
    // Reset file input to allow selecting the same file again
    event.target.value = '';
  };
  
  const currentTrack = playlist[currentTrackIndex];
  const maxTracks = isProUser ? 50 : 10;

  return (
    <div className="relative flex items-center h-10">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".mp3"
        multiple
      />
      <div className="flex items-center space-x-2">
        <div className="relative group flex items-center">
            <button
                onClick={handleAddClick}
                className="inline-flex items-center justify-center w-10 h-10 border border-slate-700 text-base font-medium rounded-md shadow-sm text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-all duration-300"
                aria-label="Add music playlist"
            >
                <MusicNoteIcon className="w-5 h-5" />
            </button>
            <div className="absolute left-full ml-2 w-max max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap">
                <span className="bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg">
                    Add your playlist to get a finer experience
                </span>
            </div>
        </div>

        {playlist.length > 0 && (
             <button
                onClick={() => setShowControls(prev => !prev)}
                className="inline-flex items-center justify-center w-10 h-10 border border-slate-700 text-base font-medium rounded-md shadow-sm text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-all duration-300"
                aria-label="Show music controls"
            >
                <CogIcon className="w-5 h-5" />
            </button>
        )}
      </div>

      {/* Control Panel */}
      <div
        className={`absolute top-full right-0 mt-2 w-64 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg shadow-2xl p-4 z-20 origin-top-right transition-all duration-300 ease-in-out
          ${showControls && playlist.length > 0 ? 'transform opacity-100 scale-100' : 'transform opacity-0 scale-95 pointer-events-none'}`}
      >
        <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-400">Now Playing</p>
            <button onClick={() => setShowControls(false)} className="text-slate-500 hover:text-white transition-colors">
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
        <p className="text-sm font-medium text-slate-200 truncate mb-4" title={currentTrack?.file.name}>
            {currentTrack?.file.name || 'No track selected'}
        </p>

        <div className="flex items-center justify-around mb-4">
            <button onClick={onPrev} disabled={playlist.length === 0} className="text-slate-300 hover:text-white disabled:text-slate-600 transition-colors">
                <PrevTrackIcon className="w-6 h-6" />
            </button>
            <button onClick={onPlayPause} disabled={playlist.length === 0} className="w-10 h-10 flex items-center justify-center rounded-full bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-600 transition-colors">
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
             <button onClick={onNext} disabled={playlist.length === 0} className="text-slate-300 hover:text-white disabled:text-slate-600 transition-colors">
                <NextTrackIcon className="w-6 h-6" />
            </button>
        </div>
        
        <div className="mb-4">
            <label htmlFor="volume-slider" className="sr-only">Volume</label>
            <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
            />
        </div>

        <div className="flex justify-between items-center">
             <p className="text-xs text-slate-500">
                {playlist.length}/{maxTracks} tracks
            </p>
            <button onClick={onClearPlaylist} title="Clear Playlist" className="text-slate-500 hover:text-red-400 transition-colors">
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};