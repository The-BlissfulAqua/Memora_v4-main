import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const RemoteImage: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt, className }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [showUrl, setShowUrl] = useState(false);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    React.useEffect(() => {
        // cleanup blobUrl when src changes or on unmount
        return () => {
            if (blobUrl) {
                try { URL.revokeObjectURL(blobUrl); } catch (e) { /* ignore */ }
            }
        };
    }, [blobUrl, src]);

    if (!src) return <div className={`${className} flex items-center justify-center bg-slate-700 text-slate-400`}>No image</div>;

    const effectiveSrc = blobUrl || src;
    const key = `${effectiveSrc}-${attempt}`;

    const tryFetchBlob = async (url: string) => {
        console.debug('[RemoteImage] trying fetch blob fallback for', url);
        try {
            const headers: any = { 'ngrok-skip-browser-warning': '1' };
            const resp = await fetch(url, { headers });
            if (!resp.ok) throw new Error('fetch status ' + resp.status);
            const b = await resp.blob();
            // Diagnostic: log blob details and check magic bytes
            try {
                console.debug('[RemoteImage] fetched blob', { size: b.size, type: b.type });
                const slice = await b.slice(0, 16).arrayBuffer();
                const bytes = new Uint8Array(slice);
                const hex = Array.from(bytes).map(x => x.toString(16).padStart(2, '0')).join(' ');
                console.debug('[RemoteImage] blob head bytes', hex);
                // Basic signature checks
                const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
                const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length-2] === 0xff;
                if (!isPng && !isJpg) {
                    console.warn('[RemoteImage] fetched blob does not look like PNG/JPEG — it may be an HTML error page or different content type');
                }
            } catch (diagErr) { console.debug('[RemoteImage] blob diagnostics failed', diagErr); }
            const o = URL.createObjectURL(b);
            setBlobUrl(o);
            setError(null);
            setLoading(false);
            console.debug('[RemoteImage] fetch blob fallback succeeded', url);
            return true;
        } catch (err) {
            console.warn('[RemoteImage] fetch blob fallback failed', url, err);
            return false;
        }
    };

    return (
        <div className={`${className} relative`}> 
            {loading && !error && (<div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-400">Loading...</div>)}
            {error && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-700 text-slate-400 p-2">
                    <div className="text-sm mb-2">Image failed to load</div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-slate-600 rounded" onClick={async () => { setError(null); setLoading(true); setAttempt(a => a + 1); console.debug('[RemoteImage] retry', src); const ok = await tryFetchBlob(src); if (!ok) setError('failed'); }}>Retry</button>
                        <button className="px-3 py-1 bg-slate-600 rounded" onClick={() => setShowUrl(s => !s)}>{showUrl ? 'Hide URL' : 'Show URL'}</button>
                    </div>
                    {showUrl && <div className="mt-2 text-xs break-all">{src}</div>}
                </div>
            )}
            {!error && (
                <img
                    key={key}
                    src={effectiveSrc}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onLoad={() => { console.debug('[RemoteImage] loaded', effectiveSrc); setLoading(false); setError(null); }}
                    onError={async (e) => {
                        console.error('[RemoteImage] load error', effectiveSrc, e);
                        setLoading(false);
                        // if we haven't tried fetching as blob yet, try that as a fallback
                        if (!blobUrl) {
                            const ok = await tryFetchBlob(src);
                            if (!ok) setError('failed');
                        } else {
                            setError('failed');
                        }
                    }}
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