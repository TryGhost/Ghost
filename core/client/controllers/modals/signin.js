import SigninController from '../signin';

export default SigninController.extend({
    actions: {
        authenticate: function (data) {
            var self = this;
            this._super(data).then(function () {
                self.send('closeModal');
            });
        }
    }
});
