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
  withAdded,
  withMoved,
  withNewOption,
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
 * An option's text, drawn in an input's box like a tier's benefits but read rather than edited,
 * since an option's text is what names it. The box grows with a long option rather than holding it
 * to one line, and wraps anywhere rather than between words, since an option can be one unbroken
 * word that would otherwise widen the whole form.
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
    <InputGroup className="h-auto min-h-(--control-height)">
      <span
        aria-describedby={problemId}
        aria-invalid={Boolean(problemId) || undefined}
        className="flex min-w-0 flex-1 items-center px-3 py-1.5 text-control wrap-anywhere"
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

/** An option in the list: its text, which can't be changed, and a button to remove it. */
function ListedOption({
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
        <InputGroupAddon align="inline-end">
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
 * as a pasted list with one option per line, dragged to reorder, and removed. An option can't be
 * renamed: its text is all that names it, so different text is a different option. Changing a typo
 * is removing the option and adding the right one, and members who picked the old text keep it.
 */
export function ListOptionsEditor({
  list,
  errors,
  idPrefix,
  onChange,
}: {
  list: ListInputs;
  errors: CustomFieldErrors;
  idPrefix: string;
  /** Each change is made to the inputs as they stand when it applies. */
  onChange: (change: (list: ListInputs) => ListInputs) => void;
}) {
  const add = (texts: readonly string[]) => {
    onChange((current) => withAdded(current, texts));
  };

  const addTyped = () => add([list.newOption]);

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
            renderItem={({ option, index }) => (
              <ListedOption
                index={index}
                option={option}
                problem={optionProblem(option)}
                problemId={`${idPrefix}-option-${index}-error`}
                onRemove={() => onChange((current) => withoutOption(current, option))}
              />
            )}
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
