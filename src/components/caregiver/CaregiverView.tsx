import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Alert, VoiceMessage, SenderRole } from '../../types';
import PillIcon from '../icons/PillIcon';
import ForkKnifeIcon from '../icons/ForkKnifeIcon';
import GlassWaterIcon from '../icons/GlassWaterIcon';
import ReminderForm from './ReminderForm';
import FallIcon from '../icons/FallIcon';
import CompanionIcon from '../icons/CompanionIcon';
import VoiceMessagePlayer from '../shared/VoiceMessagePlayer';
import VoiceRecorder from '../shared/VoiceRecorder';
import soundService from '../../services/soundService';
import MusicIcon from '../icons/MusicIcon';

// Helper to check if a reminder is due (time-only, compares hh:mm against now)
function isReminderDue(reminderTime: string) {
  const now = new Date();
  const [h, m] = reminderTime.split(':');
  const reminderDate = new Date(now);
  reminderDate.setHours(Number(h), Number(m), 0, 0);
  return now >= reminderDate;
}

const ReminderIcon: React.FC<{ icon: 'medication' | 'meal' | 'hydration' | 'music'; className?: string }> = ({ icon, className }) => {
    switch (icon) {
        case 'medication': return <PillIcon className={className} />;
        case 'meal': return <ForkKnifeIcon className={className} />;
        case 'hydration': return <GlassWaterIcon className={className} />;
        case 'music': return <MusicIcon className={className} />;
        default: return null;
    }
};


const CaregiverView: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { reminders, alerts, voiceMessages } = state;

  // Caregiver view should not play reminder audio or auto-mark reminders notified.
  // Reminder playback/notification is handled on the Patient view only.
  
  const unacknowledgedAlerts = alerts.filter(
    a => (a.type === 'SOS' || a.type === 'FALL') && a.requiresAcknowledgement
  );

  // Alert sound playback is handled centrally in App.tsx so that only caregivers/family/dev hear it.


  const deleteReminder = (id: string) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
        dispatch({ type: 'DELETE_REMINDER', payload: id });
    }
  }

  const handleSimulateFall = () => {
      dispatch({
          type: 'TRIGGER_SOS',
          payload: {
              id: new Date().toISOString(),
              message: 'Potential Fall Detected! (Simulated)',
              timestamp: new Date().toLocaleString(),
              type: 'FALL'
          }
      });
      alert('Fall alert sent!');
  }

  const handleNewVoiceMessage = (audioUrl: string, duration: number) => {
    const newMessage: VoiceMessage = {
        id: new Date().toISOString(),
        audioUrl,
        duration,
        senderRole: SenderRole.CAREGIVER,
        senderName: 'Caregiver',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'ADD_VOICE_MESSAGE', payload: newMessage });
  };
  
  const AlertIcon: React.FC<{ type: Alert['type'] }> = ({ type }) => {
      switch (type) {
          case 'FALL': return <FallIcon className="w-6 h-6" />;
          case 'EMOTION': return <CompanionIcon className="w-6 h-6" />;
          case 'SOS': return <span className="text-xl">🚨</span>;
          default: return <span className="text-xl">⚠️</span>;
      }
  };

  const alertColorClasses = {
      SOS: 'bg-red-900/50 border-red-700/80 text-red-200',
      FALL: 'bg-orange-900/50 border-orange-700/80 text-orange-200',
      EMOTION: 'bg-blue-900/50 border-blue-700/80 text-blue-200',
  };

  const handleAcknowledge = () => {
    dispatch({ type: 'ACKNOWLEDGE_ALERTS' });
  };


  return (
    <div className="relative space-y-6 p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl">
  {/* Reminder playback and notifications are intentionally handled on Patient view only */}
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
      <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

      <header className="border-b border-slate-700/50 pb-4">
        <h1 className="text-3xl font-bold text-white">Caregiver Dashboard</h1>
        <p className="text-md text-slate-400">Manage patient schedule and alerts for Memora</p>
      </header>

      {unacknowledgedAlerts.length > 0 && (
        <div className="p-4 bg-red-800/50 border-2 border-red-500 rounded-xl shadow-lg animate-pulse">
            <h2 className="text-xl font-bold text-white text-center mb-2">URGENT ALERT RECEIVED</h2>
            <button
                onClick={handleAcknowledge}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-500 transition-colors"
                aria-label="Acknowledge and silence alarm"
            >
                Acknowledge & Silence Alarm
            </button>
        </div>
      )}
      
      {alerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-300">Urgent Alerts</h2>
            {alerts.map(alert => (
                <div key={alert.id} className={`p-4 rounded-xl shadow-lg ${alertColorClasses[alert.type]}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <AlertIcon type={alert.type} />
                        <div>
                            <p className="font-semibold">{alert.message}</p>
                            <p className="text-sm text-slate-400">{alert.timestamp}</p>
                        </div>
                    </div>
                    { (alert.type === 'SOS' || alert.type === 'FALL') && <span className="text-xl animate-ping">🚨</span> }
                  </div>
                </div>
            ))}
          </div>
      )}

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Voice Mailbox</h2>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
            {voiceMessages.map(msg => <VoiceMessagePlayer key={msg.id} message={msg} />)}
        </div>
        <div className='border-t border-slate-700/50 pt-4'>
            <p className='text-sm text-slate-400 mb-2 text-center'>Send a voice note to patient and family</p>
            <VoiceRecorder onNewMessage={handleNewVoiceMessage} />
        </div>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Add New Reminder</h2>
        <ReminderForm />
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
          <h2 className="text-xl font-bold text-gray-300 mb-3">System Actions</h2>
          <button onClick={handleSimulateFall} className="w-full px-5 py-2 bg-orange-700/80 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm">
            Simulate Fall Detection
          </button>
      </div>
      
      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Patient's Daily Schedule</h2>
        {reminders.length > 0 ? (
             <ul className="space-y-3">
             {reminders.map(reminder => (
               <li key={reminder.id} className="p-3 bg-slate-800/50 rounded-lg shadow-sm flex items-center justify-between">
                 <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-4 bg-slate-700 text-slate-300`}>
                        <ReminderIcon icon={reminder.icon} className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-200">{reminder.title}</p>
                        <p className="text-sm text-slate-400">{reminder.time}</p>
                    </div>
                 </div>
                 <div className='flex items-center space-x-4'>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${reminder.completed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                        {reminder.completed ? 'COMPLETED' : 'PENDING'}
                    </span>
                    <button onClick={() => deleteReminder(reminder.id)} className="text-slate-500 hover:text-red-400 transition-colors text-2xl font-bold">&times;</button>
                 </div>
               </li>
             ))}
           </ul>
        ) : (
            <p className="text-slate-500 text-center py-4">No reminders scheduled for today.</p>
        )}
      </div>
    </div>
  );
};

export default CaregiverView;