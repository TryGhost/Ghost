import {ReactComponent as PlusIcon} from '../../assets/icons/plus.svg';

export function PlusButton({onClick}) {
    return (
        <div className="absolute top-[-2px] left-[-66px]" data-kg-plus-button>
            <button
                aria-label="Add a card"
                className="group relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-grey transition-all ease-linear hover:border-grey-900 dark:border-grey-800 dark:hover:border-grey-100 md:h-9 md:w-9"
                type="button"
                onClick={onClick}
            >
                <PlusIcon className="h-4 w-4 stroke-grey-800 stroke-2 group-hover:stroke-grey-500 dark:stroke-grey-500 dark:group-hover:stroke-grey-100" />
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
