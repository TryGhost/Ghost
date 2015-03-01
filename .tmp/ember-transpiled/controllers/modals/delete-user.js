define("ghost/controllers/modals/delete-user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DeleteUserController = Ember.Controller.extend({
        userPostCount: Ember.computed('model.id', function () {
            var promise,
                query = {
                    author: this.get('model.slug'),
                    status: 'all'
                };

            promise = this.store.find('post', query).then(function (results) {
                return results.meta.pagination.total;
            });

            return Ember.Object.extend(Ember.PromiseProxyMixin, {
                count: Ember.computed.alias('content'),

                inflection: Ember.computed('count', function () {
                    return this.get('count') > 1 ? '博文' : '博文';
                })
            }).create({promise: promise});
        }),

        actions: {
            confirmAccept: function () {
                var self = this,
                    user = this.get('model');

                user.destroyRecord().then(function () {
                    self.store.unloadAll('post');
                    self.transitionToRoute('settings.users');
                    self.notifications.showSuccess('删除用户成功', {delayed: true});
                }, function () {
                    self.notifications.showError('删除用户失败，请重试');
                });
            },

            confirmReject: function () {
                return false;
            }
        },

        confirm: {
            accept: {
                text: '确认删除',
                buttonClass: 'btn btn-red'
            },
            reject: {
                text: '取消操作',
                buttonClass: 'btn btn-default btn-minor'
            }
        }
    });

    __exports__["default"] = DeleteUserController;
  });