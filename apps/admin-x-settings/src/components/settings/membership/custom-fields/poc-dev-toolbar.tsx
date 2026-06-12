import * as customFields from '../../../../../../../poc/custom-fields/repo';
import React, {useEffect, useRef, useState} from 'react';

// POC-only dev toolbar: a small fixed "Custom Fields" pill (bottom-right) that
// opens a menu to seed/empty the throwaway repo while testing, instead of the
// devtools console. No reload — the repo's write() notifies subscribers, so the
// open admin views (and the site tab, via the storage event) refresh live.
// Custom (not the design-system Popover) so the menu matches the black pill.
// Deletes with the rest of poc/custom-fields/.
const itemClass = 'block w-full whitespace-nowrap px-4 py-1.5 text-left text-sm font-medium text-white hover:bg-grey-900';

const PocDevToolbar: React.FC = () => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const act = (action: () => Promise<unknown>) => () => {
        action();
        setOpen(false);
    };

    return (
        <div ref={ref} className='fixed right-4 bottom-4 z-[9999]'>
            {open && (
                <div className='absolute right-0 bottom-full mb-2 overflow-hidden rounded-xl bg-black py-1 shadow-lg'>
                    <button className={itemClass} type='button' onClick={act(customFields.resetToSeed)}>Seed</button>
                    <button className={itemClass} type='button' onClick={act(customFields.clearAll)}>Empty</button>
                </div>
            )}
            <button className='flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg hover:opacity-90' type='button' onClick={() => setOpen(o => !o)}>
                Custom Fields
                <svg className='transition-transform duration-150' fill='none' height='6' style={{transform: open ? 'rotate(180deg)' : 'rotate(0deg)'}} viewBox='0 0 10 6' width='10'>
                    <path d='M1 1l4 4 4-4' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' />
                </svg>
            </button>
        </div>
    );
};

export default PocDevToolbar;
