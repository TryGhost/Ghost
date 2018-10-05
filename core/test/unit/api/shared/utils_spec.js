const should = require('should');
const {
    requiredData,
    requiredOptions,
    allowedData,
    allowedOptions,
    mergeValidations
} = require('../../../../server/api/shared/utils');

describe.only('shared api utils', function () {
    describe('requiredData(prop)', function () {
        it('returns a validation object requring the prop', function () {
            should.deepEqual(requiredData('jeremy'), {
                data: {
                    jeremy: {
                        required: true
                    }
                }
            });
        });
    });

    describe('requiredOptions(prop)', function () {
        it('returns a validation object requring the prop', function () {
            should.deepEqual(requiredOptions('mark'), {
                options: {
                    mark: {
                        required: true
                    }
                }
            });
        });
    });

    describe('allowedData(prop, vals)', function () {
        it('returns a validation object allowing the prop to have vals', function () {
            should.deepEqual(allowedData('dinner', ['eggs', 'pizza', 'beer']), {
                data: {
                    dinner: {
                        values: ['eggs', 'pizza', 'beer']
                    }
                }
            });
        });
    });

    describe('allowedOptions(prop, vals)', function () {
        it('returns a validation object allowing the prop to have vals', function () {
            should.deepEqual(allowedOptions('breakfast', ['eggs', 'icecream']), {
                options: {
                    breakfast: {
                        values: ['eggs', 'icecream']
                    }
                }
            });
        });
    });

    describe('mergeValidations(...validations)', function () {
        it('returns a validation object containing all the validations', function () {
            should.deepEqual(mergeValidations(
                requiredData('breakfast'),
                requiredData('dinner'),
                allowedData('dinner', ['eggs', 'pizza', 'beer']),
                requiredOptions('egg_style'),
                allowedOptions('egg_style', ['loads'])
            ), {
                data: {
                    breakfast: {
                        required: true
                    },
                    dinner: {
                        required: true,
                        values: ['eggs', 'pizza', 'beer']
                    }
                },
                options: {
                    egg_style: {
                        required: true,
                        values: ['loads']
                    }
                }
            });
        });
    });
});
