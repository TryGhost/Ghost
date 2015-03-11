// SelectiveSaveMixin adds a saveOnly method to a DS.Model.
//
// saveOnly provides a way to save one or more properties of a model while
// preserving outstanding changes to other properties.
var SelectiveSaveMixin = Ember.Mixin.create({
    saveOnly: function () {
        if (arguments.length === 0) {
            return Ember.RSVP.resolve();
        }

        if (arguments.length === 1 && Ember.isArray(arguments[0])) {
            return this.saveOnly.apply(this, Array.prototype.slice.call(arguments[0]));
        }

        var propertiesToSave = Array.prototype.slice.call(arguments),
            changed,
            hasMany = {},
            belongsTo = {},
            self = this;

        changed = this.changedAttributes();

        // disable observers so we can make changes to the model but not have
        // them reflected by the UI
        this.beginPropertyChanges();

        // make a copy of any relations the model may have so they can
        // be reapplied later
        this.eachRelationship(function (name, meta) {
            if (meta.kind === 'hasMany') {
                hasMany[name] = self.get(name).slice();
                return;
            }

            if (meta.kind === 'belongsTo') {
                belongsTo[name] = self.get(name);
                return;
            }
        });

        try {
            // roll back all changes to the model and then reapply only those that
            // are part of the saveOnly

            self.rollback();

            propertiesToSave.forEach(function (name) {
                if (hasMany.hasOwnProperty(name)) {
                    self.get(name).clear();

                    hasMany[name].forEach(function (relatedType) {
                        self.get(name).pushObject(relatedType);
                    });

                    return;
                }

                if (belongsTo.hasOwnProperty(name)) {
                    return self.updateBelongsTo(name, belongsTo[name]);
                }

                if (changed.hasOwnProperty(name)) {
                    return self.set(name, changed[name][1]);
                }
            });
        }
        catch (err) {
            // if we were not able to get the model into the correct state
            // put it back the way we found it and return a rejected promise

            Ember.keys(changed).forEach(function (name) {
                self.set(name, changed[name][1]);
            });

            Ember.keys(hasMany).forEach(function (name) {
                self.updateHasMany(name, hasMany[name]);
            });

            Ember.keys(belongsTo).forEach(function (name) {
                self.updateBelongsTo(name, belongsTo[name]);
            });

            self.endPropertyChanges();

            return Ember.RSVP.reject(new Error(err.message || 'Error during saveOnly. Changes NOT saved.'));
        }

        return this.save().finally(function () {
            // reapply any changes that were not part of the save

            Ember.keys(changed).forEach(function (name) {
                if (propertiesToSave.hasOwnProperty(name)) {
                    return;
                }

                self.set(name, changed[name][1]);
            });

            Ember.keys(hasMany).forEach(function (name) {
                if (propertiesToSave.hasOwnProperty(name)) {
                    return;
                }

                self.updateHasMany(name, hasMany[name]);
            });

            Ember.keys(belongsTo).forEach(function (name) {
                if (propertiesToSave.hasOwnProperty(name)) {
                    return;
                }

                self.updateBelongsTo(name, belongsTo[name]);
            });

            // signal that we're finished and normal model observation may continue
            self.endPropertyChanges();
        });
    }
});

export default SelectiveSaveMixin;
