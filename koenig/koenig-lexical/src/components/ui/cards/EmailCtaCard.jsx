import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import PropTypes from 'prop-types';
import React from 'react';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin';
import {Button} from '../Button';
import {ButtonGroupSetting, DropdownSetting, InputSetting, InputUrlSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {CardVisibilityMessage} from '../CardVisibilityMessage.jsx';
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

    const getVisibilityMessage = (segmentType) => {
        switch (segmentType) {
        case 'status:free':
            return 'Hidden on website and paid newsletter';
        case 'status:-free':
            return 'Hidden on website and free newsletter';
        default:
            return '';
        }
    };

    const visibilityMessage = getVisibilityMessage(segment);

    return (
        <>
            <div className="w-full pb-6">
                {/* Segment */}
                <CardVisibilityMessage message={visibilityMessage} />

                {/* Top divider */}
                {showDividers && <hr className="not-kg-prose mb-12 block border-t-grey-300 dark:border-t-grey-900" data-testid="top-divider" />}

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
