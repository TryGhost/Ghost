import Service from '@ember/service';

export default class UtilsService extends Service {
    downloadFile(url) {
        let iframe = document.getElementById('iframeDownload');

        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'iframeDownload';
            iframe.style.display = 'none';
            document.body.append(iframe);
        }

        iframe.setAttribute('src', url);
    }
}
