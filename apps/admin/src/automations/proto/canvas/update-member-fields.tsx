import React from 'react';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import {
  CUSTOM_FIELDS,
  MEMBER_UPDATE_OPERATIONS,
  type MemberUpdateOperation,
  type UpdateMemberAction,
} from '@/automations/proto/shared/update-member';
import { SearchableSelectField } from '@/automations/proto/shared/searchable-select-field';
import { canCreateLabel, createLabel, useLabels } from '@/automations/proto/shared/labels';

// ---------------------------------------------------------------------------
// The Update member card's inline form.
//
// On the card like every other step's settings — the canvas rule this proto has
// followed since the right panel went away. The operation select is always
// there; what sits under it depends on the answer, and for unsubscribing that's
// nothing at all.
//
// Two selects and sometimes an input, matching the Wait card's metrics (h-9,
// the base Input height) so a flow of mixed steps reads as one form rather than
// as cards from different screens.
// ---------------------------------------------------------------------------

export const UpdateMemberFields: React.FC<{
  data: UpdateMemberAction['data'];
  onChange: (next: UpdateMemberAction['data']) => void;
}> = ({ data, onChange }) => {
  const labels = useLabels();

  return (
    <Stack gap="md">
      {/* No field label: the card's header already says "Update member", and
          this select is the sentence that finishes it. */}
      <Select
        value={data.operation}
        onValueChange={(next) =>
          // Switching operation keeps whatever the other operations had been
          // set to — the fields are all held on one data bag for exactly this
          // reason. Someone flipping to unsubscribe to see what it looks like
          // shouldn't lose the label they'd picked.
          onChange({ ...data, operation: next as MemberUpdateOperation })
        }
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        {/* Track the card while the canvas moves, like every menu out here. */}
        <SelectContent updatePositionStrategy="always">
          {MEMBER_UPDATE_OPERATIONS.map((operation) => (
            <SelectItem key={operation.value} value={operation.value}>
              {operation.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {data.operation === 'label' && (
        <div className="flex gap-2">
          {/* Add-vs-remove is a direction on the label answer rather than its
              own operation — see MEMBER_UPDATE_OPERATIONS. Narrow, because the
              label beside it is the part that varies. */}
          <Select
            value={data.label_mode}
            onValueChange={(next) => onChange({ ...data, label_mode: next as 'add' | 'remove' })}
          >
            <SelectTrigger className="h-9 w-32 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent updatePositionStrategy="always">
              <SelectItem value="add">Add</SelectItem>
              <SelectItem value="remove">Remove</SelectItem>
            </SelectContent>
          </Select>
          <div className="min-w-0 flex-1">
            {/* The same field the label TRIGGER uses, creation included: a
                publisher automating "tag them once they've read the welcome"
                is inventing that label right now, and sending them to the
                members screen to make it first is the detour the segment
                builder exists to refuse. */}
            <SearchableSelectField
              canCreate={(query) => canCreateLabel(labels, query)}
              options={labels}
              placeholder="Choose a label"
              searchLabel="Search labels"
              selectedId={data.label_id}
              onCreate={(name) => createLabel(name).id}
              onSelect={(labelId) => onChange({ ...data, label_id: labelId })}
            />
          </div>
        </div>
      )}

      {data.operation === 'custom_field' && (
        <div className="flex gap-2">
          <Select
            value={data.field_id ?? ''}
            onValueChange={(next) => onChange({ ...data, field_id: next })}
          >
            <SelectTrigger className="h-9 w-40 shrink-0">
              <SelectValue placeholder="Choose a field" />
            </SelectTrigger>
            <SelectContent updatePositionStrategy="always">
              {CUSTOM_FIELDS.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Field value"
            className="h-9 min-w-0 flex-1"
            placeholder={
              CUSTOM_FIELDS.find((field) => field.id === data.field_id)?.placeholder ?? 'Value'
            }
            value={data.field_value}
            onChange={(event) => onChange({ ...data, field_value: event.target.value })}
          />
        </div>
      )}

      {/* Unsubscribing renders nothing, and says so. The operation takes no
          argument — that's what distinguishes it from the other two — and a
          card whose body ends at the select would read as unfinished rather
          than as complete. One line is cheaper than the doubt. */}
      {data.operation === 'unsubscribe' && (
        <p className="text-control text-muted-foreground">
          Stops all email to this member. They stay a member and keep their access.
        </p>
      )}
    </Stack>
  );
};
