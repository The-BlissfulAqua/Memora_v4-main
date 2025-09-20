import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { PatientScreen } from '../../types';
import NavigationIcon from '../icons/NavigationIcon';
import RemindersIcon from '../icons/RemindersIcon';
import CompanionIcon from '../icons/CompanionIcon';
import BrainIcon from '../icons/BrainIcon';
import ImageIcon from '../icons/ImageIcon';
import VoicemailIcon from '../icons/VoicemailIcon';

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
  const { state, dispatch } = useAppContext();
  const { sharedQuote } = state;

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
    { name: 'Memory Game', icon: <BrainIcon className="w-8 h-8"/>, screen: PatientScreen.COGNITIVE_GAMES },
    { name: 'Memory Album', icon: <ImageIcon className="w-8 h-8"/>, screen: PatientScreen.MEMORY_ALBUM },
  ];

  return (
    <div className="relative flex flex-col h-[95vh] bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-4 sm:p-6">
       {/* Decorative screws */}
       <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
       <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>
       
      <header className="text-left mb-6 border-b border-slate-700/50 pb-4">
        <h1 className="text-3xl font-bold text-white">Memora</h1>
        <p className="text-md text-slate-400 mt-1">Hello! How can I help you today?</p>
      </header>
      
      {sharedQuote && (
        <div className="mb-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 text-center">
            <p className="text-sm text-slate-400 font-semibold">A Thought From Your Family</p>
            <p className="text-lg text-white italic mt-1">"{sharedQuote.text}"</p>
        </div>
      )}

      <main className="flex-grow flex flex-col space-y-3">
        {menuItems.map((item) => (
          <MenuItem 
            key={item.name}
            name={item.name}
            icon={item.icon}
            onClick={() => setScreen(item.screen)}
          />
        ))}
      </main>

      <footer className="mt-6">
        <button
          onClick={handleSOS}
          className="w-full py-4 bg-red-800/50 border border-red-600/80 text-red-200 text-2xl font-bold rounded-lg shadow-lg flex items-center justify-center gap-4 hover:bg-red-800/80 hover:text-white transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          EMERGENCY SOS
        </button>
      </footer>
    </div>
  );
};

export default PatientHome;