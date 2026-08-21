import {act, fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {ArtifactBuilderPayload, OpenArtifactBuilderEvent} from '@/ember-bridge';
import type {ArtifactBuilderExperienceProps} from './artifact-builder-host';

let featureEnabled: boolean | null | undefined = true;
let openHandler: ((event: OpenArtifactBuilderEvent) => void) | undefined;
let routePath = '/editor/post/1';
const respond = vi.fn<(result: unknown) => boolean>(() => true);

vi.mock('react-router', async (importOriginal) => ({
    ...await importOriginal<typeof import('react-router')>(),
    useLocation: () => ({pathname: routePath, search: '', hash: '', state: null, key: routePath})
}));

vi.mock('@/ember-bridge', () => ({
    useEmberFeatureFlag: () => featureEnabled,
    subscribeOpenArtifactBuilder: (handler: (event: OpenArtifactBuilderEvent) => void) => {
        openHandler = handler;
        return () => {
            openHandler = undefined;
        };
    },
    respondToArtifactBuilder: (result: unknown) => respond(result)
}));

const request: OpenArtifactBuilderEvent = {
    requestId: 'request-1',
    cardId: 'node-1',
    artifact: {id: 'artifact-1', artifactVersion: 1, title: '', description: '', html: ''}
};

const saved: ArtifactBuilderPayload = {
    id: 'artifact-1',
    artifactVersion: 1,
    title: 'Calculator',
    description: 'A useful calculator',
    html: '<!doctype html><html><head><title>Calculator</title></head><body>Saved</body></html>'
};

const FakeExperience = ({onCancel, onSave}: ArtifactBuilderExperienceProps) => (
    <div>
        <span>Artifact overlay</span>
        <button type='button' onClick={onCancel}>Cancel</button>
        <button type='button' onClick={() => onSave(saved)}>Save</button>
    </div>
);

describe('ArtifactBuilderHost', () => {
    beforeEach(() => {
        featureEnabled = true;
        routePath = '/editor/post/1';
        respond.mockClear();
    });

    it('correlates Save with the originating bridge request', async () => {
        const {ArtifactBuilderHost} = await import('./artifact-builder-host');
        render(<ArtifactBuilderHost Experience={FakeExperience} />);

        act(() => openHandler?.(request));
        expect(screen.getByRole('dialog', {name: 'Artifact editor'})).toBeInTheDocument();
        expect(screen.getByText('Artifact overlay')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Save'}));

        expect(respond).toHaveBeenCalledWith({requestId: 'request-1', status: 'saved', artifact: saved});
        expect(screen.queryByText('Artifact overlay')).not.toBeInTheDocument();
    });

    it('returns Cancel without changing the card', async () => {
        const {ArtifactBuilderHost} = await import('./artifact-builder-host');
        render(<ArtifactBuilderHost Experience={FakeExperience} />);

        act(() => openHandler?.(request));
        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

        expect(respond).toHaveBeenCalledWith({requestId: 'request-1', status: 'cancelled'});
    });

    it('returns an unavailable error when the shared experiment is off', async () => {
        featureEnabled = false;
        const {ArtifactBuilderHost} = await import('./artifact-builder-host');
        render(<ArtifactBuilderHost Experience={FakeExperience} />);

        act(() => openHandler?.(request));

        expect(respond).toHaveBeenCalledWith({
            requestId: 'request-1',
            status: 'error',
            message: 'Artifact Builder is not available on this site.'
        });
        expect(screen.queryByText('Artifact overlay')).not.toBeInTheDocument();
        featureEnabled = true;
    });

    it('does not reject a replay of the active correlated request', async () => {
        const {ArtifactBuilderHost} = await import('./artifact-builder-host');
        render(<ArtifactBuilderHost Experience={FakeExperience} />);

        act(() => openHandler?.(request));
        act(() => openHandler?.(request));

        expect(respond).not.toHaveBeenCalled();
        expect(screen.getByText('Artifact overlay')).toBeInTheDocument();
    });

    it('moves focus into the modal surface and restores it after closing', async () => {
        const {ArtifactBuilderHost} = await import('./artifact-builder-host');
        const trigger = document.createElement('button');
        document.body.append(trigger);
        trigger.focus();
        render(<ArtifactBuilderHost Experience={FakeExperience} />);

        act(() => openHandler?.(request));
        expect(screen.getByRole('dialog', {name: 'Artifact editor'})).toContainElement(document.activeElement as HTMLElement);

        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        expect(trigger).toHaveFocus();
        trigger.remove();
    });

    it('settles the bridge request when the Builder experience cannot load', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const BrokenExperience = () => {
            throw new Error('chunk failed');
        };
        const {ArtifactBuilderHost} = await import('./artifact-builder-host');
        render(<ArtifactBuilderHost Experience={BrokenExperience} />);

        act(() => openHandler?.(request));

        expect(respond).toHaveBeenCalledWith({
            requestId: 'request-1',
            status: 'error',
            message: 'Artifact Builder could not load. Please try again.'
        });
        expect(screen.queryByRole('dialog', {name: 'Artifact editor'})).not.toBeInTheDocument();
        consoleError.mockRestore();
    });

    it('cancels the correlated request when its originating editor route changes', async () => {
        const {ArtifactBuilderHost} = await import('./artifact-builder-host');
        const view = render(<ArtifactBuilderHost Experience={FakeExperience} />);
        act(() => openHandler?.(request));

        routePath = '/posts';
        view.rerender(<ArtifactBuilderHost Experience={FakeExperience} />);

        expect(respond).toHaveBeenCalledWith({requestId: 'request-1', status: 'cancelled'});
        expect(screen.queryByRole('dialog', {name: 'Artifact editor'})).not.toBeInTheDocument();
    });
});
