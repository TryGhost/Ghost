const fileUploadResponse = function (db, {requestBody}) {
    let [file] = requestBody.getAll('uploadimage');
    let now = new Date();
    let year = now.getFullYear();
    let month = `${now.getMonth()}`;

    if (month.length === 1) {
        month = `0${month}`;
    }

    return {
        url: `/content/images/${year}/${month}/${file.name}`
    };
};

export default function mockUploads(server) {
    server.post('/images/', fileUploadResponse, 200, {timing: 100});
    server.post('/images/icon/', fileUploadResponse, 200, {timing: 100});
}
