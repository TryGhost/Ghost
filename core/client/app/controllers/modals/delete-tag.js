import Ember from 'ember';
var DeleteTagController = Ember.Controller.extend({
    postInflection: Ember.computed('model.post_count', function () {
        return this.get('model.post_count') > 1 ? '博文' : '博文';
    }),

    actions: {
        confirmAccept: function () {
            var tag = this.get('model'),
                name = tag.get('name'),
                self = this;

            this.send('closeSettingsMenu');

            tag.destroyRecord().then(function () {
                self.notifications.showSuccess('删除 ' + name);
            }).catch(function (error) {
                self.notifications.showAPIError(error);
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

export default DeleteTagController;
