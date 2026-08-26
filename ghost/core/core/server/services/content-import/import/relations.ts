import type { PostData } from './post-data';

const { slugify } = require('@tryghost/string');
const validator = require('@tryghost/validator');

interface RelationModel {
  id: string;
}

export interface RelationModels {
  User: {
    findOne(data: object, options: object): Promise<RelationModel | null>;
    add(data: object, options: object): Promise<RelationModel>;
    getOwnerUser(options: object): Promise<RelationModel>;
  };
  Tag: {
    findOne(data: object, options: object): Promise<RelationModel | null>;
  };
}

export interface PostRelationSource {
  authorNames?: string;
  authorEmails?: string;
  tagNames?: string;
}

export interface AuthorReference {
  name?: string;
  email?: string;
}

export interface PostRelationsResolver {
  resolve(data: PostData, source: PostRelationSource, options: object): Promise<ResolvedRelations>;
}

export interface ResolvedRelations {
  data: PostData;
  warnings: string[];
}

export function parseAuthorReferences(
  authorNames?: string,
  authorEmails?: string,
): AuthorReference[] {
  const names = splitList(authorNames);
  const emails = splitList(authorEmails);
  return Array.from({ length: Math.max(names.length, emails.length) }, (_, index) => ({
    ...(names[index] ? { name: names[index] } : {}),
    ...(emails[index] ? { email: emails[index] } : {}),
  }));
}

export function parseTagReferences(tagNames?: string): string[] {
  return splitList(tagNames).filter((tag): tag is string => Boolean(tag));
}

export class BookshelfPostRelationsResolver implements PostRelationsResolver {
  private _models: RelationModels;

  constructor(models: RelationModels) {
    this._models = models;
  }

  async resolve(
    data: PostData,
    source: PostRelationSource,
    options: object,
  ): Promise<ResolvedRelations> {
    const { authors, warnings } = await this.resolveAuthors(source, options);
    const tags = await this.resolveTags(source, options);
    const resolved: PostData = {
      ...data,
      tags: [...tags, ...data.tags],
    };

    if (authors.length > 0) {
      resolved.authors = authors;
    }

    return { data: resolved, warnings };
  }

  private async resolveAuthors(
    source: PostRelationSource,
    options: object,
  ): Promise<{ authors: Array<{ id: string }>; warnings: string[] }> {
    const authors: Array<{ id: string }> = [];
    const warnings: string[] = [];
    const seen = new Set<string>();
    const authorsByEmail = new Map<string, RelationModel>();
    let owner: RelationModel | undefined;

    const useOwner = async (warning: string) => {
      owner ??= await this._models.User.getOwnerUser({ ...options });
      warnings.push(warning);
      if (!seen.has(owner.id)) {
        seen.add(owner.id);
        authors.push({ id: owner.id });
      }
    };

    for (const reference of parseAuthorReferences(source.authorNames, source.authorEmails)) {
      let author: RelationModel | null = null;
      if (reference.email) {
        if (!validator.isEmail(reference.email)) {
          await useOwner(`Author email "${reference.email}" is invalid; assigned Owner instead.`);
          continue;
        }

        const emailKey = reference.email.toLowerCase();
        author = authorsByEmail.get(emailKey) ?? null;
        if (!author) {
          author = await this._models.User.findOne({ email: reference.email }, { ...options });
        }

        if (!author && reference.name) {
          author = await this._models.User.add(
            {
              name: reference.name,
              email: reference.email,
              roles: ['Contributor'],
            },
            { ...options },
          );
        }

        if (!author) {
          await useOwner(`Author email "${reference.email}" has no name; assigned Owner instead.`);
          continue;
        }

        authorsByEmail.set(emailKey, author);
      } else if (reference.name) {
        author = await this._models.User.findOne({ slug: slugify(reference.name) }, { ...options });

        if (!author) {
          await useOwner(`Author "${reference.name}" has no email; assigned Owner instead.`);
          continue;
        }
      } else {
        await useOwner('An empty author entry was assigned to Owner instead.');
        continue;
      }

      if (author && !seen.has(author.id)) {
        seen.add(author.id);
        authors.push({ id: author.id });
      }
    }

    return { authors, warnings };
  }

  private async resolveTags(
    source: PostRelationSource,
    options: object,
  ): Promise<Array<{ id: string }>> {
    const tags: Array<{ id: string }> = [];
    const seen = new Set<string>();

    for (const reference of parseTagReferences(source.tagNames)) {
      const normalizedSlug = slugify(reference);
      const lookups = [{ name: reference }, { slug: reference }];
      if (normalizedSlug && normalizedSlug !== reference) {
        lookups.push({ slug: normalizedSlug });
      }

      let tag: RelationModel | null = null;
      for (const lookup of lookups) {
        tag = await this._models.Tag.findOne(lookup, { ...options });
        if (tag) {
          break;
        }
      }

      if (tag && !seen.has(tag.id)) {
        seen.add(tag.id);
        tags.push({ id: tag.id });
      }
    }

    return tags;
  }
}

function splitList(value?: string): Array<string | undefined> {
  return value?.split(',').map((part) => part.trim() || undefined) ?? [];
}
