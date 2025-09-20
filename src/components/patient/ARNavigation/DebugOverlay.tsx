import React from 'react';
import { Beacon } from '../../../types';
import BluetoothIcon from '../../icons/BluetoothIcon';

interface DebugOverlayProps {
  deviceHeading: number | null;
  destinationBearing: number;
  relativeBearing: number;
  steps: number;
  simulatedHeading: number;
  setSimulatedHeading: (h: number) => void;
  beacons: Beacon[];
  isScanning: boolean;
  startScan: () => void;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({
  deviceHeading,
  destinationBearing,
  relativeBearing,
  steps,
  simulatedHeading,
  setSimulatedHeading,
  beacons,
  isScanning,
  startScan
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70 backdrop-blur-sm text-white text-xs font-mono z-20 max-h-[45vh] flex flex-col">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>H_device:</span><span>{deviceHeading?.toFixed(2) ?? 'N/A'}°</span>
        <span>B_dest:</span><span>{destinationBearing.toFixed(2)}°</span>
        <span>Relative:</span><span>{relativeBearing.toFixed(2)}°</span>
        <span>Steps:</span><span>{steps.toFixed(0)}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-600">
        <label htmlFor="simHeading" className="block mb-1">Simulate Heading: {simulatedHeading}°</label>
        <input
            type="range"
            id="simHeading"
            min="0"
            max="360"
            step="1"
            value={simulatedHeading}
            onChange={(e) => setSimulatedHeading(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      <div className="mt-2 pt-2 border-t border-slate-600">
        <div className="flex justify-between items-center mb-1">
            <h3 className='font-bold'>Beacon Detection</h3>
            <button 
                onClick={startScan} 
                disabled={isScanning}
                className='flex items-center gap-1.5 px-2 py-1 bg-slate-600/70 rounded text-xs hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500'
            >
                <BluetoothIcon className="w-3 h-3"/>
                {isScanning ? 'Scanning...' : 'Start Scan'}
            </button>
        </div>
        <div className='space-y-1 overflow-y-auto pr-1'>
            {beacons.length > 0 ? beacons.map(b => (
                 <div key={b.id} className="grid grid-cols-[1fr,auto,auto] gap-x-3 text-right">
                    <span className='truncate text-left'>{b.name || b.id}</span>
                    <span>{b.rssi}dBm</span>
                    <span>~{b.distance.toFixed(2)}m</span>
                 </div>
            )) : (
                <p className="text-slate-500">{isScanning ? 'Listening for beacons...' : 'Scan not started.'}</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default DebugOverlay;
