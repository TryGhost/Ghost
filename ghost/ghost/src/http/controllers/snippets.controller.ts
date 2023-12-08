import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseFilters, UseInterceptors, ValidationPipe} from '@nestjs/common';
import {SnippetsService} from '../../core/snippets/snippets.service';
import {SnippetDTO, BrowseSnippetsDTO} from './snippet.dto.output';
import {SnippetsBodyDTO} from './snippet.dto.input';
import ObjectID from 'bson-objectid';
import {now} from '../../common/date';
import {LocationHeaderInterceptor} from '../interceptors/location-header.interceptor';
import {GlobalExceptionFilter} from '../filters/global-exception.filter';
import {NotFoundError} from '@tryghost/errors';
import {
    ParseFormatsQueryPipe,
    ParseFilterQueryPipe,
    ParsePageQueryPipe,
    ParseLimitQueryPipe
} from '../pipes';

type FormatsParameter = 'mobiledoc' | 'lexical';

@Controller('snippets')
@UseInterceptors(LocationHeaderInterceptor)
@UseFilters(GlobalExceptionFilter)
export class SnippetsController {
    constructor(private readonly service: SnippetsService) {}

    mapBodyToData(body: unknown): {name?: string, description?: string, lexical?: string, mobiledoc?: string} {
        if (typeof body !== 'object' || body === null) {
            return {};
        }
        if (!Reflect.has(body, 'snippets')) {
            return {};
        }

        const bodyWithSnippets = body as {snippets: unknown;};

        if (!Array.isArray(bodyWithSnippets.snippets)) {
            return {};
        }

        const firstSnippet = bodyWithSnippets.snippets[0] as unknown;

        if (typeof firstSnippet !== 'object' || firstSnippet === null) {
            return {};
        }

        // We use any here because we don't know what the type is, but we are checking that it's a string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getString = (obj: object) => (prop: string) => (prop in obj && typeof (obj as any)[prop] === 'string' ? (obj as any)[prop] : undefined);

        const getStringFrom = getString(firstSnippet);

        const data = {
            name: getStringFrom('name'),
            lexical: getStringFrom('lexical'),
            mobiledoc: getStringFrom('mobiledoc')
        };

        return data;
    }

    @Get(':id')
    async read(
        @Param('id') id: 'string',
        @Query('formats', ParseFormatsQueryPipe) formats:FormatsParameter
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.getOne(ObjectID.createFromHexString(id));
        if (snippet === null) {
            throw new NotFoundError({
                context: 'Snippet not found.',
                message: 'Resource not found error, cannot read snippet.'
            });
        }
        return {
            snippets: [new SnippetDTO(snippet, {formats})]
        };
    }

    @Delete(':id')
    @HttpCode(204)
    async destroy(
        @Param('id') id: 'string'
    ) {
        const snippet = await this.service.delete(ObjectID.createFromHexString(id));
        if (snippet === null) {
            throw new NotFoundError({
                context: 'Resource could not be found.',
                message: 'Resource not found error, cannot delete snippet.'
            });
        }
        return {};
    }

    @Put(':id')
    async edit(
        @Param('id') id: 'string',
        @Body() body: unknown,
        @Query('formats', ParseFormatsQueryPipe) formats:FormatsParameter
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.update(ObjectID.createFromHexString(id), this.mapBodyToData(body));
        if (snippet === null) {
            throw new NotFoundError({
                context: 'Snippet not found.',
                message: 'Resource not found error, cannot read snippet.'
            });
        }
        return {
            snippets: [new SnippetDTO(snippet, {formats})]
        };
    }

    @Post('')
    async add(
        @Body(new ValidationPipe({
            // @NOTE: here for local debugging purposes
            enableDebugMessages: true,
            whitelist: true,
            // @NOTE: has to be done for nested validation to work
            transform: true
        })) body: SnippetsBodyDTO,
        @Query('formats', ParseFormatsQueryPipe) formats:FormatsParameter
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.create({
            ...body.snippets[0],
            updatedAt: now()
        // We cast this as `any` because we're having to pass updatedAt as a hack to replicate broken existing API implementation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        return {
            snippets: [new SnippetDTO(snippet, {formats})]
        };
    }

    @Get('')
    async browse(
        @Query('formats', ParseFormatsQueryPipe) formats: FormatsParameter,
        @Query('page', ParsePageQueryPipe) page: number,
        @Query('limit', ParseLimitQueryPipe) limit: number | 'all',
        @Query('filter', ParseFilterQueryPipe) filter?: string
    ): Promise<BrowseSnippetsDTO> {
        let snippets;
        let total;
        if (limit === 'all') {
            snippets = await this.service.getAll({
                filter
            });
            total = snippets.length;
        } else {
            const result = await this.service.getPage({
                filter,
                page,
                limit
            });
            total = result.count;
            snippets = result.data;
        }
        const pages = limit === 'all' ? 0 : Math.ceil(total / limit);

        return new BrowseSnippetsDTO(snippets, {page, limit, pages, total}, {formats});
    }
}
