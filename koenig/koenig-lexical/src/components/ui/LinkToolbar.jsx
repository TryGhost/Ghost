import {ToolbarMenuItem} from './ToolbarMenu';

export function LinkToolbar({href, onEdit, onRemove}) {
    return (
        <div className="relative m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans text-sm font-medium leading-loose text-white dark:bg-grey-950">
            <a className="ml-3 mr-2" href={href} rel="noopener noreferrer" target="_blank">{href}</a>

            <ToolbarMenuItem
                dataTestId="edit-url"
                icon="edit"
                isActive={false}
                label="Edit"
                onClick={onEdit}
            />

            <ToolbarMenuItem
                dataTestId="remove-url"
                icon="remove"
                isActive={false}
                label="Remove"
                onClick={onRemove}
            />
        </div>
    );
}
