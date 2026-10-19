import type { JSX } from 'preact';

type IconProps = JSX.SVGAttributes<SVGSVGElement>;

export function SearchIcon(props: IconProps) {
  return (
    <svg height={16} viewBox="0 0 24 24" width={16} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M23.38,21.62l-6.53-6.53a9.15,9.15,0,0,0,1.9-5.59,9.27,9.27,0,1,0-3.66,7.36l6.53,6.53a1.26,1.26,0,0,0,1.76,0A1.25,1.25,0,0,0,23.38,21.62ZM2.75,9.5A6.75,6.75,0,1,1,9.5,16.25,6.76,6.76,0,0,1,2.75,9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ClearIcon(props: IconProps) {
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

export function CircleAnimatedIcon(props: IconProps) {
  return (
    <svg height={16} viewBox="0 0 16 16" width={16} xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>circle anim</title>
      <g className="nc-icon-wrapper" fill="#40413F">
        <g className="nc-loop-circle-16-icon-f">
          <path
            d="M8 16a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zM8 2a6 6 0 1 0 6 6 6.006 6.006 0 0 0-6-6z"
            fill="#D4D4D4"
          />
          <path d="M8 0v2a6.006 6.006 0 0 1 6 6h2a8.009 8.009 0 0 0-8-8z" data-color="color-2" />
        </g>
        <style>
          {
            '.nc-loop-circle-16-icon-f{--animation-duration:0.5s;transform-origin:8px 8px;animation:nc-loop-circle-anim var(--animation-duration) infinite linear}@keyframes nc-loop-circle-anim{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}'
          }
        </style>
      </g>
    </svg>
  );
}
