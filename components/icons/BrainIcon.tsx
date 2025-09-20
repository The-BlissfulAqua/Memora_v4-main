import React from 'react';

const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v1.23a.5.5 0 0 0 .7.43L15 6a2.5 2.5 0 0 1 3.5 3.5l-2.07 2.07a.5.5 0 0 0-.14.35v1.22a2.5 2.5 0 0 1-2.5 2.5h-1.63a.5.5 0 0 0-.43.7l.14.35a2.5 2.5 0 0 1-3.5 3.5l-2.07-2.07a.5.5 0 0 0-.35-.14h-1.22A2.5 2.5 0 0 1 2 15.5v-5A2.5 2.5 0 0 1 4.5 8H6a2.5 2.5 0 0 1 3.5-3.5L11.57 2.7a.5.5 0 0 0 .43-.7V2z"></path>
    <path d="M12 4.5a2.5 2.5 0 0 0-2.5-2.5"></path>
    <path d="M15 6a2.5 2.5 0 0 0-2.5-2.5"></path>
    <path d="M4.5 8A2.5 2.5 0 0 0 2 10.5"></path>
    <path d="M19.5 16a2.5 2.5 0 0 0 2.5-2.5"></path>
  </svg>
);

export default BrainIcon;
