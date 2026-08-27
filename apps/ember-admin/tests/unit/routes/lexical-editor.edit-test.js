import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: lexical-editor.edit presence', function () {
    setupTest();

    let route;
    let editor;

    beforeEach(function () {
        route = this.owner.lookup('route:lexical-editor.edit');
        editor = {setPost: sinon.stub()};
        sinon.stub(route, 'controllerFor').withArgs('lexical-editor').returns(editor);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('enters presence when the editor is set up', function () {
        const enterStub = sinon.stub(route.presence, 'enterPost');
        const post = {id: 'post-1'};

        route.setupController({}, post);

        expect(editor.setPost).to.have.been.calledOnceWith(post);
        expect(enterStub).to.have.been.calledOnceWith('post-1');
    });

    it('leaves presence when the route deactivates', function () {
        const leaveStub = sinon.stub(route.presence, 'leavePost');
        route._activePostId = 'post-1';

        route.deactivate();

        expect(leaveStub).to.have.been.calledOnceWith('post-1');
        expect(route._activePostId).to.be.null;
    });
});
