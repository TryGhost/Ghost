import {$getNodeByKey} from 'lexical';
import {useEffect, useState} from 'react';
export const useVisibilityToggle = (editor, nodeKey, initialVisibility) => {
    const [emailVisibility, setEmailVisibility] = useState(initialVisibility.showOnEmail);
    const [webVisibility, setWebVisibility] = useState(initialVisibility.showOnWeb);
    const [segment, setSegment] = useState(initialVisibility.segment);
    const [message, setMessage] = useState('');

    const dropdownOptions = [{
        label: 'All subscribers',
        name: ''
    }, {
        label: 'Free subscribers',
        name: 'status:free'
    }, {
        label: 'Paid subscribers',
        name: 'status:-free'
    }];

    const updateMessage = () => {
        let segmentLabel = 'all subscribers';

        if (segment === 'status:free') {
            segmentLabel = 'free subscribers';
        } else if (segment === 'status:-free') {
            segmentLabel = 'paid subscribers';
        }

        let combinedMessage = '';

        if (emailVisibility && webVisibility) {
            combinedMessage = `Shown on web and in email to ${segmentLabel}`;
        } else if (emailVisibility) {
            combinedMessage = `Only shown in email to ${segmentLabel}`;
        } else if (webVisibility) {
            combinedMessage = `Only shown on web`;
        } else {
            combinedMessage = 'Hidden from both email and web';
        }

        setMessage(combinedMessage);
    };

    useEffect(() => {
        updateMessage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emailVisibility, webVisibility, segment]);

    const toggleEmail = (e) => {
        editor.update(() => {
            setEmailVisibility(e.target.checked);
            const node = $getNodeByKey(nodeKey);
            node.visibility = {...node.visibility, showOnEmail: e.target.checked};
        });
    };

    const toggleWeb = (e) => {
        editor.update(() => {
            setWebVisibility(e.target.checked);
            const node = $getNodeByKey(nodeKey);
            node.visibility = {...node.visibility, showOnWeb: e.target.checked};
        });
    };

    const toggleSegment = (name) => {
        editor.update(() => {
            setSegment(name);
            const node = $getNodeByKey(nodeKey);
            node.visibility = {...node.visibility, segment: name};
        });
    };

    return [toggleEmail, toggleSegment, toggleWeb, segment, emailVisibility, webVisibility, dropdownOptions, message];
};
