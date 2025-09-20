import React, { useState, useEffect } from 'react';
import { useDeviceSensors } from '../../../hooks/useDeviceSensors';

interface CalibrationModalProps {
  onComplete: () => void;
}

const CalibrationModal: React.FC<CalibrationModalProps> = ({ onComplete }) => {
  const { heading } = useDeviceSensors();
  const [coveredSegments, setCoveredSegments] = useState<Set<number>>(new Set());
  const [showSkipButton, setShowSkipButton] = useState(false);
  const TOTAL_SEGMENTS = 12; // 360 / 30 degrees per segment

  useEffect(() => {
    // Show the skip button after a timeout to encourage calibration first.
    const skipTimer = setTimeout(() => {
        setShowSkipButton(true);
    }, 7000); // 7 seconds

    return () => clearTimeout(skipTimer);
  }, []);

  useEffect(() => {
    if (heading !== null) {
      const segment = Math.floor(heading / (360 / TOTAL_SEGMENTS));
      setCoveredSegments(prev => new Set(prev).add(segment));
    }
  }, [heading]);

  const progress = coveredSegments.size / TOTAL_SEGMENTS;
  const isComplete = progress >= 1;

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1500); // Wait a moment after completion
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  const radius = 80;
  const strokeWidth = 15;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center h-full text-white p-4 bg-black/50">
      <h2 className="text-3xl font-bold mb-4">Calibrate Sensors</h2>
      <p className="text-slate-300 max-w-xs mb-8">
        For accurate direction, please slowly rotate your device in a circle or figure-eight pattern.
      </p>

      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
          {/* Background Circle */}
          <circle
            stroke="#374151"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress Ring */}
          <circle
            stroke={isComplete ? '#10B981' : '#4F46E5'}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          {isComplete ? (
            <span className="text-4xl text-green-400">✓</span>
          ) : (
            <>
              <div className="text-4xl font-bold">
                {Math.round(progress * 100)}%
              </div>
              <div className="text-sm text-slate-400">Calibrating</div>
            </>
          )}
        </div>
      </div>
      
      {isComplete && (
        <p className="mt-8 text-xl font-semibold text-green-400 animate-pulse">
            Calibration Complete!
        </p>
      )}

      {!isComplete && showSkipButton && (
        <div className="mt-8 flex flex-col items-center">
            <button 
                onClick={onComplete}
                className="px-6 py-2 bg-slate-700 text-white font-semibold rounded-full shadow-lg hover:bg-slate-600 active:scale-95 transition-all"
            >
                Skip Calibration
            </button>
            <p className="text-xs text-slate-500 mt-2">(Direction may be less accurate)</p>
        </div>
      )}
    </div>
  );
};

export default CalibrationModal;