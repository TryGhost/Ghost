import { fakeResponseFor } from './handlers';
import { readScenario } from './scenario';
import { setRealFetch } from './real-fetch';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// Puts the fake analytics backend in front of Admin's requests, before Admin
// renders. Each request is offered to the fakes for the scenario picked in
// the prototype menu; anything they don't answer reaches the real Ghost as
// usual. With "Site data" picked, nothing is faked.
export const installAnalyticsFakes = () => {
  const scenario = readScenario();
  if (scenario === 'site') {
    return;
  }

  const realFetch = window.fetch.bind(window);
  setRealFetch(realFetch);
  const fakeResponse = fakeResponseFor(scenario);

  window.fetch = async (input, init) => {
    const response = await fakeResponse(new Request(input, init));
    return response ?? realFetch(input, init);
  };
};
