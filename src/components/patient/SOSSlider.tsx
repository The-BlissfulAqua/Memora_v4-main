import React, { useState, useRef, MouseEvent, TouchEvent } from 'react';

interface SOSSliderProps {
  onActivate: () => void;
}

const SOSSlider: React.FC<SOSSliderProps> = ({ onActivate }) => {
  const [thumbPosition, setThumbPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const handleDragStart = (clientX: number) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    // Calculate the starting mouse position relative to the thumb itself
    const thumbRect = thumbRef.current?.getBoundingClientRect();
    startXRef.current = clientX - (thumbRect?.left || 0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || !sliderRef.current) return;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    // The new position is the current mouse position minus the slider's starting edge and the initial offset within the thumb
    const newX = clientX - sliderRect.left - startXRef.current;
    
    const endPosition = sliderRect.width - (thumbRef.current?.clientWidth || 0);
    const clampedX = Math.max(0, Math.min(newX, endPosition));
    setThumbPosition(clampedX);
  };

  const handleDragEnd = () => {
    if (!isDragging || !sliderRef.current || !thumbRef.current) return;
    setIsDragging(false);

    const sliderWidth = sliderRef.current.clientWidth;
    const thumbWidth = thumbRef.current.clientWidth;
    const activationThreshold = sliderWidth * 0.8;

    if (thumbPosition + thumbWidth > activationThreshold) {
      onActivate();
    }
    
    // Reset thumb position with transition
    setThumbPosition(0);
  };
  
  // Mouse Events
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => handleDragStart(e.clientX);
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
      // We listen on the parent, but only if dragging has started
      if (isDragging) {
        handleDragMove(e.clientX);
      }
  }
  const onMouseUp = () => {
      if (isDragging) {
          handleDragEnd();
      }
  }
  const onMouseLeave = () => {
      if (isDragging) {
          handleDragEnd();
      }
  }

  // Touch Events
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => handleDragStart(e.touches[0].clientX);
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
      if (isDragging) {
        handleDragMove(e.touches[0].clientX);
      }
  }
  const onTouchEnd = () => {
      if (isDragging) {
        handleDragEnd();
      }
  }

  return (
    <div 
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50"
        // Move listeners to the full-page container to catch mouse movements outside the slider
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onTouchMove={onTouchMove}
    >
      <div 
        ref={sliderRef}
        className="relative w-full h-16 bg-red-900/50 border border-red-700/80 rounded-full flex items-center p-2 shadow-2xl backdrop-blur-sm overflow-hidden"
      >
        <div 
          ref={thumbRef}
          className="absolute h-12 w-12 bg-red-600 rounded-full flex items-center justify-center cursor-pointer select-none shadow-lg z-10"
          style={{ transform: `translateX(${thumbPosition}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease' }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="flex-grow text-center text-red-200 font-bold text-lg animate-pulse pl-12 pointer-events-none">
          SLIDE FOR SOS
        </div>
      </div>
    </div>
  );
};

export default SOSSlider;