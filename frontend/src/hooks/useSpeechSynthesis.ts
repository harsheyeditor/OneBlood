import { useState, useCallback, useEffect } from 'react';

export interface UseSpeechSynthesisReturn {
  speak: (text: string, options?: SpeechSynthesisUtterance) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  speaking: boolean;
  paused: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
}

export const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);

      // Load voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();

      // Voices might load asynchronously
      speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string, options: Partial<SpeechSynthesisUtterance> = {}) => {
    if (!supported || !text.trim()) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set default options
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    // Find preferred voice based on language
    if (voices.length > 0) {
      const preferredVoice = voices.find(voice =>
        voice.lang.includes(utterance.lang) || voice.lang.includes('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    // Event handlers
    utterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };

    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setSpeaking(false);
      setPaused(false);
    };

    utterance.onpause = () => {
      setPaused(true);
    };

    utterance.onresume = () => {
      setPaused(false);
    };

    // Start speaking
    speechSynthesis.speak(utterance);
  }, [supported, voices]);

  const cancel = useCallback(() => {
    if (supported) {
      speechSynthesis.cancel();
      setSpeaking(false);
      setPaused(false);
    }
  }, [supported]);

  const pause = useCallback(() => {
    if (supported && speaking) {
      speechSynthesis.pause();
      setPaused(true);
    }
  }, [supported, speaking]);

  const resume = useCallback(() => {
    if (supported && paused) {
      speechSynthesis.resume();
      setPaused(false);
    }
  }, [supported, paused]);

  return {
    speak,
    cancel,
    pause,
    resume,
    speaking,
    paused,
    supported,
    voices
  };
};