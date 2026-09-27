import NavigationItem from 'ghost-admin/models/navigation-item';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {getPagePlacement, setPageNavigationPlacement} from 'ghost-admin/utils/site-navigation';

function mutableSettings({navigation = [], secondaryNavigation = []} = {}) {
    return {
        navigation: emberA(navigation.map(item => NavigationItem.create({...item, isSecondary: false}))),
        secondaryNavigation: emberA(secondaryNavigation.map(item => NavigationItem.create({...item, isSecondary: true}))),
        settingsModel: {},
        reload: sinon.stub().resolves(),
        save: sinon.stub().resolves()
    };
}

describe('Unit: Util: site-navigation', function () {
    const blogUrl = 'https://example.com/';

    it('reads placement from Ember navigation models', function () {
        const settings = mutableSettings({secondaryNavigation: [{label: 'Home', url: '/home/'}]});
        expect(getPagePlacement(settings, '/', blogUrl, {home: '/'})).to.equal('secondary');
    });

    it('reloads settings before updating and saves the fresh menus', async function () {
        const settings = mutableSettings();
        settings.reload.callsFake(async () => {
            settings.navigation = emberA([NavigationItem.create({label: 'News', url: '/news/'})]);
        });

        await setPageNavigationPlacement(settings, {label: 'About', path: '/about/', placement: 'primary', blogUrl});

        expect(settings.reload.calledOnce).to.be.true;
        expect(settings.save.calledOnce).to.be.true;
        expect(settings.navigation.map(item => item.url)).to.deep.equal(['/news/', '/about/']);
    });

    it('rebuilds navigation models with the correct menu and metadata', async function () {
        const item = {label: '', url: '/about/', icon: 'https://example.com/about.svg', visibility: 'members'};
        const settings = mutableSettings({navigation: [item]});

        await setPageNavigationPlacement(settings, {label: 'About', path: '/about/', placement: 'secondary', blogUrl});

        expect(settings.navigation).to.have.length(0);
        expect(settings.secondaryNavigation).to.have.length(1);
        const moved = settings.secondaryNavigation[0];
        expect(moved).to.be.instanceOf(NavigationItem);
        expect(moved.getProperties('label', 'url', 'icon', 'visibility')).to.deep.equal(item);
        expect(moved.isSecondary).to.be.true;

        await setPageNavigationPlacement(settings, {path: '/about/', placement: 'primary', blogUrl});
        expect(settings.navigation[0]).to.be.instanceOf(NavigationItem);
        expect(settings.navigation[0].isSecondary).to.be.false;
    });

    it('skips saving when the page is already in the destination', async function () {
        const settings = mutableSettings({navigation: [{label: 'About', url: '/about/'}]});
        const primary = settings.navigation;

        await setPageNavigationPlacement(settings, {path: '/about/', placement: 'primary', blogUrl});

        expect(settings.reload.calledOnce).to.be.true;
        expect(settings.save.called).to.be.false;
        expect(settings.navigation).to.equal(primary);
    });

    it('restores both menus when saving fails', async function () {
        const settings = mutableSettings({
            navigation: [{label: 'Home', url: '/'}],
            secondaryNavigation: [{label: 'About', url: '/about/'}]
        });
        const primary = settings.navigation;
        const secondary = settings.secondaryNavigation;
        const failure = new Error('Save failed');
        settings.save.rejects(failure);

        let error;
        try {
            await setPageNavigationPlacement(settings, {path: '/', placement: 'secondary', blogUrl});
        } catch (e) {
            error = e;
        }

        expect(error).to.equal(failure);
        expect(settings.navigation).to.equal(primary);
        expect(settings.secondaryNavigation).to.equal(secondary);
        expect(settings.navigation[0].isSecondary).to.be.false;
    });
});
