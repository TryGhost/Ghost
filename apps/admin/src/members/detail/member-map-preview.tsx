// Throwaway local preview with sample data; the real integration lives in member-detail.tsx.
import React from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { ShadeApp } from '@tryghost/shade/app';
import { Box, Stack, Inline, Container } from '@tryghost/shade/primitives';
import { Button, Input } from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { DetailPage } from '@tryghost/shade/page-templates';
import MemberMapPrototype from './member-map-prototype';
import '@/index.css';
export default function Preview() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const requested = params.get('variant');
  const variant = requested === 'B' || requested === 'C' ? requested : 'A';
  const [country, setCountry] = React.useState('GB');
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  return (
    <ShadeApp
      className={
        dark
          ? 'shade-admin dark min-h-screen bg-background text-foreground'
          : 'shade-admin min-h-screen bg-background text-foreground'
      }
      darkMode={dark}
    >
      <Container className="h-screen" size="page">
        <DetailPage>
          <DetailPage.Header>
            <MemberMapPrototype
              geolocation={JSON.stringify({ country_code: country })}
              variant={variant}
            >
              <PageHeader
                blurredBackground={false}
                className="[&_[data-page-header=main]]:items-end"
                sticky={false}
              >
                <PageHeader.Left>
                  <span className="text-sm text-muted-foreground">Members › Member</span>
                  <PageHeader.Title className="mt-2 truncate text-2xl sm:text-3xl">
                    Alex Morgan
                  </PageHeader.Title>
                </PageHeader.Left>
                <PageHeader.Actions>
                  <PageHeader.ActionGroup>
                    <PageHeader.Action label="More actions" iconOnly>
                      ···
                    </PageHeader.Action>
                    <PageHeader.ActionGroup.Primary>
                      <Button disabled>Save</Button>
                    </PageHeader.ActionGroup.Primary>
                  </PageHeader.ActionGroup>
                </PageHeader.Actions>
              </PageHeader>
            </MemberMapPrototype>
          </DetailPage.Header>
          <DetailPage.Body>
            <Stack className="pt-5" gap="xl">
              <Inline wrap>
                <Button variant="outline" onClick={() => setCountry('GB')}>
                  United Kingdom
                </Button>
                <Button variant="outline" onClick={() => setCountry('US')}>
                  United States
                </Button>
                <Button variant="outline" onClick={() => setCountry('SG')}>
                  Singapore
                </Button>
                <Button variant="outline" onClick={() => setCountry('')}>
                  Unknown
                </Button>
                <Button variant="outline" onClick={() => setDark(!dark)}>
                  Toggle theme
                </Button>
              </Inline>
              <Box className="rounded-lg border border-border-default p-6">
                <Stack gap="lg">
                  <h2 className="text-lg font-semibold">Sample member — visual verification</h2>
                  <p className="text-muted-foreground">
                    This preview uses sample country data. The same header is mounted on the real
                    member page with ?variant=A, B or C.
                  </p>
                  <label>
                    Name
                    <Input defaultValue="Alex Morgan" />
                  </label>
                  <p className="text-muted-foreground">
                    The form below the header remains unchanged in Ghost.
                  </p>
                </Stack>
              </Box>
            </Stack>
          </DetailPage.Body>
        </DetailPage>
      </Container>
    </ShadeApp>
  );
}
