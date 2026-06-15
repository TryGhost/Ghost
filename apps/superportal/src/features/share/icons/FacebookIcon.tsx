import type {ReactElement} from 'react';

interface Props {
    className?: string;
}

/**
 * Facebook brand icon (blue circle, white f). Verbatim from share-facebook.svg
 * with the Inkscape transform preserved.
 */
export function FacebookIcon({className}: Props): ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 666.66668 666.66717"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            <g transform="matrix(1.3333333,0,0,-1.3333333,-133.33333,799.99999)">
                <path
                    d="m 0,0 c 0,138.071 -111.929,250 -250,250 -138.071,0 -250,-111.929 -250,-250 0,-117.245 80.715,-215.622 189.606,-242.638 v 166.242 h -51.552 V 0 h 51.552 v 32.919 c 0,85.092 38.508,124.532 122.048,124.532 15.838,0 43.167,-3.105 54.347,-6.211 V 81.986 c -5.901,0.621 -16.149,0.932 -28.882,0.932 -40.993,0 -56.832,-15.528 -56.832,-55.9 V 0 h 81.659 l -14.028,-76.396 h -67.631 V -248.169 C -95.927,-233.218 0,-127.818 0,0"
                    transform="translate(600,350)"
                    fill="#0866ff"
                />
                <path
                    d="M 0,0 14.029,76.396 H -67.63 v 27.019 c 0,40.372 15.838,55.899 56.831,55.899 12.733,0 22.981,-0.31 28.882,-0.931 v 69.253 c -11.18,3.106 -38.509,6.212 -54.347,6.212 -83.539,0 -122.048,-39.441 -122.048,-124.533 V 76.396 h -51.552 V 0 h 51.552 v -166.242 c 19.343,-4.798 39.568,-7.362 60.394,-7.362 10.254,0 20.358,0.632 30.288,1.831 L -67.63,0 Z"
                    transform="translate(447.9175,273.6036)"
                    fill="#ffffff"
                />
            </g>
        </svg>
    );
}
