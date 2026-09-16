import PlusIcon from '../../assets/icons/plus.svg?react';

export function PlusButton({onClick}) {
    return (
        <div className="absolute left-[-32px] top-[-2px] xs:left-[-66px]" data-kg-plus-button>
            <button
                aria-label="Add a card"
                className="group relative flex size-7 cursor-pointer items-center justify-center rounded-full border border-grey transition-all ease-linear hover:border-grey-800 dark:border-grey-800 dark:hover:border-grey-400 md:size-9"
                type="button"
                onClick={onClick}
            >
                <PlusIcon className="size-4 stroke-grey-800 stroke-2 dark:stroke-grey-300" />
            </button>
        </div>
    );
}

export function PlusMenu({children}) {
    return (
        <div className="absolute left-[-16px]" data-kg-plus-menu>
            {children}
        </div>
    );
}
