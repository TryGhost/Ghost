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
    dispatch: (action, data) => {
        return {action, data};
    }
});

export default AppContext;
