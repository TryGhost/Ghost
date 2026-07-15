import Service, {inject as service} from '@ember/service';

export default class ImageAltTextService extends Service {
    @service ajax;
    @service ghostPaths;

    async generate(imageUrl) {
        const url = this.ghostPaths.url.api('images', 'alt-text');
        const response = await this.ajax.post(url, {
            data: {
                image_url: imageUrl
            }
        });

        return response.alt_text;
    }
}
