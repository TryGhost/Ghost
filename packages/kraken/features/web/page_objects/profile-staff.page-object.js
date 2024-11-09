class ProfileStaffPageObject {
    
    constructor(driver) {
        this.driver = driver;
    }


    async clickProfile() {
        const element = await this.driver.$("button.ml-2.inline-block.text-sm.font-bold.text-green");
        return await element.click();
    }

    async clickSave() {
        const element = await this.driver.$("button.cursor-pointer.bg-black.text-white");
        return await element.click();
    }

    async getOwnerSection() {
        const element = await this.driver.$(".text-md.font-semibold.capitalize.text-white");
        return await element.getText();
    }

    async getName() {
        const element = await this.driver.$(
            'h1.text-white'
        );
        return await element.getText();
    }

    async setName(name) {
        const element = await this.driver.$(
            'input.bg-transparent'
        );
        await element.clearValue();
        return await element.setValue(name);
    }

}

module.exports = { ProfileStaffPageObject };
