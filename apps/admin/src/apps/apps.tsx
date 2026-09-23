import AppCard, { AppPlaceholderCard } from './components/app-card';
import React from 'react';
import { useFillingPlaceholders } from './use-filling-placeholders';
import { APPS } from './app-registry';
import { Box, Container, Grid } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { useIsAppActivated } from './app-activation';

const AppCardForApp: React.FC<{ app: (typeof APPS)[number] }> = ({ app }) => {
  const isActivated = useIsAppActivated(app.id);
  return <AppCard app={app} isActivated={isActivated} />;
};

const Apps: React.FC = () => {
  // Grey cards pad the grid out to the bottom of the page while the
  // catalogue holds a single app.
  const { areaRef, gridRef, cardRef, placeholderCount, cardHeight, cardWidth, columns, rowGap } =
    useFillingPlaceholders(APPS.length);
  // A radial fade from the top-left corner: solid far enough to cover the
  // real app cards, then the group of placeholders dissolves towards the
  // bottom and right of the page.
  const realRows = Math.ceil(APPS.length / columns);
  const realColumns = Math.min(APPS.length, columns);
  const solidRadius =
    cardHeight && cardWidth
      ? Math.hypot(
          realColumns * (cardWidth + rowGap) - rowGap,
          realRows * (cardHeight + rowGap) - rowGap,
        )
      : 0;
  const fadeMask = solidRadius
    ? `radial-gradient(farthest-corner at top left, black ${solidRadius}px, transparent 100%)`
    : undefined;

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="apps-page">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>Apps</PageHeader.Title>
              </PageHeader.Left>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            <div ref={areaRef} className="grow">
              <Grid
                ref={gridRef}
                className="grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                gap="lg"
                style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
              >
                {APPS.map((app, index) => (
                  <div key={app.id} ref={index === 0 ? cardRef : undefined} className="h-full">
                    <AppCardForApp app={app} />
                  </div>
                ))}
                {Array.from({ length: placeholderCount }, (_, index) => (
                  <AppPlaceholderCard key={`placeholder-${index}`} height={cardHeight} />
                ))}
              </Grid>
            </div>
          </ListPage.Body>
        </ListPage>
      </Container>
    </Box>
  );
};

export default Apps;
