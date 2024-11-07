class ChangeLanguagePageObject {
    adminPage = "/ghost";

    constructor(driver) {
        this.driver = driver;
        this.adminPage = this.driver.baseUrl + this.adminPage;
    }

    async getLanguage() {
        const element = await this.driver.$("html").getAttribute("lang");
        return await element;
    }

    async clickEditLanguage() {
        const element = await this.driver.$("#publication-language + .flex.items-start.justify-between.gap-4 div div button");
        return await element.click();
    }

    async editLanguage(value) {
        const element = await this.driver.$(`input[placeholder="Site language"]`);
        await element.clearValue();
        await this.driver.pause(1000);
        await element.click();                
        await element.setValue(['\uE009', 'a']); 
        await element.setValue('\uE003');       
        await element.setValue(value);
        await this.driver.pause(1000);
        return await this.saveLanguage();
    }

    async saveLanguage() {
        const element = await this.driver.$("#publication-language + .flex.items-start.justify-between.gap-4 div div .bg-green");
        return await element.click();
    }
}

module.exports = { ChangeLanguagePageObject };
