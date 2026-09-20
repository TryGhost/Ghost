// Throwaway local preview with sample data; the real integration lives in member-detail.tsx.
import React from 'react';
import { ShadeApp } from '@tryghost/shade/app';
import { Box, Stack, Inline, Container } from '@tryghost/shade/primitives';
import { Avatar, Button, Input } from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { DetailPage } from '@tryghost/shade/page-templates';
import MemberMapPrototype from './member-map-prototype';
import '@/index.css';
export default function Preview() {
  const [country, setCountry] = React.useState('GB');
  const [region, setRegion] = React.useState('South Carolina');
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  return (
    <ShadeApp
      className={
        dark
          ? 'shade-admin dark [container-type:inline-size] min-h-screen bg-background text-foreground'
          : 'shade-admin [container-type:inline-size] min-h-screen bg-background text-foreground'
      }
      darkMode={dark}
    >
      <Container className="h-screen" size="page">
        <DetailPage>
          <DetailPage.Header className="has-[[data-member-map-location=unknown]]:py-7">
            <MemberMapPrototype
              geolocation={JSON.stringify({
                country_code: country,
                region: country === 'US' ? region : undefined,
              })}
              enabled
            >
              <PageHeader blurredBackground={false} sticky={false}>
                <PageHeader.Left>
                  <span className="text-sm text-muted-foreground">Members › Member</span>
                  <Inline className="mt-3 max-w-full min-w-0" gap="md">
                    <Avatar
                      className="size-10 min-w-10 [&_span]:text-lg"
                      colorSeed="Alex Morgan"
                      initials="AM"
                    />
                    <PageHeader.Title className="min-w-0 truncate text-2xl sm:text-3xl">
                      Alex Morgan
                    </PageHeader.Title>
                  </Inline>
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
                <Button variant="outline" onClick={() => setCountry('CZ')}>
                  Czech Republic
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
              {country === 'US' && (
                <Inline wrap>
                  {[
                    'South Carolina',
                    'California',
                    'Alaska',
                    'Hawaii',
                    'District of Columbia',
                    '',
                  ].map((state) => (
                    <Button
                      key={state}
                      variant={region === state ? 'default' : 'outline'}
                      onClick={() => setRegion(state)}
                    >
                      {state || 'State unknown'}
                    </Button>
                  ))}
                </Inline>
              )}
              <Box className="rounded-lg border border-border-default p-6">
                <Stack gap="lg">
                  <h2 className="text-lg font-semibold">Sample member — visual verification</h2>
                  <p className="text-muted-foreground">
                    This preview uses sample country data. The same header is mounted on the real
                    member page in development.
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
