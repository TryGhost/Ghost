import React, { Component } from 'react';
import './App.css';
import AppContext from './AppContext';
import PopupModal from './components/PopupModal';
import SearchIndex from './search-index.js';

class App extends Component {
  state = {
    searchIndex: null,
    showPopup: false,
    indexStarted: false,
    indexComplete: false,
    searchValue: '',
  };

  inputRef = React.createRef();

  componentDidMount() {
    this.initSetup();
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.handleHashChange, false);
    window.removeEventListener('keydown', this.handleKeyDown, false);
  }

  initSetup() {
    this.handleSearchUrl();
    this.addKeyboardShortcuts();
    this.setupCustomTriggerButton();
    window.addEventListener('hashchange', this.handleHashChange, false);
  }

  setupSearchIndex = async () => {
    this.setState({ indexStarted: true });
    const searchIndex = new SearchIndex({
      adminUrl: this.props.adminUrl,
      apiKey: this.props.apiKey,
    });
    await searchIndex.init();
    this.setState({ searchIndex, indexComplete: true });
  };

  setupCustomTriggerButton() {
    const customTriggerButtons = this.getCustomTriggerButtons();
    customTriggerButtons.forEach((customTriggerButton) => {
      customTriggerButton.removeEventListener('click', this.handleClick);
      customTriggerButton.addEventListener('click', this.handleClick);
    });
  }

  getCustomTriggerButtons() {
    return document.querySelectorAll('[data-ghost-search]') || [];
  }

  handleSearchUrl() {
    const [path] = window.location.hash.substr(1).split('?');
    if (path === '/search' || path === '/search/') {
      this.setState({ showPopup: true });
      window.history.replaceState('', document.title, window.location.pathname);
    }
  }

  addKeyboardShortcuts() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    if (e.key === 'k' && e.metaKey) {
      this.setState({ showPopup: true });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  handleClick = (event) => {
    event.preventDefault();
    this.setState({ showPopup: true });

    const tmpElement = document.createElement('input');
    tmpElement.style.cssText = 'opacity: 0; position: fixed; top: 0;';
    document.body.appendChild(tmpElement);
    tmpElement.focus();

    setTimeout(() => {
      this.inputRef.current.focus();
      document.body.removeChild(tmpElement);
    }, 150);
  };

  handleHashChange = () => {
    this.handleSearchUrl();
  };

  render() {
    return (
      <AppContext.Provider
        value={{
          page: 'search',
          showPopup: this.state.showPopup,
          adminUrl: this.props.adminUrl,
          stylesUrl: this.props.stylesUrl,
          searchIndex: this.state.searchIndex,
          indexComplete: this.state.indexComplete,
          searchValue: this.state.searchValue,
          inputRef: this.inputRef,
          onAction: () => {},
          dispatch: (action, data) => {
            if (action === 'update') {
              this.setState((prevState) => ({ ...prevState, ...data }));
            }
          },
        }}
      >
        <PopupModal />
      </AppContext.Provider>
    );
  }
}

export default App;
