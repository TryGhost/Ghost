import React from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  Switch,
} from '@tryghost/shade/components';
import { SettingGroupContent } from '@tryghost/shade/patterns';
import {
  type Setting,
  getSettingValues,
  useEditSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { withErrorBoundary } from '@/settings/components/with-error-boundary';

const Editor: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const { settings } = useGlobalData();
  const { mutateAsync: editSettings } = useEditSettings();
  const handleError = useHandleError();

  const [smartQuotes] = getSettingValues<boolean>(settings, ['editor_smart_quotes']);

  const toggleSmartQuotes = async (checked: boolean) => {
    const updatedSetting: Setting[] = [{ key: 'editor_smart_quotes', value: checked }];

    try {
      await editSettings(updatedSetting);
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <TopLevelGroup
      description="Set how the editor handles what you type"
      keywords={keywords}
      navid="editor"
      testId="editor"
      title="Editor"
    >
      <SettingGroupContent columns={1}>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="smart-quotes">Smart quotes</FieldLabel>
            <FieldDescription>
              Turn straight quotes into “curly” quotes, apostrophes and primes as you type or paste,
              using the quotation marks of your publication language. Code is left alone.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={Boolean(smartQuotes)}
            id="smart-quotes"
            onCheckedChange={(checked) => void toggleSmartQuotes(checked)}
          />
        </Field>
      </SettingGroupContent>
    </TopLevelGroup>
  );
};

export default withErrorBoundary(Editor, 'Editor');
