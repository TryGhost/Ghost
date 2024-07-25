import {$getNodeByKey} from 'lexical';
import {useCallback, useEffect, useRef, useState} from 'react';

export const useVisibilityToggle = (editor, nodeKey, initialVisibility) => {
    const [emailVisibility, setEmailVisibility] = useState(false);
    const [freeMemberVisibility, setFreeMemberVisibility] = useState(true);
    const [paidMemberVisibility, setPaidMemberVisibility] = useState(true);

    // Ref to track the initial render
    const isInitialRender = useRef(true);

    useEffect(() => {
        setEmailVisibility(initialVisibility.emailOnly);
        parseNqlString(initialVisibility.segment);
    }, [initialVisibility]);

    const getNqlString = useCallback(() => {
        if (freeMemberVisibility && paidMemberVisibility) {
            return '';
        } else if (freeMemberVisibility && !paidMemberVisibility) {
            return 'status:free';
        } else if (paidMemberVisibility && !freeMemberVisibility) {
            return 'status:-free';
        } else {
            return 'status:-free+status:-paid';
        }
    }, [freeMemberVisibility, paidMemberVisibility]);

    const parseNqlString = (nql) => {
        if (!nql || nql === '') {
            setFreeMemberVisibility(true);
            setPaidMemberVisibility(true);
        } else if (nql === 'status:free') {
            setFreeMemberVisibility(true);
            setPaidMemberVisibility(false);
        } else if (nql === 'status:paid') {
            setFreeMemberVisibility(false);
            setPaidMemberVisibility(true);
        } else if (nql === 'status:-free+status:-paid') {
            setFreeMemberVisibility(false);
            setPaidMemberVisibility(false);
        }
    };

    const toggleEmail = (e) => {
        editor.update(() => {
            setEmailVisibility(e.target.checked);
            const node = $getNodeByKey(nodeKey);
            node.visibility = {...node.visibility, emailOnly: e.target.checked};
        });
    };

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            const nqlString = getNqlString();
            node.visibility = {...node.visibility, segment: nqlString};
        });
    }, [freeMemberVisibility, paidMemberVisibility, editor, nodeKey, getNqlString]);

    const toggleMembers = (e, name) => {
        if (name === 'free') {
            setFreeMemberVisibility(e.target.checked);
        } else if (name === 'paid') {
            setPaidMemberVisibility(e.target.checked);
        }
    };

    return [emailVisibility, toggleEmail, toggleMembers, freeMemberVisibility, paidMemberVisibility];
};
