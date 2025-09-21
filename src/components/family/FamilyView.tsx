import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAIComfortingQuote, isGeminiConfigured, missingApiKeyError } from '../../services/geminiService';
import { Memory, SharedQuote, EventLogItem, VoiceMessage, SenderRole } from '../../types';
import PillIcon from '../icons/PillIcon';
import ForkKnifeIcon from '../icons/ForkKnifeIcon';
import GlassWaterIcon from '../icons/GlassWaterIcon';
import CompanionIcon from '../icons/CompanionIcon';
import FallIcon from '../icons/FallIcon';
import RemindersIcon from '../icons/RemindersIcon';
import ImageIcon from '../icons/ImageIcon';
import VoiceMessagePlayer from '../shared/VoiceMessagePlayer';
import VoiceRecorder from '../shared/VoiceRecorder';
import MusicIcon from '../icons/MusicIcon';
import UploadProgress from '../shared/UploadProgress';

const ReminderIcon: React.FC<{ icon: 'medication' | 'meal' | 'hydration' | 'music'; className?: string }> = ({ icon, className }) => {
  switch (icon) {
    case 'medication': return <PillIcon className={className} />;
    case 'meal': return <ForkKnifeIcon className={className} />;
    case 'hydration': return <GlassWaterIcon className={className} />;
    case 'music': return <MusicIcon className={className} />;
    default: return null;
  }
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

const FamilyView: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { reminders, alerts, eventLog, voiceMessages } = state;

  const [imageUrl, setImageUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  
  const [caption, setCaption] = useState('');
  const [sharedBy, setSharedBy] = useState('');
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [customThought, setCustomThought] = useState('');

  const unacknowledgedAlerts = alerts.filter(a => (a.type === 'SOS' || a.type === 'FALL') && a.requiresAcknowledgement);

  const handleAcknowledge = () => dispatch({ type: 'ACKNOWLEDGE_ALERTS' });

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent submitting local-only previews (blob: or data:) since they won't be accessible to other clients
    if (!imageUrl || !caption || !sharedBy) { alert('Please fill out all memory fields.'); return; }
    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      console.warn('[FamilyView] Attempted to submit a local-only image URL - block until upload returns a public URL', imageUrl);
      alert('Image is still local-only. Please wait for the upload to complete or disable "Upload original file" to upload the file directly.');
      return;
    }
    const newMemory: Memory = { id: new Date().toISOString(), imageUrl, caption, sharedBy };
    dispatch({ type: 'ADD_MEMORY', payload: newMemory });
    setImageUrl(''); setCaption('');
  };

  const handleSendAIQuote = async () => {
    if (!isGeminiConfigured) { alert(missingApiKeyError); return; }
    setIsSendingQuote(true);
    try {
      const quoteText = await getAIComfortingQuote();
      if (quoteText === missingApiKeyError) { alert(quoteText); return; }
      const newQuote: SharedQuote = { id: new Date().toISOString(), text: quoteText, timestamp: new Date().toLocaleString() };
      dispatch({ type: 'ADD_QUOTE', payload: newQuote });
    } catch (e) { console.error(e); alert('Could not send a thought at this time.'); }
    finally { setIsSendingQuote(false); }
  };

  const handleSendCustomQuote = () => {
    if (!customThought.trim()) return; const newQuote: SharedQuote = { id: new Date().toISOString(), text: customThought.trim(), timestamp: new Date().toLocaleString() };
    dispatch({ type: 'ADD_QUOTE', payload: newQuote }); setCustomThought(''); alert('Your thought has been sent!');
  };

  const handleNewVoiceMessage = (audioUrl: string, duration: number) => {
    const newMessage: VoiceMessage = { id: new Date().toISOString(), audioUrl, duration, senderRole: SenderRole.FAMILY, senderName: sharedBy.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    dispatch({ type: 'ADD_VOICE_MESSAGE', payload: newMessage });
  };

  return (
    <div className="relative space-y-6 p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl">
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
      <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

      <header className="border-b border-slate-700/50 pb-4">
        <h1 className="text-3xl font-bold text-white">Family Dashboard</h1>
        <p className="text-md text-slate-400">Stay connected with your loved one</p>
      </header>

      {unacknowledgedAlerts.length > 0 && (
        <div className="p-4 bg-red-800/50 border-2 border-red-500 rounded-xl shadow-lg animate-pulse">
          <h2 className="text-xl font-bold text-white text-center mb-2">URGENT ALERT RECEIVED</h2>
          <button onClick={handleAcknowledge} className="w-full py-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-500 transition-colors">Acknowledge & Silence Alarm</button>
        </div>
      )}

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Your Details</h2>
        <input type="text" placeholder="Your Name (e.g., Daughter, Jane)" value={sharedBy} onChange={e => setSharedBy(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm"/>
        <p className="text-xs text-slate-500 mt-1">Please fill this in to share memories or voice messages.</p>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Voice Messages</h2>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">{voiceMessages.map(msg => <VoiceMessagePlayer key={msg.id} message={msg} />)}</div>
        <div className='border-t border-slate-700/50 pt-4'>
          <p className='text-sm text-slate-400 mb-2 text-center'>Send a voice note to your loved one</p>
          <VoiceRecorder onNewMessage={handleNewVoiceMessage} disabled={!sharedBy.trim()} />
        </div>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Share a Memory</h2>
        <form onSubmit={handleAddMemory} className="space-y-3">
          <div className="w-full">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">Upload an image to share</div>
              <div>
                <button type="button" onClick={() => document.getElementById('family-image-input')?.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg shadow-md focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm">
                  <ImageIcon className="w-4 h-4" /> Choose file
                </button>
              </div>
            </div>
            {/* Removed client-side resizing: always upload the original file */}
            <input id="family-image-input" type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files && e.target.files[0]; if (!f) return;
              console.debug('[FamilyView] file selected (original-only upload)', { name: f.name, size: f.size, type: f.type });
              const demoUrl = (window as any).__DEMO_REALTIME_URL as string | undefined;
              if (demoUrl) {
                try {
                  const httpBase = demoUrl.replace(/^wss?:\/\//, (m) => (m.startsWith('wss') ? 'https://' : 'http://'));
                  const uploadEndpoint = `${httpBase.replace(/\/$/, '')}/upload`;
                  const form = new FormData(); form.append('file', f, f.name);
                  await new Promise<void>((resolve) => {
                    const xhr = new XMLHttpRequest(); xhrRef.current = xhr; xhr.open('POST', uploadEndpoint, true);
                    console.debug('[FamilyView] XHR open ->', uploadEndpoint);
                    xhr.onload = () => {
                      console.debug('[FamilyView] XHR onload', xhr.status, xhr.responseText);
                      xhrRef.current = null;
                      if (xhr.status >= 200 && xhr.status < 300) {
                        try { const body = JSON.parse(xhr.responseText || '{}'); setImageUrl(body.url || ''); setUploadToast('Upload complete'); setTimeout(() => setUploadToast(null), 2500); console.debug('[FamilyView] upload success', body); resolve(); }
                        catch (e) { console.warn('[FamilyView] parse response failed', e); resolve(); }
                      } else if (xhr.status === 413) { setImageUrl(''); setUploadToast('File too large (max 5MB)'); setTimeout(() => setUploadToast(null), 3000); resolve(); }
                      else if (xhr.status === 415) { setImageUrl(''); setUploadToast('Unsupported file type'); setTimeout(() => setUploadToast(null), 3000); resolve(); }
                      else { console.warn('[FamilyView] upload failed status', xhr.status, xhr.responseText); setImageUrl(''); setUploadToast('Upload failed'); setTimeout(() => setUploadToast(null), 2500); resolve(); }
                    };
                    xhr.onerror = () => { console.error('[FamilyView] XHR error'); xhrRef.current = null; setImageUrl(''); setUploadToast('Upload error'); setTimeout(() => setUploadToast(null), 2500); resolve(); };
                    xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) { const p = Math.round((ev.loaded / ev.total) * 100); setUploadProgress(p); console.debug('[FamilyView] upload progress', p); } };
                    xhr.onloadend = () => { setUploadProgress(null); xhrRef.current = null; };
                    xhr.send(form);
                  });
                  try { e.currentTarget.value = ''; } catch (err) { console.debug('[FamilyView] input clear ignored', err); }
                  return;
                } catch (uErr) { console.warn('[FamilyView] upload original failed, falling back to local preview', uErr); }
              }
              // fallback to local object URL preview if demo URL not configured or upload failed
              setImageUrl(URL.createObjectURL(f)); try { e.currentTarget.value = ''; } catch (err) { console.debug('[FamilyView] input clear ignored', err); }
            }} />
          </div>

          <div>
            {imageUrl ? (
              <div className="w-full rounded-lg overflow-hidden border border-slate-700/50">
                <img src={imageUrl} alt="preview" className="w-full object-cover" />
              </div>
            ) : (
              <div className="text-sm text-slate-500">No image chosen yet.</div>
            )}
          </div>

          <UploadProgress progress={uploadProgress} message={uploadToast} onCancel={() => { if (xhrRef.current) { try { xhrRef.current.abort(); } catch (e) {} xhrRef.current = null; setUploadProgress(null); setUploadToast('Upload cancelled'); setTimeout(() => setUploadToast(null), 2000); } }} />

          <textarea placeholder="Caption for the memory" value={caption} onChange={e => setCaption(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm"/>
          <button type="submit" disabled={!sharedBy.trim()} className="w-full px-5 py-2 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed">Share Memory</button>
        </form>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Send a Comforting Thought</h2>
        <p className='text-sm text-slate-400 mb-3'>Send a short, positive message to your loved one's home screen.</p>
        <div className="space-y-3">
          <button onClick={handleSendAIQuote} disabled={isSendingQuote || !isGeminiConfigured} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed" title={!isGeminiConfigured ? 'API Key not configured. See README.md' : 'Send an AI-generated thought'}>
            {isSendingQuote ? 'Generating...' : <> <MusicIcon className="w-5 h-5"/> Generate & Send Thought </>}
          </button>
          <div className="flex items-center gap-2 border-t border-slate-700/50 pt-3">
            <input type="text" placeholder="Or write a personal message..." value={customThought} onChange={(e) => setCustomThought(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendCustomQuote()} className="flex-grow px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 text-sm" />
            <button onClick={handleSendCustomQuote} disabled={!customThought.trim()} className="flex-shrink-0 px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed">Send</button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Patient Activity Timeline</h2>
        <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">{eventLog.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(event => (
          <li key={event.id} className="text-sm text-slate-400 flex items-start gap-3">
            <div className='mt-1'><EventIcon icon={event.icon} /></div>
            <div>
              <p className="font-semibold text-slate-300">{event.text}</p>
              <p className='text-xs'>{event.timestamp}</p>
            </div>
          </li>
        ))}</ul>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl shadow-md border border-slate-700/50">
        <h2 className="text-xl font-bold text-gray-300 mb-3">Patient's Daily Schedule</h2>
        {reminders.length > 0 ? (
          <ul className="space-y-3">{reminders.map(reminder => (
            <li key={reminder.id} className="p-3 bg-slate-800/50 rounded-lg shadow-sm flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-lg mr-4 bg-slate-700 text-slate-300"><ReminderIcon icon={reminder.icon} className="w-6 h-6" /></div>
                <div>
                  <p className="font-semibold text-gray-200">{reminder.title}</p>
                  <p className="text-sm text-slate-400">{reminder.time}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${reminder.completed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{reminder.completed ? 'COMPLETED' : 'PENDING'}</span>
            </li>
          ))}</ul>
        ) : (
          <p className="text-slate-500 text-center py-4">No reminders scheduled for today.</p>
        )}
      </div>
    </div>
  );
};

export default FamilyView;