export type AnnouncementSettings = {
  announcement?: string;
  announcement_background?: string;
};

type AnnouncementResponse = {
  announcement: AnnouncementSettings[];
};

type RequestOptions = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  body?: BodyInit;
};

function setupGhostApi({ apiUrl }: { apiUrl?: string }) {
  function makeRequest({
    url,
    method = 'GET',
    headers = {},
    credentials = undefined,
    body = undefined,
  }: RequestOptions) {
    const options = {
      method,
      headers,
      credentials,
      body,
    };
    return fetch(url, options);
  }

  const announcementSettings = {
    browse(): Promise<AnnouncementResponse> {
      const url = apiUrl!;
      return makeRequest({
        url,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(function (res) {
        if (res.ok) {
          return res.json() as Promise<AnnouncementResponse>;
        } else {
          throw new Error('Failed to fetch site data');
        }
      });
    },
  };

  const init = async (): Promise<AnnouncementSettings | undefined> => {
    const { announcement } = await announcementSettings.browse();
    return announcement[0];
  };

  return { announcementSettings, init };
}

export default setupGhostApi;
