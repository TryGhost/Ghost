import moment from 'moment-timezone';
import nql from '@tryghost/nql';
import {Response} from 'miragejs';
import {
    extractFilterParam,
    paginateModelCollection,
    withPermissionsCheck
} from '../utils';
import {faker} from '@faker-js/faker';
import {underscore} from '@ember/string';

const ALLOWED_ROLES = [
    'Owner',
    'Administrator',
    'Super Editor'
];

export function mockMembersStats(server) {
    server.get('/members/stats/count', withPermissionsCheck(ALLOWED_ROLES, function (db, {queryParams}) {
        let {days} = queryParams;

        let firstSubscriberDays = faker.datatype.number({min: 30, max: 600});

        if (days === 'all-time') {
            days = firstSubscriberDays;
        } else {
            days = Number(days);
        }

        let total = 0;
        if (firstSubscriberDays > days) {
            total += faker.datatype.number({max: 1000});
        }

        // simulate sql GROUP BY where days with 0 subscribers are missing
        let dateCounts = {};
        let i = 0;
        while (i < days) {
            let date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            let count = faker.datatype.number({min: 0, max: 30});

            if (count !== 0) {
                dateCounts[date] = count;
            }

            i += 1;
        }

        // similar to what we'll need to do on the server
        let totalOnDate = {};
        let j = days - 1;
        while (j >= 0) {
            let date = moment().subtract(j, 'days').format('YYYY-MM-DD');
            totalOnDate[date] = total + (dateCounts[date] || 0);
            total += (dateCounts[date] || 0);
            j -= 1;
        }

        return {
            total,
            resource: 'members',
            data: Object.keys(totalOnDate).map((key, idx, arr) => {
                return {
                    date: key,
                    free: arr[key],
                    paid: 0,
                    comped: 0
                };
            })
        };
    }));
}

export default function mockMembers(server) {
    server.post('/members/', withPermissionsCheck(ALLOWED_ROLES, function ({members}) {
        const attrs = this.normalizedRequestAttrs();
        return members.create(attrs);
    }));

    server.get('/members/', withPermissionsCheck(ALLOWED_ROLES, function ({members}, {queryParams}) {
        let {filter, search, page, limit} = queryParams;
        page = +page || 1;
        limit = +limit || 15;

        let collection = members.all();
        if (filter) {
            try {
                const nqlFilter = nql(filter, {
                    expansions: [
                        {
                            key: 'label',
                            replacement: 'labels.slug'
                        },
                        {
                            key: 'tier',
                            replacement: 'tiers.slug'
                        },
                        {
                            key: 'tier_id',
                            replacement: 'tiers.id'
                        },
                        {
                            key: 'offer_redemptions',
                            replacement: 'subscriptions.offer_id'
                        }
                    ]
                });

                collection = collection.filter((member) => {
                    const serializedMember = {};

                    // mirage model keys match our main model keys so we need to transform
                    // camelCase to underscore to match the filter format
                    Object.keys(member.attrs).forEach((key) => {
                        serializedMember[underscore(key)] = member.attrs[key];
                    });

                    // similar deal for associated models
                    ['labels', 'tiers', 'subscriptions', 'newsletters'].forEach((association) => {
                        serializedMember[association] = [];
                        member[association].models.forEach((associatedModel) => {
                            const serializedAssociation = {};
                            Object.keys(associatedModel.attrs).forEach((key) => {
                                serializedAssociation[underscore(key)] = associatedModel.attrs[key];
                            });
                            serializedMember[association].push(serializedAssociation);
                        });
                    });
                    return nqlFilter.queryJSON(serializedMember);
                });
            } catch (err) {
                console.error(err); // eslint-disable-line
                throw err;
            }
        }

        if (search) {
            const query = search.toLowerCase();
            collection = collection.filter((member) => {
                return member.name.toLowerCase().indexOf(query) !== -1
                    || member.email.toLowerCase().indexOf(query) !== -1;
            });
        }

        return paginateModelCollection('members', collection, page, limit);
    }));

    server.del('/members/', withPermissionsCheck(ALLOWED_ROLES, function ({members}, {queryParams}) {
        if (!queryParams.filter && !queryParams.search && queryParams.all !== 'true') {
            return new Response(422, {}, {errors: [{
                type: 'IncorrectUsageError',
                message: 'DELETE /members/ must be used with a filter, search, or all=true query parameter'
            }]});
        }

        let membersToDelete = members.all();

        if (queryParams.filter) {
            let labelFilter = extractFilterParam('label', queryParams.filter);

            membersToDelete = membersToDelete.filter((member) => {
                let matches = false;
                labelFilter.forEach((slug) => {
                    if (member.labels.models.find(l => l.slug === slug)) {
                        matches = true;
                    }
                });
                return matches;
            });
        }

        let count = membersToDelete.length;
        membersToDelete.destroy();

        return {
            meta: {
                stats: {
                    successful: count
                }
            }
        };
    }));

    server.get('/members/:id/', withPermissionsCheck(ALLOWED_ROLES, function ({members}, {params}) {
        let {id} = params;
        let member = members.find(id);

        return member || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Member not found.'
            }]
        });
    }));

    server.put('/members/:id/', withPermissionsCheck(ALLOWED_ROLES, function ({members, tiers, subscriptions}, {params}) {
        const attrs = this.normalizedRequestAttrs();
        const member = members.find(params.id);

        // API accepts `tiers: [{id: 'x'}]` which isn't handled natively by mirage
        if (attrs.tiers.length > 0) {
            attrs.tiers.forEach((p) => {
                const tier = tiers.find(p.id);

                if (!member.tiers.includes(tier)) {
                    // TODO: serialize tiers through _active_ subscriptions
                    member.tiers.add(tier);

                    subscriptions.create({
                        member,
                        tier,
                        comped: true,
                        plan: {
                            id: '',
                            nickname: 'Complimentary',
                            interval: 'year',
                            currency: 'USD',
                            amount: 0
                        },
                        status: 'active',
                        startDate: moment().toISOString(),
                        defaultPaymentCardLast4: '****',
                        cancelAtPeriodEnd: false,
                        cancellationReason: null,
                        currentPeriodEnd: moment().add(1, 'year').toISOString(),
                        price: {
                            id: '',
                            price_id: '',
                            nickname: 'Complimentary',
                            amount: 0,
                            interval: 'year',
                            type: 'recurring',
                            currency: 'USD',
                            tier: {
                                id: '',
                                tier_id: tier.id
                            }
                        },
                        offer: null
                    });

                    member.save();
                }
            });
        }

        const tierIds = (attrs.tiers || []).map(p => p.id);

        member.tiers.models.forEach((tier) => {
            if (!tierIds.includes(tier.id)) {
                member.subscriptions.models.filter(sub => sub.tier.id === tier.id).forEach((sub) => {
                    member.subscriptions.remove(sub);
                });

                member.tiers.remove(tier);
            }
        });

        // these are read-only properties so make sure we don't overwrite data
        delete attrs.tiers;
        delete attrs.subscriptions;

        return member.update(attrs);
    }));

    server.del('/members/:id/', withPermissionsCheck(ALLOWED_ROLES, function ({members}, request) {
        const id = request.params.id;
        members.find(id).destroy();
    }));

    server.get('/members/upload/', withPermissionsCheck(ALLOWED_ROLES, function () {
        return new Response(200, {
            'Content-Disposition': 'attachment',
            filename: `members.${moment().format('YYYY-MM-DD')}.csv`,
            'Content-Type': 'text/csv'
        }, '');
    }));

    server.post('/members/upload/', withPermissionsCheck(ALLOWED_ROLES, function ({labels}, request) {
        const label = labels.create();

        // TODO: parse CSV and create member records
        for (const kvPair of request.requestBody.entries()) {
            const [key, value] = kvPair;
            console.log({key, value}); // eslint-disable-line
        }

        return new Response(201, {}, {
            meta: {
                import_label: label,
                stats: {imported: 1, invalid: []}
            }
        });
    }));

    server.get('/members/events/', withPermissionsCheck(ALLOWED_ROLES, function ({memberActivityEvents}, {queryParams}) {
        let {limit, filter, page} = queryParams;

        limit = +limit || 15;
        page = +page || 1;

        let collection = memberActivityEvents.all();
        collection = collection.sort((a, b) => {
            return Number(b.id) - Number(a.id);
        });

        if (filter) {
            try {
                const nqlFilter = nql(filter, {
                    expansions: [
                        {
                            key: 'data.created_at',
                            replacement: 'created_at'
                        }
                    ]
                });

                collection = collection.filter((event) => {
                    const serializedEvent = {};

                    // mirage model keys match our main model keys, so we need to transform
                    // camelCase to underscore to match the filter format
                    Object.keys(event.attrs).forEach((key) => {
                        serializedEvent[underscore(key)] = event.attrs[key];
                    });

                    return nqlFilter.queryJSON(serializedEvent);
                });
            } catch (err) {
                console.error(err); // eslint-disable-line
                throw err;
            }
        }

        return paginateModelCollection('members', collection, page, limit);
    }));

    mockMembersStats(server);
}
