import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface MemoryAlbumViewProps {
    onBack: () => void;
}

const MemoryAlbumView: React.FC<MemoryAlbumViewProps> = ({ onBack }) => {
    const { state } = useAppContext();
    const { memories } = state;
    const defaultImageUrl = "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop";

    return (
        <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
            {/* Decorative screws */}
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

            <header className="flex items-center mb-6 border-b border-slate-700/50 pb-4">
                <button onClick={onBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
                    <span className='text-lg'>&larr;</span> Back
                </button>
                <h2 className="text-2xl font-bold text-white">Your Memory Album</h2>
            </header>
            
            {memories.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <h3 className="text-2xl font-bold text-slate-400">No memories yet.</h3>
                    <p className="text-slate-500">Your family can share photos with you here.</p>
                </div>
            ) : (
                <div className="space-y-6 overflow-y-auto pr-2 flex-grow">
                    {memories.map(memory => (
                        <div key={memory.id} className="bg-slate-800/50 rounded-xl overflow-hidden shadow-lg border border-slate-700/50">
                            <img 
                                src={memory.imageUrl} 
                                alt={memory.caption} 
                                className="w-full h-60 object-cover bg-slate-700"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null; // prevent looping
                                    target.src = defaultImageUrl;
                                }}
                            />
                            <div className="p-4">
                                <p className="text-lg text-gray-200 italic">"{memory.caption}"</p>
                                <p className="text-right text-sm text-slate-400 mt-2">- {memory.sharedBy}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MemoryAlbumView;