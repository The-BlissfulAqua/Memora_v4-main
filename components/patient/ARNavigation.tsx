import React, { useState, useEffect, useRef } from 'react';

interface ARNavigationProps {
  onBack: () => void;
}

type NavState = 'SELECTION' | 'BLUEPRINT' | 'NAVIGATING';

const destinations = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room'];

// Simple house layout with coordinates for blueprint and target compass headings for AR
// Headings: 0=North, 90=East, 180=South, 270=West
const roomLayout: { [key: string]: { x: number; y: number; heading: number } } = {
    'Living Room': { x: 77.5, y: 85, heading: 350 }, // Almost North
    'Bedroom': { x: 222.5, y: 85, heading: 10 },    // Also almost North
    'Kitchen': { x: 77.5, y: 315, heading: 170 },   // South-ish
    'Bathroom': { x: 222.5, y: 315, heading: 190 }, // South-ish
};

// Start point is always the center of the living room for this simulation
const startPoint = roomLayout['Living Room'];

const ARNavigation: React.FC<ARNavigationProps> = ({ onBack }) => {
  const [navState, setNavState] = useState<NavState>('SELECTION');
  const [destination, setDestination] = useState<string | null>(null);

  // State for AR view
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // To hold the active camera stream
  const [heading, setHeading] = useState<number | null>(null);
  const [arError, setArError] = useState<string | null>(null);
  const [arStep, setArStep] = useState(0); // For simulating walking progress

  // Effect for setting up and tearing down AR features (camera and compass)
  useEffect(() => {
    if (navState !== 'NAVIGATING') {
      return;
    }

    let isMounted = true;
    let orientationCleanup: (() => void) | null = null;

    const startARListeners = async () => {
        setArError(null); // Clear previous errors

        // The stream should have been acquired by the button click. Assign it.
        if (isMounted && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        } else if (isMounted) {
            setArError("Camera is not available.");
            return;
        }

        // Request compass permissions and add listener
        try {
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission !== 'granted') {
                    throw new Error("Compass permission denied.");
                }
            }
        } catch (e) {
            console.warn("Could not request orientation permission. This may fail on iOS.", e);
            if (isMounted) setArError("Compass permission denied.");
        }

        const handleOrientation = (event: DeviceOrientationEvent) => {
            if (event.alpha !== null && isMounted) {
                setHeading(event.alpha);
            }
        };

        window.addEventListener('deviceorientation', handleOrientation);
        orientationCleanup = () => window.removeEventListener('deviceorientation', handleOrientation);
    };

    startARListeners();

    // Cleanup function for the effect
    return () => {
        isMounted = false;
        // Clean up compass listener
        if (orientationCleanup) {
            orientationCleanup();
        }
        // Stop camera stream tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        // Detach from video element
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };
  }, [navState]);
  
  const handleStartARClick = async () => {
    setArError(null); // Clear previous errors before trying again
    try {
        // Request camera directly on click to ensure it's a user gesture
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream; // Store the stream in the ref
        setArStep(0);
        setNavState('NAVIGATING'); // Now switch the view
    } catch (err) {
        console.error("Error accessing camera:", err);
        let message = "Could not access camera. Please check permissions in your browser settings.";
        if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                message = "Camera access was denied. Please allow it and try again.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                message = "No back-facing camera found on this device.";
            }
        }
        setArError(message);
    }
  };

  const handleBack = () => {
    setArStep(0);
    setHeading(null);
    if (navState === 'NAVIGATING') {
        setNavState('BLUEPRINT');
    } else if (navState === 'BLUEPRINT') {
        setNavState('SELECTION');
        setDestination(null);
        setArError(null); // Clear any errors when going back to selection
    } else {
        onBack();
    }
  }

  if (navState === 'SELECTION') {
    return (
      <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
       <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
       <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

        <header className="flex items-center mb-6 border-b border-slate-700/50 pb-4">
            <button onClick={onBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
                <span className='text-lg'>&larr;</span> Back
            </button>
            <h2 className="text-2xl font-bold text-white">Where to?</h2>
        </header>
        <div className="flex-grow flex flex-col space-y-3">
          {destinations.map(d => (
            <button
              key={d}
              onClick={() => { setDestination(d); setNavState('BLUEPRINT'); }}
              className="flex items-center w-full p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/90 transition-colors duration-200 border border-transparent hover:border-slate-700"
            >
                <span className="text-xl font-semibold text-gray-200">{d}</span>
                <span className="ml-auto text-gray-500">&rarr;</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (navState === 'BLUEPRINT') {
    const endPoint = destination ? roomLayout[destination] : startPoint;

    const angleRad = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
    const angleDeg = -90 - (angleRad * 180 / Math.PI);

    // Snap the angle to the nearest 90 degrees to avoid awkward diagonal layouts.
    const snappedAngleDeg = Math.round(angleDeg / 90) * 90;

    // Calculate scaling factor to fit the rotated map inside the viewbox
    const MAP_WIDTH = 300;
    const MAP_HEIGHT = 400;
    // We use the snapped angle to find the new bounding box size
    const rotationRad = (snappedAngleDeg * Math.PI) / 180;

    const newBoundingBoxWidth = MAP_WIDTH * Math.abs(Math.cos(rotationRad)) + MAP_HEIGHT * Math.abs(Math.sin(rotationRad));
    const newBoundingBoxHeight = MAP_WIDTH * Math.abs(Math.sin(rotationRad)) + MAP_HEIGHT * Math.abs(Math.cos(rotationRad));

    const scale = Math.min(MAP_WIDTH / newBoundingBoxWidth, MAP_HEIGHT / newBoundingBoxHeight);
    
    // Apply a 95% scale to leave a small margin around the edges
    const finalScale = scale * 0.95;
    
    // The SVG transform string. Rotates around the center of the map (150, 200)
    // and scales relative to that same center point to keep it centered.
    const svgTransform = `translate(150 200) rotate(${-snappedAngleDeg}) scale(${finalScale}) translate(-150 -200)`;

    // Angle for the arrowhead at the end of the path
    const endAngleDeg = angleRad * 180 / Math.PI;

    return (
      <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
        <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>
        
        <header className="flex items-center mb-6 border-b border-slate-700/50 pb-4">
            <button onClick={handleBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
                <span className='text-lg'>&larr;</span> Back
            </button>
            <h2 className="text-2xl font-bold text-white">Map to {destination}</h2>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 300 400" className="max-w-full max-h-[60vh]">
                    <g transform={svgTransform} style={{ transition: 'transform 0.7s ease-in-out' }}>
                        <rect width="300" height="400" fill="#1E293B" />
                        
                        {Object.entries(roomLayout).map(([name, {x, y}]) => {
                            const width = name === 'Living Room' || name === 'Bedroom' ? 135 : 135;
                            const height = 150;
                            const rectX = x - width/2;
                            const rectY = y - height/2;
                            const isDest = name === destination;

                            return (
                                <g key={name}>
                                    <rect x={rectX} y={rectY} width={width} height={height} fill={isDest ? "rgba(59, 130, 246, 0.2)" : "none"} stroke={isDest ? "#3B82F6" : "#475569"} strokeWidth="2" />
                                    {/* Counter-rotate the text so it remains readable */}
                                    <text x={x} y={y} textAnchor="middle" fill="#94A3B8" fontSize="16" transform={`rotate(${snappedAngleDeg} ${x} ${y})`}>{name}</text>
                                </g>
                            )
                        })}
                        
                        <path d={`M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`} fill="none" stroke="#34D399" strokeWidth="4" strokeDasharray="8 4" >
                            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />
                        </path>

                        {/* Add an arrowhead at the end of the path */}
                        <polygon
                            points="-12,-6 0,0 -12,6"
                            fill="#34D399"
                            transform={`translate(${endPoint.x}, ${endPoint.y}) rotate(${endAngleDeg})`}
                        />
                        
                        <circle cx={startPoint.x} cy={startPoint.y} r="8" fill="#10B981" />
                        {/* Counter-rotate the "You" text */}
                        <text x={startPoint.x} y={startPoint.y} textAnchor="middle" dy="4" fill="white" fontSize="12" fontWeight="bold" transform={`rotate(${snappedAngleDeg} ${startPoint.x} ${startPoint.y})`}>You</text>
                    </g>
                </svg>
            </div>
        </main>
        
        {arError && (
            <div className="my-2 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-sm text-center">
                {arError}
            </div>
        )}

        <footer className='mt-4'>
            <button onClick={handleStartARClick} className="w-full py-4 bg-slate-700 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-slate-600 transition-colors">
                Start AR Navigation
            </button>
        </footer>
      </div>
    );
  }

  const targetHeading = destination ? roomLayout[destination].heading : 0;
  let instructionText = "Initializing...";
  let arrowRotation = 0;
  let showWalkButton = false;
  let isArrived = arStep >= 2;

  if(arError) {
      instructionText = arError;
  } else if (heading === null) {
      instructionText = "Waiting for compass...";
  } else {
      let angleDiff = targetHeading - heading;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff <= -180) angleDiff += 360;
      
      const ARRIVAL_THRESHOLD = 25; // degrees

      if (isArrived) {
          instructionText = "You have arrived!";
      } else if (Math.abs(angleDiff) <= ARRIVAL_THRESHOLD) {
          instructionText = `Go straight ahead`;
          arrowRotation = 0;
          showWalkButton = true;
      } else if (angleDiff > 0) {
          instructionText = "Turn right";
          arrowRotation = 90;
      } else {
          instructionText = "Turn left";
          arrowRotation = -90;
      }
  }

  return (
    <div className="relative w-full h-[95vh] bg-gray-900 overflow-hidden rounded-3xl shadow-2xl flex flex-col justify-between border border-slate-700/50">
      <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/30"></div>
      
      <header className="relative p-4 flex justify-between items-center bg-black/50 backdrop-blur-sm">
        <button onClick={handleBack} className="text-white text-sm p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1">
            <span className='text-lg'>&larr;</span> Back
        </button>
        <h2 className="text-white text-lg font-bold">To {destination}</h2>
        <div/>
      </header>

      <main className="relative flex-grow flex flex-col items-center justify-center text-white p-4">
        {!isArrived && (
            <div className="transition-transform duration-500 ease-in-out" style={{transform: `rotate(${arrowRotation}deg)`}}>
                <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                    <path d="M12 2L12 22M12 2L5 9M12 2L19 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
        )}
        <p className="mt-4 text-4xl font-bold text-center p-4 bg-black/70 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700">
          {instructionText}
        </p>
      </main>

       <footer className="relative p-4">
           {isArrived ? (
               <button 
                 onClick={() => { setNavState('SELECTION'); setDestination(null); }}
                 className="w-full py-4 bg-green-800/80 border border-green-600 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-green-700 transition-colors"
               >
                 Done
               </button>
           ) : (
                showWalkButton && (
                    <button
                        onClick={() => setArStep(prev => prev + 1)}
                        className="w-full py-4 bg-blue-800/80 border border-blue-600 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors animate-pulse"
                    >
                        I am walking forward
                    </button>
                )
           )}
       </footer>
    </div>
  );
};

export default ARNavigation;