class ProfileStaffPageObject {
    
    constructor(driver) {
        this.driver = driver;
    }

    async clickSettingProfile() {
        const element = await this.driver.$(".ember-view.gh-nav-bottom-tabicon");
        return await element.click();
    }

    async clickProfile() {
        const element = await this.driver.$("button.ml-2.inline-block.text-sm.font-bold.text-green");
        return await element.click();
    }

}

module.exports = { ProfileStaffPageObject };
