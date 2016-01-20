import BaseValidator from './base';

export default BaseValidator.create({
  properties: ['name', 'description'],
  name(model) {
      let title = model.get('name');

      if (!validator.isLength(title, 0, 150)) {
          model.get('errors').add('name', 'Name is too long');
          this.invalidate();
      }
  },

  description(model) {
      let desc = model.get('description');

      if (!validator.isLength(desc, 0, 200)) {
          model.get('errors').add('description', 'Description is too long');
          this.invalidate();
      }
  }
});
