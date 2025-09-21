import React from 'react';

interface UploadProgressProps {
  progress: number | null;
  message?: string | null;
  onCancel?: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ progress, message, onCancel }) => {
  if (progress === null && !message) return null;

  return (
    <div className="mt-2 w-full max-w-sm bg-slate-900/40 border border-slate-700/60 rounded-md p-2">
      {progress !== null && (
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {message && (
        <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
          <div>{message}</div>
          {onCancel && (
            <button onClick={onCancel} className="ml-3 px-2 py-1 bg-red-600 text-white rounded text-xs">Cancel</button>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
