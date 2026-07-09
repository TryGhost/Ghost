import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderLeft, PageHeaderTitle} from '@tryghost/shade/patterns';
import type {ReactNode} from 'react';

interface AddonPageChromeProps {
    title: ReactNode;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
}

/**
 * Canonical page chrome, matching the recipe native admin pages use
 * (see apps/posts automations/tags): a centered max-w-page column wrapping
 * ListPage, with the sticky blurred header band owned by ListPage.Header.
 */
export function AddonPageChrome({title, description, actions, children}: AddonPageChromeProps) {
    return (
        <div className="size-full">
            <div className="relative mx-auto flex h-full max-w-page flex-col">
                <ListPage>
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeaderLeft>
                                <PageHeaderTitle>
                                    {title}
                                    {description && <PageHeaderDescription>{description}</PageHeaderDescription>}
                                </PageHeaderTitle>
                            </PageHeaderLeft>
                            {actions && <PageHeaderActions>{actions}</PageHeaderActions>}
                        </PageHeader>
                    </ListPage.Header>
                    <ListPage.Body>
                        {children}
                    </ListPage.Body>
                </ListPage>
            </div>
        </div>
    );
}
