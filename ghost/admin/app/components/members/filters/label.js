import {MATCH_RELATION_OPTIONS} from './relation-options';

export const LABEL_FILTER = {
    label: 'Label', 
    name: 'label', 
    valueType: 'array', 
    columnLabel: 'Label', 
    relationOptions: MATCH_RELATION_OPTIONS,
    getColumnValue: (member) => {
        return {
            class: 'gh-members-list-labels',
            text: (member.labels ?? []).map(label => label.name).join(', ')
        };
    }
};
