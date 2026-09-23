import { createHmac } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getPostCardAccess } from './post-card-access';

const errors = require('@tryghost/errors');
const models = require('../../models');
const settingsHelpers = require('../settings-helpers');
const { timingSafeStringEqual } = require('../../../shared/timing-safe-string-equal');

export interface MemberCredential {
  uuid: string;
  key: string;
}

/** Existing signed-link credential, shared with newsletter preferences. */
export function issueCredential(uuid: string): MemberCredential {
  return {
    uuid,
    key: createHmac('sha256', settingsHelpers.getMembersValidationKey()).update(uuid).digest('hex'),
  };
}

export function validateCredential(value: unknown): MemberCredential {
  const credential = value as MemberCredential | null;
  if (
    !credential ||
    typeof credential.uuid !== 'string' ||
    !/^[\da-f-]{36}$/i.test(credential.uuid) ||
    typeof credential.key !== 'string' ||
    !timingSafeStringEqual(issueCredential(credential.uuid).key, credential.key)
  ) {
    throw new errors.UnauthorizedError({
      message: 'Invalid member credentials.',
      code: 'MEMBER_CREDENTIAL_INVALID',
    });
  }
  return credential;
}

export async function currentMemberContext(
  req: Request & { identity?: { id: string } | null },
  res: Response,
  next: NextFunction,
) {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const member = req.identity
      ? await models.Member.findOne({ id: req.identity.id }, { columns: ['id', 'uuid'] })
      : null;
    res.json({ member: member ? issueCredential(member.get('uuid')) : null });
  } catch (error) {
    next(error);
  }
}

/** Resolve one current member and their tiers for the entire bounded batch. */
export async function postAccess(input: { post_ids?: unknown; member?: unknown }) {
  const ids = input?.post_ids;
  if (
    !Array.isArray(ids) ||
    ids.length > 100 ||
    ids.some((id) => typeof id !== 'string' || !/^[\da-f]{24}$/i.test(id))
  ) {
    throw new errors.ValidationError({ message: 'post_ids must contain at most 100 post IDs.' });
  }
  let member = null;
  if (input.member !== undefined && input.member !== null) {
    const credential = validateCredential(input.member);
    const model = await models.Member.findOne(
      { uuid: credential.uuid },
      { withRelated: ['products'] },
    );
    if (!model) {
      throw new errors.UnauthorizedError({
        message: 'Invalid member credentials.',
        code: 'MEMBER_CREDENTIAL_INVALID',
      });
    }
    member = model.toJSON();
  }
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) {
    return { data: [] };
  }
  const posts = await models.Post.findAll({
    filter: `id:[${uniqueIds.join(',')}]+status:published`,
    withRelated: ['tiers'],
  });
  const byId = new Map(
    posts.models.map(
      (post: { id: string; toJSON: () => Parameters<typeof getPostCardAccess>[0] }) => [
        post.id,
        post.toJSON(),
      ],
    ),
  );
  const data = [];
  for (const id of uniqueIds) {
    const post = byId.get(id) as Parameters<typeof getPostCardAccess>[0] | undefined;
    const decision = post
      ? await getPostCardAccess(post, member)
      : { access: false, visible_card_ids: [] };
    data.push({ id, ...decision });
  }
  return { data };
}
