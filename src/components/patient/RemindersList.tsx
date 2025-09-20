import React from 'react';
import { useAppContext } from '../../context/AppContext';
import PillIcon from '../icons/PillIcon';
import ForkKnifeIcon from '../icons/ForkKnifeIcon';
import GlassWaterIcon from '../icons/GlassWaterIcon';
import MusicIcon from '../icons/MusicIcon';

interface RemindersListProps {
    onBack: () => void;
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

const RemindersList: React.FC<RemindersListProps> = ({ onBack }) => {
  const { state, dispatch } = useAppContext();
  const { reminders } = state;

  const handleComplete = (id: string) => {
    dispatch({ type: 'COMPLETE_REMINDER', payload: id });
  };

  const pendingReminders = reminders.filter(r => !r.completed);

  return (
    <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
       {/* Decorative screws */}
       <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
       <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

      <header className="flex items-center mb-6 border-b border-slate-700/50 pb-4">
        <button onClick={onBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
            <span className='text-lg'>&larr;</span> Back
        </button>
        <h2 className="text-2xl font-bold text-white">Today's Reminders</h2>
      </header>
      
      {pendingReminders.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-green-400">All Done for Today!</h3>
            <p className="text-slate-400">Great job!</p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto pr-2">
            {pendingReminders.map((reminder) => (
            <li key={reminder.id} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between transition-colors duration-200">
                <div className="flex items-center">
                    <div className="bg-slate-700/80 text-slate-300 p-3 rounded-lg mr-4 shadow-md">
                        <ReminderIcon icon={reminder.icon} className="w-6 h-6"/>
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-gray-200">{reminder.title}</p>
                        <p className="text-md text-slate-400">{reminder.time}</p>
                    </div>
                </div>
                <button
                    onClick={() => handleComplete(reminder.id)}
                    className="px-5 py-2 bg-green-600/80 text-white font-bold text-sm rounded-full shadow-md hover:bg-green-600 active:scale-95 transition-all"
                >
                    Done
                </button>
            </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default RemindersList;