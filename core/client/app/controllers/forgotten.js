import Ember from 'ember';
import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var ForgottenController = Ember.Controller.extend(ValidationEngine, {
    email: '',
    submitting: false,

    // ValidationEngine settings
    validationType: 'forgotten',

    actions: {
        submit: function () {
            var data = this.getProperties('email');
            this.send('doForgotten', data, true);
        },
        doForgotten: function (data, delay) {
            var self = this;
            this.set('email', data.email);
            this.toggleProperty('submitting');
            this.validate({format: false}).then(function () {
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                    type: 'POST',
                    data: {
                        passwordreset: [{
                            email: data.email
                        }]
                    }
                }).then(function () {
                    self.toggleProperty('submitting');
                    self.notifications.showSuccess('发送成功，请按照邮件提示重置密码。(如未收到，请检查垃圾箱)', {delayed: delay});
                    self.set('email', '');
                    self.transitionToRoute('signin');
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    self.notifications.showAPIError(resp, {defaultErrorText: '登录时系统错误,请重试。（ 反馈QQ群: 335978388 ）'});
                });
            }).catch(function (errors) {
                self.toggleProperty('submitting');
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default ForgottenController;
