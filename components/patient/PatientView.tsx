import React, { useState, useEffect } from 'react';
import PatientHome from './PatientHome';
import ARNavigation from './ARNavigation';
import AICompanion from './AICompanion';
import RemindersList from './RemindersList';
import CognitiveGames from './CognitiveGames';
import MemoryAlbumView from './MemoryAlbumView';
import VoiceMessages from './VoiceMessages';
import { PatientScreen } from '../../types';
import { useAppContext } from '../../context/AppContext';

const PatientView: React.FC = () => {
  const { dispatch } = useAppContext();
  const [screen, setScreen] = useState<PatientScreen>(PatientScreen.HOME);

  // Fall Detection Logic
  useEffect(() => {
    const FALL_THRESHOLD = 25; // m/s^2, a threshold for fall detection
    let lastReadingTime = Date.now();

    const handleMotionEvent = (event: DeviceMotionEvent) => {
      if (Date.now() - lastReadingTime < 100) return; // Throttle readings
      lastReadingTime = Date.now();

      const acc = event.accelerationIncludingGravity;
      if (acc && acc.x != null && acc.y != null && acc.z != null) {
        const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
        if (magnitude > FALL_THRESHOLD) {
          console.log('Potential fall detected! Magnitude:', magnitude);
          dispatch({
            type: 'TRIGGER_SOS',
            payload: {
              id: new Date().toISOString(),
              message: 'Potential Fall Detected!',
              timestamp: new Date().toLocaleString(),
              type: 'FALL',
            },
          });
          // To prevent multiple alerts, a cooldown could be added here in a real app.
        }
      }
    };

    // Note: In a production app, iOS 13+ requires explicit user permission for motion events,
    // usually triggered by a button click. For this demo, we assume permission is granted.
    window.addEventListener('devicemotion', handleMotionEvent);

    return () => {
      window.removeEventListener('devicemotion', handleMotionEvent);
    };
  }, [dispatch]);


  const renderScreen = () => {
    switch (screen) {
      case PatientScreen.HOME:
        return <PatientHome setScreen={setScreen} />;
      case PatientScreen.NAVIGATION:
        return <ARNavigation onBack={() => setScreen(PatientScreen.HOME)} />;
      case PatientScreen.AI_COMPANION:
        return <AICompanion onBack={() => setScreen(PatientScreen.HOME)} />;
      case PatientScreen.REMINDERS:
        return <RemindersList onBack={() => setScreen(PatientScreen.HOME)} />;
      case PatientScreen.COGNITIVE_GAMES:
        return <CognitiveGames onBack={() => setScreen(PatientScreen.HOME)} />;
      case PatientScreen.MEMORY_ALBUM:
        return <MemoryAlbumView onBack={() => setScreen(PatientScreen.HOME)} />;
      case PatientScreen.VOICE_MESSAGES:
        return <VoiceMessages onBack={() => setScreen(PatientScreen.HOME)} />;
      default:
        return <PatientHome setScreen={setScreen} />;
    }
  };

  return <div className="w-full h-full">{renderScreen()}</div>;
};

export default PatientView;