import React from 'react';
import {
    BackgroundColorField,
    BodyFontField,
    ButtonColorField,
    ButtonCornersField,
    ButtonStyleField,
    DividerColorField,
    HeaderBackgroundField,
    HeadingFontField,
    HeadingWeightField,
    ImageCornersField,
    LinkColorField,
    LinkStyleField,
    PostTitleColorField,
    SectionTitleColorField,
    TitleAlignmentField
} from './design-fields';
import {EmailDesignProvider} from './email-design-context';
import {Separator} from '@tryghost/shade';
import type {EmailDesignSettings} from './types';

interface DesignSettingsFormProps {
    settings: EmailDesignSettings;
    onSettingsChange: (updates: Partial<EmailDesignSettings>) => void;
    accentColor: string;
}

const DesignSettingsForm: React.FC<DesignSettingsFormProps> = ({settings, onSettingsChange, accentColor}) => (
    <EmailDesignProvider accentColor={accentColor} settings={settings} onSettingsChange={onSettingsChange}>
        <div className="flex flex-col gap-6">
            <section>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Global</h4>
                <div className="flex flex-col gap-4">
                    <BackgroundColorField />
                    <HeadingFontField />
                    <HeadingWeightField />
                    <BodyFontField />
                </div>
            </section>

            <Separator />

            <section>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Header</h4>
                <div className="flex flex-col gap-4">
                    <HeaderBackgroundField />
                    <PostTitleColorField />
                    <TitleAlignmentField />
                </div>
            </section>

            <Separator />

            <section>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Body</h4>
                <div className="flex flex-col gap-4">
                    <SectionTitleColorField />
                    <ButtonColorField />
                    <ButtonStyleField />
                    <ButtonCornersField />
                    <LinkColorField />
                    <LinkStyleField />
                    <ImageCornersField />
                    <DividerColorField />
                </div>
            </section>
        </div>
    </EmailDesignProvider>
);

export default DesignSettingsForm;
