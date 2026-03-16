import {ToolbarMenuItem} from './ToolbarMenu';

export function LinkToolbar({href, onEdit, onRemove}) {
    return (
        <div className="relative m-0 flex items-center justify-evenly gap-1 rounded-lg bg-white px-1 font-sans text-md font-normal text-black shadow-md dark:bg-grey-950 dark:text-white">
            <a className="ml-3 mr-2 max-w-2xl truncate" href={href} rel="noopener noreferrer" target="_blank">{href}</a>

            <ToolbarMenuItem
                dataTestId="edit-url"
                icon="edit"
                isActive={false}
                label="Edit"
                secondary={true}
                onClick={onEdit}
            />

            <ToolbarMenuItem
                dataTestId="remove-url"
                icon="remove"
                isActive={false}
                label="Remove"
                secondary={true}
                onClick={onRemove}
            />
        </div>
    );
}
