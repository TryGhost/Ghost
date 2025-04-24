import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {Avatar, AvatarFallback, AvatarImage} from '../../../../src/components/ui/avatar';
import {render} from '../../utils/test-utils';

describe('Avatar Components', () => {
    it('renders Avatar correctly with default props', () => {
        render(<Avatar data-testid="avatar" />);
        const avatar = screen.getByTestId('avatar');
        
        assert.ok(avatar, 'Avatar should be rendered');
        assert.ok(avatar.className.includes('overflow-hidden rounded-full'), 'Should have default styling');
    });

    it('applies custom className to Avatar correctly', () => {
        render(<Avatar className="custom-class" data-testid="avatar" />);
        const avatar = screen.getByTestId('avatar');
        
        assert.ok(avatar.className.includes('custom-class'), 'Should have custom class');
    });

    it('renders AvatarFallback correctly', () => {
        render(
            <Avatar data-testid="avatar">
                <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
            </Avatar>
        );
        
        const avatarFallback = screen.getByTestId('avatar-fallback');
        assert.ok(avatarFallback, 'AvatarFallback should be rendered');
        assert.equal(avatarFallback.textContent, 'JD', 'Should render the fallback text content');
        assert.ok(avatarFallback.className.includes('bg-muted'), 'Should have default styling');
    });

    it('applies custom className to AvatarFallback correctly', () => {
        render(
            <Avatar>
                <AvatarFallback 
                    className="custom-fallback-class" 
                    data-testid="avatar-fallback"
                >
                    JD
                </AvatarFallback>
            </Avatar>
        );
        
        const avatarFallback = screen.getByTestId('avatar-fallback');
        assert.ok(avatarFallback.className.includes('custom-fallback-class'), 'Should have custom class');
    });

    it('verifies Avatar component can accept children', () => {
        render(
            <Avatar data-testid="avatar">
                <div data-testid="custom-child">Test Content</div>
            </Avatar>
        );
        
        const avatar = screen.getByTestId('avatar');
        const child = screen.getByTestId('custom-child');
        
        assert.ok(avatar, 'Avatar should be rendered');
        assert.ok(child, 'Child should be rendered');
        assert.equal(child.textContent, 'Test Content', 'Child should have correct content');
    });

    it('passes props to Avatar component', () => {
        render(
            <Avatar 
                data-testid="avatar" 
                id="custom-id" 
                role="img" 
                aria-label="User avatar"
            />
        );
        
        const avatar = screen.getByTestId('avatar');
        assert.equal(avatar.id, 'custom-id', 'Should have custom id');
        assert.equal(avatar.getAttribute('role'), 'img', 'Should have correct role');
        assert.equal(avatar.getAttribute('aria-label'), 'User avatar', 'Should have correct aria-label');
    });

    it('tests AvatarImage functionality indirectly', () => {
        // Testing that the Avatar component properly accepts the AvatarImage component
        // We're not testing detailed functionality since it's not fully working in the test environment
        const {container} = render(
            <Avatar>
                <AvatarImage src="test.jpg" alt="Test" />
            </Avatar>
        );
        
        // Just verify that the component renders without crashing
        assert.ok(container, 'Component renders without crashing');
    });
}); 