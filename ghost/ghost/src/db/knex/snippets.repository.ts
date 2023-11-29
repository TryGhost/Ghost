import {SnippetsRepository} from '../../core/snippets/snippets.repository.interface';
import {Snippet} from '../../core/snippets/snippet.entity';
import {OrderOf} from '../../common/repository';
import {BaseKnexRepository} from './knex.repository';
import ObjectID from 'bson-objectid';

export class KnexSnippetsRepository
    extends BaseKnexRepository<Snippet, string, OrderOf<[]>, []>
    implements SnippetsRepository {
    readonly table = 'snippets';

    protected mapEntityToRow(entity: Snippet): any {
        const row = {
            id: entity.id.toHexString(),
            name: entity.name,
            lexical: entity.lexical,
            mobiledoc: entity.mobiledoc,
            created_at: this.formatDateForKnex(entity.createdAt),
            created_by: entity.createdBy.toHexString(),
            updated_at: this.formatDateForKnex(entity.updatedAt),
            updated_by: entity.updatedBy?.toHexString()
        };

        return row;
    }

    protected mapRowToEntity(row: any): Snippet | null {
        return Snippet.create({
            id: ObjectID.createFromHexString(row.id),
            name: row.name,
            lexical: row.lexical,
            mobiledoc: row.mobiledoc,
            createdAt: new Date(row.created_at),
            createdBy: {
                toHexString() {
                    return row.created_by;
                }
            },
            updatedAt: row.updated_at ? new Date(row.updated_at) : null,
            updatedBy: row.updated_by ? {
                toHexString() {
                    return row.updated_by;
                }
            } : null
        });
    }
}

