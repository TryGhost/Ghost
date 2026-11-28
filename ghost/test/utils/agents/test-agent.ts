import Agent from '@tryghost/express-test';

type TestAgentOptions = {
  apiURL: string;
  originURL: string;
  queryParams?: Agent.AgentOptions['queryParams'];
};

// The constructor always passes a headers object to Agent, which stores it as
// `defaults`, so headers is never undefined on a TestAgent.
type TestAgentDefaults = Agent.AgentOptions & Required<Pick<Agent.AgentOptions, 'headers'>>;

/**
 * @constructor
 * @param app  Ghost express app instance
 * @param options
 */
class TestAgent extends Agent {
  declare defaults: TestAgentDefaults;

  constructor(app: Agent.App, options: TestAgentOptions) {
    const originUrl = new URL(options.originURL);

    super(app, {
      baseUrl: options.apiURL,
      headers: {
        host: originUrl.host,
        origin: originUrl.origin,
      },
      queryParams: options.queryParams,
    });
  }

  /**
   * Delete the authorization header.
   * Authorization header is set when using token authentication.
   * We need to reset the authorization header when logging in with username/password.
   */
  clearAuthHeaders(): void {
    if (this.defaults.headers.Authorization) {
      delete this.defaults.headers.Authorization;
    }
  }

  /**
   * Delete the authorization header and cookies.
   * Ensures that the agent is not authenticated.
   */
  resetAuthentication(): void {
    this.clearAuthHeaders();
    this.clearCookies();
  }
}

module.exports = TestAgent;
