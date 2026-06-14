import './styles/index.css';
import {StandaloneApp} from './app.tsx';

export {
    StandaloneApp as AdminXApp
};

// Opens the media library as a picker from outside the React app (the Ember
// editor). Prototype entry point for the media-in-use feature.
export {renderMediaLibrarySelector} from './media-library-selector';
