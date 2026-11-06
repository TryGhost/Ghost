import { type ReactNode } from 'react';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  SortableList,
} from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { optionText } from '@tryghost/metafield-types/structure';
import {
  type ListInputs,
  type OptionRow,
  type UnsavedOptionRow,
  withAdded,
  withMoved,
  withNewOption,
  withOptionText,
  withTypedAdded,
  withoutOption,
} from '@/shared/member-custom-fields/list-inputs';
import {
  type CustomFieldErrors,
  optionErrorKey,
} from '@/shared/member-custom-fields/custom-field-values';

/** How an option is named to someone who can't see its row: by its text, or by its place. */
const optionName = (option: OptionRow, index: number) =>
  optionText(option.text) || `option ${index + 1}`;

/**
 * An option's text where it can't be changed, drawn in a disabled input's box as a saved field's
 * type is. The box grows with a long option rather than holding it to one line, and wraps anywhere
 * rather than between words, since an option can be one unbroken word that would otherwise widen
 * the whole form.
 */
export function FixedOptionText({
  text,
  problemId,
  children,
}: {
  text: string;
  /** The id of the problem shown beneath the option, if it has one. */
  problemId?: string;
  children?: ReactNode;
}) {
  return (
    <InputGroup className="h-auto min-h-(--control-height)" data-disabled>
      <span
        aria-describedby={problemId}
        aria-invalid={Boolean(problemId) || undefined}
        className="flex min-w-0 flex-1 cursor-not-allowed items-center px-3 py-1 text-control wrap-anywhere text-muted-foreground"
      >
        {text}
      </span>
      {children}
    </InputGroup>
  );
}

/** An option's row with the problem it has, if any, beneath it. */
function OptionWithProblem({
  problem,
  problemId,
  children,
}: {
  problem?: string;
  problemId: string;
  children: ReactNode;
}) {
  return (
    <Stack className="min-w-0 grow" gap="xs">
      {children}
      {problem && <FieldError id={problemId}>{problem}</FieldError>}
    </Stack>
  );
}

/** Removes an option. Shown while its row is hovered or has focus, and hidden while disabled. */
function RemoveOptionButton({
  name,
  describedBy,
  onRemove,
}: {
  name: string;
  describedBy?: string;
  onRemove: () => void;
}) {
  return (
    <InputGroupButton
      aria-describedby={describedBy}
      aria-label={`Remove ${name}`}
      className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 disabled:invisible"
      shape="rounded"
      size="icon-xs"
      variant="secondary"
      onClick={onRemove}
    >
      <LucideIcon.Trash2 />
    </InputGroupButton>
  );
}

interface OptionRowProps {
  index: number;
  problem?: string;
  problemId: string;
  onRemove: () => void;
}

/** An option not yet saved: an input, as a tier's benefit is, so a typo is fixed in place. */
function UnsavedOption({
  option,
  index,
  problem,
  problemId,
  onRemove,
  onText,
}: OptionRowProps & { option: UnsavedOptionRow; onText: (text: string) => void }) {
  const describedBy = problem ? problemId : undefined;
  return (
    <OptionWithProblem problem={problem} problemId={problemId}>
      <InputGroup>
        <InputGroupInput
          aria-describedby={describedBy}
          aria-invalid={Boolean(problem) || undefined}
          aria-label={`Option ${index + 1}`}
          value={option.text}
          onChange={(event) => onText(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <RemoveOptionButton
            describedBy={describedBy}
            name={optionName(option, index)}
            onRemove={onRemove}
          />
        </InputGroupAddon>
      </InputGroup>
    </OptionWithProblem>
  );
}

/** An option the field is saved with: its text is fixed, but it can be moved or removed. */
function SavedOption({
  option,
  index,
  problem,
  problemId,
  onRemove,
}: OptionRowProps & { option: OptionRow }) {
  const describedBy = problem ? problemId : undefined;
  return (
    <OptionWithProblem problem={problem} problemId={problemId}>
      <FixedOptionText problemId={describedBy} text={option.text}>
        <InputGroupAddon align="inline-end" className="py-0">
          <RemoveOptionButton
            describedBy={describedBy}
            name={optionName(option, index)}
            onRemove={onRemove}
          />
        </InputGroupAddon>
      </FixedOptionText>
    </OptionWithProblem>
  );
}

/**
 * The options a list field offers, in the order members are offered them: added one at a time or
 * as a pasted list with one option per line, dragged to reorder, and removed. An option not yet
 * saved can be changed. An option the field is saved with keeps its text, so fixing a typo in one
 * is removing it and adding the right one.
 */
export function ListOptionsEditor({
  list,
  errors,
  idPrefix,
  onChange,
  onRefuse,
}: {
  list: ListInputs;
  errors: CustomFieldErrors;
  idPrefix: string;
  /** Each change is made to the inputs as they stand when it applies. */
  onChange: (change: (list: ListInputs) => ListInputs) => void;
  /** Says why the typed text wasn't added, until the inputs next change. */
  onRefuse: (reason: string) => void;
}) {
  const add = (texts: readonly string[]) => {
    onChange((current) => withAdded(current, texts));
  };

  // Typed text is added only if the rules take it as the list's next option, and stays in the
  // input with their reason if not. A pasted list skips its repeats instead, as tidying a list
  // someone already has.
  const addTyped = () => {
    const added = withTypedAdded(list);
    if ('refused' in added) {
      onRefuse(added.refused);
      return;
    }
    onChange(() => added);
  };

  const listProblem = errors.options;
  const typedProblem = errors.newOption;
  const optionProblem = (option: OptionRow) => errors[optionErrorKey(option)];
  const rows = list.options.map((option, index) => ({ id: option.id, option, index }));

  return (
    <FieldSet
      data-invalid={
        Boolean(listProblem || typedProblem || list.options.some(optionProblem)) || undefined
      }
    >
      <FieldLegend variant="label">Options</FieldLegend>
      <Stack gap="sm">
        <div>
          <SortableList
            getDragHandleLabel={({ option, index }) => `Reorder ${optionName(option, index)}`}
            items={rows}
            itemSeparator={false}
            renderItem={({ option, index }) => {
              const props = {
                index,
                problem: optionProblem(option),
                problemId: `${idPrefix}-option-${index}-error`,
                onRemove: () => onChange((current) => withoutOption(current, option)),
              };
              return option.saved ? (
                <SavedOption option={option} {...props} />
              ) : (
                <UnsavedOption
                  option={option}
                  {...props}
                  onText={(text) => onChange((current) => withOptionText(current, option, text))}
                />
              );
            }}
            onMove={(id, overId) => onChange((current) => withMoved(current, id, overId))}
          />
          <Inline align="center" className="py-1" gap="md">
            <LucideIcon.Plus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <Field className="w-full">
              <FieldLabel className="sr-only" htmlFor={`${idPrefix}-new-option`}>
                New option
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  aria-describedby={
                    [
                      typedProblem && `${idPrefix}-new-option-error`,
                      listProblem && `${idPrefix}-options-error`,
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  aria-invalid={Boolean(listProblem || typedProblem) || undefined}
                  id={`${idPrefix}-new-option`}
                  placeholder="Add an option"
                  value={list.newOption}
                  onChange={(event) => {
                    const newOption = event.target.value;
                    onChange((current) => withNewOption(current, newOption));
                  }}
                  onKeyDown={(event) => {
                    // Enter that confirms what an input method is composing isn't adding an
                    // option: the composed text isn't in the input yet.
                    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
                      return;
                    }
                    // Enter adds the option rather than saving the form around it.
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.stopPropagation();
                      addTyped();
                    }
                  }}
                  // A paste of several lines is a list someone already has, so each line is an
                  // option. Text already typed is kept, around the paste as the input would have
                  // placed it.
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData('text');
                    if (!/\r?\n/.test(pasted)) {
                      return;
                    }
                    event.preventDefault();
                    const { selectionStart, selectionEnd } = event.currentTarget;
                    const typed = list.newOption;
                    const before = typed.slice(0, selectionStart ?? typed.length);
                    const after = typed.slice(selectionEnd ?? typed.length);
                    add(`${before}${pasted}${after}`.split(/\r?\n/));
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Add option"
                    shape="rounded"
                    size="icon-xs"
                    variant="default"
                    onClick={addTyped}
                  >
                    <LucideIcon.Plus />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {typedProblem && (
                <FieldError id={`${idPrefix}-new-option-error`}>{typedProblem}</FieldError>
              )}
            </Field>
          </Inline>
        </div>
        {listProblem && <FieldError id={`${idPrefix}-options-error`}>{listProblem}</FieldError>}
      </Stack>
    </FieldSet>
  );
}
