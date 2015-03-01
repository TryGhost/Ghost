define("ghost/controllers/forgotten", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ajax = __dependency1__["default"];
    var ValidationEngine = __dependency2__["default"];

    var ForgottenController = Ember.Controller.extend(ValidationEngine, {
        email: '',
        submitting: false,

        // ValidationEngine settings
        validationType: 'forgotten',

        actions: {
            submit: function () {
                var self = this,
                    data = self.getProperties('email');

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
                        self.notifications.showSuccess('发送成功，请按照邮件提示重置密码。(如未收到，请检查垃圾箱)', {delayed: true});
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

    __exports__["default"] = ForgottenController;
  });