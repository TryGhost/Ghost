import type {ButtonProps} from '../components/ui/button';

type SaveState = 'unsaved' | 'saving' | 'saved' | 'error' | '';

export interface FormButtonProps {
    disabled: boolean;
    variant: ButtonProps['variant'];
    label?: string;
}

export function getFormButtonProps(saveState: SaveState): FormButtonProps {
    const disabled = saveState === 'saving';

    let variant: ButtonProps['variant'] = 'default';
    if (saveState === 'error') {
        variant = 'destructive';
    }

    let label: string | undefined;
    if (saveState === 'saved') {
        label = 'Saved';
    } else if (saveState === 'saving') {
        label = 'Saving...';
    } else if (saveState === 'error') {
        label = 'Retry';
    }

    return {disabled, variant, label};
}
