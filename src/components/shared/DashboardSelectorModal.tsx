import React from 'react';
import { ViewMode } from '../../types';
import { useAppContext } from '../../context/AppContext';

const DashboardSelectorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { dispatch } = useAppContext();

  const choose = (v: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: v });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Choose Dashboard</h2>
        <p className="text-sm text-slate-400 mb-4">Select which dashboard you'd like this device to open for the demo.</p>
        <div className="space-y-3">
          <button onClick={() => choose(ViewMode.PATIENT)} className="w-full px-4 py-3 bg-slate-700 text-white rounded">Patient</button>
          <button onClick={() => choose(ViewMode.CAREGIVER)} className="w-full px-4 py-3 bg-orange-600 text-white rounded">Caregiver</button>
          <button onClick={() => choose(ViewMode.FAMILY)} className="w-full px-4 py-3 bg-blue-600 text-white rounded">Family</button>
        </div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="text-sm text-slate-400">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSelectorModal;
