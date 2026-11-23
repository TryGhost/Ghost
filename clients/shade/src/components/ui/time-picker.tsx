import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

export interface TimePickerProps extends Omit<ComponentProps<'input'>, 'type' | 'size' | 'prefix'> {
  /**
   * Optional leading context, such as a timezone abbreviation. It takes the
   * clock icon's place, leaving a 12-hour locale's AM/PM room in narrow fields.
   */
  prefix?: ReactNode;
}

/** Native, keyboard-accessible time input. Values use HH:mm and remain consumer-owned. */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { className, prefix, disabled, step = 60, ...props },
  ref,
) {
  return (
    <InputGroup className={cn('min-w-0', className)} data-disabled={disabled}>
      <InputGroupAddon className={prefix ? 'text-sm font-normal' : undefined}>
        {prefix ?? <Clock aria-hidden="true" />}
      </InputGroupAddon>
      <InputGroupInput
        ref={ref}
        className="min-w-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        disabled={disabled}
        step={step}
        type="time"
        {...props}
      />
    </InputGroup>
  );
});
