import { z } from 'zod';

export const relayVersion = 'ghost-canvas-relay-1';
export const toolNames = [
  'state',
  'read',
  'edit',
  'inspect',
  'content',
  'history',
  'reveal',
  'review',
].map((name) => `ghost_canvas_${name}`);
export const identifier = z.string().uuid();
export const tenantId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
export const claimsSchema = z.object({
  tenant: tenantId,
  session: identifier,
  sub: z.string().min(1).max(128),
  role: z.enum(['editor', 'agent']),
  exp: z.number().int(),
  iat: z.number().int(),
});
export type RelayClaims = z.infer<typeof claimsSchema>;
export const callSchema = z
  .object({
    id: identifier,
    epoch: identifier,
    tool: z.string().refine((name) => toolNames.includes(name)),
    input: z.record(z.string(), z.unknown()),
  })
  .strict();
export type RelayCall = z.infer<typeof callSchema>;
export const replySchema = z
  .object({
    type: z.literal('result'),
    id: identifier,
    epoch: identifier,
    result: z.record(z.string(), z.unknown()),
  })
  .strict();
export const catalogSchema = z
  .array(
    z
      .object({
        name: z.string().refine((name) => toolNames.includes(name)),
        description: z.string().max(8192),
        inputSchema: z.record(z.string(), z.unknown()),
      })
      .strict(),
  )
  .min(1)
  .max(8)
  .refine((tools) => new Set(tools.map((tool) => tool.name)).size === tools.length);
export type RelayOperation = {
  id: string;
  epoch: string;
  status: 'dispatched' | 'completed' | 'unknown';
  result?: Record<string, unknown>;
  reason?: string;
};
export type RelayConnection = {
  serviceUrl: string;
  tenant: string;
  session: string;
  token: string;
};
export function sessionPath(connection: Pick<RelayConnection, 'tenant' | 'session'>): string {
  tenantId.parse(connection.tenant);
  identifier.parse(connection.session);
  return `/v1/tenants/${connection.tenant}/sessions/${connection.session}`;
}
