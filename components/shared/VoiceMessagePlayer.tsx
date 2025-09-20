import React, { useState, useRef, useEffect } from 'react';
import { VoiceMessage, SenderRole } from '../../types';
import PlayIcon from '../icons/PlayIcon';
import PauseIcon from '../icons/PauseIcon';
import UserIcon from '../icons/UserIcon';
import UsersIcon from '../icons/UsersIcon';
import CaregiverIcon from '../icons/CaregiverIcon';

interface VoiceMessagePlayerProps {
  message: VoiceMessage;
}

const RoleIcon: React.FC<{ role: SenderRole }> = ({ role }) => {
    switch (role) {
        case SenderRole.PATIENT:
            return <UserIcon className="w-6 h-6 text-slate-300" />;
        case SenderRole.FAMILY:
            return <UsersIcon className="w-6 h-6 text-slate-300" />;
        case SenderRole.CAREGIVER:
            return <CaregiverIcon className="w-6 h-6 text-slate-300" />;
        default:
            return null;
    }
};

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isUserMessage = message.senderRole === SenderRole.PATIENT;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Audio playback error:", e));
    }
    setIsPlaying(!isPlaying);
  };
  
  const formatTime = (timeInSeconds: number) => {
    const seconds = Math.floor(timeInSeconds % 60);
    const minutes = Math.floor(timeInSeconds / 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 w-full ${isUserMessage ? 'justify-end' : ''}`}>
        <div className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'}`}>
            <div className={`p-3 rounded-xl max-w-xs w-full shadow-md border ${isUserMessage ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700/50'}`}>
                <div className="flex items-center gap-3">
                     <div className="flex-shrink-0 bg-slate-900/50 p-2 rounded-full">
                        <RoleIcon role={message.senderRole} />
                     </div>
                     <div className='flex-grow'>
                        <p className={`font-bold text-sm ${isUserMessage ? 'text-white' : 'text-slate-300'}`}>{message.senderName}</p>
                        <p className="text-xs text-slate-400">{message.timestamp}</p>
                     </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                    <audio ref={audioRef} src={message.audioUrl} preload="metadata" />
                    <button onClick={togglePlay} className="flex-shrink-0 text-white bg-slate-600/50 hover:bg-slate-600/80 rounded-full p-2">
                        {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                    <div className="flex-grow h-2 bg-slate-900/50 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-12 text-right">
                        {isPlaying ? formatTime(currentTime) : formatTime(message.duration)}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default VoiceMessagePlayer;
