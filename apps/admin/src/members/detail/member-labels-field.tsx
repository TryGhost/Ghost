import React from 'react';
import {LabelPicker} from '@/members/label-picker';
import {resolveSlugsToLabels} from './member-detail-edit';
import {useLabelPicker} from '@/members/hooks/use-label-picker';
import type {Label} from '@tryghost/admin-x-framework/api/labels';
import type {MemberEditableLabel} from './member-detail-edit';

interface MemberLabelsFieldProps {
    labels: MemberEditableLabel[];
    disabled?: boolean;
    onChange: (labels: MemberEditableLabel[]) => void;
}

const MemberLabelsField: React.FC<MemberLabelsFieldProps> = ({labels, disabled, onChange}) => {
    const selectedSlugs = labels.map(label => label.slug);

    // Always read the latest labels in async callbacks (avoids a stale render closure
    // when a create resolves after the user has also toggled something).
    const labelsRef = React.useRef(labels);
    labelsRef.current = labels;

    // Persistent slug → {name, slug} lookup so a selection change can turn slugs back
    // into full label objects. A ref-held cache is safe to top up during render.
    const knownRef = React.useRef<Map<string, MemberEditableLabel>>(new Map());
    const remember = (list: Array<{name: string; slug: string}>) => {
        for (const label of list) {
            knownRef.current.set(label.slug, {name: label.name, slug: label.slug});
        }
    };
    remember(labels);

    const picker = useLabelPicker({
        selectedSlugs,
        onSelectionChange: slugs => onChange(resolveSlugsToLabels(slugs, knownRef.current))
    });
    remember(picker.labels);

    // `picker.createLabel` selects the new slug *before* we know its display name, so
    // the selection change above briefly resolves it to a slug-as-name placeholder.
    // Once the create resolves we know the real name: reconcile against the *live*
    // selection (labelsRef, so a concurrent removal isn't undone) and guarantee the
    // new label is present with its real name — otherwise it would be saved as its
    // slug and the server (which matches labels by name) would create a duplicate.
    const handleCreate = async (name: string): Promise<Label | undefined> => {
        const created = await picker.createLabel(name);
        if (created) {
            const createdLabel = {name: created.name, slug: created.slug};
            knownRef.current.set(created.slug, createdLabel);
            const others = labelsRef.current.filter(label => label.slug !== created.slug);
            onChange([...others, createdLabel]);
        }
        return created;
    };

    return (
        <div
            className={disabled ? 'pointer-events-none opacity-60' : undefined}
            data-testid='member-labels-field'
            // `inert` (not just pointer-events) so the combobox can't be keyboard-edited
            // mid-save, which would be silently discarded when the save reseeds the draft.
            {...(disabled ? {inert: ''} : {})}
        >
            <LabelPicker
                isCreating={picker.isCreating}
                labels={picker.labels}
                optionSource={picker.optionSource}
                // The 'Labels' Label above already contextualizes this field —
                // 'Search labels...' inside the input would be visually noisy.
                placeholder=''
                resolvedSelectedLabels={picker.resolvedSelectedLabels}
                selectedSlugs={selectedSlugs}
                onCreate={handleCreate}
                onDelete={picker.deleteLabel}
                onEdit={picker.editLabel}
                onToggle={picker.toggleLabel}
            />
        </div>
    );
};

export default MemberLabelsField;
