import type { PostAuthor } from '@tryghost/admin-x-framework/api/posts';
import type { User } from '@tryghost/admin-x-framework/api/users';

/** One staff member, as the field shows and writes them. */
export interface AuthorOption {
  id: string;
  name: string;
  email: string;
}

/** The browse the field reads: every staff member, most published first. */
export const AUTHORS_SEARCH_PARAMS = {
  include: 'count.posts',
  limit: 'all',
  order: 'count.posts desc, name asc',
} as const;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function toOption(user: Pick<User, 'id' | 'name' | 'email'>): AuthorOption {
  return { id: user.id, name: user.name || user.email, email: user.email };
}

/**
 * Matches a search term against a name, slug or email, ignoring case and
 * accents so an unaccented term still finds an accented name.
 */
export function matchesAuthor(user: Pick<User, 'name' | 'slug' | 'email'>, term: string): boolean {
  const needle = fold(term);
  return [user.name, user.slug, user.email].some((field) => fold(field ?? '').includes(needle));
}

/** The rows the list offers: everyone not already an author, narrowed by the term. */
export function authorSuggestions(
  users: User[] | undefined,
  selected: ReadonlyArray<AuthorOption>,
  term: string,
): AuthorOption[] {
  const chosen = new Set(selected.map(({ id }) => id));
  const trimmed = term.trim();
  return (users ?? [])
    .filter((user) => !chosen.has(user.id) && (!trimmed || matchesAuthor(user, trimmed)))
    .map(toOption);
}

/**
 * The chips, in the post's own order. A saved post carries its authors' names,
 * so a chip is named whether or not the staff browse has run.
 */
export function selectedAuthors(
  authors: ReadonlyArray<PostAuthor>,
  users: User[] | undefined,
): AuthorOption[] {
  const known = new Map((users ?? []).map((user) => [user.id, user]));
  const options: AuthorOption[] = [];
  for (const author of authors) {
    if (!author.id) {
      continue;
    }
    const user = known.get(author.id);
    options.push(
      user
        ? toOption(user)
        : {
            id: author.id,
            name: author.name || author.email || author.id,
            email: author.email ?? '',
          },
    );
  }
  return options;
}
