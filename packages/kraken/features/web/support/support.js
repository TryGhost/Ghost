const { setWorldConstructor, setDefaultTimeout, World } = require('@cucumber/cucumber');

class KrakenWorld {
  constructor(input) {
    let params = input.parameters;
    this.userId = params.id;
    this.device = params.device || {};
    this.testScenarioId = params.testScenarioId;
    this.attach = input.attach;
  }
}

setWorldConstructor(KrakenWorld);
setDefaultTimeout(30 * 1000);
