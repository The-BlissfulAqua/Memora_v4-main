import React from 'react';

const CaregiverIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M12 22s-8-4.5-8-11.5A8 8 0 0 1 12 2a8 8 0 0 1 8 8.5c0 7-8 11.5-8 11.5z" />
    <path d="M9 12H15" />
    <path d="M12 9V15" />
  </svg>
);

export default CaregiverIcon;
