import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React, {useRef} from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {PaywallV2Card} from '../components/ui/cards/PaywallV2Card.jsx';
import {ToolbarMenu, ToolbarMenuItem} from '../components/ui/ToolbarMenu.jsx';
import {getAccentColor} from '../utils/getAccentColor.js';
import {getImageDimensions} from '../utils/getImageDimensions';
import {nextPaywallCardAccess} from '../utils/paywallCardAccess';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const PaywallV2NodeComponent = ({
    nodeKey,
    access,
    tiers,
    ...targets
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const [activeTarget, setActiveTarget] = React.useState('web');
    const imageDragHandler = useFileDragAndDrop({handleDrop: handleImageDrop});
    const fileInputRef = useRef(null);
    const imageUploader = fileUploader.useFileUpload('image');

    // Every recipient of a members-only post is already a member, so nobody
    // receiving the email lands on the paywall - there's no email paywall to
    // write, and offering one would be copy that never sends.
    const hasEmailPaywall = access !== 'members';

    // Editing a global default, the surface is settled before the card is
    // reached - each one is its own card on the screen rather than two behind a
    // switch - so the card neither chooses nor offers to.
    const defaultsTarget = cardConfig?.paywallDefaults?.target;

    // At rest the card shows the web paywall, because that's the one that sits
    // in the post - the email paywall is a property of the send, and with the
    // switch gone there'd be nothing on a closed card to say which was showing.
    //
    // The chosen tab is remembered rather than reset, so reopening the card
    // returns to whichever paywall was last being edited.
    const displayTarget = defaultsTarget || (hasEmailPaywall && isEditing ? activeTarget : 'web');

    // Every setting is stored twice, prefixed per target, so the web and email
    // paywalls are configured completely independently. `read`/`write` save the
    // rest of this component from naming both copies of each one.
    const prefix = displayTarget === 'email' ? 'email' : 'web';
    const read = name => targets[`${prefix}${name}`];
    const write = (name, value) => updateNode((node) => {
        node[`${prefix}${name}`] = value;
    });

    const updateNode = (fn) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            fn(node);
        });
    };

    /**
     * The post owns access; the card only reports it. Inserting the card is what
     * sets the post's access (see PaywallV2Plugin), and from then on this keeps
     * the card in step with it.
     *
     * Without this the card kept whatever it was created with - a post moved
     * from tiers to paid still read "Tiered access beyond here", and worse,
     * `getPaywallMemberSegment` built its gated block from the stale value, so
     * the rendered post gated against a different audience than the post did.
     */
    // Both tier lists are rebuilt on every read - the node getter copies, and
    // the host maps the post's tiers into a fresh array - so the effect below
    // keys off their contents rather than their identity
    const tiersKey = tiers.join(',');
    const postTiersKey = (cardConfig?.post?.tiers || []).join(',');

    React.useEffect(() => {
        const next = nextPaywallCardAccess({
            access,
            tiers,
            visibility: cardConfig?.post?.visibility,
            postTiers: cardConfig?.post?.tiers
        });

        if (!next) {
            return;
        }

        updateNode((node) => {
            node.access = next.access;
            node.setTiers(next.tiers);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [access, tiersKey, cardConfig?.post?.visibility, postTiersKey]);

    const handleShowButtonToggle = () => write('ShowButton', !read('ShowButton'));

    const handleButtonTextChange = event => write('ButtonText', event.target.value);

    const handleButtonUrlChange = value => write('ButtonUrl', value);

    const handleButtonColorChange = (value, matchingTextColor) => {
        updateNode((node) => {
            node[`${prefix}ButtonColor`] = value;
            node[`${prefix}ButtonTextColor`] = matchingTextColor;
        });
    };

    /**
     * Choosing the brand colour also inverts the button, because a button set to
     * the default black - or to the accent itself - either fights the card or
     * disappears into it. It takes the card's text colour, and its label takes
     * the card's colour, which is how Ghost's own accent CTA reads.
     *
     * Written as real values rather than derived at render time, so the button
     * colour picker still means something afterwards. Moving off the brand
     * colour undoes it, but only if the pair is still the one we wrote - an
     * author who has since picked their own keeps it.
     */
    const handleBackgroundColorChange = (value) => {
        const accent = getAccentColor();
        const accentPair = {color: textColorForBackgroundColor(accent).hex(), textColor: accent};

        updateNode((node) => {
            node[`${prefix}BackgroundColor`] = value;

            if (value === 'accent') {
                node[`${prefix}ButtonColor`] = accentPair.color;
                node[`${prefix}ButtonTextColor`] = accentPair.textColor;
                return;
            }

            const isUntouchedAccentPair = node[`${prefix}ButtonColor`] === accentPair.color
                && node[`${prefix}ButtonTextColor`] === accentPair.textColor;

            if (isUntouchedAccentPair) {
                node[`${prefix}ButtonColor`] = '#000000';
                node[`${prefix}ButtonTextColor`] = '#ffffff';
            }
        });
    };

    const handleLinkColorChange = value => write('LinkColor', value);

    const handleLayoutChange = value => write('Layout', value);

    const handleAlignmentChange = value => write('Alignment', value);

    const handleShowDividersToggle = () => write('ShowDividers', !read('ShowDividers'));

    const handleImageChange = async (files) => {
        const imgPreviewUrl = URL.createObjectURL(files[0]);
        try {
            const {width, height} = await getImageDimensions(imgPreviewUrl);
            const result = await imageUploader.upload(files);

            updateNode((node) => {
                node[`${prefix}ImageUrl`] = result?.[0].url;
                node[`${prefix}ImageWidth`] = width;
                node[`${prefix}ImageHeight`] = height;
            });
        } finally {
            URL.revokeObjectURL(imgPreviewUrl);
        }
    };

    const onFileChange = async (event) => {
        handleImageChange(event.target.files);
    };

    const onRemoveMedia = () => {
        updateNode((node) => {
            node[`${prefix}ImageUrl`] = null;
            node[`${prefix}ImageWidth`] = null;
            node[`${prefix}ImageHeight`] = null;
        });
    };

    async function handleImageDrop(files) {
        await handleImageChange(files);
    }

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const headingEditor = read('HeadingEditor');
    const textEditor = read('TextEditor');

    React.useEffect(() => {
        headingEditor?.setEditable(isEditing);
        textEditor?.setEditable(isEditing);
    }, [isEditing, headingEditor, textEditor]);

    return (
        <>
            <PaywallV2Card
                access={access}
                activeTarget={displayTarget}
                alignment={read('Alignment')}
                buttonColor={read('ButtonColor')}
                buttonText={read('ButtonText')}
                buttonTextColor={read('ButtonTextColor')}
                buttonUrl={read('ButtonUrl')}
                color={read('BackgroundColor')}
                handleButtonColor={handleButtonColorChange}
                handleColorChange={handleBackgroundColorChange}
                handleLinkColorChange={handleLinkColorChange}
                hasEmailPaywall={!defaultsTarget && hasEmailPaywall}
                headingEditor={headingEditor}
                headingEditorInitialState={read('HeadingEditorInitialState')}
                imageDragHandler={imageDragHandler}
                imageSrc={read('ImageUrl')}
                imageUploader={imageUploader}
                isEditing={isEditing}
                layout={read('Layout')}
                linkColor={read('LinkColor')}
                setActiveTarget={setActiveTarget}
                setFileInputRef={ref => fileInputRef.current = ref}
                showButton={read('ShowButton')}
                showDividers={read('ShowDividers')}
                textEditor={textEditor}
                textEditorInitialState={read('TextEditorInitialState')}
                updateAlignment={handleAlignmentChange}
                updateButtonText={handleButtonTextChange}
                updateButtonUrl={handleButtonUrlChange}
                updateLayout={handleLayoutChange}
                updateShowButton={handleShowButtonToggle}
                updateShowDividers={handleShowDividersToggle}
                onFileChange={onFileChange}
                onRemoveMedia={onRemoveMedia}
            />

            {/* Edit only - no "save as snippet". A snippet is content you drop
                into any post, and this card isn't that: it belongs to the one
                post's access, which is what puts it there and takes it away.
                Reinserting it elsewhere would carry an access level that has
                nothing to do with the post it lands in. */}
            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-paywall-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
};
