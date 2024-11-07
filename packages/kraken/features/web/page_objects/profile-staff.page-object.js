class ProfileStaffPageObject {
    
    constructor(driver) {
        this.driver = driver;
    }

    async clickProfile() {
        const element = await this.driver.$("button.ml-2.inline-block.text-sm.font-bold.text-green");
        return await element.click();
    }

}

module.exports = { ProfileStaffPageObject };
