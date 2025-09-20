import React from 'react';

const PillIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <rect x="3" y="8" width="18" height="8" rx="4" ry="4" />
    <line x1="7" y1="9" x2="17" y2="17" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default PillIcon;