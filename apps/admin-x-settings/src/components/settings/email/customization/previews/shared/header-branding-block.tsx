import clsx from 'clsx';

type HeaderBrandingTestIds = {
    container?: string;
    image?: string;
    icon?: string;
    title?: string;
    subtitle?: string;
};

type HeaderBrandingBlockProps = {
    headerImage?: string | null;
    headerImageClassName?: string;
    headerIcon?: string;
    headerTitle?: string | null;
    headerSubtitle?: string | null;
    backgroundColor?: string;
    titleColor: string;
    subtitleColor: string;
    alignment?: 'center' | 'left';
    testIds?: HeaderBrandingTestIds;
};

const HeaderBrandingBlock: React.FC<HeaderBrandingBlockProps> = ({
    headerImage,
    headerImageClassName = 'mb-4 block pt-6',
    headerIcon,
    headerTitle,
    headerSubtitle,
    backgroundColor,
    titleColor,
    subtitleColor,
    alignment = 'center',
    testIds
}) => {
    const image = headerImage?.trim();
    const hasBranding = Boolean(headerIcon || headerTitle || headerSubtitle);

    if (!image && !hasBranding) {
        return null;
    }

    return (
        <div data-testid={testIds?.container} style={{backgroundColor}}>
            {image && (
                <div>
                    <img
                        alt=""
                        className={headerImageClassName}
                        data-testid={testIds?.image}
                        src={image}
                    />
                </div>
            )}
            {hasBranding && (
                <div className="py-3">
                    {headerIcon && (
                        <img
                            alt=""
                            className={clsx('mb-2 size-10', alignment === 'center' ? 'mx-auto' : '')}
                            data-testid={testIds?.icon}
                            role="presentation"
                            src={headerIcon}
                        />
                    )}
                    {headerTitle && (
                        <h4
                            className={clsx(
                                'mb-1 text-[1.6rem] font-bold uppercase leading-tight tracking-tight',
                                alignment === 'center' ? 'text-center' : 'text-left'
                            )}
                            data-testid={testIds?.title}
                            style={{color: titleColor}}
                        >
                            {headerTitle}
                        </h4>
                    )}
                    {headerSubtitle && (
                        <h5
                            className={clsx(
                                'mb-1 text-[1.3rem] font-normal',
                                alignment === 'center' ? 'text-center' : 'text-left'
                            )}
                            data-testid={testIds?.subtitle}
                            style={{color: subtitleColor}}
                        >
                            {headerSubtitle}
                        </h5>
                    )}
                </div>
            )}
        </div>
    );
};

export default HeaderBrandingBlock;
