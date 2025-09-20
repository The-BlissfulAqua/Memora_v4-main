import React from 'react';

const GlassWaterIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M15 2H9s-1 10 6 10" />
    <path d="M12 22V7" />
    <path d="M5 22h14" />
  </svg>
);

export default GlassWaterIcon;