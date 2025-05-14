import {AppContext} from '../../AppContext';
import {Avatar} from './Avatar';
import {buildDeletedMember, buildMember} from '../../../test/utils/fixtures';
import {render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, ...renderOptions}) => {
    const contextWithDefaults = {
        commentsEnabled: 'all',
        comments: [],
        openCommentForms: [],
        member: null,
        t: str => str,
        ...appContext
    };

    return render(
        <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>,
        renderOptions
    );
};

describe('<AvatarComponent>', function () {
    it('renders provided member\'s avatar if provided', function () {
        const member = buildMember({
            name: 'John Doe'
        });
        const appContext = {};

        contextualRender(<Avatar member={member} />, {appContext});

        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders blank avatar if member is null', function () {
        const appContext = {};

        contextualRender(<Avatar member={null} />, {appContext});

        expect(screen.getByTestId('blank-avatar')).toBeInTheDocument();
    });

    it('renders blank avator if member is deleted', function () {
        const member = buildDeletedMember();
        const appContext = {};

        contextualRender(<Avatar member={member} />, {appContext});
    });
});
