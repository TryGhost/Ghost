import { describe, expect, it } from 'vitest';
import {
  ALL_POST_INCLUDES,
  POST_FORMATS,
  buildPageWriteParams,
  buildPostBrowseParams,
  buildPostReadParams,
  buildPostWriteParams,
  serializePostPayload,
} from '../../../src/api/post-contract';

describe('post request contract', () => {
  describe('query params', () => {
    it('requests both content formats on reads', () => {
      expect(buildPostBrowseParams()).toEqual({ formats: 'mobiledoc,lexical' });
      expect(buildPostReadParams()).toEqual({ formats: 'mobiledoc,lexical' });
    });

    it('re-requests the full include list on writes', () => {
      expect(buildPostWriteParams()).toEqual({
        formats: POST_FORMATS,
        include:
          'tags,authors,authors.roles,email,tiers,newsletter,count.clicks,post_revisions,post_revisions.author',
      });
    });

    it('adds save_revision and convert_to_lexical only when requested', () => {
      expect(buildPostWriteParams({ saveRevision: true, convertToLexical: true })).toEqual({
        formats: POST_FORMATS,
        save_revision: 'true',
        convert_to_lexical: 'true',
        include: ALL_POST_INCLUDES,
      });

      expect(buildPostWriteParams({ saveRevision: false, convertToLexical: false })).toEqual({
        formats: POST_FORMATS,
        include: ALL_POST_INCLUDES,
      });
    });

    it('sends newsletter and email segment when emailing a publish', () => {
      expect(buildPostWriteParams({ newsletter: 'weekly', emailSegment: 'status:free' })).toEqual({
        formats: POST_FORMATS,
        newsletter: 'weekly',
        email_segment: 'status:free',
        include: ALL_POST_INCLUDES,
      });
    });

    it('rewrites the "everyone" segment to all', () => {
      expect(
        buildPostWriteParams({ newsletter: 'weekly', emailSegment: 'status:free,status:-free' }),
      ).toEqual({
        formats: POST_FORMATS,
        newsletter: 'weekly',
        email_segment: 'all',
        include: ALL_POST_INCLUDES,
      });
    });

    it('only sends an email segment alongside a newsletter', () => {
      expect(buildPostWriteParams({ emailSegment: 'status:free' })).toEqual({
        formats: POST_FORMATS,
        include: ALL_POST_INCLUDES,
      });
    });

    it('never sends email delivery params for pages', () => {
      expect(buildPageWriteParams({ saveRevision: true })).toEqual({
        formats: POST_FORMATS,
        save_revision: 'true',
        include: ALL_POST_INCLUDES,
      });
    });
  });

  describe('payload shaping', () => {
    it('strips read-only and virtual fields from post payloads', () => {
      expect(
        serializePostPayload({
          id: 'post-1',
          title: 'Hello',
          lexical: '{"root":{}}',
          author_id: 'author-1',
          author: { id: 'author-1' },
          uuid: 'uuid-1',
          url: 'https://example.com/hello/',
          send_email_when_published: true,
          email_recipient_filter: 'all',
          email: { email_count: 1 },
          newsletter: { id: 'newsletter-1' },
          post_revisions: [{ id: 'revision-1' }],
        }),
      ).toEqual({
        id: 'post-1',
        title: 'Hello',
        lexical: '{"root":{}}',
      });
    });

    it('strips the page-only title/feature-image toggle from post payloads but keeps it for pages', () => {
      const data = { title: 'Hello', show_title_and_feature_image: false };

      expect(serializePostPayload(data)).toEqual({ title: 'Hello' });
      expect(serializePostPayload(data, 'page')).toEqual(data);
    });

    it('strips email fields from page payloads', () => {
      expect(
        serializePostPayload(
          { title: 'Hello', email_subject: 'Subject', email_only: false, email_id: 'email-1' },
          'page',
        ),
      ).toEqual({ title: 'Hello' });
    });

    it('drops visibility, filter and tiers when visibility is null', () => {
      expect(
        serializePostPayload({
          title: 'Hello',
          visibility: null,
          visibility_filter: 'label:vip',
          tiers: [{ id: 'tier-1' }],
        }),
      ).toEqual({ title: 'Hello' });
    });

    it('drops the visibility filter when visibility is tiers', () => {
      expect(
        serializePostPayload({
          title: 'Hello',
          visibility: 'tiers',
          visibility_filter: 'label:vip',
          tiers: [{ id: 'tier-1' }],
        }),
      ).toEqual({
        title: 'Hello',
        visibility: 'tiers',
        tiers: [{ id: 'tier-1' }],
      });
    });

    it('treats tiers visibility without tiers as unchanged visibility', () => {
      expect(serializePostPayload({ title: 'Hello', visibility: 'tiers', tiers: [] })).toEqual({
        title: 'Hello',
      });
    });

    it('keeps other visibility values untouched', () => {
      expect(serializePostPayload({ title: 'Hello', visibility: 'members', tiers: [] })).toEqual({
        title: 'Hello',
        visibility: 'members',
        tiers: [],
      });
    });
  });
});
