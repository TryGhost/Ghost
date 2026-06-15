/**
 * Shared modal close button — top-(inline-)end corner X. The inset uses the
 * logical `-end-2` so it sits top-right in LTR and top-left in RTL.
 */

import {type ReactElement} from 'react';
import {cn} from '../../cn';
import {CloseIcon} from '../../icons/CloseIcon';
import type {Translator} from '../../../types';

interface Props {
    onClick(): void;
    t: Translator;
    className?: string;
}

const CLOSE_BTN = 'gh:absolute gh:-top-2 gh:-end-2 gh:flex gh:items-center gh:justify-center gh:w-8 gh:h-8 gh:p-0 gh:border-0 gh:bg-transparent gh:cursor-pointer gh:text-[#888] gh:hover:text-[#15171a] gh:rounded-full';

export function CloseButton({onClick, t, className}: Props): ReactElement {
    return (
        <button type="button" aria-label={t('Close')} onClick={onClick} className={cn(CLOSE_BTN, className)}>
            <CloseIcon className="gh:w-4 gh:h-4" />
        </button>
    );
}
