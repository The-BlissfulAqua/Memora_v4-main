import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import localNotifications from '../../services/localNotifications';
import { Reminder } from '../../types';
import PillIcon from '../icons/PillIcon';
import ForkKnifeIcon from '../icons/ForkKnifeIcon';
import GlassWaterIcon from '../icons/GlassWaterIcon';


const ReminderForm: React.FC = () => {
    const { dispatch } = useAppContext();
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('');
    const [icon, setIcon] = useState<'medication' | 'meal' | 'hydration'>('medication');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!title || !time) {
            alert('Please fill out all fields.');
            return;
        }

        const newReminder: Reminder = {
            id: new Date().toISOString(),
            title,
            time,
            completed: false,
            icon,
            notified: false,
        };

        dispatch({ type: 'ADD_REMINDER', payload: newReminder });
        // No creation-time scheduling: rely on in-app timers to fire notification/audio at the scheduled time
        setTitle('');
        setTime('');
        setIcon('medication');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <input
                    type="text"
                    placeholder="Reminder Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                    <button type="button" onClick={() => setIcon('medication')} className={`p-2 rounded-lg transition-colors ${icon === 'medication' ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}><PillIcon className="w-6 h-6"/></button>
                    <button type="button" onClick={() => setIcon('meal')} className={`p-2 rounded-lg transition-colors ${icon === 'meal' ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}><ForkKnifeIcon className="w-6 h-6"/></button>
                    <button type="button" onClick={() => setIcon('hydration')} className={`p-2 rounded-lg transition-colors ${icon === 'hydration' ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}><GlassWaterIcon className="w-6 h-6"/></button>
                </div>
                <button type="submit" className="px-6 py-2 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500">
                    Add
                </button>
            </div>
        </form>
    );
}

export default ReminderForm;