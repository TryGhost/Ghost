module.exports = {
    get normalize() {
        return require('./normalize');
    },
    get handleImageSizes() {
        return require('./handle-image-sizes');
    },
    get handleMemberAvatars() {
        return require('./handle-member-avatars');
    }
};
