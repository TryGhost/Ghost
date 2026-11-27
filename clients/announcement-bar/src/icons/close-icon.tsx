import type { JSX } from 'preact';

type IconProps = JSX.SVGAttributes<SVGSVGElement>;

export function CloseIcon(props: IconProps) {
  return (
    <svg height={16} viewBox="0 0 24 24" width={16} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M.44,21.44a1.49,1.49,0,0,0,0,2.12,1.5,1.5,0,0,0,2.12,0l9.26-9.26a.25.25,0,0,1,.36,0l9.26,9.26a1.5,1.5,0,0,0,2.12,0,1.49,1.49,0,0,0,0-2.12L14.3,12.18a.25.25,0,0,1,0-.36l9.26-9.26A1.5,1.5,0,0,0,21.44.44L12.18,9.7a.25.25,0,0,1-.36,0L2.56.44A1.5,1.5,0,0,0,.44,2.56L9.7,11.82a.25.25,0,0,1,0,.36Z"
        fill="currentColor"
        stroke="#000000"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={0.4}
      />
    </svg>
  );
}
