// Ref: https://reactjs.org/docs/context.html
import React from 'react';

const AppContext = React.createContext({
    posts: [],
    authors: [],
    tags: [],
    action: '',
    lastPage: '',
    page: '',
    pageData: {},
    // eslint-disable-next-line no-unused-vars
    dispatch: (_action, _data) => {},
    searchIndex: null,
    indexComplete: false,
    searchValue: '',
    t: () => {}
});

export default AppContext;
