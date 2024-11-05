const { After, Before } = require('@cucumber/cucumber');
const { AndroidClient } = require('kraken-node');

Before(async function () {
  this.deviceClient = new AndroidClient(
    this.device.id, this.apkPath,
    this.apkPackage, this.apkLaunchActivity,
    {}, this.userId
  );
  this.driver = await this.deviceClient.startKrakenForUserId(this.userId);
})

After(async function () {
  await this.deviceClient.stopKrakenForUserId(this.userId);
});
