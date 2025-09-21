import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const RemoteImage: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt, className }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [showUrl, setShowUrl] = useState(false);

    if (!src) return <div className={`${className} flex items-center justify-center bg-slate-700 text-slate-400`}>No image</div>;

    const key = `${src}-${attempt}`;
    return (
        <div className={`${className} relative`}> 
            {loading && !error && (<div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-400">Loading...</div>)}
            {error && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-700 text-slate-400 p-2">
                    <div className="text-sm mb-2">Image failed to load</div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-slate-600 rounded" onClick={() => { setError(null); setLoading(true); setAttempt(a => a + 1); console.debug('[RemoteImage] retry', src); }}>Retry</button>
                        <button className="px-3 py-1 bg-slate-600 rounded" onClick={() => setShowUrl(s => !s)}>{showUrl ? 'Hide URL' : 'Show URL'}</button>
                    </div>
                    {showUrl && <div className="mt-2 text-xs break-all">{src}</div>}
                </div>
            )}
            {!error && (
                <img
                    key={key}
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onLoad={() => { console.debug('[RemoteImage] loaded', src); setLoading(false); setError(null); }}
                    onError={(e) => { console.error('[RemoteImage] load error', src, e); setError('failed'); setLoading(false); }}
                />
            )}
            {!error && (
                <button className="absolute top-2 right-2 text-xs px-2 py-1 bg-black/40 rounded" onClick={() => setShowUrl(s => !s)}>{showUrl ? 'Hide URL' : 'URL'}</button>
            )}
            {showUrl && !error && (<div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded break-all">{src}</div>)}
        </div>
    );
};

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
                    {memories.map(memory => {
                        console.debug('[MemoryAlbumView] rendering memory', { id: memory.id, imageUrl: memory.imageUrl });
                        return (
                        <div key={memory.id} className="bg-slate-800/50 rounded-xl overflow-hidden shadow-lg border border-slate-700/50">
                            <RemoteImage src={memory.imageUrl} alt={memory.caption} className="w-full h-60" />
                            <div className="p-4">
                                <p className="text-lg text-gray-200 italic">"{memory.caption}"</p>
                                <p className="text-right text-sm text-slate-400 mt-2">- {memory.sharedBy}</p>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MemoryAlbumView;