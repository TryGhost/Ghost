/**
 * Shared modal back button — top-(inline-)start corner chevron. The inset uses
 * the logical `-start-2` and the icon flips (`rtl:-scale-x-100`) so it points
 * the correct way in RTL.
 */

import {type ReactElement} from 'react';
import {cn} from '../../cn';
import {BackIcon} from '../../icons/BackIcon';
import type {Translator} from '../../../types';

interface Props {
    onClick(): void;
    t: Translator;
    disabled?: boolean;
    className?: string;
}

const BACK_BTN = 'gh:absolute gh:-top-2 gh:-start-2 gh:flex gh:items-center gh:justify-center gh:w-8 gh:h-8 gh:p-0 gh:border-0 gh:bg-transparent gh:cursor-pointer gh:text-[#888] gh:hover:text-[#15171a] gh:rounded-full';

export function BackButton({onClick, t, disabled, className}: Props): ReactElement {
    return (
        <button type="button" aria-label={t('Back')} onClick={onClick} disabled={disabled} className={cn(BACK_BTN, className)}>
            <BackIcon className="gh:w-4 gh:h-4 gh:rtl:-scale-x-100" />
        </button>
    );
}
