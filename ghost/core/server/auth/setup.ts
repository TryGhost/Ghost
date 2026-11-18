import _ from 'lodash';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import logging from '@tryghost/logging';
import moment from 'moment';
import validator from '@tryghost/validator';
import { z } from 'zod';
import config from '../../shared/config';

const models = require('../models');
const mail = require('../lib/mail');

// The settings these become are checked with validator's isLength, which counts an emoji as one
const maxLength = (max: number) => (value: string) => validator.isLength(value, { max });

// Limits match the settings, so an oversized value fails before the owner is created
const blogTitleSchema = z.string().trim().min(1).refine(maxLength(150));

/** The setup form */
export const setupDetailsSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  blogTitle: blogTitleSchema,
  theme: z.string().nullish(),
  accentColor: z.string().nullish(),
  description: z.string().trim().refine(maxLength(200)).nullish(),
});

// Updating the owner has never needed a title
export const updateSetupDetailsSchema = setupDetailsSchema
  .pick({ name: true, email: true, password: true })
  .extend({ blogTitle: blogTitleSchema.nullish() });

export type SetupUserData = z.infer<typeof setupDetailsSchema> & { status: string };
type UpdateSetupUserData = z.infer<typeof updateSetupDetailsSchema> & { status: string };

interface SetupUser {
  id: string;
  get(attribute: 'email'): string;
}

export interface SetupData<UserData = SetupUserData> {
  user: SetupUser;
  userData: UserData;
}

type Context = { context: Record<string, unknown> };

interface SettingsAPI {
  edit(
    data: { settings: Array<{ key: string; value: unknown }> },
    options: Context,
  ): Promise<unknown>;
}

interface BrowseEditAPI<Key extends string> {
  browse(options: { limit: 'all' }): Promise<Record<Key, Array<{ id: string; slug: string }>>>;
  edit(
    data: Record<Key, Array<{ name: string }>>,
    options: { context: Record<string, unknown>; id: string },
  ): Promise<unknown>;
}

interface MailAPI {
  send(payload: unknown, options: Context): Promise<unknown>;
}

interface ThemesAPI {
  install(options: Record<string, unknown>): Promise<{ themes: Array<{ name: string }> }>;
  activate(options: Record<string, unknown>): Promise<unknown>;
}

const messages = {
  setupAlreadyCompleted: 'Setup has already been completed.',
  setupMustBeCompleted: 'Setup must be completed before making this request.',
  setupUnableToRun: 'Database missing fixture data. Please reset database and try again.',
  sampleBlogDescription: 'Thoughts, stories and ideas.',
  yourNewGhostBlog: 'Your New Ghost Site',
  unableToSendWelcomeEmail: 'Unable to send welcome email, your site will continue to function.',
  failedThemeInstall: "Theme {themeName} didn't install because of the error: {error}",
  failedSamplePostUpdate: "Sample post {slug} wasn't updated during setup.",
};

const postSetupFixtures = {
  'coming-soon':
    '{"version":"0.3.1","atoms":[],"cards":[],"markups":[["a",["href","#/portal/"]]],"sections":[[1,"p",[[0,[],0,"This is {{site.title}}, a brand new site by {{author.name}} that\'s just getting started. Things will be up and running here shortly, but you can "],[0,[0],1,"subscribe"],[0,[],0," in the meantime if you\'d like to stay up to date and receive emails when new content is published!"]]]],"ghostVersion":"4.0"}',
  about:
    '{"version":"0.3.1","atoms":[],"cards":[["hr",{}]],"markups":[["a",["href","https://ghost.org"]]],"sections":[[1,"p",[[0,[],0,"{{site.title}} is an independent publication launched in {{date}} by {{author.name}}. If you subscribe today, you\'ll get full access to the website as well as email newsletters about new content when it\'s available. Your subscription makes this site possible, and allows {{site.title}} to continue to exist. Thank you!"]]],[1,"h3",[[0,[],0,"Access all areas"]]],[1,"p",[[0,[],0,"By signing up, you\'ll get access to the full archive of everything that\'s been published before and everything that\'s still to come. Your very own private library."]]],[1,"h3",[[0,[],0,"Fresh content, delivered"]]],[1,"p",[[0,[],0,"Stay up to date with new content sent straight to your inbox! No more worrying about whether you missed something because of a pesky algorithm or news feed."]]],[1,"h3",[[0,[],0,"Meet people like you"]]],[1,"p",[[0,[],0,"Join a community of other subscribers who share the same interests."]]],[10,0],[1,"h3",[[0,[],0,"Start your own thing"]]],[1,"p",[[0,[],0,"Enjoying the experience? Get started for free and set up your very own subscription business using "],[0,[0],1,"Ghost"],[0,[],0,", the same platform that powers this website."]]]],"ghostVersion":"4.0"}',
};

/** Returns setup status */
export async function checkIsSetup(): Promise<boolean> {
  return models.User.isSetup();
}

/**
 * Allows an assertion to be made about setup status.
 *
 * @param status True: setup must be complete. False: setup must not be complete.
 * @returns a "task ready" function
 */
export function assertSetupCompleted(status: boolean) {
  return async function checkPermission<T>(__?: T): Promise<T | undefined> {
    const isSetup = await checkIsSetup();

    if (isSetup === status) {
      return __;
    }

    const completed = tpl(messages.setupAlreadyCompleted);
    const notCompleted = tpl(messages.setupMustBeCompleted);

    function throwReason(reason: string): never {
      throw new errors.NoPermissionError({ message: reason });
    }

    if (isSetup) {
      throwReason(completed);
    } else {
      throwReason(notCompleted);
    }
  };
}

export async function setupUser<UserData extends UpdateSetupUserData>(
  userData: UserData,
): Promise<SetupData<UserData>> {
  const context = { context: { internal: true } };

  const owner = await models.User.findOne({ role: 'Owner', status: 'all' });

  if (!owner) {
    throw new errors.InternalServerError({
      message: tpl(messages.setupUnableToRun),
    });
  }

  const user: SetupUser = await models.User.setup(userData, _.extend({ id: owner.id }, context));

  return {
    user: user,
    userData: userData,
  };
}

export async function doSettings(
  data: SetupData<
    Pick<UpdateSetupUserData, 'blogTitle'> &
      Pick<Partial<SetupUserData>, 'description' | 'accentColor'>
  >,
  settingsAPI: SettingsAPI,
) {
  const context = { context: { user: data.user.id } };
  const user = data.user;
  const blogTitle = data.userData.blogTitle;
  const description = data.userData.description;

  if (!blogTitle) {
    return user;
  }

  const userSettings: Array<{ key: string; value: unknown }> = [
    { key: 'title', value: blogTitle },
    { key: 'description', value: description || tpl(messages.sampleBlogDescription) },
  ];

  if (data.userData.accentColor) {
    userSettings.push({
      key: 'accent_color',
      value: data.userData.accentColor,
    });
  }

  await settingsAPI.edit({ settings: userSettings }, context);

  return user;
}

// Update names for default product and newsletter to site title.
async function doTiersAndNewsletter<
  Data extends { user: Pick<SetupUser, 'id'>; userData: Pick<SetupUserData, 'blogTitle'> },
>(
  data: Data,
  api: { tiers: BrowseEditAPI<'tiers'>; newsletters: BrowseEditAPI<'newsletters'> },
): Promise<Data> {
  const { tiers: tiersAPI, newsletters: newslettersAPI } = api;
  const context = { context: { user: data.user.id } };
  const blogTitle = data.userData.blogTitle;

  try {
    const tierPage = await tiersAPI.browse({ limit: 'all' });
    const newsletterPage = await newslettersAPI.browse({ limit: 'all' });

    const defaultTier = tierPage.tiers.find((p) => p.slug === 'default-product');
    const defaultNewsletter = newsletterPage.newsletters.find(
      (p) => p.slug === 'default-newsletter',
    );

    if (defaultTier) {
      await tiersAPI.edit(
        {
          tiers: [
            {
              name: blogTitle,
            },
          ],
        },
        { context: context.context, id: defaultTier.id },
      );
    }

    if (defaultNewsletter) {
      await newslettersAPI.edit(
        {
          newsletters: [
            {
              name: blogTitle,
            },
          ],
        },
        { context: context.context, id: defaultNewsletter.id },
      );
    }
  } catch (e) {
    return data;
  }

  return data;
}

export async function doFixtures(data: SetupData) {
  const date = moment().format('MMMM YYYY');

  const values: Record<string, string> = {
    'site.title': data.userData.blogTitle,
    'author.name': data.userData.name,
    date,
  };

  for (const [slug, fixture] of Object.entries(postSetupFixtures)) {
    // One pass over the fixture, so values can't introduce tokens; escaped to stay valid JSON
    const mobiledoc = fixture.replace(/{{(site\.title|author\.name|date)}}/g, (__, token: string) =>
      JSON.stringify(values[token]).slice(1, -1),
    );

    // A sample post that keeps its placeholders shouldn't fail setup
    try {
      const post = await models.Post.findOne({ slug });

      if (post) {
        await models.Post.edit({ mobiledoc }, { id: post.id });
      }
    } catch (error) {
      logging.warn(
        new errors.InternalServerError({
          err: error instanceof Error ? error : String(error),
          message: tpl(messages.failedSamplePostUpdate, { slug }),
        }),
      );
    }
  }

  return data;
}

export function sendWelcomeEmail(email: string, mailAPI: MailAPI): Promise<void> {
  if (config.get('sendWelcomeEmail')) {
    const data = {
      ownerEmail: email,
    };

    return mail.utils
      .generateContent({ data: data, template: 'welcome' })
      .then(async (content: { html: string; text: string }) => {
        const message = {
          to: email,
          subject: tpl(messages.yourNewGhostBlog),
          html: content.html,
          text: content.text,
        };

        const payload = {
          mail: [
            {
              message: message,
              options: {},
            },
          ],
        };

        await mailAPI
          .send(payload, { context: { internal: true } })
          .catch((err: Error & { context?: string }) => {
            err.context = tpl(messages.unableToSendWelcomeEmail);
            logging.error(err);
          });
      });
  }
  return Promise.resolve();
}

export async function installTheme(data: SetupData, api: { themes: ThemesAPI }) {
  const { theme: themeName } = data.userData;

  if (!themeName) {
    return data;
  }

  if (themeName.toLowerCase() === 'tryghost/source') {
    logging.warn('Skipping theme install as Source is the default theme.');
    return data;
  }

  // Use the api instead of the services as the api performs extra logic
  try {
    const installResults = await api.themes.install({
      source: 'github',
      ref: themeName,
      context: { internal: true },
    });
    const theme = installResults.themes[0];

    await api.themes.activate({
      name: theme.name,
      context: { internal: true },
    });
  } catch (error) {
    //Fallback to Casper/Source by doing nothing as the theme setting update is the last step
    logging.warn(tpl(messages.failedThemeInstall, { themeName, error: (error as Error).message }));
  }

  return data;
}

export { doTiersAndNewsletter as doProductAndNewsletter };
