import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { SenderRole, VoiceMessage } from '../../types';
import VoiceRecorder from '../shared/VoiceRecorder';
import VoiceMessagePlayer from '../shared/VoiceMessagePlayer';

interface VoiceMessagesProps {
    onBack: () => void;
}

const VoiceMessages: React.FC<VoiceMessagesProps> = ({ onBack }) => {
    const { state, dispatch } = useAppContext();
    const { voiceMessages } = state;

    const handleNewMessage = (audioUrl: string, duration: number) => {
        const newMessage: VoiceMessage = {
            id: new Date().toISOString(),
            audioUrl,
            duration,
            senderRole: SenderRole.PATIENT,
            senderName: 'Me',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        dispatch({ type: 'ADD_VOICE_MESSAGE', payload: newMessage });
    };

    return (
        <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
            {/* Decorative screws */}
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

            <header className="flex items-center mb-6 border-b border-slate-700/50 pb-4">
                <button onClick={onBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
                    <span className='text-lg'>&larr;</span> Back
                </button>
                <h2 className="text-2xl font-bold text-white">Voice Messages</h2>
            </header>
            
            <div className="flex-grow space-y-4 overflow-y-auto pr-2 mb-4">
                {voiceMessages.length > 0 ? (
                    voiceMessages.map(msg => <VoiceMessagePlayer key={msg.id} message={msg} />)
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <h3 className="text-xl text-slate-400">No voice messages yet.</h3>
                        <p className="text-slate-500">Tap the microphone below to send one.</p>
                    </div>
                )}
            </div>

            <footer className="mt-auto border-t border-slate-700/50 pt-4">
                <VoiceRecorder onNewMessage={handleNewMessage} />
            </footer>
        </div>
    );
};

export default VoiceMessages;