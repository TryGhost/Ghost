import Service from '@ember/service';
import classic from 'ember-classic-decorator';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

@classic
export default class GhostPathsService extends Service.extend(ghostPaths()) {}
