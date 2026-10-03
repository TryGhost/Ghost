import { describe, expect, it, vi } from 'vitest';
import { createPresencePoll } from '../../../../../core/server/services/post-presence/poll-presence';
import { PostPresenceService } from '../../../../../core/server/services/post-presence/post-presence-service';

const user = { id: 'a'.repeat(24), name: 'Alex', profile_image: null, roles: [{ name: 'Author' }] };
const resource = { id: 'b'.repeat(24), type: 'post' as const };
function setup() {
  const cache = {
    appendEvent: vi.fn().mockResolvedValue(1),
    readEvents: vi.fn().mockResolvedValue([]),
  };
  const service = new PostPresenceService(cache, 'site');
  const findResources = vi.fn().mockResolvedValue([resource]);
  const canEdit = vi.fn().mockResolvedValue(undefined);
  const frame = {
    options: { context: { user: user.id, api_key: null } },
    data: {
      presence: [
        {
          resources: [resource],
          editing: resource,
        },
      ],
    },
    user: { load: vi.fn().mockResolvedValue(undefined), toJSON: () => user },
    setHeader: vi.fn(),
  };
  return {
    cache,
    findResources,
    canEdit,
    frame,
    poll: createPresencePoll({ getService: () => service, findResources, canEdit }),
  };
}

describe('presence poll orchestration', () => {
  it('returns a retry delay when the poll limit is exceeded', async () => {
    const { cache, poll, frame } = setup();
    cache.appendEvent.mockResolvedValue(31);
    await expect(poll(frame)).rejects.toMatchObject({ statusCode: 429 });
    expect(frame.setHeader).toHaveBeenCalledWith('Retry-After', '10');
  });
  it('preserves database errors rather than misreporting them as permission failures', async () => {
    const { poll, frame, findResources } = setup();
    const failure = new Error('database unavailable');
    findResources.mockRejectedValue(failure);
    await expect(poll(frame)).rejects.toBe(failure);
  });
  it('does not record or read presence after edit permission is denied', async () => {
    const { cache, poll, frame, canEdit } = setup();
    canEdit.mockRejectedValue(new Error('editing denied'));
    await expect(poll(frame)).rejects.toThrow('editing denied');
    // Only the rate-limit event was written.
    expect(cache.appendEvent).toHaveBeenCalledTimes(1);
    expect(cache.readEvents).not.toHaveBeenCalled();
  });
  it('checks current access rather than trusting an existing cached presence entry', async () => {
    const { poll, frame, findResources, canEdit } = setup();
    await poll(frame);
    findResources.mockResolvedValue([]);
    await expect(poll(frame)).rejects.toMatchObject({ statusCode: 403 });
    expect(canEdit).toHaveBeenCalledTimes(1);
  });
});
