import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { PatientScreen } from '../../types';
import NavigationIcon from '../icons/NavigationIcon';
import RemindersIcon from '../icons/RemindersIcon';
import CompanionIcon from '../icons/CompanionIcon';
import BrainIcon from '../icons/BrainIcon';
import ImageIcon from '../icons/ImageIcon';
import VoicemailIcon from '../icons/VoicemailIcon';
import MusicIcon from '../icons/MusicIcon';
import SOSSlider from './SOSSlider';

interface PatientHomeProps {
  setScreen: (screen: PatientScreen) => void;
}

// A reusable component for the list items to keep code DRY
const MenuItem: React.FC<{ name: string; icon: React.ReactNode; onClick: () => void; }> = ({ name, icon, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center w-full p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/90 transition-colors duration-200 border border-transparent hover:border-slate-700"
    >
        <div className="mr-4 text-white">{icon}</div>
        <span className="text-xl font-semibold text-gray-200">{name}</span>
        <span className="ml-auto text-gray-500">&rarr;</span>
    </button>
);


const PatientHome: React.FC<PatientHomeProps> = ({ setScreen }) => {
  const { dispatch } = useAppContext();
  const { sharedQuote } = useAppContext().state;

  const handleSOS = () => {
    const newAlert = {
      id: new Date().toISOString(),
      message: 'SOS button pressed by patient!',
      timestamp: new Date().toLocaleString(),
      type: 'SOS' as const,
    };
    dispatch({ type: 'TRIGGER_SOS', payload: newAlert });
    alert('Caregiver and Family have been notified!');
  };

  const menuItems = [
    { name: 'Navigate Home', icon: <NavigationIcon className="w-8 h-8"/>, screen: PatientScreen.NAVIGATION },
    { name: 'My Reminders', icon: <RemindersIcon className="w-8 h-8"/>, screen: PatientScreen.REMINDERS },
    { name: 'AI Companion', icon: <CompanionIcon className="w-8 h-8"/>, screen: PatientScreen.AI_COMPANION },
    { name: 'Voice Messages', icon: <VoicemailIcon className="w-8 h-8"/>, screen: PatientScreen.VOICE_MESSAGES },
  // Music Therapy feature removed — menu entry intentionally omitted
    { name: 'Memory Game', icon: <BrainIcon className="w-8 h-8"/>, screen: PatientScreen.COGNITIVE_GAMES },
    { name: 'Memory Album', icon: <ImageIcon className="w-8 h-8"/>, screen: PatientScreen.MEMORY_ALBUM },
  ];

  return (
    <div className="relative flex flex-col h-[95vh] bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-4 sm:p-6">
       {/* Decorative screws */}
       <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
       <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>
       
      <header className="flex items-center justify-start gap-4 text-left mb-6 border-b border-slate-700/50 pb-4">
        <button onClick={() => (window as any).openLoginModal?.()} className="px-3 py-1 bg-slate-800/80 rounded text-sm">Login</button>
        <div>
          <h1 className="text-3xl font-bold text-white">Memora</h1>
          <p className="text-md text-slate-400 mt-1">Hello! How can I help you today?</p>
        </div>
      </header>
      
      {sharedQuote && (
        <div className="mb-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 text-center">
            <p className="text-sm text-slate-400 font-semibold">A Thought From Your Family</p>
            <p className="text-lg text-white italic mt-1">"{sharedQuote.text}"</p>
        </div>
      )}

      <main className="flex-grow flex flex-col space-y-3 overflow-y-auto pr-2 pb-20">
        {menuItems.map((item) => (
          <MenuItem 
            key={item.name}
            name={item.name}
            icon={item.icon}
            onClick={() => setScreen(item.screen)}
          />
        ))}
      </main>

      <SOSSlider onActivate={handleSOS} />
    </div>
  );
};

export default PatientHome;