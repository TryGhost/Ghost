import {IsString, IsArray, IsNotEmpty, IsOptional, MaxLength, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

class SnippetDTO {
    @IsString()
    @IsNotEmpty()
    @MaxLength(191)
        name?: string;

    @IsString()
    @IsOptional()
        lexical?: string;

    @IsString()
    @IsOptional()
        mobiledoc?: string;
};

export class SnippetsBodyDTO {
    @IsArray()
    @ValidateNested()
    @IsNotEmpty()
    // @NOTE: without explicit type conversion the nested validation won't work!
    @Type(() => SnippetDTO)
        snippets!: SnippetDTO[];
}
