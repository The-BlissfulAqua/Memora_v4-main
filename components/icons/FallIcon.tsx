import React from 'react';

const FallIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M11 21h-1a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h1"/>
    <path d="M18 21h-2a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h2"/>
    <path d="m15 15-3-3-3 3"/>
    <path d="m12 12 4-4 4 4"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v2"/>
    <path d="M8 4H6a2 2 0 0 0-2 2v2"/>
  </svg>
);

export default FallIcon;