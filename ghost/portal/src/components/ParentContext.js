// Ref: https://reactjs.org/docs/context.html
const React = require('react');

export const ParentContext = React.createContext({
    site: {},
    member: {},
    action: '',
    brandColor: '',
    onAction: () => {}
});