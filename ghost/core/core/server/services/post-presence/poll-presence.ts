import errors from '@tryghost/errors';
import { z } from 'zod';
import {
  actorSchema,
  requestSchema,
  resourceSchema,
  type Resource,
  type PostPresenceService,
} from './post-presence-service';

export const contextSchema = z.object({
  user: z.string().regex(/^[a-f\d]{24}$/i),
  api_key: z.null().optional(),
  internal: z.literal(false).optional(),
});
export const bodySchema = z.object({ presence: z.array(requestSchema).length(1) });
const userSchema = actorSchema.extend({ roles: z.array(z.object({ name: z.string() })) });
export type PresenceUser = z.infer<typeof userSchema>;
export type PresenceFrame = {
  data: z.infer<typeof bodySchema>;
  options: { context: z.infer<typeof contextSchema> };
  user: { load: (relations: string[]) => Promise<unknown>; toJSON: () => unknown };
  setHeader: (name: string, value: string) => void;
};

type Dependencies = {
  getService: () => PostPresenceService | undefined;
  findResources: (resources: Resource[], user: PresenceUser) => Promise<unknown>;
  canEdit: (context: unknown, id: string) => Promise<unknown>;
};

export function createPresencePoll({ getService, findResources, canEdit }: Dependencies) {
  return async (frame: PresenceFrame) => {
    frame.setHeader('Cache-Control', 'no-store');
    const service = getService();
    if (!service) {
      throw new errors.NotFoundError({
        message: 'Presence is unavailable with this cache adapter.',
      });
    }
    const context = frame.options.context;
    if (!(await service.allowPoll(context.user))) {
      frame.setHeader('Retry-After', '10');
      throw new errors.TooManyRequestsError({ message: 'Too many presence requests.' });
    }
    const request = frame.data.presence[0];
    await frame.user.load(['roles']);
    const user = userSchema.parse(frame.user.toJSON());
    const posts = z.array(resourceSchema).parse(await findResources(request.resources, user));
    const visible = request.resources.filter((resource) =>
      posts.some((post) => post.id === resource.id && post.type === resource.type),
    );
    const editing = request.editing;
    if (editing) {
      if (
        !visible.some((resource) => resource.id === editing.id && resource.type === editing.type)
      ) {
        throw new errors.NoPermissionError({ message: 'You cannot edit this resource.' });
      }
      await canEdit(frame.options.context, editing.id);
      await service.record(editing, user, editing.action, request.sessionId);
    }
    return { events: await service.recent(visible), serverTime: Date.now() };
  };
}
