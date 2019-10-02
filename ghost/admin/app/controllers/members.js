import Controller from '@ember/controller';
import moment from 'moment';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    store: service(),

    meta: null,
    members: null,
    searchText: '',
    init() {
        this._super(...arguments);
        this.set('members', this.store.peekAll('member'));
    },

    filteredMembers: computed('members.@each.{name,email}', 'searchText', function () {
        let {members, searchText} = this;
        searchText = searchText.toLowerCase();

        let filtered = members.filter((member) => {
            if (!searchText) {
                return true;
            }

            let {name, email} = member;
            return (name && name.toLowerCase().indexOf(searchText) >= 0)
                || (email && email.toLowerCase().indexOf(searchText) >= 0);
        });

        return filtered;
    }),

    chartData: computed('members.@each', function () {
        let {members} = this;
        let dateFormat = 'DD-MM-YYYY';
        let monthData = [];
        let dateLabel = [];
        let startDate = moment().subtract(29, 'days');
        for (let i = 0; i < 30; i++) {
            let m = moment(startDate).add(i, 'days');
            dateLabel.push(m.format(dateFormat));
            let membersTillDate = members.filter((member) => {
                let isValid = moment(member.createdAt).isSameOrBefore(m, 'day');
                return isValid;
            }).length;
            monthData.push(membersTillDate);
        }
        return {
            data: {
                labels: dateLabel,
                datasets: [
                    {
                        label: 'Total Members',
                        data: monthData,
                        fill: false,
                        strokeColor: 'rgba(151,187,205,1)',
                        pointColor: 'rgba(151,187,205,1)',
                        pointStrokeColor: '#fff',
                        pointHighlightFill: '#fff',
                        pointHighlightStroke: 'rgba(151,187,205,1)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                title: {
                    display: true,
                    text: 'Total members in last 30 days'
                },
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            format: dateFormat,
                            tooltipFormat: 'll'
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Date'
                        },
                        display: true
                    }]
                }
            }
        };
    }),

    fetchMembers: task(function* () {
        let newFetchDate = new Date();
        let results;

        if (this._hasFetchedAll) {
            // fetch any records modified since last fetch
            results = yield this.store.query('member', {
                limit: 'all',
                filter: `updated_at:>='${moment.utc(this._lastFetchDate).format('YYYY-MM-DD HH:mm:ss')}'`
            });
        } else {
            // fetch all records
            results = yield this.store.query('member', {
                limit: 'all'
            });
            this._hasFetchedAll = true;
        }

        this.set('meta', results.meta);
        this._lastFetchDate = newFetchDate;
    })
});
