// Ref: https://reactjs.org/docs/context.html
import React from 'react';

const AppContext = React.createContext({
    site: {},
    member: {},
    action: '',
    lastPage: '',
    brandColor: '',
    pageData: {},
    onAction: (action, data) => {
        return {action, data};
    },
    t: () => {}

});

export default AppContext;
