import type { JSX } from 'preact';

type IconProps = JSX.SVGAttributes<SVGSVGElement>;

export function LoadingIcon(props: IconProps) {
  return (
    <svg
      aria-busy="true"
      aria-live="polite"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        className="nc-icon-wrapper"
        fill="currentColor"
        stroke="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      >
        <g className="nc-loop-dots-4-24-icon-o">
          <circle cx="4" cy="12" r="3" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="20" cy="12" r="3" />
        </g>
        <style data-cap="butt">
          {`
            .nc-loop-dots-4-24-icon-o{--animation-duration:0.8s}
            .nc-loop-dots-4-24-icon-o *{opacity:.4;transform:scale(.75);animation:nc-loop-dots-4-anim var(--animation-duration) infinite}
            .nc-loop-dots-4-24-icon-o :nth-child(1){transform-origin:4px 12px;animation-delay:-.3s;animation-delay:calc(var(--animation-duration)/-2.666)}
            .nc-loop-dots-4-24-icon-o :nth-child(2){transform-origin:12px 12px;animation-delay:-.15s;animation-delay:calc(var(--animation-duration)/-5.333)}
            .nc-loop-dots-4-24-icon-o :nth-child(3){transform-origin:20px 12px}
            @keyframes nc-loop-dots-4-anim{0%,100%{opacity:.4;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
        `}
        </style>
      </g>
    </svg>
  );
}

export function EmailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <style>
          {
            '.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1px;}'
          }
        </style>
      </defs>
      <rect className="a" height="15" rx="1.5" ry="1.5" width="22.5" x="0.75" y="4.5" />
      <line className="a" x1="15.687" x2="19.5" y1="9.975" y2="13.5" />
      <line className="a" x1="8.313" x2="4.5" y1="9.975" y2="13.5" />
      <path className="a" d="M22.88,5.014l-9.513,6.56a2.406,2.406,0,0,1-2.734,0L1.12,5.014" />
    </svg>
  );
}
