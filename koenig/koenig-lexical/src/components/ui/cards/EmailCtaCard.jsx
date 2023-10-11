import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin';
import {Button} from '../Button';
import {ButtonGroupSetting, DropdownSetting, InputSetting, InputUrlSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';

export function EmailCtaCard({
    alignment,
    buttonText,
    buttonUrl,
    handleSegmentChange,
    htmlEditor,
    htmlEditorInitialState,
    isEditing,
    segment,
    showDividers,
    showButton,
    toggleDividers,
    updateAlignment,
    updateShowButton,
    updateButtonText,
    updateButtonUrl
}) {
    const alignmentOpts = [
        {
            label: 'Left',
            name: 'left',
            Icon: LeftAlignIcon,
            dataTestId: 'left-align'
        },
        {
            label: 'Center',
            name: 'center',
            Icon: CenterAlignIcon,
            dataTestId: 'center-align'
        }
    ];

    const dropdownOptions = [{
        label: 'Free members',
        name: 'status:free'
    }, {
        label: 'Paid members',
        name: 'status:-free'
    }];

    const segmentName = dropdownOptions.find(option => option.name === segment)?.label ?? '';

    return (
        <>
            <div className="w-full pb-6">
                {/* Segment */}
                <div className="pb-7 pt-1 font-sans text-xs font-semibold uppercase leading-8 tracking-normal text-grey dark:text-grey-800">
                    {segmentName}
                </div>

                {/* Top divider */}
                {showDividers && <hr className="not-kg-prose -mt-4 mb-12 block border-t-grey-300 dark:border-t-grey-900" data-testid="top-divider" />}

                {/* HTML content */}
                <KoenigNestedEditor
                    autoFocus={true}
                    hasSettingsPanel={true}
                    initialEditor={htmlEditor}
                    initialEditorState={htmlEditorInitialState}
                    nodes='basic'
                    placeholderClassName={`bg-transparent whitespace-normal font-serif text-xl !text-grey-500 !dark:text-grey-800 ` }
                    placeholderText="Email only text... (optional)"
                    textClassName={`w-full bg-transparent whitespace-normal font-serif text-xl text-grey-900 dark:text-grey-200 ${alignment === 'left' ? 'text-left' : 'text-center mx-auto [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left'} ` }
                >
                    <ReplacementStringsPlugin />
                </KoenigNestedEditor>

                {/* Button */}
                { (showButton && (isEditing || (buttonText && buttonUrl))) &&
                    <div className={`mt-6 ${alignment === 'left' ? 'text-left' : 'text-center'} ` }>
                        <Button color={'accent'} dataTestId="cta-button" placeholder="Add button text" value={buttonText}/>
                    </div>
                }

                {/* Bottom divider */}
                {showDividers && <hr className="not-kg-prose mb-0 mt-12 block border-t-grey-300 dark:border-t-grey-900" data-testid="bottom-divider" />}

                {/* Read-only overlay */}
                {!isEditing && <ReadOnlyOverlay />}
            </div>

            {isEditing && (
                <SettingsPanel>
                    {/* Segment settings */}
                    <DropdownSetting
                        description='Visible for this audience when delivered by email. This card is not published on your site.'
                        label='Visibility'
                        menu={dropdownOptions}
                        value={segment}
                        onChange={handleSegmentChange}
                    />
                    <SettingsDivider />

                    {/* Alignment settings */}
                    <ButtonGroupSetting
                        buttons={alignmentOpts}
                        label='Content alignment'
                        selectedName={alignment}
                        onClick={updateAlignment}
                    />

                    {/* Dividers settings */}
                    <ToggleSetting
                        dataTestId="dividers-settings"
                        isChecked={showDividers}
                        label='Separators'
                        onChange={toggleDividers}
                    />
                    <SettingsDivider />

                    {/* Button settings */}
                    <ToggleSetting
                        dataTestId="button-settings"
                        isChecked={showButton}
                        label='Button'
                        onChange={updateShowButton}
                    />
                    {showButton && (
                        <>
                            <InputSetting
                                dataTestId="button-text"
                                label='Button text'
                                placeholder='Add button text'
                                value={buttonText}
                                onChange={updateButtonText}
                            />
                            <InputUrlSetting
                                dataTestId="button-url"
                                label='Button URL'
                                value={buttonUrl}
                                onChange={updateButtonUrl}
                            />
                        </>
                    )}
                </SettingsPanel>
            )}
        </>
    );
}

EmailCtaCard.propTypes = {
    alignment: PropTypes.oneOf(['left', 'center']),
    buttonText: PropTypes.string,
    buttonUrl: PropTypes.string,
    isEditing: PropTypes.bool,
    segment: PropTypes.oneOf(['status:free', 'status:-free']),
    showButton: PropTypes.bool,
    showDividers: PropTypes.bool,
    updateAlignment: PropTypes.func,
    updateButtonText: PropTypes.func,
    updateButtonUrl: PropTypes.func,
    updateShowButton: PropTypes.func,
    toggleDividers: PropTypes.func,
    suggestedUrls: PropTypes.array,
    handleSegmentChange: PropTypes.func,
    htmlEditor: PropTypes.object,
    htmlEditorInitialState: PropTypes.object
};

EmailCtaCard.defaultProps = {
    alignment: 'left',
    buttonText: '',
    buttonUrl: '',
    isEditing: false,
    segment: 'status:free',
    showButton: true,
    showDividers: true,
    suggestedUrls: []
};
