import type { JSX } from 'preact';

type IconProps = JSX.SVGAttributes<SVGSVGElement>;

export function AvatarIcon(props: IconProps) {
  return (
    <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M11.55 4C13.483 4 15.05 5.567 15.05 7.5C15.05 9.433 13.483 11 11.55 11C9.617 11 8.05 9.433 8.05 7.5C8.05 5.567 9.617 4 11.55 4ZM11.55 20C9.044 20 6.757 19.067 5 17.538C5.997 14.888 8.551 13 11.55 13C14.549 13 17.103 14.888 18.1 17.538C16.343 19.066 14.056 20 11.55 20Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"
        fill="none"
        fill-rule="evenodd"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg
      className="gh-portal-closeicon"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <style>
          {
            '.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px !important;}'
          }
        </style>
      </defs>
      <path className="a" d="M.75 23.249l22.5-22.5M23.25 23.249L.75.749" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g
        className="nc-icon-wrapper"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      >
        <polygon points="7 21 2 22 3 17 18 2 22 6 7 21" />
      </g>
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg
      fill="black"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 12C3.82843 12 4.5 11.3284 4.5 10.5C4.5 9.67157 3.82843 9 3 9C2.17157 9 1.5 9.67157 1.5 10.5C1.5 11.3284 2.17157 12 3 12Z" />
      <path d="M8 12C8.82843 12 9.5 11.3284 9.5 10.5C9.5 9.67157 8.82843 9 8 9C7.17157 9 6.5 9.67157 6.5 10.5C6.5 11.3284 7.17157 12 8 12Z" />
      <path d="M13 12C13.8284 12 14.5 11.3284 14.5 10.5C14.5 9.67157 13.8284 9 13 9C12.1716 9 11.5 9.67157 11.5 10.5C11.5 11.3284 12.1716 12 13 12Z" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}

export function PinOffIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 17v5" />
      <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />
      <path d="m2 2 20 20" />
      <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />
    </svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="16"
      stroke="black"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.333 7.206 6.539 2v3.254c3.645 0 8.461 1.432 8.461 7.81-1.757-2.994-3.58-3.905-8.46-3.905v3.254L1.332 7.206Z"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.3"
      />
    </svg>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <svg
      height="40px"
      viewBox="0 0 50 50"
      width="40px"
      x="0px"
      xmlns="http://www.w3.org/2000/svg"
      y="0px"
      {...props}
    >
      <path d="M43.935,25.145c0-10.318-8.364-18.683-18.683-18.683c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615c8.072,0,14.615,6.543,14.615,14.615H43.935z">
        <animateTransform
          attributeName="transform"
          attributeType="xml"
          dur="0.6s"
          from="0 25 25"
          repeatCount="indefinite"
          to="360 25 25"
          type="rotate"
        />
      </path>
    </svg>
  );
}

export function SuccessIcon(props: IconProps) {
  return (
    <svg
      height="26px"
      viewBox="-1 -1 26 26"
      width="26px"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="none" fill-rule="evenodd" stroke="none" stroke-width="1">
        <path
          className="animated-check-circle"
          d="M19.6004116,2.71490714 C17.5353801,1.0196018 14.8927356,0 12,0 C5.38938053,0 0,5.38938053 0,12 C0,18.6106195 5.38938053,24 12,24 C18.6106195,24 24,18.6106195 24,12 C24,9.71681416 23.3628319,7.59292035 22.2743363,5.78761062 L11.0442478,17.0442478 L5.49557522,11.4955752"
          stroke="#FFFFFF"
          stroke-width="2"
        />
      </g>
    </svg>
  );
}

export function ThumbsDownIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
      <path d="M17 14V2" />
    </svg>
  );
}

export function ThumbsUpIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
      <path d="M7 10v12" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
