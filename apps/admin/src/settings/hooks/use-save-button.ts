import { type SaveHandler } from '@tryghost/admin-x-framework/hooks';
import { useRef, useState } from 'react';

export const useSaveButton = (handleSave: SaveHandler, fakeWhenUnchanged?: boolean) => {
  const [savingTitle, setSavingTitle] = useState('Save');
  const [isSaving, setIsSaving] = useState(false);
  const pendingSave = useRef(false);

  const onSaveClick = async () => {
    if (pendingSave.current) {
      return;
    }
    pendingSave.current = true;
    setIsSaving(true);
    setSavingTitle('Saving');

    // Execute the save operation
    let saved: boolean;
    try {
      saved = await handleSave({ fakeWhenUnchanged });
    } catch (error) {
      pendingSave.current = false;
      setSavingTitle('Save');
      setIsSaving(false);
      throw error;
    }
    if (!saved) {
      pendingSave.current = false;
      setSavingTitle('Save');
      setIsSaving(false);
      return;
    }

    // After a second, change the label to 'Saved'
    setTimeout(() => {
      setSavingTitle('Saved');

      // After yet another second, reset to 'Save'
      setTimeout(() => {
        pendingSave.current = false;
        setSavingTitle('Save');
        setIsSaving(false);
      }, 1000);
    }, 1000);
  };

  return {
    savingTitle,
    isSaving,
    onSaveClick,
  };
};
