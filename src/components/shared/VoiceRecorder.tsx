import React, { useState, useRef, useEffect } from 'react';
import MicrophoneIcon from '../icons/MicrophoneIcon';

interface VoiceRecorderProps {
  onNewMessage: (audioUrl: string, duration: number) => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onNewMessage, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [supportedMimeType, setSupportedMimeType] = useState<string>('');

  useEffect(() => {
    // Check for MediaRecorder support and find a supported MIME type
    if (typeof MediaRecorder !== 'undefined') {
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/mp4',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
        ];
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                setSupportedMimeType(mimeType);
                break;
            }
        }
    }

    // Check and monitor microphone permissions
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'microphone' as PermissionName }).then(permissionStatus => {
            setMicPermission(permissionStatus.state);
            permissionStatus.onchange = () => {
                setMicPermission(permissionStatus.state);
            }
        }).catch(err => {
            console.error("Could not query microphone permissions.", err);
        });
    }

    // Cleanup function
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    // If running in Capacitor native, request RECORD_AUDIO permission first
    try {
      const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();
      if (isCapacitor) {
        try {
          // dynamic import to avoid runtime errors on web
          const mod: any = await import('@capacitor/core');
          const Permissions = mod?.Permissions || mod?.Plugins?.Permissions;
          if (Permissions && typeof Permissions.request === 'function') {
            const res = await Permissions.request({ name: 'microphone' as any });
            if (res && res.state === 'denied') {
              alert('Microphone permission denied. Please enable it in system settings.');
              return;
            }
          }
        } catch (permErr) {
          console.warn('Capacitor permission request failed, attempting browser flow', permErr);
        }
      }
    } catch (err) {
      console.warn('Permission check error', err);
    }
    if (micPermission === 'denied') {
        alert("Microphone access has been blocked. Please enable it in your browser's site settings to record a message.");
        return;
    }
    
    if (!supportedMimeType) {
        alert("Sorry, your browser doesn't support audio recording.");
        return;
    }

    try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: supportedMimeType });

        if (audioBlob.size === 0) {
            console.warn("Recording was too short or failed, resulting in an empty audio file.");
        } else {
            // Convert to base64 data URL so other clients (and deployments) can
            // play the audio even when the original blob URL is not available.
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string | null;
              if (result) {
                onNewMessage(result, recordingTime);
              } else {
                // Fallback: create an object URL if read fails
                try {
                  const audioUrl = URL.createObjectURL(audioBlob);
                  onNewMessage(audioUrl, recordingTime);
                } catch (e) {
                  console.warn('Failed to create audio URL for recorded blob', e);
                }
              }
            };
            reader.onerror = (e) => {
              console.warn('Failed to read recorded audio blob as data URL', e);
              try {
                const audioUrl = URL.createObjectURL(audioBlob);
                onNewMessage(audioUrl, recordingTime);
              } catch (err) {
                console.warn('Failed to create object URL as fallback', err);
              }
            };
            reader.readAsDataURL(audioBlob);
        }

        // Clean up the stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
          alert("Could not start recording. You need to grant microphone access.");
      } else {
          alert("Could not start recording. Please ensure your microphone is working.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center justify-center w-full gap-4">
      <button
        onClick={handleButtonClick}
        disabled={disabled && !isRecording}
        className={`flex-shrink-0 w-16 h-16 rounded-full transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            isRecording 
            ? 'bg-red-600 text-white animate-pulse focus:ring-red-500' 
            : (disabled 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500')
        }`}
        aria-label={isRecording ? 'Stop recording' : (disabled ? 'Enter your name to record' : 'Start recording')}
      >
        <MicrophoneIcon className="w-8 h-8" />
      </button>
      {isRecording && (
        <div className="text-xl font-mono bg-slate-800/50 px-4 py-2 rounded-lg text-white">
          {formatTime(recordingTime)}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;