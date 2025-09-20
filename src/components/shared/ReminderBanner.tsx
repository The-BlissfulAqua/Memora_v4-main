import React from 'react';
import { Reminder } from '../../types';
import soundService from '../../services/soundService';
import localNotifications from '../../services/localNotifications';
import { useAppContext } from '../../context/AppContext';

const ReminderBanner: React.FC<{ reminder: Reminder; status: 'upcoming' | 'due' | 'completed' }> = ({ reminder, status }) => {
  const { dispatch } = useAppContext();

  const notifyNow = async () => {
    try {
      soundService.playReminderAlert();
    } catch (e) {
      console.warn('Failed to play reminder sound', e);
    }
    try {
      await localNotifications.schedule({ id: Date.now(), title: reminder.title, body: reminder.title });
    } catch (e) {
      console.warn('localNotifications failed', e);
    }
  };

  const dismiss = () => {
    dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: reminder.id });
  };

  const markComplete = () => {
    dispatch({ type: 'COMPLETE_REMINDER', payload: reminder.id });
    dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: reminder.id });
  };

  const snooze = () => {
    // Snooze by 5 minutes: compute new time string
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const newTime = `${hh}:${mm}`;
    dispatch({ type: 'ADD_REMINDER', payload: { ...reminder, id: new Date().toISOString(), time: newTime, notified: false, completed: false } });
    dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: reminder.id });
  };

  React.useEffect(() => {
    if (status === 'due') {
      notifyNow();
    }
  }, [status]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-lg p-3 flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{reminder.title}</p>
              <p className="text-sm text-slate-400">{reminder.time} — {status === 'due' ? 'Due now' : 'Upcoming'}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={markComplete} className="px-3 py-1 bg-green-600 rounded text-sm">Complete</button>
            <button onClick={snooze} className="px-3 py-1 bg-yellow-600 rounded text-sm">Snooze 5m</button>
            <button onClick={dismiss} className="px-3 py-1 bg-slate-700 rounded text-sm">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderBanner;
