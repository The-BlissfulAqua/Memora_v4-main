// A simple service to manage audio playback for alerts.

// Import audio assets so the bundler (Vite) includes them in the app package.
import sosAsset from '../assets/audio/sos_alert.mp3';
import fallAsset from '../assets/audio/fall_alert.mp3';
import reminderAsset from '../assets/audio/reminder_notification.mp3';

let sosAudio: HTMLAudioElement | null = null;
let fallAudio: HTMLAudioElement | null = null;
let reminderAudio: HTMLAudioElement | null = null;
let isUnlocked = false;
let _isSosPlaying = false;
let _isFallPlaying = false;
let _isReminderPlaying = false;

function ensureAudioElement(kind: 'sos' | 'fall' | 'reminder'): HTMLAudioElement {
  if (kind === 'sos') {
    if (sosAudio) return sosAudio;
    sosAudio = new Audio(sosAsset);
    sosAudio.loop = true;
    sosAudio.preload = 'auto';
    // playsInline to avoid Safari going fullscreen on iOS
    (sosAudio as any).playsInline = true;
    try { sosAudio.load(); } catch (e) { /* ignore */ }
  console.debug('[soundService] created sosAudio', { src: sosAudio.src, loop: sosAudio.loop, preload: sosAudio.preload });
  sosAudio.addEventListener('play', () => console.debug('[soundService] sosAudio play event'));
    sosAudio.addEventListener('pause', () => console.debug('[soundService] sosAudio pause event'));
    sosAudio.addEventListener('error', (ev) => console.error('[soundService] sosAudio error', ev));
    return sosAudio;
  }
  if (kind === 'fall') {
    if (fallAudio) return fallAudio;
    fallAudio = new Audio(fallAsset);
    fallAudio.loop = true;
    fallAudio.preload = 'auto';
    (fallAudio as any).playsInline = true;
    try { fallAudio.load(); } catch (e) { /* ignore */ }
  console.debug('[soundService] created fallAudio', { src: fallAudio.src, loop: fallAudio.loop, preload: fallAudio.preload });
  fallAudio.addEventListener('play', () => console.debug('[soundService] fallAudio play event'));
    fallAudio.addEventListener('pause', () => console.debug('[soundService] fallAudio pause event'));
    fallAudio.addEventListener('error', (ev) => console.error('[soundService] fallAudio error', ev));
    return fallAudio;
  }
  if (reminderAudio) return reminderAudio;
  reminderAudio = new Audio(reminderAsset);
  reminderAudio.loop = false;
  reminderAudio.preload = 'auto';
  (reminderAudio as any).playsInline = true;
  try { reminderAudio.load(); } catch (e) { /* ignore */ }
  console.debug('[soundService] created reminderAudio', { src: reminderAudio.src, loop: reminderAudio.loop, preload: reminderAudio.preload });
  reminderAudio.addEventListener('play', () => console.debug('[soundService] reminderAudio play event'));
  reminderAudio.addEventListener('error', (ev) => console.error('[soundService] reminderAudio error', ev));
  return reminderAudio;
}

const soundService = {
  /**
   * Unlocks the browser's audio context by playing a muted sound.
   * This MUST be called from within a user-initiated event handler (e.g., a click).
   */
  // Return a Promise so callers can wait for the unlock attempt to finish and then retry play.
  unlock: async (): Promise<void> => {
    if (isUnlocked) return;
    try {
      console.log('Attempting to unlock audio context...');
      const audio = ensureAudioElement('sos');
      audio.muted = true;
      const promise = audio.play();
      if (promise) {
        try {
          await promise;
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          isUnlocked = true;
          console.log('Audio context unlocked successfully.');
        } catch (err) {
          console.error('Audio unlock failed. Subsequent sounds may not play until another interaction.', err);
          // Leave isUnlocked false; caller may attempt again later on user interaction.
        }
      }
    } catch (err) {
      console.error('Audio unlock failed synchronously', err);
    }
  },

  playSosAlert: () => {
    try {
      const audio = ensureAudioElement('sos');
      console.debug('[soundService] playSosAlert -> src=', audio.src);
      audio.muted = false;
      audio.volume = 1.0;
      // Ensure we start from the beginning for loudness
      audio.currentTime = 0;
      const doPlay = () => {
        if (audio.paused) audio.play().then(() => { _isSosPlaying = true; }).catch(e => console.error('Error playing SOS sound:', e));
      };

      if (!isUnlocked) {
        // Try to unlock, then attempt to play. If unlock fails, still attempt to play (may fail).
        (soundService as any).unlock().then(() => {
          doPlay();
        }).catch(() => {
          // Unlock failed; still try to play once (will likely fail on browsers blocking autoplay).
          doPlay();
        });
      } else {
        doPlay();
      }
    } catch (e) {
      console.error('Error ensuring SOS audio element:', e);
    }
  },

  stopSosAlert: () => {
    if (sosAudio) {
      try {
        if (!sosAudio.paused) {
          sosAudio.pause();
          sosAudio.currentTime = 0;
        }
        _isSosPlaying = false;
      } catch (e) {
        console.error('Error stopping SOS audio', e);
      }
    }
  },

  playFallAlert: () => {
    try {
      const audio = ensureAudioElement('fall');
      console.debug('[soundService] playFallAlert -> src=', audio.src);
      audio.muted = false;
      audio.volume = 1.0;
      audio.currentTime = 0;
      const doPlay = () => {
        if (audio.paused) audio.play().then(() => { _isFallPlaying = true; }).catch(s => console.error('Error playing Fall alert sound:', s));
      };

      if (!isUnlocked) {
        (soundService as any).unlock().then(() => {
          doPlay();
        }).catch(() => {
          doPlay();
        });
      } else {
        doPlay();
      }
    } catch (e) {
      console.error('Error ensuring Fall audio element:', e);
    }
  },

  stopFallAlert: () => {
    if (fallAudio) {
      try {
        if (!fallAudio.paused) {
          fallAudio.pause();
          fallAudio.currentTime = 0;
        }
        _isFallPlaying = false;
      } catch (e) {
        console.error('Error stopping Fall audio', e);
      }
    }
  },

  // Diagnostics
  isSosPlaying: () => !!_isSosPlaying,
  isFallPlaying: () => !!_isFallPlaying,

  isReminderPlaying: () => !!_isReminderPlaying,

  playReminderAlert: (): HTMLAudioElement | null => {
    try {
      const audio = ensureAudioElement('reminder');
      console.debug('[soundService] playReminderAlert -> src=', audio.src);
      audio.muted = false;
      audio.volume = 1.0;
      audio.currentTime = 0;

      const doPlay = () => {
        console.debug('[soundService] reminder audio state before play', { paused: audio.paused, readyState: audio.readyState, muted: audio.muted, volume: audio.volume });
        if (audio.paused) audio.play().then(() => { _isReminderPlaying = true; console.debug('[soundService] reminder audio started playing'); }).catch(e => console.error('Error playing reminder sound:', e));
      };

      if (!isUnlocked) {
        // Attempt to unlock first (muted) then play
        (soundService as any).unlock().then(() => {
          try { audio.load(); } catch (e) { /* ignore */ }
          doPlay();
        }).catch(() => {
          // Unlock failed; still try to play once
          try { audio.load(); } catch (e) { /* ignore */ }
          doPlay();
        });
      } else {
        try { audio.load(); } catch (e) { /* ignore */ }
        doPlay();
      }
    } catch (e) {
      console.error('Error ensuring Reminder audio element:', e);
    }
    // Return the audio element so callers can observe 'ended' or close notifications when audio finishes
    return reminderAudio;
  }
  ,
  stopReminderAlert: () => {
    if (reminderAudio) {
      try {
        if (!reminderAudio.paused) {
          reminderAudio.pause();
          reminderAudio.currentTime = 0;
        }
        _isReminderPlaying = false;
      } catch (e) {
        console.error('Error stopping reminder audio', e);
      }
    }
  }
};

export default soundService;
