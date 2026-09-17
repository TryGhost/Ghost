import CodeEditor from '@/settings/components/code-editor';
import React, { useEffect, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { SettingsModal } from '@tryghost/shade/patterns';
import { toast } from 'sonner';
import { useEditSettings } from '@tryghost/admin-x-framework/api/settings';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';

export interface RobotsTxtEditorModalProps {
  initialContent: string;
  onClose: () => void;
}

const hint = (
  <>
    Ghost applies robots.txt in this order: a private site always serves its own, then this custom
    file, then your theme&apos;s robots.txt, then Ghost&apos;s default. Leave empty to use the theme
    or default file. Use {'{{blog-url}}'} for your site URL.
  </>
);

const RobotsTxtEditorModal: React.FC<RobotsTxtEditorModalProps> = ({ initialContent, onClose }) => {
  const { mutateAsync: editSettings } = useEditSettings();
  const handleError = useHandleError();

  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await editSettings([{ key: 'robots_txt', value: content }]);
      toast.success('robots.txt updated');
      onClose();
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  return (
    <SettingsModal
      backDropClick={false}
      cancelLabel="Close"
      footer={<></>}
      height="full"
      size="full"
      testId="modal-robots-txt-editor"
      onClose={onClose}
    >
      <Stack className="h-full min-h-0">
        <Inline align="center" className="mb-4" justify="between">
          <Text as="h2" className="md:text-3xl" leading="heading" size="2xl" weight="bold">
            Custom robots.txt file
          </Text>
          <Inline gap="md">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button disabled={isSaving} type="button" onClick={() => void handleSave()}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </Inline>
        </Inline>

        <div className="mb-16 min-h-0 flex-auto">
          <CodeEditor
            data-testid="robots-txt-editor"
            extensions={[]}
            height="full"
            hint={hint}
            value={content}
            autoFocus
            onChange={setContent}
          />
        </div>
      </Stack>
    </SettingsModal>
  );
};

export default RobotsTxtEditorModal;
