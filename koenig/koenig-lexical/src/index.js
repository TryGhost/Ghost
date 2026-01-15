/* Components */
import DesignSandbox from './components/DesignSandbox';
import KoenigCardWrapper from './components/KoenigCardWrapper';
import KoenigComposableEditor from './components/KoenigComposableEditor';
import KoenigComposer from './components/KoenigComposer';
import KoenigEditor from './components/KoenigEditor';
import KoenigEmailEditor from './components/KoenigEmailEditor';
import KoenigNestedComposer from './components/KoenigNestedComposer';

/* Plugins */
import AudioPlugin from './plugins/AudioPlugin';
import CallToActionPlugin from './plugins/CallToActionPlugin';
import CalloutPlugin from './plugins/CalloutPlugin';
import CardMenuPlugin from './plugins/CardMenuPlugin';
import DragDropPastePlugin from './plugins/DragDropPastePlugin';
import DragDropReorderPlugin from './plugins/DragDropReorderPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import ExternalControlPlugin from './plugins/ExternalControlPlugin';
import FilePlugin from './plugins/FilePlugin';
import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin';
import GalleryPlugin from './plugins/GalleryPlugin';
import HeaderPlugin from './plugins/HeaderPlugin';
import HorizontalRulePlugin from './plugins/HorizontalRulePlugin';
import HtmlOutputPlugin from './plugins/HtmlOutputPlugin';
import ImagePlugin from './plugins/ImagePlugin';
import KoenigBehaviourPlugin from './plugins/KoenigBehaviourPlugin';
import MarkdownPlugin from './plugins/MarkdownPlugin';
import MarkdownShortcutPlugin from './plugins/MarkdownShortcutPlugin';
import PlusCardMenuPlugin from './plugins/PlusCardMenuPlugin';
import ReplacementStringsPlugin from './plugins/ReplacementStringsPlugin';
import RestrictContentPlugin from './plugins/RestrictContentPlugin';
import SignupPlugin from './plugins/SignupPlugin';
import SlashCardMenuPlugin from './plugins/SlashCardMenuPlugin';
import TKCountPlugin from './plugins/TKCountPlugin';
import TogglePlugin from './plugins/TogglePlugin';
import VideoPlugin from './plugins/VideoPlugin';
import WordCountPlugin from './plugins/WordCountPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';

import AllDefaultPlugins from './plugins/AllDefaultPlugins';

/* Nodes */
import BASIC_NODES from './nodes/BasicNodes';
import DEFAULT_NODES from './nodes/DefaultNodes';
import EMAIL_NODES from './nodes/EmailNodes';
import MINIMAL_NODES from './nodes/MinimalNodes';

/* Transformers */
import {
    BASIC_TRANSFORMERS,
    CODE_BLOCK as CODE_BLOCK_TRANSFORMER,
    DEFAULT_TRANSFORMERS,
    ELEMENT_TRANSFORMERS,
    EMAIL_TRANSFORMERS,
    HR as HR_TRANSFORMER,
    MINIMAL_TRANSFORMERS
} from './plugins/MarkdownShortcutPlugin';

/* Exports ------------------------------------------------------------------ */

export * from './utils';

export {
    DesignSandbox,
    KoenigComposableEditor,
    KoenigComposer,
    KoenigEditor,
    KoenigEmailEditor,
    KoenigNestedComposer,
    KoenigCardWrapper,

    AudioPlugin,
    CalloutPlugin,
    CallToActionPlugin,
    CardMenuPlugin,
    DragDropPastePlugin,
    DragDropReorderPlugin,
    EmojiPickerPlugin,
    ExternalControlPlugin,
    FilePlugin,
    FloatingToolbarPlugin,
    GalleryPlugin,
    HeaderPlugin,
    HorizontalRulePlugin,
    HtmlOutputPlugin,
    ImagePlugin,
    KoenigBehaviourPlugin,
    MarkdownPlugin,
    MarkdownShortcutPlugin,
    PlusCardMenuPlugin,
    ReplacementStringsPlugin,
    RestrictContentPlugin,
    SignupPlugin,
    SlashCardMenuPlugin,
    TKCountPlugin,
    TogglePlugin,
    VideoPlugin,
    WordCountPlugin,
    ListPlugin,

    AllDefaultPlugins,

    DEFAULT_NODES,
    BASIC_NODES,
    EMAIL_NODES,
    MINIMAL_NODES,

    ELEMENT_TRANSFORMERS,
    HR_TRANSFORMER,
    CODE_BLOCK_TRANSFORMER,

    DEFAULT_TRANSFORMERS,
    BASIC_TRANSFORMERS,
    EMAIL_TRANSFORMERS,
    MINIMAL_TRANSFORMERS
};

// eslint-disable-next-line no-undef
export const version = __APP_VERSION__ ? __APP_VERSION__ : 'development';
