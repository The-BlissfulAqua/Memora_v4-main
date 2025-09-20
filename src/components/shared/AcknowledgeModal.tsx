import React, { useEffect, useRef } from 'react';
import sosAsset from '../../assets/audio/sos_alert.mp3';
import fallAsset from '../../assets/audio/fall_alert.mp3';
import { useAppContext } from '../../context/AppContext';

const AcknowledgeModal: React.FC<{ alertId: string; alertType: 'SOS' | 'FALL'; onClose?: () => void }> = ({ alertId, alertType, onClose }) => {
  const { dispatch } = useAppContext();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastActive = useRef<HTMLElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    lastActive.current = document.activeElement as HTMLElement | null;
    setTimeout(() => {
      modalRef.current?.querySelector<HTMLElement>('button')?.focus();
    }, 0);

    // Initialize and play the appropriate audio
    if (!audioRef.current) {
      audioRef.current = new Audio(alertType === 'SOS' ? sosAsset : fallAsset);
      audioRef.current.loop = true;
      audioRef.current.preload = 'auto';
      (audioRef.current as any).playsInline = true;
      audioRef.current.volume = 1.0;

      const unlockAndPlay = async () => {
        try {
          // Attempt to unlock audio context (important for iOS)
          const unlockAudio = audioRef.current;
          if (unlockAudio) {
            unlockAudio.muted = true;
            await unlockAudio.play();
            unlockAudio.pause();
            unlockAudio.currentTime = 0;
            unlockAudio.muted = false;
            
            // Now play the actual alert
            if (audioRef.current) {
              audioRef.current.load();
              await audioRef.current.play();
              console.debug(`[AcknowledgeModal] ${alertType} alert playing successfully`);
            }
          }
        } catch (e) {
          console.error(`Error initializing/playing ${alertType} audio:`, e);
        }
      };

      unlockAndPlay();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      lastActive.current?.focus?.();
      // Clean up audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [alertType, onClose]);

  const acknowledge = () => {
    // Stop the audio when acknowledged
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    dispatch({ type: 'ACKNOWLEDGE_ALERTS' });
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999 }} aria-hidden={false}>
      <div className="absolute inset-0 bg-black/60" style={{ zIndex: 99998 }} />
      <div 
        ref={modalRef} 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-description"
        className="relative bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm p-6 border border-slate-700" 
        style={{ zIndex: 99999 }}
      >
        <h3 id="alert-title" className="text-lg font-bold mb-2">Important Alert</h3>
        <p id="alert-description" className="text-sm text-slate-300 mb-4">
          A critical {alertType === 'SOS' ? 'SOS' : 'Fall'} alert is active. Please acknowledge to stop the alarm.
        </p>
        <div className="flex justify-end gap-2">
          <button 
            onClick={acknowledge}
            id={`acknowledge-${alertId}`}
            name={`acknowledge-${alertType.toLowerCase()}-alert`}
            aria-label={`Acknowledge ${alertType} alert`}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Acknowledge
          </button>
          <button 
            onClick={onClose}
            id={`close-${alertId}`}
            name="close-alert-modal"
            aria-label="Close alert modal"
            className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcknowledgeModal;
