import { Container, H1, Inline } from '@tryghost/shade/primitives';
import { useActivityPubHostLayout } from './host-context';

export function HostHeader() {
  const hostLayout = useActivityPubHostLayout();
  if (!hostLayout?.headerLeading) {
    return null;
  }
  return (
    <Container className={hostLayout.contentClassName} size="page">
      <Inline
        align="center"
        as="header"
        className="py-5"
        gap="md"
        style={{ paddingInline: hostLayout.contentGutter }}
      >
        {hostLayout.headerLeading}
        <H1 className="text-lg font-semibold tracking-normal">Network</H1>
      </Inline>
    </Container>
  );
}
