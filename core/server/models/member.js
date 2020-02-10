const ghostBookshelf = require('./base');
const uuid = require('uuid');
const _ = require('lodash');
const sequence = require('../lib/promise/sequence');
const config = require('../config');
const crypto = require('crypto');
const urlUtils = require('../lib/url-utils');

const Member = ghostBookshelf.Model.extend({
    tableName: 'members',

    defaults() {
        return {
            subscribed: true,
            uuid: uuid.v4()
        };
    },

    relationships: ['labels'],

    relationshipBelongsTo: {
        labels: 'labels'
    },

    labels: function labels() {
        return this.belongsToMany('Label', 'members_labels', 'member_id', 'label_id')
            .withPivot('sort_order')
            .query('orderBy', 'sort_order', 'ASC');
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'member' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    },

    onDestroying: function onDestroyed(model) {
        ghostBookshelf.Model.prototype.onDestroying.apply(this, arguments);

        this.handleAttachedModels(model);
    },

    onSaving: function onSaving(model, attr, options) {
        let labelsToSave = [];
        let ops = [];

        // CASE: detect lowercase/uppercase label slugs
        if (!_.isUndefined(this.get('labels')) && !_.isNull(this.get('labels'))) {
            labelsToSave = [];

            //  and deduplicate upper/lowercase tags
            _.each(this.get('labels'), function each(item) {
                item.name = item.name && item.name.trim();
                for (let i = 0; i < labelsToSave.length; i = i + 1) {
                    if (labelsToSave[i].name && item.name && labelsToSave[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                        return;
                    }
                }

                labelsToSave.push(item);
            });

            this.set('labels', labelsToSave);
        }

        // CASE: Detect existing labels with same case-insensitive name and replace
        ops.push(function updateLabels() {
            return ghostBookshelf.model('Label')
                .findAll(Object.assign({
                    columns: ['id', 'name']
                }, _.pick(options, 'transacting')))
                .then((labels) => {
                    labelsToSave.forEach((label) => {
                        let existingLabel = labels.find((lab) => {
                            return label.name.toLowerCase() === lab.get('name').toLowerCase();
                        });
                        label.name = (existingLabel && existingLabel.get('name')) || label.name;
                    });

                    model.set('labels', labelsToSave);
                });
        });

        this.handleAttachedModels(model);
        return sequence(ops);
    },

    handleAttachedModels: function handleAttachedModels(model) {
        /**
         * @NOTE:
         * Bookshelf only exposes the object that is being detached on `detaching`.
         * For the reason above, `detached` handler is using the scope of `detaching`
         * to access the models that are not present in `detached`.
         */
        model.related('labels').once('detaching', function onDetached(collection, label) {
            model.related('labels').once('detached', function onDetached(detachedCollection, response, options) {
                label.emitChange('detached', options);
                model.emitChange('label.detached', options);
            });
        });

        model.related('labels').once('attaching', function onDetached(collection, labels) {
            model.related('labels').once('attached', function onDetached(detachedCollection, response, options) {
                labels.forEach((label) => {
                    label.emitChange('attached', options);
                    model.emitChange('label.attached', options);
                });
            });
        });
    },

    /**
     * The base model keeps only the columns, which are defined in the schema.
     * We have to add the relations on top, otherwise bookshelf-relations
     * has no access to the nested relations, which should be updated.
     */
    permittedAttributes: function permittedAttributes() {
        let filteredKeys = ghostBookshelf.Model.prototype.permittedAttributes.apply(this, arguments);

        this.relationships.forEach((key) => {
            filteredKeys.push(key);
        });

        return filteredKeys;
    },

    /**
     * We have to ensure consistency. If you listen on model events (e.g. `member.added`), you can expect that you always
     * receive all fields including relations. Otherwise you can't rely on a consistent flow. And we want to avoid
     * that event listeners have to re-fetch a resource. This function is used in the context of inserting
     * and updating resources. We won't return the relations by default for now.
     */
    defaultRelations: function defaultRelations(methodName, options) {
        if (['edit', 'add', 'destroy'].indexOf(methodName) !== -1) {
            options.withRelated = _.union(['labels'], options.withRelated || []);
        }

        return options;
    },

    toJSON(unfilteredOptions) {
        const options = Member.filterOptions(unfilteredOptions, 'toJSON');
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        // inject a computed avatar url
        //
        // uses gravatar's default ?d= query param to enable a redirect to one
        // of our own images if there is no gravatar for the member's email
        //
        // we have an image "api" endpoint {siteUrl}/images/member/{uuid}/
        // fallback = gravatar -> theme default avatar -> ghost default avatar
        //
        // if gravatar is disabled in privacy config then we'll return our member avatar url directly
        const absolute = true;
        attrs.avatar_image = urlUtils.urlJoin(
            urlUtils.getSiteUrl(absolute),
            urlUtils.STATIC_IMAGE_URL_PREFIX,
            `members/avatar/default/`
        );

        // Ensure we have an assetHash
        // @TODO rework this! Code is shared with asset_url helper
        if (!config.get('assetHash')) {
            config.set('assetHash', (crypto.createHash('md5').update(Date.now().toString()).digest('hex')).substring(0, 10));
        }

        // Finally add the asset hash to the output URL
        attrs.avatar_image += '?v=' + config.get('assetHash');

        if (attrs.email && !config.isPrivacyDisabled('useGravatar')) {
            const emailHash = crypto.createHash('md5').update(attrs.email.toLowerCase().trim()).digest('hex');
            const encodedImageUrl = encodeURIComponent(attrs.avatar_image);
            attrs.avatar_image = `https://gravatar.com/avatar/${emailHash}?s=250&d=${encodedImageUrl}`;
        }

        return attrs;
    }
});

const Members = ghostBookshelf.Collection.extend({
    model: Member
});

module.exports = {
    Member: ghostBookshelf.model('Member', Member),
    Members: ghostBookshelf.collection('Members', Members)
};
