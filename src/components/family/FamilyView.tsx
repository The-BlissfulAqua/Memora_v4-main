import NotificationSound from '../shared/NotificationSound';
// Helper to check if a reminder is due
function isReminderDue(reminderTime: string) {
    const now = new Date();
    const [h, m] = reminderTime.split(':');
    const reminderDate = new Date(now);
    reminderDate.setHours(Number(h), Number(m), 0, 0);
    return now >= reminderDate;
}
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAIComfortingQuote, isGeminiConfigured, missingApiKeyError } from '../../services/geminiService';
import { Memory, SharedQuote, Alert, EventLogItem, VoiceMessage, SenderRole } from '../../types';
import PillIcon from '../icons/PillIcon';
import ForkKnifeIcon from '../icons/ForkKnifeIcon';
import GlassWaterIcon from '../icons/GlassWaterIcon';
import CompanionIcon from '../icons/CompanionIcon';
import FallIcon from '../icons/FallIcon';
import RemindersIcon from '../icons/RemindersIcon';
import ImageIcon from '../icons/ImageIcon';
import VoiceMessagePlayer from '../shared/VoiceMessagePlayer';
import VoiceRecorder from '../shared/VoiceRecorder';
import soundService from '../../services/soundService';
import MusicIcon from '../icons/MusicIcon';

const ReminderIcon: React.FC<{ icon: 'medication' | 'meal' | 'hydration' | 'music'; className?: string }> = ({ icon, className }) => {
    switch (icon) {
        case 'medication': return <PillIcon className={className} />;
        case 'meal': return <ForkKnifeIcon className={className} />;
        case 'hydration': return <GlassWaterIcon className={className} />;
        case 'music': return <MusicIcon className={className} />;
        default: return null;
    }
};

const FamilyView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { reminders, alerts, eventLog, voiceMessages } = state;

        // Find the first due and unnotified reminder
        const dueReminder = reminders.find((r: any) => !r.completed && !r.notified && isReminderDue(r.time));

        useEffect(() => {
            if (dueReminder) {
                dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: dueReminder.id });
            }
        }, [dueReminder, dispatch]);

    const [imageUrl, setImageUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [sharedBy, setSharedBy] = useState('');
    const [isSendingQuote, setIsSendingQuote] = useState(false);
    const [customThought, setCustomThought] = useState('');

    const unacknowledgedAlerts = alerts.filter(
        a => (a.type === 'SOS' || a.type === 'FALL') && a.requiresAcknowledgement
    );

    // Alert sound playback is handled centrally in App.tsx so that only caregivers/family/dev hear it.

    const handleAcknowledge = () => {
        dispatch({ type: 'ACKNOWLEDGE_ALERTS' });
    };

    const handleAddMemory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrl || !caption || !sharedBy) {
            alert('Please fill out all memory fields.');
            return;
        }

        const newMemory: Memory = {
            id: new Date().toISOString(),
            imageUrl,
            caption,
            sharedBy
        };
        dispatch({ type: 'ADD_MEMORY', payload: newMemory });
        setImageUrl('');
        setCaption('');
    };
    
    const handleSendAIQuote = async () => {
        if (!isGeminiConfigured) {
            alert(missingApiKeyError);
            return;
        }
        setIsSendingQuote(true);
        try {
            const quoteText = await getAIComfortingQuote();
            if (quoteText === missingApiKeyError) {
                alert(quoteText);
                return;
            }
            const newQuote: SharedQuote = {
                id: new Date().toISOString(),
                text: quoteText,
                timestamp: new Date().toLocaleString()
            };
            dispatch({ type: 'ADD_QUOTE', payload: newQuote });
        } catch (error) {
            console.error("Failed to send quote", error);
            alert("Could not send a thought at this time.");
        } finally {
            setIsSendingQuote(false);
        }
    };

    const handleSendCustomQuote = () => {
        if (customThought.trim() === '') return;
        const newQuote: SharedQuote = {
            id: new Date().toISOString(),
            text: customThought.trim(),
            timestamp: new Date().toLocaleString(),
        };
        dispatch({ type: 'ADD_QUOTE', payload: newQuote });
        setCustomThought('');
        alert("Your thought has been sent!");
    };
    
    const handleNewVoiceMessage = (audioUrl: string, duration: number) => {
        const newMessage: VoiceMessage = {
            id: new Date().toISOString(),
            audioUrl,
            duration,
            senderRole: SenderRole.FAMILY,
            senderName: sharedBy.trim(),
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

  const EventIcon: React.FC<{ icon: EventLogItem['icon'] }> = ({ icon }) => {
    switch (icon) {
        case 'sos': return <span className="text-red-400">🚨</span>;
        case 'fall': return <FallIcon className="w-4 h-4 text-orange-400"/>;
        case 'emotion': return <CompanionIcon className="w-4 h-4 text-blue-400"/>;
        case 'reminder': return <RemindersIcon className="w-4 h-4 text-green-400"/>;
        case 'task': return <RemindersIcon className="w-4 h-4 text-slate-400"/>;
        case 'memory': return <ImageIcon className="w-4 h-4 text-purple-400"/>;
        default: return null;
    }
  };

    return (
    <div className="relative space-y-6 p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl">
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
      <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

      <header className="border-b border-slate-700/50 pb-4">
        <h1 className="text-3xl font-bold text-white">Family Dashboard</h1>
        <p className="text-md text-slate-400">Stay connected with your loved one</p>
      </header>
      
    {/* Play notification sound if a reminder is due */}
    <NotificationSound trigger={!!dueReminder} />
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
        <h2 className="text-xl font-bold text-gray-300 mb-3">Your Details</h2>
        <input type="text" placeholder="Your Name (e.g., Daughter, Jane)" value={sharedBy} onChange={e => setSharedBy(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm"/>
        <p className="text-xs text-slate-500 mt-1">Please fill this in to share memories or voice messages.</p>
      </div>
      
      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Voice Messages</h2>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
            {voiceMessages.map(msg => <VoiceMessagePlayer key={msg.id} message={msg} />)}
        </div>
        <div className='border-t border-slate-700/50 pt-4'>
            <p className='text-sm text-slate-400 mb-2 text-center'>Send a voice note to your loved one</p>
            <VoiceRecorder onNewMessage={handleNewVoiceMessage} disabled={!sharedBy.trim()} />
        </div>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Share a Memory</h2>
         <form onSubmit={handleAddMemory} className="space-y-3">
             <input type="text" placeholder="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm"/>
             <textarea placeholder="Caption for the memory" value={caption} onChange={e => setCaption(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm"/>
             <button type="submit" disabled={!sharedBy.trim()} className="w-full px-5 py-2 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed">Share Memory</button>
        </form>
      </div>
      
      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Send a Comforting Thought</h2>
        <p className='text-sm text-slate-400 mb-3'>Send a short, positive message to your loved one's home screen.</p>
        <div className="space-y-3">
            <button 
              onClick={handleSendAIQuote} 
              disabled={isSendingQuote || !isGeminiConfigured} 
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isGeminiConfigured ? 'API Key not configured. See README.md' : 'Send an AI-generated thought'}
            >
                {isSendingQuote ? 'Generating...' : <> <CompanionIcon className="w-5 h-5"/> Generate & Send Thought </>}
            </button>
            <div className="flex items-center gap-2 border-t border-slate-700/50 pt-3">
                <input
                    type="text"
                    placeholder="Or write a personal message..."
                    value={customThought}
                    onChange={(e) => setCustomThought(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendCustomQuote()}
                    className="flex-grow px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm"
                />
                <button
                    onClick={handleSendCustomQuote}
                    disabled={!customThought.trim()}
                    className="flex-shrink-0 px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Send
                </button>
            </div>
        </div>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Patient Activity Timeline</h2>
        <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {eventLog.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(event => (
                <li key={event.id} className="text-sm text-slate-400 flex items-start gap-3">
                    <div className='mt-1'><EventIcon icon={event.icon} /></div>
                    <div>
                        <p className="font-semibold text-slate-300">{event.text}</p>
                        <p className='text-xs'>{event.timestamp}</p>
                    </div>
                </li>
            ))}
        </ul>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Patient's Daily Schedule</h2>
        {reminders.length > 0 ? (
             <ul className="space-y-3">
             {reminders.map(reminder => (
               <li key={reminder.id} className="p-3 bg-slate-800/50 rounded-lg shadow-sm flex items-center justify-between">
                 <div className="flex items-center">
                    <div className="p-2 rounded-lg mr-4 bg-slate-700 text-slate-300">
                        <ReminderIcon icon={reminder.icon} className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-200">{reminder.title}</p>
                        <p className="text-sm text-slate-400">{reminder.time}</p>
                    </div>
                 </div>
                 <span className={`px-3 py-1 text-xs font-bold rounded-full ${reminder.completed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                    {reminder.completed ? 'COMPLETED' : 'PENDING'}
                 </span>
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

export default FamilyView;