import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import ImmersiveLayoutIcon from '../../../assets/icons/kg-layout-immersive.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor.jsx';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import MinimalLayoutIcon from '../../../assets/icons/kg-layout-minimal.svg?react';
import PropTypes from 'prop-types';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin.jsx';
import clsx from 'clsx';
import defaultTheme from '../../../themes/default.js';
import {Button} from '../Button.jsx';
import {ButtonGroupSetting, ColorOptionSetting, ColorPickerSetting, InputSetting, InputUrlSetting, MediaUploadSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel.jsx';
import {CALLTOACTION_COLORS} from '../../../utils/callToActionColors.js';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay.jsx';
import {RestrictContentPlugin} from '../../../index.js';
import {getAccentColor} from '../../../utils/getAccentColor.js';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useState} from 'react';

// The card closes with a single rule naming what the reader needs to get past
// it. It reports the post's access rather than setting it - the card never asks
// the question, it's answered for the author when the card goes in.
const ACCESS_LABELS = {
    members: 'Members access beyond here',
    paid: 'Paid access beyond here',
    tiers: 'Tiered access beyond here'
};

export const paywallColorPicker = [
    {label: 'None', name: 'none', color: 'bg-transparent border-black/15 dark:border-white/15 relative after:absolute after:left-1/2 after:top-1/2 after:h-[1px] after:w-[18px] after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:bg-red-500'},
    {label: 'White', name: 'white', color: 'bg-transparent border-black/15 dark:border-white/15'},
    {label: 'Grey', name: 'grey', color: 'bg-grey/20 border-black/[.08] dark:border-white/15'},
    {label: 'Blue', name: 'blue', color: 'bg-blue/20 border-black/[.08] dark:border-white/15'},
    {label: 'Green', name: 'green', color: 'bg-green/20 border-black/[.08] dark:border-white/15'},
    {label: 'Yellow', name: 'yellow', color: 'bg-yellow/20 border-black/[.08] dark:border-white/15'},
    {label: 'Red', name: 'red', color: 'bg-red/20 border-black/[.08] dark:border-white/15'},
    {label: 'Pink', name: 'pink', color: 'bg-pink/20 border-black/[0.08] dark:border-white/15'},
    {label: 'Purple', name: 'purple', color: 'bg-purple/20 border-black/[0.08] dark:border-white/15'},
    // full strength rather than the /20 tints above - the point of the brand
    // colour is that it's the brand colour. `matchingTextColor` already resolves
    // `accent` through `getAccentColor()`, so the text flips to suit it.
    {label: 'Brand color', name: 'accent', color: 'bg-accent border-accent'}
];

export const paywallLinkColorPicker = [
    {label: 'Text color', name: 'text', color: 'bg-black border-black dark:bg-white dark:border-white'},
    {label: 'Brand color', name: 'accent', color: 'bg-accent border-accent'}
];

const getTheme = () => ({
    ...defaultTheme,
    link: 'cta-link-color'
});

// The rule that closes the card, marking where the gated content starts
function PaywallDivider({label, arrow}) {
    return (
        // One cut across the post with the label set into it: the rules break
        // for the text and pick up again after it, rather than the text sitting
        // in a badge laid over the top. Real elements rather than
        // `before:`/`after:` because the zigzag is a masked shape, not a border.
        <div className="flex items-center whitespace-pre text-center font-sans text-2xs font-semibold uppercase text-grey-500 dark:text-grey-800">
            <span className="kg-paywall-v2-cut" />
            {/* the label needs room either side or the zigzag reads as part of
                the words rather than as the line they interrupt */}
            <span className="inline-flex items-center gap-1.5 px-3">
                {arrow && <span className="text-green">{arrow}</span>}
                {label}
                {arrow && <span className="text-green">{arrow}</span>}
            </span>
            <span className="kg-paywall-v2-cut" />
        </div>
    );
}

PaywallDivider.propTypes = {
    label: PropTypes.string,
    arrow: PropTypes.string
};

const TARGETS = [{name: 'web', label: 'Web'}, {name: 'email', label: 'Email'}];

// Segmented control: pills inside a muted track, the active one lifted with a
// background and shadow. Follows Shade's `Tabs variant='segmented'` shape, with
// Koenig palette values since Shade's tokens aren't available here - note that
// Koenig's shadow scale is much heavier than Shade's, so the active pill wants
// `shadow-xs`, not the `shadow-md` Shade's variant uses.
function TargetSwitch({activeTarget, onChange}) {
    return (
        <div
            className="not-kg-prose flex justify-center py-4"
            data-kg-allow-clickthrough="false"
            data-testid="paywall-target-switch"
            role="tablist"
        >
            <div className="inline-flex items-center rounded-lg bg-grey-100 p-[3px] dark:bg-grey-950">
                {TARGETS.map(target => (
                    <button
                        key={target.name}
                        aria-selected={activeTarget === target.name}
                        className={clsx(
                            'inline-flex h-7 cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-4 font-sans text-sm font-medium',
                            activeTarget === target.name
                                ? 'bg-white text-grey-900 shadow-xs dark:bg-grey-900 dark:text-white'
                                : 'text-grey-700 hover:text-grey-900 dark:text-grey-600 dark:hover:text-grey-300'
                        )}
                        data-testid={`paywall-target-${target.name}`}
                        role="tab"
                        type="button"
                        onClick={() => onChange(target.name)}
                    >
                        {target.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

TargetSwitch.propTypes = {
    activeTarget: PropTypes.oneOf(['web', 'email']),
    onChange: PropTypes.func
};

export function PaywallV2Card({
    access = null,
    hasEmailPaywall = true,
    activeTarget = 'web',
    alignment = 'center',
    buttonColor = '',
    buttonTextColor = '',
    color = 'grey',
    headingEditor,
    headingEditorInitialState,
    textEditor,
    textEditorInitialState,
    imageSrc = '',
    isEditing = false,
    layout = 'immersive',
    linkColor = 'text',
    showButton = true,
    showDividers = true,
    buttonText = 'Upgrade',
    buttonUrl = '#/portal/signup',
    imageDragHandler = {},
    imageUploader = {},
    onFileChange = () => {},
    onRemoveMedia = () => {},
    setFileInputRef = () => {},
    setActiveTarget = () => {},
    updateAlignment = () => {},
    updateButtonText = () => {},
    updateButtonUrl = () => {},
    updateLayout = () => {},
    updateShowButton = () => {},
    updateShowDividers = () => {},
    handleButtonColor = () => {},
    handleColorChange = () => {},
    handleLinkColorChange = () => {}
}) {
    const [buttonColorPickerExpanded, setButtonColorPickerExpanded] = useState(false);

    const {isLoading, progress} = imageUploader || {};
    const theme = getTheme();

    const layoutOptions = [
        {label: 'Minimal', name: 'minimal', Icon: MinimalLayoutIcon, dataTestId: 'minimal-layout', ariaLabel: 'Small, square image'},
        {label: 'Full', name: 'immersive', Icon: ImmersiveLayoutIcon, dataTestId: 'immersive-layout', ariaLabel: 'Full-width image'}
    ];

    const alignmentOptions = [
        {label: 'Left', name: 'left', Icon: LeftAlignIcon, dataTestId: 'left-align'},
        {label: 'Center', name: 'center', Icon: CenterAlignIcon, dataTestId: 'center-align'}
    ];

    // The brand colour is a runtime value, so it can't be a utility class the
    // way the fixed tints are - the card names it and computes its own readable
    // text colour, which the heading and body then inherit.
    const isAccentBackground = color === 'accent';

    const matchingTextColor = (bgColor) => {
        return bgColor === 'transparent' ? '' : textColorForBackgroundColor(bgColor === 'accent' ? getAccentColor() : bgColor).hex();
    };

    const accentTextColor = isAccentBackground ? matchingTextColor('accent') : undefined;

    const contentSettings = (
        <>
            {/* Image setting — per target */}
            <MediaUploadSetting
                alt='Image'
                borderStyle={'rounded'}
                // the shared row is top-aligned and its label carries a bottom
                // margin, which leaves the thumbnail sitting low against it
                className='items-center [&>div:first-child]:mb-0'
                desc='Upload'
                icon='file'
                isDraggedOver={imageDragHandler.isDraggedOver}
                isLoading={isLoading}
                label='Image'
                mimeTypes={['image/*']}
                placeholderRef={imageDragHandler.setRef}
                progress={progress}
                setFileInputRef={setFileInputRef}
                src={imageSrc}
                type='button'
                onFileChange={onFileChange}
                onRemoveMedia={onRemoveMedia}
            />
            <hr className="not-kg-prose my-2 block border-t-grey-300 dark:border-t-grey-900" />
            {/* Button settings — per target */}
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
                buttons={layoutOptions}
                label='Layout'
                selectedName={layout}
                onClick={updateLayout}
            />
            {layout === 'immersive' && (
                <ButtonGroupSetting
                    buttons={alignmentOptions}
                    label='Alignment'
                    selectedName={alignment}
                    onClick={updateAlignment}
                />
            )}
            <ColorOptionSetting
                buttons={paywallColorPicker}
                dataTestId='paywall-background-color-picker'
                label='Background'
                selectedName={color}
                onClick={handleColorChange}
            />
            {color === 'none' && (
                <ToggleSetting
                    dataTestId="paywall-dividers"
                    isChecked={showDividers}
                    label='Dividers'
                    onChange={updateShowDividers}
                />
            )}
            <ColorOptionSetting
                buttons={paywallLinkColorPicker}
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
                    onTogglePicker={setButtonColorPickerExpanded}
                />
            )}
        </>
    );

    return (
        <>
            {/* The paywall the reader will actually see, on the page while the
                post is being written rather than behind an edit mode. Editing
                it only makes it editable - there's nothing to open first, and
                nothing about the card the author has to remember. */}
            <div
                className="kg-paywall-v2-pane"
                data-testid="paywall-editing-pane"
            >
                <div className="kg-paywall-v2-pane-inner">
                    {/* Editing only. At rest the card is the paywall the post
                        has, and a switch above it made the card read as two
                        things the post might have - a question, sitting in the
                        writing, that the author hadn't asked. Choosing between
                        the two is editing, so it appears when editing does.

                        Also hidden when there's no email paywall to switch to. */}
                    {hasEmailPaywall && isEditing && (
                        <TargetSwitch activeTarget={activeTarget} onChange={setActiveTarget} />
                    )}

                    {/* Ghost always renders an "Already a member? Sign in" line
                        on the web paywall. It isn't editable, so it's left out
                        of the editor rather than shown as something the author
                        can't touch. */}
                    <div
                        className={clsx(
                            // keeps the closing paywall rule off the card
                            'relative mb-4 w-full rounded-lg border',
                            // the shared colour map holds fixed tints only, so the
                            // brand colour is named here rather than looked up
                            isAccentBackground ? 'border-transparent bg-accent' : CALLTOACTION_COLORS[color],
                            {'py-3': color === 'none'}
                        )}
                        data-paywall-layout={layout}
                        data-testid={`paywall-content-${activeTarget}`}
                        style={{
                            '--cta-link-color': linkColor === 'accent' ? getAccentColor() : 'var(--cta-link-color-text)',
                            ...(isAccentBackground ? {color: accentTextColor} : {})
                        }}
                    >
                        <div className={clsx(
                            'flex gap-6 pb-7 pt-6',
                            layout === 'immersive' ? 'flex-col' : 'flex-row',
                            color === 'none' && showDividers ? 'border-y border-grey-900/15 dark:border-grey-100/20' : color !== 'none' ? 'mx-6' : ''
                        )}>
                            {imageSrc && (
                                <div className={clsx('block', layout === 'immersive' ? 'w-full' : 'w-16 shrink-0')}>
                                    <img
                                        alt=""
                                        className={clsx(
                                            layout === 'immersive' ? 'h-auto w-full' : 'aspect-square w-16 object-cover',
                                            'rounded-md'
                                        )}
                                        data-testid="paywall-card-image"
                                        src={imageSrc}
                                    />
                                </div>
                            )}

                            <div className={clsx(
                                'flex w-full flex-col gap-4',
                                layout === 'immersive' && alignment === 'center' ? 'items-center' : ''
                            )}>
                                {/* Heading. Keyed on the target: LexicalNestedComposer
                                    binds `initialEditor` at mount, so without a remount
                                    both tabs would drive whichever editor mounted first. */}
                                <KoenigNestedEditor
                                    key={`${activeTarget}-heading`}
                                    autoFocus={true}
                                    dataTestId={`paywall-${activeTarget}-heading-editor`}
                                    hasSettingsPanel={true}
                                    initialEditor={headingEditor}
                                    initialEditorState={headingEditorInitialState}
                                    initialTheme={theme}
                                    nodes='basic'
                                    placeholderClassName="bg-transparent whitespace-normal font-serif text-2xl font-bold !text-grey-500 !dark:text-grey-800"
                                    placeholderText="Add a heading..."
                                    textClassName={clsx(
                                        'koenig-lexical-paywall-heading w-full whitespace-normal text-pretty bg-transparent font-serif text-2xl',
                                        isAccentBackground ? 'text-inherit' : 'text-grey-900 dark:text-grey-200',
                                        alignment === 'center' && layout === 'immersive' ? 'text-center' : 'text-left'
                                    )}
                                    useDefaultClasses={false}
                                >
                                    <RestrictContentPlugin allowBr={false} paragraphs={1} />
                                    <ReplacementStringsPlugin />
                                </KoenigNestedEditor>

                                {/* Body text, keyed for the same reason as the heading */}
                                <KoenigNestedEditor
                                    key={`${activeTarget}-text`}
                                    dataTestId={`paywall-${activeTarget}-text-editor`}
                                    hasSettingsPanel={true}
                                    initialEditor={textEditor}
                                    initialEditorState={textEditorInitialState}
                                    initialTheme={theme}
                                    nodes='basic'
                                    placeholderClassName="bg-transparent whitespace-normal font-serif text-xl !text-grey-500 !dark:text-grey-800"
                                    placeholderText="Explain what's beyond the paywall..."
                                    textClassName={clsx(
                                        'koenig-lexical-paywall-text w-full whitespace-normal text-pretty bg-transparent font-serif text-xl',
                                        isAccentBackground ? 'text-inherit' : 'text-grey-900 dark:text-grey-200',
                                        alignment === 'center' && layout === 'immersive' ? 'text-center' : 'text-left'
                                    )}
                                >
                                    <ReplacementStringsPlugin />
                                </KoenigNestedEditor>

                                {/* Button */}
                                {showButton && (isEditing || (buttonText && buttonUrl)) && (
                                    <div
                                        className={clsx(layout === 'immersive' && imageSrc ? 'w-full' : '')}
                                        data-test-paywall-button-current-url={buttonUrl}
                                    >
                                        <Button
                                            color={'accent'}
                                            dataTestId="paywall-button"
                                            placeholder="Add button text"
                                            size={layout === 'immersive' && imageSrc ? 'medium' : 'small'}
                                            style={buttonColor !== 'accent' ? {backgroundColor: buttonColor, color: buttonTextColor} : undefined}
                                            value={buttonText}
                                            width={layout === 'minimal' || !imageSrc ? 'regular' : 'full'}
                                        />
                                    </div>
                                )}

                            </div>
                        </div>

                        {!isEditing && <ReadOnlyOverlay />}
                    </div>
                </div>
            </div>

            <PaywallDivider arrow="↓" label={ACCESS_LABELS[access] || ACCESS_LABELS.members} />

            {isEditing && (
                <SettingsPanel
                    tabs={[{id: 'content', label: 'Content'}, {id: 'design', label: 'Design'}]}
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

PaywallV2Card.propTypes = {
    access: PropTypes.oneOf(['members', 'paid', 'tiers', null]),
    hasEmailPaywall: PropTypes.bool,
    activeTarget: PropTypes.oneOf(['web', 'email']),
    alignment: PropTypes.oneOf(['left', 'center']),
    buttonColor: PropTypes.string,
    buttonText: PropTypes.string,
    buttonTextColor: PropTypes.string,
    buttonUrl: PropTypes.string,
    color: PropTypes.oneOf(['none', 'grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']),
    headingEditor: PropTypes.object,
    headingEditorInitialState: PropTypes.object,
    imageDragHandler: PropTypes.object,
    imageSrc: PropTypes.string,
    imageUploader: PropTypes.object,
    isEditing: PropTypes.bool,
    layout: PropTypes.oneOf(['minimal', 'immersive']),
    linkColor: PropTypes.oneOf(['text', 'accent']),
    showButton: PropTypes.bool,
    showDividers: PropTypes.bool,
    textEditor: PropTypes.object,
    textEditorInitialState: PropTypes.object,
    handleButtonColor: PropTypes.func,
    handleColorChange: PropTypes.func,
    handleLinkColorChange: PropTypes.func,
    onFileChange: PropTypes.func,
    onRemoveMedia: PropTypes.func,
    setActiveTarget: PropTypes.func,
    setFileInputRef: PropTypes.func,
    updateAlignment: PropTypes.func,
    updateButtonText: PropTypes.func,
    updateButtonUrl: PropTypes.func,
    updateLayout: PropTypes.func,
    updateShowButton: PropTypes.func,
    updateShowDividers: PropTypes.func
};
