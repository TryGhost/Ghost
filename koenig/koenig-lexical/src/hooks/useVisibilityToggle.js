import {$getNodeByKey} from 'lexical';

export const useVisibilityToggle = (editor, nodeKey, cardConfig) => {
    const isStripeEnabled = cardConfig?.stripeEnabled;

    const dropdownOptions = () => {
        if (isStripeEnabled) {
            return [{
                label: 'All members',
                name: ''
            }, {
                label: 'Free members',
                name: 'status:free'
            }, {
                label: 'Paid members',
                name: 'status:-free'
            }];
        }
    };

    let isVisibilityActive = false;
    let showOnWeb = true;
    let showOnEmail = true;
    let segment = '';
    let message = '';

    editor.getEditorState().read(() => {
        const htmlNode = $getNodeByKey(nodeKey);
        const visibility = htmlNode.visibility;

        isVisibilityActive = htmlNode.getIsVisibilityActive();
        showOnWeb = visibility.showOnWeb;
        showOnEmail = visibility.showOnEmail;
        segment = visibility.segment;
    });

    if (isVisibilityActive) {
        let hiddenNewsletter = '';

        if (segment === 'status:free') {
            hiddenNewsletter = 'paid newsletter';
        } else if (segment === 'status:-free') {
            hiddenNewsletter = 'free newsletter';
        }

        if (!showOnWeb && !showOnEmail) {
            message = 'Hidden on website and newsletter';
        } else if (showOnWeb && !showOnEmail) {
            message = 'Hidden in newsletter';
        } else if (showOnWeb && showOnEmail && hiddenNewsletter) {
            message = `Hidden in ${hiddenNewsletter}`;
        } else if (!showOnWeb && showOnEmail && !hiddenNewsletter) {
            message = 'Hidden on website';
        } else if (!showOnWeb && showOnEmail && hiddenNewsletter) {
            message = `Hidden on website and ${hiddenNewsletter}`;
        }
    }
    
    const toggleEmail = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.visibility = {...node.visibility, showOnEmail: !node.visibility.showOnEmail};
        });
    };
    
    const toggleWeb = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.visibility = {...node.visibility, showOnWeb: !node.visibility.showOnWeb};
        });
    };
    
    const toggleSegment = (name) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.visibility = {...node.visibility, segment: name};
        });
    };

    return [toggleEmail, toggleSegment, toggleWeb, segment, showOnEmail, showOnWeb, dropdownOptions(), message];
};
