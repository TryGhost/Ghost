/** Every provider Ghost registers. A provider names files and loads none, so the order does not matter. */
import apps from '../domains/apps/provider';
import hosting from '../domains/hosting/provider';
import network from '../domains/network/provider';

export default [apps, hosting, network];
