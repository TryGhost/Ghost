import BaseModel from 'ghost/models/base';

var SettingsModel = BaseModel.extend({
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
