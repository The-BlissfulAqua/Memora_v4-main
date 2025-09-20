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
    <path d="M6 3h12l-1 12a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4L6 3z" />
    <path d="M8 8h8" />
  </svg>
);

export default GlassWaterIcon;