const fileUploadResponse = function (db, {requestBody}) {
    // let [ref] = requestBody.getAll('ref');
    const [purpose] = requestBody.getAll('purpose');
    const [file] = requestBody.getAll('file');
    const now = new Date();
    const year = now.getFullYear();
    let month = `${now.getMonth()}`;

    if (month.length === 1) {
        month = `0${month}`;
    }

    if (['image', 'profile_image', 'icon'].includes(purpose)) {
        return {
            images: [{
                url: `/content/images/${year}/${month}/${file.name}`
            }]
        };
    }
};

export default function mockUploads(server) {
    server.post('/images/upload/', fileUploadResponse, 200, {timing: 100});
}
