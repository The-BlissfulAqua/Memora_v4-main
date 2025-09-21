import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { VoiceMessage, SenderRole } from '../../types';
import nativeTts from '../../services/nativeTts';
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
  const { dispatch } = useAppContext();
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [usingTTS, setUsingTTS] = useState(false);
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

    const handleError = () => {
      // If the audio fails to load or play, fallback to TTS
      // We only trigger TTS when the user attempted to play
      if (isPlaying) {
        speakFallback();
      }
    };

    const handleLoadedMetadata = () => {
      // When metadata is loaded, update stored duration if it differs
      if (!audio) return;
      const actualDuration = Math.round(audio.duration * 100) / 100; // round to 2 decimals
      if (actualDuration && Math.abs((message.duration || 0) - actualDuration) > 0.2) {
        try {
          dispatch({ type: 'UPDATE_VOICE_MESSAGE_DURATION', payload: { id: message.id, duration: actualDuration } });
        } catch (e) {
          console.warn('Failed to dispatch duration update', e);
        }
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // If metadata already loaded before we attached the listener (common for local assets),
    // call the handler immediately to persist the correct duration.
    try {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        handleLoadedMetadata();
      }
    } catch (e) {
      // Ignore cross-origin/read errors; listener will handle when available.
    }

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  useEffect(() => {
    // Cleanup any lingering TTS on unmount
    return () => {
      if (window.speechSynthesis && ttsUtteranceRef.current) {
        window.speechSynthesis.cancel();
        ttsUtteranceRef.current = null;
      }
    };
  }, []);

  const speakFallback = (explicitText?: string) => {
    const text = explicitText || `${message.senderName} says: hello. This is a short voice message for you.`;
    // Prefer native TTS when available (Capacitor plugin)
    if (nativeTts.isNative) {
      nativeTts.speak(text).catch((e: any) => {
        console.warn('nativeTts failed, falling back to Web Speech API', e);
      });
      setIsPlaying(true);
      setUsingTTS(true);
      // We don't have fine-grained end events from nativeTts here; optimistic behavior
      setTimeout(() => {
        setIsPlaying(false);
        setUsingTTS(false);
      }, Math.max(1500, message.duration * 1000));
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not available in this environment.');
      setIsPlaying(false);
      setUsingTTS(false);
      return;
    }

    const synth = window.speechSynthesis;
    // Cancel any existing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    ttsUtteranceRef.current = utterance;

    // Pick a human-like voice if available (prefer en-US variants)
    const voices = synth.getVoices();
    let chosen = voices.find(v => /en[-_]?us/i.test(v.lang) && /Google|Microsoft|Apple|Samantha|Daniel|Alex/i.test(v.name));
    if (!chosen) chosen = voices.find(v => /en/i.test(v.lang)) || voices[0];
    if (chosen) utterance.voice = chosen;

    utterance.onstart = () => {
      setUsingTTS(true);
      setIsPlaying(true);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setUsingTTS(false);
      ttsUtteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setUsingTTS(false);
      ttsUtteranceRef.current = null;
    };

    synth.speak(utterance);
  };

  const stopAnyPlayback = () => {
    // Stop audio element
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    // Stop TTS
    if (window.speechSynthesis && ttsUtteranceRef.current) {
      window.speechSynthesis.cancel();
      ttsUtteranceRef.current = null;
    }
    setIsPlaying(false);
    setUsingTTS(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;

    if (isPlaying) {
      stopAnyPlayback();
      return;
    }

    // Try audio playback first if there is an audioUrl
    if (audio && message.audioUrl) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(async (err) => {
        console.warn('Audio playback failed, attempting data URL blob fallback:', err);
        try {
          const src = audio.src;
          if (src && src.startsWith('data:')) {
            // Convert data URL to blob then to object URL and retry
            const resp = await fetch(src);
            const blob = await resp.blob();
            const objUrl = URL.createObjectURL(blob);
            audio.src = objUrl;
            await audio.play();
            setIsPlaying(true);
            return;
          }
        } catch (e) {
          console.warn('Data URL blob fallback failed', e);
        }
        // fallback to TTS if playback still fails
        speakFallback();
      });
      return;
    }

    // Otherwise use TTS fallback
    speakFallback();
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