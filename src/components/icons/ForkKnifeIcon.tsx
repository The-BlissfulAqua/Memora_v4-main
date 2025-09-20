import React from 'react';

const ForkKnifeIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M7 2v10" />
    <path d="M11 2v10" />
    <path d="M5 20h14" />
  </svg>
);

export default ForkKnifeIcon;