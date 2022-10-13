import {ReactComponent as PlusIcon} from '../assets/icons/plus.svg';

export function PlusButton({onClick}) {
    return (
        <div className="absolute top-[-2px] left-[-66px]" data-kg-plus-button>
            <button
                type="button"
                aria-label="Add a card"
                className="group relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-grey bg-white transition-all ease-linear hover:border-grey-900 md:h-9 md:w-9"
                onClick={onClick}
            >
                <PlusIcon className="h-4 w-4 stroke-grey-800 stroke-2 group-hover:stroke-grey-900" />
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
