import type { Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import {
  type AddAutomationData,
  addAutomationDataSchema,
  type EditAutomationData,
  editAutomationDataSchema,
  editAutomationStatusOnlySchema,
} from '../../../../../services/automations/automations-schemas';
import { buildInvalidAutomationPayloadMessage } from '../../../../../services/automations/util/build-invalid-automation-payload-message';

const messages = {
  invalidAutomationCreationPayload: 'Invalid automation payload.',
  invalidAutomationEditPayload: 'Invalid automation edit payload.',
  invalidAutomationStatus: 'Automation status must be one of: active, inactive, archived.',
  invalidStatusOnlyEdit:
    'Status-only automation edits can only set status to inactive or archived.',
};

function parseAddAutomation(data: unknown): AddAutomationData {
  const result = addAutomationDataSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new errors.ValidationError({
      message: buildInvalidAutomationPayloadMessage(
        result.error.issues,
        messages.invalidAutomationCreationPayload,
      ),
      property: String(issue.path[0] ?? 'automations'),
    });
  }
  return result.data;
}

function parseEditAutomation(data: unknown): EditAutomationData {
  // We use two separate schemas to preserve field-level errors, which Zod loses
  // if we use its union types.
  const hasGraphField =
    typeof data === 'object' && data !== null && ('actions' in data || 'edges' in data);
  const schema = hasGraphField ? editAutomationDataSchema : editAutomationStatusOnlySchema;
  const result = schema.safeParse(data);

  if (!result.success) {
    if (result.error.issues.some((issue) => issue.path[0] === 'status')) {
      throw new errors.ValidationError({
        message: hasGraphField ? messages.invalidAutomationStatus : messages.invalidStatusOnlyEdit,
        property: 'status',
      });
    }

    throw new errors.ValidationError({
      message: buildInvalidAutomationPayloadMessage(
        result.error.issues,
        messages.invalidAutomationEditPayload,
      ),
    });
  }

  return result.data;
}

export function add(_apiConfig: unknown, frame: Frame) {
  const automations = frame.data.automations;
  frame.data = parseAddAutomation(Array.isArray(automations) ? automations[0] : undefined);
}

export function edit(_apiConfig: unknown, frame: Frame) {
  const automations = frame.data.automations;
  frame.data = parseEditAutomation(Array.isArray(automations) ? automations[0] : undefined);
}
