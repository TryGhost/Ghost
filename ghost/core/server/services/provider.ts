/**
 * The one provider for services that still live in this folder.
 * A service leaves it when it moves into a domain, whose provider.ts then lists it.
 */
import { defineProvider } from '#support/define-provider';
import { ExportRequests } from './export-requests';

export default defineProvider({
  name: 'legacy-services',
  services: [ExportRequests],
});
