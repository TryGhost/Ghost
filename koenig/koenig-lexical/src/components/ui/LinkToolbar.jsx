import {ReactComponent as EditIcon} from '../../assets/icons/kg-edit.svg';
import {ReactComponent as TrashIcon} from '../../assets/icons/kg-trash.svg';

export function LinkToolbar({href, onEdit, onRemove}) {
    return (
        <div className="relative m-0 flex items-center justify-evenly rounded bg-black px-3 py-1 font-sans text-sm font-normal text-white after:absolute after:top-[100%] after:left-0 after:block after:h-[14px] after:w-[100%] dark:bg-grey-950">
            <a className="mr-3" href={href} rel="noopener noreferrer" target="_blank">{href}</a>

            <button
                aria-label="Edit"
                className="flex h-7 w-7 cursor-pointer items-center justify-center transition-opacity hover:opacity-75"
                type="button"
                onClick={onEdit}
            >
                <EditIcon className="h-4 w-4 fill-white" />
            </button>

            <button
                aria-label="Remove"
                className="flex h-7 w-7 cursor-pointer items-center justify-center transition-opacity hover:opacity-75"
                type="button"
                onClick={onRemove}
            >
                <TrashIcon className="h-4 w-4 fill-white" />
            </button>
        </div>
    );
}
