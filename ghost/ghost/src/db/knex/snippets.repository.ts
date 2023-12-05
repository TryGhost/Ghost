import {SnippetsRepository} from '../../core/snippets/snippets.repository.interface';
import {Snippet} from '../../core/snippets/snippet.entity';
import {OrderOf} from '../../common/repository';
import {BaseKnexRepository} from './knex.repository';
import ObjectID from 'bson-objectid';
import {Knex} from 'knex';
import {Inject} from '@nestjs/common';

/**
 * This is used to replicate the handling of URLs in lexical/mobiledoc content
 * In the current codebase this functionality is in the bookshelf model.
 *
 * Ideally it would not be in the repository here, but in the Entity,
 * but we don't have the best pattern for injecting dependencies into entities yet!
 *
 * I think the best option here is ValueObjects for Lexical/Mobiledoc content, but this
 * is just a stop-gap to get everything working, not perfect
 */
interface UrlTransformHelpers {
    mobiledocToTransformReady(mobiledoc: string): string
    lexicalToTransformReady(lexical: string): string
    transformReadyToAbsolute(value: string): string
}
export class KnexSnippetsRepository
    extends BaseKnexRepository<Snippet, string, OrderOf<[]>, []>
    implements SnippetsRepository {
    readonly table = 'snippets';

    private readonly urlUtils: UrlTransformHelpers;

    constructor(@Inject('knex') knex: Knex, @Inject('urlUtilsHax') urlUtils: UrlTransformHelpers) {
        super(knex);
        this.urlUtils = urlUtils;
    }

    protected mapEntityToRow(entity: Snippet): any {
        let mobiledoc = entity.mobiledoc;

        if (mobiledoc) {
            mobiledoc = this.urlUtils.mobiledocToTransformReady(mobiledoc);
        }

        let lexical = entity.lexical;

        if (lexical) {
            lexical = this.urlUtils.lexicalToTransformReady(lexical);
        }
        const row = {
            id: entity.id.toHexString(),
            name: entity.name,
            lexical: lexical,
            mobiledoc: mobiledoc,
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
            lexical: this.urlUtils.transformReadyToAbsolute(row.lexical),
            mobiledoc: this.urlUtils.transformReadyToAbsolute(row.mobiledoc),
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

