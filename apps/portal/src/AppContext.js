// Ref: https://reactjs.org/docs/context.html
import React from 'react';

const AppContext = React.createContext({
    site: {},
    member: {},
    action: '',
    actionErrorMessage: null,
    lastPage: '',
    brandColor: '',
    pageData: {},
    doAction: (action, data) => {
        return {action, data};
    },
    dir: 'ltr'

});

export default AppContext;
