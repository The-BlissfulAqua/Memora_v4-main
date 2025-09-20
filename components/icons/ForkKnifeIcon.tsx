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
    <path d="M5 21V3h4v18H5zM15 21V3h4v18h-4z" />
    <path d="M11 21V11c0-4.97 4.03-9 9-9v18h-4V11c0-2.76-2.24-5-5-5s-5 2.24-5 5v10h4z" />
    <path d="M15 3h4" />
    <path d="M5 3h4" />
  </svg>
);

export default ForkKnifeIcon;