import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShadeScope } from '@tryghost/shade/app';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  resetEditingLockPrototype,
  setMultiplePeoplePrototype,
  simulatePersonOpeningPrototype,
  simulatePersonClosingPrototype,
  simulatePersonTakingOverPrototype,
  PROTOTYPE_STAFF,
  useEditingLockPrototype,
} from './editing-lock-prototype';

// Research controls only: these stand in for actions in the other staff member's browser.
export function EditingLockPrototypePanel() {
  const { enabled, experience, phase, editorId, present, multiplePeople } =
    useEditingLockPrototype();
  const [collapsed, setCollapsed] = useState(false);
  if (!enabled) {
    return null;
  }
  const editor = PROTOTYPE_STAFF.find((person) => person.id === editorId);
  const status =
    phase === 'taking-over'
      ? 'You’re taking over…'
      : phase === 'locked'
        ? `${editor?.name} is editing. You’re viewing.`
        : 'You’re editing this post.';

  return createPortal(
    <ShadeScope>
      <Box
        aria-label="Editing lock prototype controls"
        className="fixed right-5 bottom-16 z-40 w-72 max-w-[calc(100vw-4rem)] border border-border-default bg-surface-elevated shadow-md"
        data-testid="editing-lock-prototype-panel"
        padding="md"
        radius="lg"
        role="complementary"
      >
        <Stack gap="md">
          <Inline gap="sm" justify="between">
            <Text className="text-base" weight="semibold">
              Editing lock prototype
            </Text>
            <Button
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand prototype controls' : 'Collapse prototype controls'}
              size="icon-sm"
              variant="ghost"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <LucideIcon.ChevronUp /> : <LucideIcon.ChevronDown />}
            </Button>
          </Inline>
          {!collapsed && (
            <>
              <Select
                value={experience}
                onValueChange={(value) => {
                  if (value === 'taking-over' || value === 'being-taken-over') {
                    resetEditingLockPrototype(value);
                  }
                }}
              >
                <SelectTrigger aria-label="Prototype experience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taking-over">Taking over</SelectItem>
                  <SelectItem value="being-taken-over">Being taken over</SelectItem>
                </SelectContent>
              </Select>
              <Inline gap="sm" justify="between">
                <Label className="text-base" htmlFor="editing-lock-multiple-people">
                  Multiple people
                </Label>
                <Switch
                  checked={multiplePeople}
                  id="editing-lock-multiple-people"
                  onCheckedChange={setMultiplePeoplePrototype}
                />
              </Inline>
              <Text className="text-base" role="status" tone="secondary">
                {status}
              </Text>
              <Stack gap="md">
                {PROTOTYPE_STAFF.filter((person) => multiplePeople || person.id === 'alex').map(
                  (person) => {
                    const isPresent = present.includes(person.id);
                    const isEditor = editorId === person.id;
                    return (
                      <Inline key={person.id} gap="sm" justify="between">
                        <Stack gap="none">
                          <Text className="text-base" weight="medium">
                            {person.name}
                          </Text>
                          <Text size="xs" tone="secondary">
                            {!isPresent ? 'Not here' : isEditor ? 'Editing' : 'Viewing'}
                          </Text>
                        </Stack>
                        <Inline gap="xs">
                          <Button
                            aria-label={`${person.name} ${isPresent ? 'closes' : 'opens'} the post`}
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              isPresent
                                ? simulatePersonClosingPrototype(person.id)
                                : simulatePersonOpeningPrototype(person.id)
                            }
                          >
                            {isPresent ? 'Close' : 'Open'}
                          </Button>
                          <Button
                            aria-label={`${person.name} takes over`}
                            disabled={!isPresent || isEditor || phase === 'taking-over'}
                            size="sm"
                            variant="secondary"
                            onClick={() => simulatePersonTakingOverPrototype(person.id)}
                          >
                            Take over
                          </Button>
                        </Inline>
                      </Inline>
                    );
                  },
                )}
              </Stack>
              <Button size="sm" variant="outline" onClick={() => resetEditingLockPrototype()}>
                <LucideIcon.RotateCcw />
                Reset scenario
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </ShadeScope>,
    document.body,
  );
}
