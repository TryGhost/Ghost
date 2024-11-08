class ChangeLanguagePageObject {
    homePage = "";

    constructor(driver) {
        this.driver = driver;
        this.homePage = this.driver.baseUrl ;
    }

    async navigateToHomePage() {
        await this.driver.url(this.homePage);
        return await this.driver.pause(1000);
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
        return await element.setValue(value);
    }

    async cleanInput() {
        const element = await this.driver.$(`input[placeholder="Site language"]`);
        return  await element.setValue('');
  
    }

    async saveLanguage() {
        const element = await this.driver.$("#publication-language + .flex.items-start.justify-between.gap-4 div div .bg-green");
        return await element.click();
    }
}

module.exports = { ChangeLanguagePageObject };
