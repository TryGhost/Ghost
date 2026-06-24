import type {ButtonColor} from '../global/button';

type SaveState = 'unsaved' | 'saving' | 'saved' | 'error' | '';

export interface OkProps {
    disabled: boolean;
    color: ButtonColor;
    label?: string;
}

export function getFormButtonProps(saveState: SaveState): OkProps {
    const disabled = saveState === 'saving';

    let color: ButtonColor = 'black';
    if (saveState === 'saved') {
        color = 'green';
    } else if (saveState === 'error') {
        color = 'red';
    }

    let label: string | undefined;
    if (saveState === 'saved') {
        label = 'Saved';
    } else if (saveState === 'saving') {
        label = 'Saving...';
    } else if (saveState === 'error') {
        label = 'Retry';
    }

    return {disabled, color, label};
}
