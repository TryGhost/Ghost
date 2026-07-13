import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor.jsx';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import defaultTheme from '../../../themes/default.js';
import {Button} from '../Button.jsx';
import {ButtonGroupSetting, ColorOptionSetting, ColorPickerSetting, InputSetting, InputUrlSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel.jsx';
import {CALLTOACTION_COLORS} from '../../../utils/callToActionColors.js';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay.jsx';
import {callToActionColorPicker, callToActionLinkColorPicker} from './CallToActionCard.jsx';
import {getAccentColor} from '../../../utils/getAccentColor.js';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useState} from 'react';

const getTheme = () => ({
    ...defaultTheme,
    link: 'cta-link-color'
});

// The paywall uses a solid card background, so the "None" option is dropped.
const paywallColorPicker = callToActionColorPicker.filter(c => c.name !== 'none');

const DIVIDER_CLASSES = 'flex h-3 items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase text-grey-500 before:mr-2 before:flex-1 before:border-t before:border-grey-300 before:content-[\'\'] after:ml-2 after:flex-1 after:border-t after:border-grey-300 dark:text-grey-800';

const alignmentOptions = [
    {label: 'Left', name: 'left', Icon: LeftAlignIcon, dataTestId: 'left-align'},
    {label: 'Center', name: 'center', Icon: CenterAlignIcon, dataTestId: 'center-align'}
];

// Small pill tabs used to switch the editable permutation (platform + audience).
function MiniTabs({options, value, onChange, dataTestId}) {
    return (
        <div className="inline-flex rounded-md bg-grey-100 p-0.5 dark:bg-grey-950" data-testid={dataTestId}>
            {options.map(option => (
                <button
                    key={option.value}
                    className={clsx(
                        'rounded px-2.5 py-1 font-sans text-xs font-medium transition-all',
                        value === option.value
                            ? 'bg-white text-grey-900 shadow-sm dark:bg-grey-800 dark:text-grey-100'
                            : 'text-grey-600 hover:text-grey-900 dark:text-grey-500 dark:hover:text-grey-300'
                    )}
                    type="button"
                    onClick={() => onChange(option.value)}
                    onMouseDown={e => e.preventDefault()}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

MiniTabs.propTypes = {
    options: PropTypes.array,
    value: PropTypes.string,
    onChange: PropTypes.func,
    dataTestId: PropTypes.string
};

export function PaywallCard({
    alignment = 'left',
    buttonColor = '',
    buttonText = '',
    buttonTextColor = '',
    buttonUrl = '',
    color = 'grey',
    group = 'public',
    groupOptions = [{value: 'public', label: 'Public'}, {value: 'free', label: 'Free'}, {value: 'paid', label: 'Paid'}, {value: 'tier', label: 'Tiers'}],
    headingEditor,
    headingEditorInitialState,
    htmlEditor,
    htmlEditorInitialState,
    isEditing = false,
    linkColor = 'text',
    platform = 'web',
    platformOptions = [{value: 'web', label: 'Web'}, {value: 'email', label: 'Email'}],
    // staticPreview renders a read-only version (used for the in-post card):
    // no tabs, no editors, no settings — just the rendered HTML.
    staticPreview = false,
    previewHeading = '',
    previewBody = '',
    showButton = true,
    handleButtonColor = () => {},
    handleColorChange = () => {},
    handleLinkColorChange = () => {},
    updateAlignment = () => {},
    updateButtonText = () => {},
    updateButtonUrl = () => {},
    updateGroup = () => {},
    updatePlatform = () => {},
    updateShowButton = () => {}
}) {
    const [buttonColorPickerExpanded, setButtonColorPickerExpanded] = useState(false);
    const isCentered = alignment === 'center';
    const theme = getTheme();

    const matchingTextColor = (bgColor) => {
        return bgColor === 'transparent' ? '' : textColorForBackgroundColor(bgColor === 'accent' ? getAccentColor() : bgColor).hex();
    };

    const tabs = [
        {id: 'content', label: 'Content'},
        {id: 'design', label: 'Design'}
    ];

    const contentSettings = (
        <>
            <ToggleSetting
                dataTestId="paywall-button-settings"
                isChecked={showButton}
                label='Button'
                onChange={updateShowButton}
            />
            {showButton && (
                <>
                    <InputSetting
                        dataTestId="paywall-button-text"
                        label='Button text'
                        placeholder='Add button text'
                        value={buttonText}
                        onChange={updateButtonText}
                    />
                    <InputUrlSetting
                        dataTestId="paywall-button-url"
                        label='Button URL'
                        value={buttonUrl}
                        onChange={updateButtonUrl}
                    />
                </>
            )}
        </>
    );

    const designSettings = (
        <>
            <ButtonGroupSetting
                buttons={alignmentOptions}
                label='Alignment'
                selectedName={alignment}
                onClick={updateAlignment}
            />
            <ColorOptionSetting
                buttons={paywallColorPicker}
                dataTestId='paywall-background-color-picker'
                label='Background'
                selectedName={color}
                onClick={handleColorChange}
            />
            <ColorOptionSetting
                buttons={callToActionLinkColorPicker}
                dataTestId='paywall-link-color-picker'
                label='Link color'
                selectedName={linkColor}
                onClick={handleLinkColorChange}
            />
            {showButton && (
                <ColorPickerSetting
                    dataTestId='paywall-button-color'
                    eyedropper={true}
                    isExpanded={buttonColorPickerExpanded}
                    label='Button Color'
                    swatches={[
                        {title: 'Black', hex: '#000000'},
                        {title: 'Grey', hex: '#F0F0F0'},
                        {title: 'Brand color', accent: true}
                    ]}
                    value={buttonColor}
                    onPickerChange={bgColor => handleButtonColor(bgColor, matchingTextColor(bgColor))}
                    onSwatchChange={(bgColor) => {
                        handleButtonColor(bgColor, matchingTextColor(bgColor));
                        setButtonColorPickerExpanded(false);
                    }}
                    onTogglePicker={isExpanded => setButtonColorPickerExpanded(isExpanded)}
                />
            )}
        </>
    );

    return (
        <>
            {/* Public preview divider */}
            <div className="pb-4" data-testid="paywall-divider-top">
                <div className={DIVIDER_CLASSES}>
                    <span className="mr-2 text-green">↑</span>
                    Free public preview
                </div>
            </div>

            {/* Platform + audience tabs (editing only — hidden in the static
                in-post preview) */}
            {!staticPreview && (
                <div
                    className="mb-4 flex items-center justify-between gap-3"
                    data-testid="paywall-variant-tabs"
                >
                    <MiniTabs
                        dataTestId="paywall-platform-tabs"
                        options={platformOptions}
                        value={platform}
                        onChange={updatePlatform}
                    />
                    <MiniTabs
                        dataTestId="paywall-group-tabs"
                        options={groupOptions}
                        value={group}
                        onChange={updateGroup}
                    />
                </div>
            )}

            {/* Paywall card */}
            <div
                className={clsx('w-full rounded-lg border px-6 py-8', CALLTOACTION_COLORS[color])}
                data-testid="paywall-content"
                style={{
                    '--cta-link-color': linkColor === 'accent' ? getAccentColor() : 'var(--cta-link-color-text)'
                }}
            >
                <div className={clsx('flex w-full flex-col gap-5', isCentered && 'items-center')}>
                    {staticPreview ? (
                        <>
                            {/* Title (read-only) — only when present */}
                            {previewHeading && (
                                <div
                                    dangerouslySetInnerHTML={{__html: previewHeading}}
                                    className={clsx(
                                        'koenig-lexical-paywall-heading w-full whitespace-normal text-pretty bg-transparent font-serif text-3xl font-bold text-grey-900 dark:text-grey-100',
                                        isCentered ? 'text-center' : 'text-left'
                                    )}
                                />
                            )}

                            {/* Body (read-only) */}
                            <div
                                dangerouslySetInnerHTML={{__html: previewBody}}
                                className={clsx(
                                    'koenig-lexical-paywall-text w-full whitespace-normal text-pretty bg-transparent font-serif text-xl text-grey-900 dark:text-grey-200',
                                    isCentered ? 'text-center' : 'text-left'
                                )}
                            />
                        </>
                    ) : (
                        <>
                            {/* Title */}
                            <KoenigNestedEditor
                                autoFocus={true}
                                dataTestId={'paywall-heading-editor'}
                                hasSettingsPanel={true}
                                initialEditor={headingEditor}
                                initialEditorState={headingEditorInitialState}
                                initialTheme={theme}
                                nodes='minimal'
                                placeholderClassName={clsx(
                                    '!dark:text-grey-800 whitespace-normal bg-transparent font-serif text-3xl font-bold !text-grey-500',
                                    isCentered ? 'text-center' : 'text-left'
                                )}
                                placeholderText="Add a title..."
                                singleParagraph={true}
                                textClassName={clsx(
                                    'koenig-lexical-paywall-heading w-full whitespace-normal text-pretty bg-transparent font-serif text-3xl font-bold text-grey-900 dark:text-grey-100',
                                    isCentered ? 'text-center [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left' : 'text-left'
                                )}
                            />

                            {/* Body */}
                            <KoenigNestedEditor
                                dataTestId={'paywall-content-editor'}
                                hasSettingsPanel={true}
                                initialEditor={htmlEditor}
                                initialEditorState={htmlEditorInitialState}
                                initialTheme={theme}
                                nodes='basic'
                                placeholderClassName={clsx(
                                    '!dark:text-grey-800 whitespace-normal bg-transparent font-serif text-xl !text-grey-500',
                                    isCentered ? 'text-center' : 'text-left'
                                )}
                                placeholderText="Write something worth subscribing for..."
                                textClassName={clsx(
                                    'koenig-lexical-paywall-text w-full whitespace-normal text-pretty bg-transparent font-serif text-xl text-grey-900 dark:text-grey-200',
                                    isCentered ? 'text-center [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left' : 'text-left'
                                )}
                            />
                        </>
                    )}

                    {/* Button */}
                    {showButton && (
                        <div data-test-paywall-button-current-url={buttonUrl}>
                            <Button
                                color={'accent'}
                                dataTestId="paywall-button"
                                placeholder="Add button text"
                                size="small"
                                style={buttonColor !== 'accent' ? {
                                    backgroundColor: buttonColor,
                                    color: buttonTextColor
                                } : undefined}
                                value={buttonText}
                                width="regular"
                            />
                        </div>
                    )}
                </div>

                {!isEditing && <ReadOnlyOverlay />}
            </div>

            {/* Members-only divider */}
            <div className="pt-4" data-testid="paywall-divider-bottom">
                <div className={DIVIDER_CLASSES}>
                    Only visible to members
                    <span className="ml-2 text-green">↓</span>
                </div>
            </div>

            {!staticPreview && isEditing && (
                <SettingsPanel
                    tabs={tabs}
                    onMouseDown={e => e.preventDefault()}
                >
                    {{
                        content: contentSettings,
                        design: designSettings
                    }}
                </SettingsPanel>
            )}
        </>
    );
}

PaywallCard.propTypes = {
    alignment: PropTypes.oneOf(['left', 'center']),
    buttonColor: PropTypes.string,
    buttonText: PropTypes.string,
    buttonTextColor: PropTypes.string,
    buttonUrl: PropTypes.string,
    color: PropTypes.oneOf(['grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']),
    group: PropTypes.string,
    groupOptions: PropTypes.array,
    headingEditor: PropTypes.object,
    headingEditorInitialState: PropTypes.object,
    htmlEditor: PropTypes.object,
    htmlEditorInitialState: PropTypes.object,
    isEditing: PropTypes.bool,
    linkColor: PropTypes.oneOf(['text', 'accent']),
    platform: PropTypes.string,
    platformOptions: PropTypes.array,
    previewBody: PropTypes.string,
    previewHeading: PropTypes.string,
    showButton: PropTypes.bool,
    staticPreview: PropTypes.bool,
    handleButtonColor: PropTypes.func,
    handleColorChange: PropTypes.func,
    handleLinkColorChange: PropTypes.func,
    updateAlignment: PropTypes.func,
    updateButtonText: PropTypes.func,
    updateButtonUrl: PropTypes.func,
    updateGroup: PropTypes.func,
    updatePlatform: PropTypes.func,
    updateShowButton: PropTypes.func
};
