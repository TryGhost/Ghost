import {SaveHandler} from '@tryghost/admin-x-framework/hooks';
import {useState} from 'react';

export const useSaveButton = (handleSave:SaveHandler, fakeWhenUnchanged?: boolean) => {
    const [savingTitle, setSavingTitle] = useState('Save');
    const [isSaving, setIsSaving] = useState(false);

    const onSaveClick = async () => {
        setIsSaving(true);
        setSavingTitle('Saving');

        const save = await handleSave({fakeWhenUnchanged});

        if (save) {
            setSavingTitle('Saved');
            setTimeout(() => {
                setSavingTitle('Save');
                setIsSaving(false);
            }, 1000);
        } else {
            setIsSaving(false);
        }
    };

    return {
        savingTitle,
        isSaving,
        onSaveClick
    };
};
