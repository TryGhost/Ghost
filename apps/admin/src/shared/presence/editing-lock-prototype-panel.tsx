import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShadeScope } from '@tryghost/shade/app';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  resetEditingLockPrototype,
  simulateAlexOpeningPrototype,
  simulateAlexTakingOverPrototype,
  useEditingLockPrototype,
} from './editing-lock-prototype';

// Research controls only: these stand in for actions in the other staff member's browser.
export function EditingLockPrototypePanel() {
  const { enabled, experience, phase, alexPresent } = useEditingLockPrototype();
  const [collapsed, setCollapsed] = useState(false);
  if (!enabled) {
    return null;
  }
  const status =
    phase === 'taking-over'
      ? 'You’re taking over…'
      : phase === 'locked'
        ? 'Alex is editing. You’re viewing.'
        : alexPresent
          ? 'You’re editing. Alex is viewing.'
          : 'You’re editing. Alex hasn’t opened the post.';

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
              <Text className="text-base" role="status" tone="secondary">
                {status}
              </Text>
              {experience === 'being-taken-over' && (
                <Stack gap="sm">
                  <Button
                    disabled={alexPresent}
                    size="sm"
                    variant="secondary"
                    onClick={simulateAlexOpeningPrototype}
                  >
                    Alex opens the post
                  </Button>
                  <Button
                    disabled={!alexPresent || phase !== 'editing'}
                    size="sm"
                    variant="secondary"
                    onClick={simulateAlexTakingOverPrototype}
                  >
                    Alex takes over
                  </Button>
                </Stack>
              )}
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
