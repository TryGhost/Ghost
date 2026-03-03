import HeaderBrandingBlock from '@src/components/settings/email/customization/previews/shared/header-branding-block';
import {render, screen} from '@testing-library/react';

describe('HeaderBrandingBlock', function () {
    it('renders only provided fields and defaults title alignment to center', function () {
        render(
            <HeaderBrandingBlock
                headerTitle='Local Haunts'
                subtitleColor='#738a94'
                testIds={{
                    title: 'header-branding-title'
                }}
                titleColor='#15171a'
            />
        );

        const title = screen.getByTestId('header-branding-title');
        expect(title).toHaveTextContent('Local Haunts');
        expect(title).toHaveClass('text-center');
        expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('renders left alignment when configured', function () {
        render(
            <HeaderBrandingBlock
                alignment='left'
                headerTitle='Local Haunts'
                subtitleColor='#738a94'
                testIds={{
                    title: 'header-branding-title'
                }}
                titleColor='#15171a'
            />
        );

        expect(screen.getByTestId('header-branding-title')).toHaveClass('text-left');
    });

    it('renders image, icon, title and subtitle when provided', function () {
        render(
            <HeaderBrandingBlock
                headerIcon='https://ghost.test/content/images/icon.png'
                headerImage='https://ghost.test/content/images/header.png'
                headerSubtitle='Morning Edition'
                headerTitle='Local Haunts'
                subtitleColor='#738a94'
                testIds={{
                    image: 'header-branding-image',
                    icon: 'header-branding-icon',
                    title: 'header-branding-title',
                    subtitle: 'header-branding-subtitle'
                }}
                titleColor='#15171a'
            />
        );

        expect(screen.getByTestId('header-branding-image')).toHaveAttribute('src', 'https://ghost.test/content/images/header.png');
        expect(screen.getByTestId('header-branding-icon')).toHaveAttribute('src', 'https://ghost.test/content/images/icon.png');
        expect(screen.getByTestId('header-branding-title')).toHaveTextContent('Local Haunts');
        expect(screen.getByTestId('header-branding-subtitle')).toHaveTextContent('Morning Edition');
    });
});
