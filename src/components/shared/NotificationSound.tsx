// NotificationSound.tsx
// Simple component to play a notification sound when triggered
import { useEffect } from 'react';
import soundService from '../../services/soundService';

interface NotificationSoundProps {
  trigger: boolean;
}

const NotificationSound: React.FC<NotificationSoundProps> = ({ trigger }) => {
  useEffect(() => {
    if (trigger) {
      soundService.playReminderAlert();
    }
  }, [trigger]);
  return null;
};

export default NotificationSound;
