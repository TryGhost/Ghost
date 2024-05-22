import {SaveHandler} from '@tryghost/admin-x-framework/hooks';
import {useState} from 'react';

export const useSaveButton = (handleSave: SaveHandler, fakeWhenUnchanged?: boolean) => {
    const [savingTitle, setSavingTitle] = useState('Save');
    const [isSaving, setIsSaving] = useState(false);

    const onSaveClick = async () => {
        setIsSaving(true);
        setSavingTitle('Saving');

        // Execute the save operation
        await handleSave({fakeWhenUnchanged});

        // After a second, change the label to 'Saved'
        setTimeout(() => {
            setSavingTitle('Saved');

            // After yet another second, reset to 'Save'
            setTimeout(() => {
                setSavingTitle('Save');
                setIsSaving(false);
            }, 1000);
        }, 1000);
    };

    return {
        savingTitle,
        isSaving,
        onSaveClick
    };
};
