import {SnippetsRepository} from '../../core/snippets/snippets.repository.interface';
import {Snippet} from '../../core/snippets/snippet.entity';
import {OrderOf} from '../../common/repository';
import {BaseKnexRepository} from './knex.repository';

export class KnexSnippetsRepository
    extends BaseKnexRepository<Snippet, string, OrderOf<[]>, []>
    implements SnippetsRepository {
    readonly table = 'snippets';

    protected mapEntityToRow(entity: Snippet): any {
        const row = {
            id: entity.id,
            name: entity.name,
            lexical: entity.lexical,
            mobiledoc: entity.mobiledoc,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt
        };

        return row;
    }

    protected mapRowToEntity(row: any): Snippet | null {
        return Snippet.create({
            id: row.id,
            name: row.name,
            lexical: row.lexical,
            mobiledoc: row.mobiledoc,
            createdAt: new Date(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at) : null
        });
    }
}
