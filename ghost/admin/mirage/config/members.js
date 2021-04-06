import faker from 'faker';
import moment from 'moment';
import {Response} from 'ember-cli-mirage';
import {paginatedResponse} from '../utils';

export function mockMembersStats(server) {
    server.get('/members/stats/count', function (db, {queryParams}) {
        let {days} = queryParams;

        let firstSubscriberDays = faker.random.number({min: 30, max: 600});

        if (days === 'all-time') {
            days = firstSubscriberDays;
        } else {
            days = Number(days);
        }

        let total = 0;
        if (firstSubscriberDays > days) {
            total += faker.random.number({max: 1000});
        }

        // simulate sql GROUP BY where days with 0 subscribers are missing
        let dateCounts = {};
        let i = 0;
        while (i < days) {
            let date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            let count = faker.random.number({min: 0, max: 30});

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
    });
}

export default function mockMembers(server) {
    server.post('/members/', function ({members}) {
        let attrs = this.normalizedRequestAttrs();

        return members.create(Object.assign({}, attrs, {id: 99}));
    });

    server.get('/members/', paginatedResponse('members'));

    server.del('/members/', function ({members}, {queryParams}) {
        if (queryParams.all !== 'true') {
            return new Response(422, {}, {errors: [{
                type: 'IncorrectUsageError',
                message: 'DELETE /members/ must be used with a filter, search, or all=true query parameter'
            }]});
        }

        let count = members.all().length;
        members.all().destroy();

        return {
            meta: {
                stats: {
                    deleted: {
                        count
                    }
                }
            }
        };
    });

    server.get('/members/:id/', function ({members}, {params}) {
        let {id} = params;
        let member = members.find(id);

        return member || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Member not found.'
            }]
        });
    });

    server.put('/members/:id/');

    server.del('/members/:id/');

    mockMembersStats(server);
}
