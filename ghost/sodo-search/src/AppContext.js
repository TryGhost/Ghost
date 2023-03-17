// Ref: https://reactjs.org/docs/context.html
const React = require('react');

const AppContext = React.createContext({
    posts: [],
    authors: [],
    tags: [],
    action: '',
    lastPage: '',
    page: '',
    pageData: {},
    dispatch: (_action, _data) => {},
    searchIndex: null,
    indexComplete: false,
    searchValue: ''
});

export default AppContext;
