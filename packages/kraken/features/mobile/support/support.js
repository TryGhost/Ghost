const { setWorldConstructor, setDefaultTimeout, World } = require('@cucumber/cucumber');

class KrakenWorld {
  constructor(input) {
    let params = input.parameters;
    let mobileInfo = params.mobile_info || {};
    this.userId = params.id;
    this.device = params.device || {};
    this.testScenarioId = params.testScenarioId;
    this.apkPath = mobileInfo.apk_path;
    this.apkPackage = mobileInfo.apk_package;
    this.apkLaunchActivity = mobileInfo.apk_launch_activity;
    this.attach = input.attach;
  }
}

setWorldConstructor(KrakenWorld);
setDefaultTimeout(30 * 1000);
