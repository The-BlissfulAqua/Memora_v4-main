import { Plugins } from '@capacitor/core';

let TextToSpeech: any = null;
try {
  // dynamic require for when running in web dev where plugin may not exist
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TextToSpeech = require('@capacitor-community/text-to-speech');
} catch (e) {
  TextToSpeech = null;
}

const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();

const speak = async (text: string, options?: { lang?: string; rate?: number }) => {
  if (isNative && TextToSpeech && TextToSpeech.TextToSpeech) {
    try {
      await TextToSpeech.TextToSpeech.speak({ text, lang: options?.lang || 'en-US', rate: options?.rate || 1.0 });
      return;
    } catch (e) {
      console.warn('Native TTS failed, falling back to Web Speech API', e);
    }
  }

  if ('speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (options?.lang) u.lang = options.lang;
    u.rate = options?.rate ?? 1.0;
    synth.speak(u);
    return;
  }

  console.warn('No TTS available');
};

export default { speak, isNative };
