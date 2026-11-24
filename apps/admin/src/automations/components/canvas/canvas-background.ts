import type { EditorChrome } from '@/automations/components/types';

// Use the same SVG dot size, spacing, and color as the editor at 100% zoom.
export const canvasBackground = {
  color: 'var(--border-strong)',
  gap: 20,
  size: 1,
};

// SHAPING PROTOTYPE ONLY — never merge: the Floating concept tries a gray-100 canvas.
export const canvasColorClass = (chrome: EditorChrome) =>
  chrome === 'floating'
    ? '[--xy-background-color:var(--color-gray-100)] dark:[--xy-background-color:var(--preview-canvas)]'
    : '[--xy-background-color:var(--preview-canvas)]';
