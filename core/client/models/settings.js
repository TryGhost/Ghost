var validator = window.validator;

import BaseModel from 'ghost/models/base';

var SettingsModel = BaseModel.extend({
    url: BaseModel.apiRoot + '/settings/?type=blog,theme,app',

    title: null,
    description: null,
    email: null,
    logo: null,
    cover: null,
    defaultLang: null,
    postsPerPage: null,
    forceI18n: null,
    permalinks: null,
    activeTheme: null,
    activeApps: null,
    installedApps: null,
    availableThemes: null,
    availableApps: null,

    validate: function () {
        var validationErrors = [],
            postsPerPage;

        if (!validator.isLength(this.get('title'), 0, 150)) {
            validationErrors.push({message: "Title is too long", el: 'title'});
        }

        if (!validator.isLength(this.get('description'), 0, 200)) {
            validationErrors.push({message: "Description is too long", el: 'description'});
        }

        if (!validator.isEmail(this.get('email')) || !validator.isLength(this.get('email'), 0, 254)) {
            validationErrors.push({message: "Please supply a valid email address", el: 'email'});
        }

        postsPerPage = this.get('postsPerPage');
        if (!validator.isInt(postsPerPage) || postsPerPage > 1000) {
            validationErrors.push({message: "Please use a number less than 1000", el: 'postsPerPage'});
        }

        if (!validator.isInt(postsPerPage) || postsPerPage < 0) {
            validationErrors.push({message: "Please use a number greater than 0", el: 'postsPerPage'});
        }

        return validationErrors;
    },
    exportPath: BaseModel.adminRoot + '/export/',
    importFrom: function (file) {
        var formData = new FormData();
        formData.append('importfile', file);
        return ic.ajax.request(BaseModel.apiRoot + '/db/', {
            headers: {
                'X-CSRF-Token': $('meta[name="csrf-param"]').attr('content')
            },
            type: 'POST',
            data: formData,
            dataType: 'json',
            cache: false,
            contentType: false,
            processData: false
        });
    },
    sendTestEmail: function () {
        return ic.ajax.request(BaseModel.apiRoot + '/mail/test/', {
            type: 'POST',
            headers: {
                'X-CSRF-Token': $('meta[name="csrf-param"]').attr('content')
            }
        });
    }
});

export default SettingsModel;
