import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTranslation } from 'react-i18next';
import './VoiceNavigation.css';

interface VoiceNavigationProps {
  onNavigate?: (destination: string) => void;
}

export const VoiceNavigation: React.FC<VoiceNavigationProps> = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { speak, speaking, supported: speechSupported } = useSpeechSynthesis();
  const {
    listening,
    transcript,
    startListening,
    stopListening,
    supported: recognitionSupported,
    resetTranscript
  } = useSpeechRecognition();

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);

  // Voice commands mapping
  const voiceCommands = {
    // Navigation commands
    'home': () => handleNavigation('home'),
    'घर': () => handleNavigation('home'),
    'donor registration': () => handleNavigation('donor'),
    'donor': () => handleNavigation('donor'),
    'दाता': () => handleNavigation('donor'),
    'hospital dashboard': () => handleNavigation('hospital'),
    'hospital': () => handleNavigation('hospital'),
    'अस्पताल': () => handleNavigation('hospital'),
    'emergency': () => handleNavigation('emergency'),
    'आपातकाल': () => handleNavigation('emergency'),
    'back': () => handleNavigation('back'),
    'पीछे': () => handleNavigation('back'),
    'help': () => speak(t('voice_help')),
    'मदद': () => speak(t('voice_help')),

    // Form commands
    'submit': () => speak(t('form_submitting')),
    'submit करें': () => speak(t('form_submitting')),
    'cancel': () => speak(t('form_cancelling')),
    'रद्द करें': () => speak(t('form_cancelling')),
    'clear': () => {
      resetTranscript();
      speak(t('form_cleared'));
    },
    'साफ़ करें': () => {
      resetTranscript();
      speak(t('form_cleared'));
    },

    // Settings commands
    'language english': () => {
      i18n.changeLanguage('en');
      speak(t('language_changed_to_english'));
    },
    'language hindi': () => {
      i18n.changeLanguage('hi');
      speak(t('language_changed_to_hindi'));
    },
    'भाषा हिंदी': () => {
      i18n.changeLanguage('hi');
      speak(t('language_changed_to_hindi'));
    },

    // Volume commands
    'volume up': () => {
      const newVolume = Math.min(1, volume + 0.2);
      setVolume(newVolume);
      speak(t('volume_set', { volume: Math.round(newVolume * 100) }));
    },
    'volume down': () => {
      const newVolume = Math.max(0, volume - 0.2);
      setVolume(newVolume);
      speak(t('volume_set', { volume: Math.round(newVolume * 100) }));
    },
    'mute': () => {
      setIsVoiceEnabled(false);
      speak(t('voice_muted'));
    },
    'unmute': () => {
      setIsVoiceEnabled(true);
      speak(t('voice_unmuted'));
    }
  };

  // Handle navigation
  const handleNavigation = useCallback((destination: string) => {
    setLastCommand(destination);
    speak(t('navigating_to', { destination: t(destination) }));

    if (onNavigate) {
      onNavigate(destination);
    }
  }, [onNavigate, speak, t]);

  // Process voice commands
  const processVoiceCommand = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim();

    // Find matching command
    const matchedCommand = Object.keys(voiceCommands).find(cmd =>
      normalizedCommand.includes(cmd.toLowerCase()) ||
      cmd.toLowerCase().includes(normalizedCommand)
    );

    if (matchedCommand && voiceCommands[matchedCommand as keyof typeof voiceCommands]) {
      voiceCommands[matchedCommand as keyof typeof voiceCommands]();
      setLastCommand(matchedCommand);
    } else {
      // Unknown command
      speak(t('voice_command_not_recognized', { command }));
    }
  }, [speak, t]);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && !listening) {
      processVoiceCommand(transcript);
    }
  }, [transcript, listening, processVoiceCommand]);

  // Toggle voice listening
  const toggleListening = () => {
    if (listening) {
      stopListening();
      speak(t('voice_listening_stopped'));
    } else {
      startListening();
      speak(t('voice_listening_started'));
    }
  };

  // Speak welcome message on mount
  useEffect(() => {
    if (isVoiceEnabled && speechSupported) {
      setTimeout(() => {
        speak(t('voice_welcome'));
      }, 1000);
    }
  }, [isVoiceEnabled, speechSupported, speak, t]);

  // Keyboard shortcuts for voice commands
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Space to toggle voice listening
      if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
        event.preventDefault();
        toggleListening();
      }

      // Escape to stop listening
      if (event.code === 'Escape' && listening) {
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [listening, toggleListening, stopListening]);

  if (!speechSupported || !recognitionSupported) {
    return (
      <motion.div
        className="voice-navigation voice-not-supported"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="voice-status">
          <span className="status-indicator error"></span>
          <span>{t('voice_not_supported')}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`voice-navigation ${isVoiceEnabled ? 'enabled' : 'disabled'}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Voice Status Indicator */}
      <div className="voice-status">
        <motion.div
          className={`status-indicator ${listening ? 'listening' : speaking ? 'speaking' : 'idle'}`}
          animate={{
            scale: listening ? [1, 1.2, 1] : 1,
            opacity: listening ? [1, 0.6, 1] : 1
          }}
          transition={{
            duration: 1.5,
            repeat: listening ? Infinity : 0
          }}
        />

        <span className="status-text">
          {listening ? t('voice_listening') :
           speaking ? t('voice_speaking') :
           t('voice_ready')}
        </span>
      </div>

      {/* Voice Controls */}
      <div className="voice-controls">
        <motion.button
          className={`voice-button ${listening ? 'active' : ''}`}
          onClick={toggleListening}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!isVoiceEnabled}
        >
          <span className="mic-icon">🎤</span>
          {listening ? t('stop_listening') : t('start_listening')}
        </motion.button>

        <motion.button
          className="voice-button"
          onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="volume-icon">{isVoiceEnabled ? '🔊' : '🔇'}</span>
        </motion.button>
      </div>

      {/* Current Command Display */}
      {transcript && (
        <motion.div
          className="current-command"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="command-label">{t('you_said')}:</span>
          <span className="command-text">"{transcript}"</span>
        </motion.div>
      )}

      {/* Last Command Display */}
      {lastCommand && (
        <motion.div
          className="last-command"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="command-label">{t('last_command')}:</span>
          <span className="command-text">"{lastCommand}"</span>
        </motion.div>
      )}

      {/* Voice Settings */}
      <div className="voice-settings">
        <div className="setting-group">
          <label>{t('volume')}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={!isVoiceEnabled}
          />
          <span>{Math.round(volume * 100)}%</span>
        </div>

        <div className="setting-group">
          <label>{t('speed')}</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            disabled={!isVoiceEnabled}
          />
          <span>{speed.toFixed(1)}x</span>
        </div>
      </div>

      {/* Help Button */}
      <motion.button
        className="help-button"
        onClick={() => speak(t('voice_help_instructions'))}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>❓</span>
        {t('voice_help')}
      </motion.button>
    </motion.div>
  );
};

export default VoiceNavigation;