// Ref: https://reactjs.org/docs/context.html
const React = require('react');

const AppContext = React.createContext({
    site: {},
    member: {},
    action: '',
    brandColor: '',
    pageData: {},
    onAction: (action, data) => {
        return {action, data};
    }
});

export default AppContext;
