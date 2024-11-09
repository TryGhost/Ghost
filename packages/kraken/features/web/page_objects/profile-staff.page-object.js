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
        await element.setValue(name);
        return await this.driver.pause(1000);
    }

}

module.exports = { ProfileStaffPageObject };
