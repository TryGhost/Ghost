import Service, {inject as service} from '@ember/service';

export default class AIService extends Service {
    @service ajax;
    @service ghostPaths;

    async generateImageAltText(imageUrl) {
        const url = this.ghostPaths.url.api('ai', 'alt-text');
        const response = await this.ajax.post(url, {
            data: {
                image_url: imageUrl
            }
        });

        return response.alt_text;
    }
}
