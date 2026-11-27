import React from 'react';
import { cn } from '@tryghost/shade/utils';

export const InProgressGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    className={cn('size-4 shrink-0', className)}
    fill="none"
    focusable="false"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="8"
      cy="8"
      r="6.75"
      stroke="currentColor"
      strokeDasharray="1.12 3.38"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M8 14.75C11.7279 14.75 14.75 11.7279 14.75 8C14.75 4.27208 11.7279 1.25 8 1.25"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

export const CompletedGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    className={cn('size-4 shrink-0', className)}
    fill="none"
    focusable="false"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.7624 1.83512C9.91921 1.45663 8.98428 1.24609 8.00018 1.24609C4.27115 1.24609 1.24817 4.26907 1.24817 7.9981C1.24817 11.7271 4.27115 14.7501 8.00018 14.7501C11.6505 14.7501 14.6243 11.8534 14.7482 8.23327"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M13.6269 4.0625L8.11272 9.57619L5.74951 7.15241"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

export const ExitedGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    className={cn('size-4 shrink-0', className)}
    fill="none"
    focusable="false"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 14.75C4.27208 14.75 1.25 11.7279 1.25 8C1.25 4.27208 4.27208 1.25 8 1.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M7.4375 8H14.75M11.375 11.375L14.75 8L11.375 4.625"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);
