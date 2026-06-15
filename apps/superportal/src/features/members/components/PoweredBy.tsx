import {type ReactElement} from 'react';

/** Portal's "Powered by Ghost" badge — the label is untranslated upstream too. */
export function PoweredBy(): ReactElement {
    return (
        <a
            href="https://ghost.org"
            target="_blank"
            rel="noopener noreferrer"
            className="gh:inline-flex gh:items-center gh:gap-2 gh:text-[12.5px] gh:font-semibold gh:text-[#626d79] gh:no-underline gh:hover:text-[#15171a]"
        >
            <svg className="gh:h-4 gh:w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6c-5.302 0-9.6-4.298-9.6-9.6S6.698 2.4 12 2.4s9.6 4.298 9.6 9.6-4.298 9.6-9.6 9.6z" />
            </svg>
            Powered by Ghost
        </a>
    );
}
