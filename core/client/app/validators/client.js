import BaseValidator from './base';

export default BaseValidator.create({
  properties: ['name', 'description', 'redirection_uri'],

  name(model) {
      let name = model.get('name');

      if (validator.empty(name)) {
          model.get('errors').add('name', 'You must specify a name for the client.');
          this.invalidate();
      } else if (name.match(/^,/)) {
          model.get('errors').add('name', 'Client names can\'t start with commas.');
          this.invalidate();
      } else if (!validator.isLength(name, 0, 150)) {
          model.get('errors').add('name', 'Client names cannot be longer than 150 characters.');
          this.invalidate();
      }
  },

  description(model) {
      let description = model.get('description');

      if (!validator.isLength(description, 0, 200)) {
          model.get('errors').add('description', 'Description cannot be longer than 200 characters.');
          this.invalidate();
      }
  }
});
