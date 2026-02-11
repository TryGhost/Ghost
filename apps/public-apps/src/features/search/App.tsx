import {Component, createRef} from 'react';
import AppContext from './AppContext';
import PopupModal from './components/PopupModal';
import SearchIndex from './SearchIndex';

// Simple inline translations for search (TODO: integrate with i18n properly later)
const translations: Record<string, Record<string, string>> = {
    en: {
        'Search posts, tags and authors': 'Search posts, tags and authors',
        'Cancel': 'Cancel',
        'Tags': 'Tags',
        'Posts': 'Posts',
        'Authors': 'Authors',
        'Show more results': 'Show more results',
        'No matches found': 'No matches found'
    }
};

function createI18n(locale: string) {
    const t = (key: string) => translations[locale]?.[key] || translations.en[key] || key;
    const dir = () => 'ltr'; // TODO: support RTL languages
    return {t, dir};
}

interface AppProps {
    adminUrl: string;
    apiKey?: string;
    inlineStyles?: string;
    locale: string;
}

interface AppState {
    searchIndex: SearchIndex;
    showPopup: boolean;
    indexStarted: boolean;
    indexComplete: boolean;
    searchValue: string;
    t: (key: string) => string;
    dir: 'ltr' | 'rtl';
    scrollbarWidth: number;
}

export default class App extends Component<AppProps, AppState> {
    inputRef = createRef<HTMLInputElement>();
    bodyScroll?: string;
    bodyMargin?: string;
    hashHandler?: () => void;
    handleKeyDown?: (e: KeyboardEvent) => void;
    clickHandler?: (e: Event) => void;
    customTriggerButtons?: NodeListOf<Element>;

    constructor(props: AppProps) {
        super(props);

        const i18nLanguage = this.props.locale || 'en';
        const i18n = createI18n(i18nLanguage);
        const dir = (i18n.dir() || 'ltr') as 'ltr' | 'rtl';

        const searchIndex = new SearchIndex({
            adminUrl: props.adminUrl,
            apiKey: props.apiKey,
            dir
        });

        this.state = {
            searchIndex,
            showPopup: false,
            indexStarted: false,
            indexComplete: false,
            searchValue: '',
            t: i18n.t,
            dir,
            scrollbarWidth: 0
        };
    }

    componentDidMount() {
        const scrollbarWidth = this.getScrollbarWidth();
        this.setState({scrollbarWidth});
        this.initSetup();
    }

    componentDidUpdate(_prevProps: AppProps, prevState: AppState) {
        if (prevState.showPopup !== this.state.showPopup) {
            this.handleBodyScroll();
        }

        if (this.state.showPopup !== prevState?.showPopup && !this.state.showPopup) {
            this.setState({searchValue: ''});
        }

        if (this.state.showPopup && !this.state.indexStarted) {
            this.setupSearchIndex();
        }
    }

    componentWillUnmount() {
        if (this.hashHandler) {
            window.removeEventListener('hashchange', this.hashHandler, false);
        }
        if (this.handleKeyDown) {
            window.removeEventListener('keydown', this.handleKeyDown, false);
        }
    }

    handleBodyScroll() {
        try {
            if (this.state.showPopup) {
                this.bodyScroll = window.document?.body?.style?.overflow;
                this.bodyMargin = window.getComputedStyle(document.body).getPropertyValue('margin-right');
                window.document.body.style.overflow = 'hidden';
                if (this.state.scrollbarWidth && document.body.scrollHeight > window.innerHeight) {
                    window.document.body.style.marginRight = `calc(${this.bodyMargin} + ${this.state.scrollbarWidth}px)`;
                }
            } else {
                window.document.body.style.overflow = this.bodyScroll || '';
                if (!this.bodyMargin || this.bodyMargin === '0px') {
                    window.document.body.style.marginRight = '';
                } else {
                    window.document.body.style.marginRight = this.bodyMargin;
                }
            }
        } catch {
            // Ignore scroll handling errors
        }
    }

    async setupSearchIndex() {
        this.setState({indexStarted: true});
        await this.state.searchIndex.init();
        this.setState({indexComplete: true});
    }

    initSetup() {
        this.handleSearchUrl();
        this.addKeyboardShortcuts();
        this.setupCustomTriggerButton();
        this.hashHandler = () => this.handleSearchUrl();
        window.addEventListener('hashchange', this.hashHandler, false);
    }

    getScrollbarWidth(): number {
        const div = document.createElement('div');
        div.style.visibility = 'hidden';
        div.style.overflow = 'scroll';
        document.body.appendChild(div);
        const scrollbarWidth = div.offsetWidth - div.clientWidth;
        document.body.removeChild(div);
        return scrollbarWidth;
    }

    setupCustomTriggerButton() {
        this.clickHandler = (event: Event) => {
            event.preventDefault();
            this.setState({showPopup: true});

            // Create temporary input for focus on mobile
            const tmpElement = document.createElement('input');
            tmpElement.style.opacity = '0';
            tmpElement.style.position = 'fixed';
            tmpElement.style.top = '0';
            document.body.appendChild(tmpElement);
            tmpElement.focus();

            setTimeout(() => {
                this.inputRef.current?.focus();
                document.body.removeChild(tmpElement);
            }, 150);
        };

        this.customTriggerButtons = this.getCustomTriggerButtons();
        this.customTriggerButtons.forEach((button) => {
            button.removeEventListener('click', this.clickHandler!);
            button.addEventListener('click', this.clickHandler!);
        });
    }

    getCustomTriggerButtons(): NodeListOf<Element> {
        return document.querySelectorAll('[data-ghost-search]');
    }

    handleSearchUrl() {
        const [path] = window.location.hash.substring(1).split('?');
        if (path === '/search' || path === '/search/') {
            this.setState({showPopup: true});
            window.history.replaceState('', document.title, window.location.pathname);
        }
    }

    addKeyboardShortcuts() {
        const customTriggerButtons = this.getCustomTriggerButtons();
        if (!customTriggerButtons?.length) {
            return;
        }
        this.handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && e.metaKey) {
                this.setState({showPopup: true});
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    dispatch = (action: string, data?: Record<string, unknown>) => {
        if (action === 'update') {
            this.setState((prevState) => ({
                ...prevState,
                ...data
            } as AppState));
        }
    };

    render() {
        return (
            <AppContext.Provider value={{
                page: 'search',
                showPopup: this.state.showPopup,
                adminUrl: this.props.adminUrl,
                inlineStyles: this.props.inlineStyles,
                searchIndex: this.state.searchIndex,
                indexComplete: this.state.indexComplete,
                searchValue: this.state.searchValue,
                inputRef: this.inputRef,
                dispatch: this.dispatch,
                t: this.state.t,
                dir: this.state.dir,
                posts: [],
                authors: [],
                tags: [],
                action: '',
                lastPage: '',
                pageData: {}
            }}>
                <PopupModal />
            </AppContext.Provider>
        );
    }
}
