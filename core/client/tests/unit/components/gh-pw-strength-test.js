import {
    describeComponent,
    it
} from 'ember-mocha';

var regularClass = 'pw-strength-dot',
    activeClass = 'pw-strength-activedot';

describeComponent('gh-pw-strength', function () {
    it('renders no dots when zxcvbn is not defined', function () {
        var component = this.subject({
            password: ''
        });

        this.render();

        expect(component.$().children().length).to.equal(0);
    });

    it('renders one dot red with password of score 0', function () {
        var component = this.subject({
            password: ''
        });

        window.zxcvbn = function () {
            return {score: 0};
        };

        this.render();

        expect(component.$().children().eq(4).hasClass(regularClass)).to.equal(true);
        expect(component.$().children().eq(4).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(3).hasClass(activeClass)).to.equal(false);
    });

    it('renders two dots red with password of score 1', function () {
        var component = this.subject();

        window.zxcvbn = function () {
            return {score: 1};
        };

        this.render();

        expect(component.$().children().eq(4).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(3).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(2).hasClass(activeClass)).to.equal(false);
    });

    it('renders three dots red with password of score 2', function () {
        var component = this.subject();

        window.zxcvbn = function () {
            return {score: 2};
        };

        this.render();

        expect(component.$().children().eq(4).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(3).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(2).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(1).hasClass(activeClass)).to.equal(false);
    });

    it('renders four dots red with password of score 3', function () {
        var component = this.subject();

        window.zxcvbn = function () {
            return {score: 3};
        };

        this.render();

        expect(component.$().children().eq(4).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(3).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(2).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(1).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(0).hasClass(activeClass)).to.equal(false);
    });

    it('renders five dots red with password of score 4', function () {
        var component = this.subject();

        window.zxcvbn = function () {
            return {score: 4};
        };

        this.render();

        expect(component.$().children().eq(4).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(3).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(2).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(1).hasClass(activeClass)).to.equal(true);
        expect(component.$().children().eq(0).hasClass(activeClass)).to.equal(true);
    });
});
