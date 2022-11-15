import { createRulesetFunction } from '@stoplight/spectral-core';
import { schema as schemaFn } from '@stoplight/spectral-functions';
import { oas2, oas3_1 } from '@stoplight/spectral-formats';

const OAS_2 = {
  title: 'A JSON Schema for Swagger 2.0 API.',
  $id: 'http://swagger.io/v2/schema.json#',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['swagger', 'info', 'paths'],
  additionalProperties: false,
  patternProperties: {
    '^x-': {
      $ref: '#/definitions/vendorExtension',
    },
  },
  properties: {
    swagger: {
      type: 'string',
      enum: ['2.0'],
      description: 'The Swagger version of this document.',
    },
    info: {
      $ref: '#/definitions/info',
    },
    host: {
      type: 'string',
      pattern: '^[^{}/ :\\\\]+(?::\\d+)?$',
      description: "The host (name or ip) of the API. Example: 'swagger.io'",
    },
    basePath: {
      type: 'string',
      pattern: '^/',
      description: "The base path to the API. Example: '/api'.",
    },
    schemes: {
      $ref: '#/definitions/schemesList',
    },
    consumes: {
      description: 'A list of MIME types accepted by the API.',
      allOf: [
        {
          $ref: '#/definitions/mediaTypeList',
        },
      ],
    },
    produces: {
      description: 'A list of MIME types the API can produce.',
      allOf: [
        {
          $ref: '#/definitions/mediaTypeList',
        },
      ],
    },
    paths: {
      $ref: '#/definitions/paths',
    },
    definitions: {
      $ref: '#/definitions/definitions',
    },
    parameters: {
      $ref: '#/definitions/parameterDefinitions',
    },
    responses: {
      $ref: '#/definitions/responseDefinitions',
    },
    security: {
      $ref: '#/definitions/security',
    },
    securityDefinitions: {
      $ref: '#/definitions/securityDefinitions',
    },
    tags: {
      type: 'array',
      items: {
        $ref: '#/definitions/tag',
      },
      uniqueItems: true,
    },
    externalDocs: {
      $ref: '#/definitions/externalDocs',
    },
  },
  definitions: {
    info: {
      type: 'object',
      description: 'General information about the API.',
      required: ['version', 'title'],
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        title: {
          type: 'string',
          description: 'A unique and precise title of the API.',
        },
        version: {
          type: 'string',
          description: 'A semantic version number of the API.',
        },
        description: {
          type: 'string',
          description:
            'A longer description of the API. Should be different from the title.  GitHub Flavored Markdown is allowed.',
        },
        termsOfService: {
          type: 'string',
          description: 'The terms of service for the API.',
        },
        contact: {
          $ref: '#/definitions/contact',
        },
        license: {
          $ref: '#/definitions/license',
        },
      },
    },
    contact: {
      type: 'object',
      description: 'Contact information for the owners of the API.',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string',
          description: 'The identifying name of the contact person/organization.',
        },
        url: {
          type: 'string',
          description: 'The URL pointing to the contact information.',
          format: 'uri',
        },
        email: {
          type: 'string',
          description: 'The email address of the contact person/organization.',
          format: 'email',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    license: {
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: {
          type: 'string',
          description: "The name of the license type. It's encouraged to use an OSI compatible license.",
        },
        url: {
          type: 'string',
          description: 'The URL pointing to the license.',
          format: 'uri',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    paths: {
      type: 'object',
      description: "Relative paths to the individual endpoints. They must be relative to the 'basePath'.",
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
        '^/': {
          $ref: '#/definitions/pathItem',
        },
      },
      additionalProperties: false,
    },
    definitions: {
      type: 'object',
      additionalProperties: {
        $ref: '#/definitions/schema',
      },
      description: 'One or more JSON objects describing the schemas being consumed and produced by the API.',
    },
    parameterDefinitions: {
      type: 'object',
      additionalProperties: {
        $ref: '#/definitions/parameter',
      },
      description: 'One or more JSON representations for parameters',
    },
    responseDefinitions: {
      type: 'object',
      additionalProperties: {
        $ref: '#/definitions/response',
      },
      description: 'One or more JSON representations for responses',
    },
    externalDocs: {
      type: 'object',
      additionalProperties: false,
      description: 'information about external documentation',
      required: ['url'],
      properties: {
        description: {
          type: 'string',
        },
        url: {
          type: 'string',
          format: 'uri',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    examples: {
      type: 'object',
      additionalProperties: true,
    },
    mimeType: {
      type: 'string',
      description: 'The MIME type of the HTTP message.',
    },
    operation: {
      type: 'object',
      required: ['responses'],
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
          uniqueItems: true,
        },
        summary: {
          type: 'string',
          description: 'A brief summary of the operation.',
        },
        description: {
          type: 'string',
          description: 'A longer description of the operation, GitHub Flavored Markdown is allowed.',
        },
        externalDocs: {
          $ref: '#/definitions/externalDocs',
        },
        operationId: {
          type: 'string',
          description: 'A unique identifier of the operation.',
        },
        produces: {
          description: 'A list of MIME types the API can produce.',
          allOf: [
            {
              $ref: '#/definitions/mediaTypeList',
            },
          ],
        },
        consumes: {
          description: 'A list of MIME types the API can consume.',
          allOf: [
            {
              $ref: '#/definitions/mediaTypeList',
            },
          ],
        },
        parameters: {
          $ref: '#/definitions/parametersList',
        },
        responses: {
          $ref: '#/definitions/responses',
        },
        schemes: {
          $ref: '#/definitions/schemesList',
        },
        deprecated: {
          type: 'boolean',
          default: false,
        },
        security: {
          $ref: '#/definitions/security',
        },
      },
    },
    pathItem: {
      type: 'object',
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        $ref: {
          type: 'string',
        },
        get: {
          $ref: '#/definitions/operation',
        },
        put: {
          $ref: '#/definitions/operation',
        },
        post: {
          $ref: '#/definitions/operation',
        },
        delete: {
          $ref: '#/definitions/operation',
        },
        options: {
          $ref: '#/definitions/operation',
        },
        head: {
          $ref: '#/definitions/operation',
        },
        patch: {
          $ref: '#/definitions/operation',
        },
        parameters: {
          $ref: '#/definitions/parametersList',
        },
      },
    },
    responses: {
      type: 'object',
      description: "Response objects names can either be any valid HTTP status code or 'default'.",
      minProperties: 1,
      additionalProperties: false,
      patternProperties: {
        '^([0-9]{3})$|^(default)$': {
          $ref: '#/definitions/responseValue',
        },
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      not: {
        type: 'object',
        additionalProperties: false,
        patternProperties: {
          '^x-': {
            $ref: '#/definitions/vendorExtension',
          },
        },
      },
    },
    responseValue: {
      oneOf: [
        {
          $ref: '#/definitions/response',
        },
        {
          $ref: '#/definitions/jsonReference',
        },
      ],
    },
    response: {
      type: 'object',
      required: ['description'],
      properties: {
        description: {
          type: 'string',
        },
        schema: {
          oneOf: [
            {
              $ref: '#/definitions/schema',
            },
            {
              $ref: '#/definitions/fileSchema',
            },
          ],
        },
        headers: {
          $ref: '#/definitions/headers',
        },
        examples: {
          $ref: '#/definitions/examples',
        },
      },
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    headers: {
      type: 'object',
      additionalProperties: {
        $ref: '#/definitions/header',
      },
    },
    header: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: {
        type: {
          type: 'string',
          enum: ['string', 'number', 'integer', 'boolean', 'array'],
        },
        format: {
          type: 'string',
        },
        items: {
          $ref: '#/definitions/primitivesItems',
        },
        collectionFormat: {
          $ref: '#/definitions/collectionFormat',
        },
        default: {
          $ref: '#/definitions/default',
        },
        maximum: {
          $ref: '#/definitions/maximum',
        },
        exclusiveMaximum: {
          $ref: '#/definitions/exclusiveMaximum',
        },
        minimum: {
          $ref: '#/definitions/minimum',
        },
        exclusiveMinimum: {
          $ref: '#/definitions/exclusiveMinimum',
        },
        maxLength: {
          $ref: '#/definitions/maxLength',
        },
        minLength: {
          $ref: '#/definitions/minLength',
        },
        pattern: {
          $ref: '#/definitions/pattern',
        },
        maxItems: {
          $ref: '#/definitions/maxItems',
        },
        minItems: {
          $ref: '#/definitions/minItems',
        },
        uniqueItems: {
          $ref: '#/definitions/uniqueItems',
        },
        enum: {
          $ref: '#/definitions/enum',
        },
        multipleOf: {
          $ref: '#/definitions/multipleOf',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    vendorExtension: {
      description: 'Any property starting with x- is valid.',
      additionalProperties: true,
      additionalItems: true,
    },
    bodyParameter: {
      type: 'object',
      required: ['name', 'in', 'schema'],
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        description: {
          type: 'string',
          description:
            'A brief description of the parameter. This could contain examples of use.  GitHub Flavored Markdown is allowed.',
        },
        name: {
          type: 'string',
          description: 'The name of the parameter.',
        },
        in: {
          type: 'string',
          description: 'Determines the location of the parameter.',
          enum: ['body'],
        },
        required: {
          type: 'boolean',
          description: 'Determines whether or not this parameter is required or optional.',
          default: false,
        },
        schema: {
          $ref: '#/definitions/schema',
        },
      },
      additionalProperties: false,
    },
    headerParameterSubSchema: {
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        required: {
          type: 'boolean',
          description: 'Determines whether or not this parameter is required or optional.',
          default: false,
        },
        in: {
          type: 'string',
          description: 'Determines the location of the parameter.',
          enum: ['header'],
        },
        description: {
          type: 'string',
          description:
            'A brief description of the parameter. This could contain examples of use.  GitHub Flavored Markdown is allowed.',
        },
        name: {
          type: 'string',
          description: 'The name of the parameter.',
        },
        type: {
          type: 'string',
          enum: ['string', 'number', 'boolean', 'integer', 'array'],
        },
        format: {
          type: 'string',
        },
        items: {
          $ref: '#/definitions/primitivesItems',
        },
        collectionFormat: {
          $ref: '#/definitions/collectionFormat',
        },
        default: {
          $ref: '#/definitions/default',
        },
        maximum: {
          $ref: '#/definitions/maximum',
        },
        exclusiveMaximum: {
          $ref: '#/definitions/exclusiveMaximum',
        },
        minimum: {
          $ref: '#/definitions/minimum',
        },
        exclusiveMinimum: {
          $ref: '#/definitions/exclusiveMinimum',
        },
        maxLength: {
          $ref: '#/definitions/maxLength',
        },
        minLength: {
          $ref: '#/definitions/minLength',
        },
        pattern: {
          $ref: '#/definitions/pattern',
        },
        maxItems: {
          $ref: '#/definitions/maxItems',
        },
        minItems: {
          $ref: '#/definitions/minItems',
        },
        uniqueItems: {
          $ref: '#/definitions/uniqueItems',
        },
        enum: {
          $ref: '#/definitions/enum',
        },
        multipleOf: {
          $ref: '#/definitions/multipleOf',
        },
      },
    },
    queryParameterSubSchema: {
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        required: {
          type: 'boolean',
          description: 'Determines whether or not this parameter is required or optional.',
          default: false,
        },
        in: {
          type: 'string',
          description: 'Determines the location of the parameter.',
          enum: ['query'],
        },
        description: {
          type: 'string',
          description:
            'A brief description of the parameter. This could contain examples of use.  GitHub Flavored Markdown is allowed.',
        },
        name: {
          type: 'string',
          description: 'The name of the parameter.',
        },
        allowEmptyValue: {
          type: 'boolean',
          default: false,
          description: 'allows sending a parameter by name only or with an empty value.',
        },
        type: {
          type: 'string',
          enum: ['string', 'number', 'boolean', 'integer', 'array'],
        },
        format: {
          type: 'string',
        },
        items: {
          $ref: '#/definitions/primitivesItems',
        },
        collectionFormat: {
          $ref: '#/definitions/collectionFormatWithMulti',
        },
        default: {
          $ref: '#/definitions/default',
        },
        maximum: {
          $ref: '#/definitions/maximum',
        },
        exclusiveMaximum: {
          $ref: '#/definitions/exclusiveMaximum',
        },
        minimum: {
          $ref: '#/definitions/minimum',
        },
        exclusiveMinimum: {
          $ref: '#/definitions/exclusiveMinimum',
        },
        maxLength: {
          $ref: '#/definitions/maxLength',
        },
        minLength: {
          $ref: '#/definitions/minLength',
        },
        pattern: {
          $ref: '#/definitions/pattern',
        },
        maxItems: {
          $ref: '#/definitions/maxItems',
        },
        minItems: {
          $ref: '#/definitions/minItems',
        },
        uniqueItems: {
          $ref: '#/definitions/uniqueItems',
        },
        enum: {
          $ref: '#/definitions/enum',
        },
        multipleOf: {
          $ref: '#/definitions/multipleOf',
        },
      },
    },
    formDataParameterSubSchema: {
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        required: {
          type: 'boolean',
          description: 'Determines whether or not this parameter is required or optional.',
          default: false,
        },
        in: {
          type: 'string',
          description: 'Determines the location of the parameter.',
          enum: ['formData'],
        },
        description: {
          type: 'string',
          description:
            'A brief description of the parameter. This could contain examples of use.  GitHub Flavored Markdown is allowed.',
        },
        name: {
          type: 'string',
          description: 'The name of the parameter.',
        },
        allowEmptyValue: {
          type: 'boolean',
          default: false,
          description: 'allows sending a parameter by name only or with an empty value.',
        },
        type: {
          type: 'string',
          enum: ['string', 'number', 'boolean', 'integer', 'array', 'file'],
        },
        format: {
          type: 'string',
        },
        items: {
          $ref: '#/definitions/primitivesItems',
        },
        collectionFormat: {
          $ref: '#/definitions/collectionFormatWithMulti',
        },
        default: {
          $ref: '#/definitions/default',
        },
        maximum: {
          $ref: '#/definitions/maximum',
        },
        exclusiveMaximum: {
          $ref: '#/definitions/exclusiveMaximum',
        },
        minimum: {
          $ref: '#/definitions/minimum',
        },
        exclusiveMinimum: {
          $ref: '#/definitions/exclusiveMinimum',
        },
        maxLength: {
          $ref: '#/definitions/maxLength',
        },
        minLength: {
          $ref: '#/definitions/minLength',
        },
        pattern: {
          $ref: '#/definitions/pattern',
        },
        maxItems: {
          $ref: '#/definitions/maxItems',
        },
        minItems: {
          $ref: '#/definitions/minItems',
        },
        uniqueItems: {
          $ref: '#/definitions/uniqueItems',
        },
        enum: {
          $ref: '#/definitions/enum',
        },
        multipleOf: {
          $ref: '#/definitions/multipleOf',
        },
      },
    },
    pathParameterSubSchema: {
      additionalProperties: false,
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      required: ['required'],
      properties: {
        required: {
          type: 'boolean',
          enum: [true],
          description: 'Determines whether or not this parameter is required or optional.',
        },
        in: {
          type: 'string',
          description: 'Determines the location of the parameter.',
          enum: ['path'],
        },
        description: {
          type: 'string',
          description:
            'A brief description of the parameter. This could contain examples of use.  GitHub Flavored Markdown is allowed.',
        },
        name: {
          type: 'string',
          description: 'The name of the parameter.',
        },
        type: {
          type: 'string',
          enum: ['string', 'number', 'boolean', 'integer', 'array'],
        },
        format: {
          type: 'string',
        },
        items: {
          $ref: '#/definitions/primitivesItems',
        },
        collectionFormat: {
          $ref: '#/definitions/collectionFormat',
        },
        default: {
          $ref: '#/definitions/default',
        },
        maximum: {
          $ref: '#/definitions/maximum',
        },
        exclusiveMaximum: {
          $ref: '#/definitions/exclusiveMaximum',
        },
        minimum: {
          $ref: '#/definitions/minimum',
        },
        exclusiveMinimum: {
          $ref: '#/definitions/exclusiveMinimum',
        },
        maxLength: {
          $ref: '#/definitions/maxLength',
        },
        minLength: {
          $ref: '#/definitions/minLength',
        },
        pattern: {
          $ref: '#/definitions/pattern',
        },
        maxItems: {
          $ref: '#/definitions/maxItems',
        },
        minItems: {
          $ref: '#/definitions/minItems',
        },
        uniqueItems: {
          $ref: '#/definitions/uniqueItems',
        },
        enum: {
          $ref: '#/definitions/enum',
        },
        multipleOf: {
          $ref: '#/definitions/multipleOf',
        },
      },
    },
    nonBodyParameter: {
      type: 'object',
      required: ['name', 'in', 'type'],
      oneOf: [
        {
          $ref: '#/definitions/headerParameterSubSchema',
        },
        {
          $ref: '#/definitions/formDataParameterSubSchema',
        },
        {
          $ref: '#/definitions/queryParameterSubSchema',
        },
        {
          $ref: '#/definitions/pathParameterSubSchema',
        },
      ],
    },
    parameter: {
      oneOf: [
        {
          $ref: '#/definitions/bodyParameter',
        },
        {
          $ref: '#/definitions/nonBodyParameter',
        },
      ],
    },
    schema: {
      type: 'object',
      description: 'A deterministic version of a JSON Schema object.',
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      properties: {
        $ref: {
          type: 'string',
        },
        format: {
          type: 'string',
        },
        title: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/title',
        },
        description: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/description',
        },
        default: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/default',
        },
        multipleOf: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/multipleOf',
        },
        maximum: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/maximum',
        },
        exclusiveMaximum: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/exclusiveMaximum',
        },
        minimum: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/minimum',
        },
        exclusiveMinimum: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/exclusiveMinimum',
        },
        maxLength: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveInteger',
        },
        minLength: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveIntegerDefault0',
        },
        pattern: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/pattern',
        },
        maxItems: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveInteger',
        },
        minItems: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveIntegerDefault0',
        },
        uniqueItems: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/uniqueItems',
        },
        maxProperties: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveInteger',
        },
        minProperties: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveIntegerDefault0',
        },
        required: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/stringArray',
        },
        enum: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/enum',
        },
        additionalProperties: {
          anyOf: [
            {
              $ref: '#/definitions/schema',
            },
            {
              type: 'boolean',
            },
          ],
          default: {},
        },
        type: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/type',
        },
        items: {
          anyOf: [
            {
              $ref: '#/definitions/schema',
            },
            {
              type: 'array',
              minItems: 1,
              items: {
                $ref: '#/definitions/schema',
              },
            },
          ],
          default: {},
        },
        allOf: {
          type: 'array',
          minItems: 1,
          items: {
            $ref: '#/definitions/schema',
          },
        },
        oneOf: {
          type: 'array',
          minItems: 1,
          items: {
            $ref: '#/definitions/schema',
          },
        },
        anyOf: {
          type: 'array',
          minItems: 1,
          items: {
            $ref: '#/definitions/schema',
          },
        },
        properties: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/schema',
          },
          default: {},
        },
        discriminator: {
          type: 'string',
        },
        readOnly: {
          type: 'boolean',
          default: false,
        },
        xml: {
          $ref: '#/definitions/xml',
        },
        externalDocs: {
          $ref: '#/definitions/externalDocs',
        },
        example: {},
      },
      additionalProperties: false,
    },
    fileSchema: {
      type: 'object',
      description: 'A deterministic version of a JSON Schema object.',
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
      required: ['type'],
      properties: {
        format: {
          type: 'string',
        },
        title: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/title',
        },
        description: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/description',
        },
        default: {
          $ref: 'http://json-schema.org/draft-04/schema#/properties/default',
        },
        required: {
          $ref: 'http://json-schema.org/draft-04/schema#/definitions/stringArray',
        },
        type: {
          type: 'string',
          enum: ['file'],
        },
        readOnly: {
          type: 'boolean',
          default: false,
        },
        externalDocs: {
          $ref: '#/definitions/externalDocs',
        },
        example: {},
      },
      additionalProperties: false,
    },
    primitivesItems: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['string', 'number', 'integer', 'boolean', 'array'],
        },
        format: {
          type: 'string',
        },
        items: {
          $ref: '#/definitions/primitivesItems',
        },
        collectionFormat: {
          $ref: '#/definitions/collectionFormat',
        },
        default: {
          $ref: '#/definitions/default',
        },
        maximum: {
          $ref: '#/definitions/maximum',
        },
        exclusiveMaximum: {
          $ref: '#/definitions/exclusiveMaximum',
        },
        minimum: {
          $ref: '#/definitions/minimum',
        },
        exclusiveMinimum: {
          $ref: '#/definitions/exclusiveMinimum',
        },
        maxLength: {
          $ref: '#/definitions/maxLength',
        },
        minLength: {
          $ref: '#/definitions/minLength',
        },
        pattern: {
          $ref: '#/definitions/pattern',
        },
        maxItems: {
          $ref: '#/definitions/maxItems',
        },
        minItems: {
          $ref: '#/definitions/minItems',
        },
        uniqueItems: {
          $ref: '#/definitions/uniqueItems',
        },
        enum: {
          $ref: '#/definitions/enum',
        },
        multipleOf: {
          $ref: '#/definitions/multipleOf',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    security: {
      type: 'array',
      items: {
        $ref: '#/definitions/securityRequirement',
      },
      uniqueItems: true,
    },
    securityRequirement: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'string',
        },
        uniqueItems: true,
      },
    },
    xml: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: 'string',
        },
        namespace: {
          type: 'string',
        },
        prefix: {
          type: 'string',
        },
        attribute: {
          type: 'boolean',
          default: false,
        },
        wrapped: {
          type: 'boolean',
          default: false,
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    tag: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        externalDocs: {
          $ref: '#/definitions/externalDocs',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    securityDefinitions: {
      type: 'object',
      additionalProperties: {
        oneOf: [
          {
            $ref: '#/definitions/basicAuthenticationSecurity',
          },
          {
            $ref: '#/definitions/apiKeySecurity',
          },
          {
            $ref: '#/definitions/oauth2ImplicitSecurity',
          },
          {
            $ref: '#/definitions/oauth2PasswordSecurity',
          },
          {
            $ref: '#/definitions/oauth2ApplicationSecurity',
          },
          {
            $ref: '#/definitions/oauth2AccessCodeSecurity',
          },
        ],
      },
      errorMessage: {
        properties: {
          basic: 'Invalid basic authentication security definition',
          apiKey: 'Invalid apiKey authentication security definition',
          oauth2: 'Invalid oauth2 authentication security definition',
        },
        _: 'Invalid security securityDefinitions',
      },
    },
    basicAuthenticationSecurity: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: {
        type: {
          type: 'string',
          enum: ['basic'],
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    apiKeySecurity: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'name', 'in'],
      properties: {
        type: {
          type: 'string',
          enum: ['apiKey'],
        },
        name: {
          type: 'string',
        },
        in: {
          type: 'string',
          enum: ['header', 'query'],
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    oauth2ImplicitSecurity: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'flow', 'authorizationUrl', 'scopes'],
      properties: {
        type: {
          type: 'string',
          enum: ['oauth2'],
        },
        flow: {
          type: 'string',
          enum: ['implicit'],
        },
        scopes: {
          $ref: '#/definitions/oauth2Scopes',
        },
        authorizationUrl: {
          type: 'string',
          format: 'uri',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    oauth2PasswordSecurity: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'flow', 'tokenUrl', 'scopes'],
      properties: {
        type: {
          type: 'string',
          enum: ['oauth2'],
        },
        flow: {
          type: 'string',
          enum: ['password'],
        },
        scopes: {
          $ref: '#/definitions/oauth2Scopes',
        },
        tokenUrl: {
          type: 'string',
          format: 'uri',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    oauth2ApplicationSecurity: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'flow', 'tokenUrl', 'scopes'],
      properties: {
        type: {
          type: 'string',
          enum: ['oauth2'],
        },
        flow: {
          type: 'string',
          enum: ['application'],
        },
        scopes: {
          $ref: '#/definitions/oauth2Scopes',
        },
        tokenUrl: {
          type: 'string',
          format: 'uri',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    oauth2AccessCodeSecurity: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'flow', 'authorizationUrl', 'tokenUrl', 'scopes'],
      properties: {
        type: {
          type: 'string',
          enum: ['oauth2'],
        },
        flow: {
          type: 'string',
          enum: ['accessCode'],
        },
        scopes: {
          $ref: '#/definitions/oauth2Scopes',
        },
        authorizationUrl: {
          type: 'string',
          format: 'uri',
        },
        tokenUrl: {
          type: 'string',
          format: 'uri',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {
          $ref: '#/definitions/vendorExtension',
        },
      },
    },
    oauth2Scopes: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
    mediaTypeList: {
      type: 'array',
      items: {
        $ref: '#/definitions/mimeType',
      },
      uniqueItems: true,
    },
    parametersList: {
      type: 'array',
      description: 'The parameters needed to send a valid API call.',
      additionalItems: false,
      items: {
        oneOf: [
          {
            $ref: '#/definitions/parameter',
          },
          {
            $ref: '#/definitions/jsonReference',
          },
        ],
      },
      uniqueItems: true,
    },
    schemesList: {
      type: 'array',
      description: 'The transfer protocol of the API.',
      items: {
        type: 'string',
        enum: ['http', 'https', 'ws', 'wss'],
      },
      uniqueItems: true,
    },
    collectionFormat: {
      type: 'string',
      enum: ['csv', 'ssv', 'tsv', 'pipes'],
      default: 'csv',
    },
    collectionFormatWithMulti: {
      type: 'string',
      enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'],
      default: 'csv',
    },
    title: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/title',
    },
    description: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/description',
    },
    default: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/default',
    },
    multipleOf: {
      type: 'number',
      exclusiveMinimum: 0,
    },
    maximum: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/maximum',
    },
    exclusiveMaximum: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/exclusiveMaximum',
    },
    minimum: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/minimum',
    },
    exclusiveMinimum: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/exclusiveMinimum',
    },
    maxLength: {
      $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveInteger',
    },
    minLength: {
      $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveIntegerDefault0',
    },
    pattern: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/pattern',
    },
    maxItems: {
      $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveInteger',
    },
    minItems: {
      $ref: 'http://json-schema.org/draft-04/schema#/definitions/positiveIntegerDefault0',
    },
    uniqueItems: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/uniqueItems',
    },
    enum: {
      $ref: 'http://json-schema.org/draft-04/schema#/properties/enum',
    },
    jsonReference: {
      type: 'object',
      required: ['$ref'],
      additionalProperties: false,
      properties: {
        $ref: {
          type: 'string',
        },
      },
    },
  },
};

const OAS_3 = {
  $id: 'https://spec.openapis.org/oas/3.0/schema/2019-04-02',
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Validation schema for OpenAPI Specification 3.0.X.',
  type: 'object',
  required: ['openapi', 'info', 'paths'],
  properties: {
    openapi: {
      type: 'string',
      pattern: '^3\\.0\\.\\d(-.+)?$',
    },
    info: {
      $ref: '#/definitions/Info',
    },
    externalDocs: {
      $ref: '#/definitions/ExternalDocumentation',
    },
    servers: {
      type: 'array',
      items: {
        $ref: '#/definitions/Server',
      },
    },
    security: {
      type: 'array',
      items: {
        $ref: '#/definitions/SecurityRequirement',
      },
    },
    tags: {
      type: 'array',
      items: {
        $ref: '#/definitions/Tag',
      },
      uniqueItems: true,
    },
    paths: {
      $ref: '#/definitions/Paths',
    },
    components: {
      $ref: '#/definitions/Components',
    },
  },
  patternProperties: {
    '^x-': {},
  },
  additionalProperties: false,
  definitions: {
    Reference: {
      type: 'object',
      required: ['$ref'],
      patternProperties: {
        '^\\$ref$': {
          type: 'string',
          format: 'uri-reference',
        },
      },
    },
    Info: {
      type: 'object',
      required: ['title', 'version'],
      properties: {
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        termsOfService: {
          type: 'string',
          format: 'uri-reference',
        },
        contact: {
          $ref: '#/definitions/Contact',
        },
        license: {
          $ref: '#/definitions/License',
        },
        version: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Contact: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        url: {
          type: 'string',
          format: 'uri-reference',
        },
        email: {
          type: 'string',
          format: 'email',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    License: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
        },
        url: {
          type: 'string',
          format: 'uri-reference',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Server: {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        variables: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/ServerVariable',
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    ServerVariable: {
      type: 'object',
      required: ['default'],
      properties: {
        enum: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        default: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Components: {
      type: 'object',
      properties: {
        schemas: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Schema',
                },
                {
                  $ref: '#/definitions/Reference',
                },
              ],
            },
          },
        },
        responses: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/Response',
                },
              ],
            },
          },
        },
        parameters: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/Parameter',
                },
              ],
            },
          },
        },
        examples: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/Example',
                },
              ],
            },
          },
        },
        requestBodies: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/RequestBody',
                },
              ],
            },
          },
        },
        headers: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/Header',
                },
              ],
            },
          },
        },
        securitySchemes: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/SecurityScheme',
                },
              ],
            },
          },
        },
        links: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/Link',
                },
              ],
            },
          },
        },
        callbacks: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9\\.\\-_]+$': {
              oneOf: [
                {
                  $ref: '#/definitions/Reference',
                },
                {
                  $ref: '#/definitions/Callback',
                },
              ],
            },
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
        },
        multipleOf: {
          type: 'number',
          exclusiveMinimum: 0,
        },
        maximum: {
          type: 'number',
        },
        exclusiveMaximum: {
          type: 'boolean',
          default: false,
        },
        minimum: {
          type: 'number',
        },
        exclusiveMinimum: {
          type: 'boolean',
          default: false,
        },
        maxLength: {
          type: 'integer',
          minimum: 0,
        },
        minLength: {
          type: 'integer',
          minimum: 0,
          default: 0,
        },
        pattern: {
          type: 'string',
          format: 'regex',
        },
        maxItems: {
          type: 'integer',
          minimum: 0,
        },
        minItems: {
          type: 'integer',
          minimum: 0,
          default: 0,
        },
        uniqueItems: {
          type: 'boolean',
          default: false,
        },
        maxProperties: {
          type: 'integer',
          minimum: 0,
        },
        minProperties: {
          type: 'integer',
          minimum: 0,
          default: 0,
        },
        required: {
          type: 'array',
          items: {
            type: 'string',
          },
          minItems: 1,
          uniqueItems: true,
        },
        enum: {
          type: 'array',
          items: {},
          minItems: 1,
          uniqueItems: false,
        },
        type: {
          type: 'string',
          enum: ['array', 'boolean', 'integer', 'number', 'object', 'string'],
        },
        not: {
          oneOf: [
            {
              $ref: '#/definitions/Schema',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
        allOf: {
          type: 'array',
          items: {
            oneOf: [
              {
                $ref: '#/definitions/Schema',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
        oneOf: {
          type: 'array',
          items: {
            oneOf: [
              {
                $ref: '#/definitions/Schema',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
        anyOf: {
          type: 'array',
          items: {
            oneOf: [
              {
                $ref: '#/definitions/Schema',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
        items: {
          oneOf: [
            {
              $ref: '#/definitions/Schema',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
        properties: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                $ref: '#/definitions/Schema',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
        additionalProperties: {
          oneOf: [
            {
              $ref: '#/definitions/Schema',
            },
            {
              $ref: '#/definitions/Reference',
            },
            {
              type: 'boolean',
            },
          ],
          default: true,
        },
        description: {
          type: 'string',
        },
        format: {
          type: 'string',
        },
        default: {},
        nullable: {
          type: 'boolean',
          default: false,
        },
        discriminator: {
          $ref: '#/definitions/Discriminator',
        },
        readOnly: {
          type: 'boolean',
          default: false,
        },
        writeOnly: {
          type: 'boolean',
          default: false,
        },
        example: {},
        externalDocs: {
          $ref: '#/definitions/ExternalDocumentation',
        },
        deprecated: {
          type: 'boolean',
          default: false,
        },
        xml: {
          $ref: '#/definitions/XML',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Discriminator: {
      type: 'object',
      required: ['propertyName'],
      properties: {
        propertyName: {
          type: 'string',
        },
        mapping: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
    },
    XML: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        namespace: {
          type: 'string',
          format: 'uri',
        },
        prefix: {
          type: 'string',
        },
        attribute: {
          type: 'boolean',
          default: false,
        },
        wrapped: {
          type: 'boolean',
          default: false,
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Response: {
      type: 'object',
      required: ['description'],
      properties: {
        description: {
          type: 'string',
        },
        headers: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                $ref: '#/definitions/Header',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
        content: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/MediaType',
          },
        },
        links: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                $ref: '#/definitions/Link',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    MediaType: {
      type: 'object',
      properties: {
        schema: {
          oneOf: [
            {
              $ref: '#/definitions/Schema',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
        example: {},
        examples: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                $ref: '#/definitions/Example',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
        encoding: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/Encoding',
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
      allOf: [
        {
          $ref: '#/definitions/ExampleXORExamples',
        },
      ],
    },
    Example: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        value: {},
        externalValue: {
          type: 'string',
          format: 'uri-reference',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Header: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
        required: {
          type: 'boolean',
          default: false,
        },
        deprecated: {
          type: 'boolean',
          default: false,
        },
        allowEmptyValue: {
          type: 'boolean',
          default: false,
        },
        style: {
          type: 'string',
          enum: ['simple'],
          default: 'simple',
        },
        explode: {
          type: 'boolean',
        },
        allowReserved: {
          type: 'boolean',
          default: false,
        },
        schema: {
          oneOf: [
            {
              $ref: '#/definitions/Schema',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
        content: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/MediaType',
          },
          minProperties: 1,
          maxProperties: 1,
        },
        example: {},
        examples: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                $ref: '#/definitions/Example',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
      allOf: [
        {
          $ref: '#/definitions/ExampleXORExamples',
        },
        {
          $ref: '#/definitions/SchemaXORContent',
        },
      ],
    },
    Paths: {
      type: 'object',
      patternProperties: {
        '^\\/': {
          $ref: '#/definitions/PathItem',
        },
        '^x-': {},
      },
      additionalProperties: false,
    },
    PathItem: {
      type: 'object',
      properties: {
        $ref: {
          type: 'string',
        },
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        servers: {
          type: 'array',
          items: {
            $ref: '#/definitions/Server',
          },
        },
        parameters: {
          type: 'array',
          items: {
            oneOf: [
              {
                $ref: '#/definitions/Parameter',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
          uniqueItems: true,
        },
      },
      patternProperties: {
        '^(get|put|post|delete|options|head|patch|trace)$': {
          $ref: '#/definitions/Operation',
        },
        '^x-': {},
      },
      additionalProperties: false,
    },
    Operation: {
      type: 'object',
      required: ['responses'],
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        externalDocs: {
          $ref: '#/definitions/ExternalDocumentation',
        },
        operationId: {
          type: 'string',
        },
        parameters: {
          type: 'array',
          items: {
            oneOf: [
              {
                $ref: '#/definitions/Parameter',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
          uniqueItems: true,
        },
        requestBody: {
          oneOf: [
            {
              $ref: '#/definitions/RequestBody',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
        responses: {
          $ref: '#/definitions/Responses',
        },
        callbacks: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                $ref: '#/definitions/Callback',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
        deprecated: {
          type: 'boolean',
          default: false,
        },
        security: {
          type: 'array',
          items: {
            $ref: '#/definitions/SecurityRequirement',
          },
        },
        servers: {
          type: 'array',
          items: {
            $ref: '#/definitions/Server',
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Responses: {
      type: 'object',
      properties: {
        default: {
          oneOf: [
            {
              $ref: '#/definitions/Response',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
      },
      patternProperties: {
        '^[1-5](?:\\d{2}|XX)$': {
          oneOf: [
            {
              $ref: '#/definitions/Response',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
        '^x-': {},
      },
      minProperties: 1,
      additionalProperties: false,
    },
    SecurityRequirement: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    Tag: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        externalDocs: {
          $ref: '#/definitions/ExternalDocumentation',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    ExternalDocumentation: {
      type: 'object',
      required: ['url'],
      properties: {
        description: {
          type: 'string',
        },
        url: {
          type: 'string',
          format: 'uri-reference',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    ExampleXORExamples: {
      description: 'Example and examples are mutually exclusive',
      not: {
        required: ['example', 'examples'],
      },
    },
    SchemaXORContent: {
      description: 'Schema and content are mutually exclusive, at least one is required',
      not: {
        required: ['schema', 'content'],
      },
      oneOf: [
        {
          required: ['schema'],
        },
        {
          required: ['content'],
          description: 'Some properties are not allowed if content is present',
          allOf: [
            {
              not: {
                required: ['style'],
              },
            },
            {
              not: {
                required: ['explode'],
              },
            },
            {
              not: {
                required: ['allowReserved'],
              },
            },
            {
              not: {
                required: ['example'],
              },
            },
            {
              not: {
                required: ['examples'],
              },
            },
          ],
        },
      ],
    },
    Parameter: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        in: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        required: {
          type: 'boolean',
          default: false,
        },
        deprecated: {
          type: 'boolean',
          default: false,
        },
        allowEmptyValue: {
          type: 'boolean',
          default: false,
        },
        style: {
          type: 'string',
        },
        explode: {
          type: 'boolean',
        },
        allowReserved: {
          type: 'boolean',
          default: false,
        },
        schema: {
          oneOf: [
            {
              $ref: '#/definitions/Schema',
            },
            {
              $ref: '#/definitions/Reference',
            },
          ],
        },
        content: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/MediaType',
          },
          minProperties: 1,
          maxProperties: 1,
        },
        example: {},
        examples: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {
                $ref: '#/definitions/Example',
              },
              {
                $ref: '#/definitions/Reference',
              },
            ],
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
      required: ['name', 'in'],
      allOf: [
        {
          $ref: '#/definitions/ExampleXORExamples',
        },
        {
          $ref: '#/definitions/SchemaXORContent',
        },
        {
          $ref: '#/definitions/ParameterLocation',
        },
      ],
    },
    ParameterLocation: {
      description: 'Parameter location',
      oneOf: [
        {
          description: 'Parameter in path',
          required: ['required'],
          properties: {
            in: {
              enum: ['path'],
            },
            style: {
              enum: ['matrix', 'label', 'simple'],
              default: 'simple',
            },
            required: {
              enum: [true],
            },
          },
        },
        {
          description: 'Parameter in query',
          properties: {
            in: {
              enum: ['query'],
            },
            style: {
              enum: ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
              default: 'form',
            },
          },
        },
        {
          description: 'Parameter in header',
          properties: {
            in: {
              enum: ['header'],
            },
            style: {
              enum: ['simple'],
              default: 'simple',
            },
          },
        },
        {
          description: 'Parameter in cookie',
          properties: {
            in: {
              enum: ['cookie'],
            },
            style: {
              enum: ['form'],
              default: 'form',
            },
          },
        },
      ],
    },
    RequestBody: {
      type: 'object',
      required: ['content'],
      properties: {
        description: {
          type: 'string',
        },
        content: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/MediaType',
          },
        },
        required: {
          type: 'boolean',
          default: false,
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    SecurityScheme: {
      oneOf: [
        {
          $ref: '#/definitions/APIKeySecurityScheme',
        },
        {
          $ref: '#/definitions/HTTPSecurityScheme',
        },
        {
          $ref: '#/definitions/OAuth2SecurityScheme',
        },
        {
          $ref: '#/definitions/OpenIdConnectSecurityScheme',
        },
      ],
    },
    APIKeySecurityScheme: {
      type: 'object',
      required: ['type', 'name', 'in'],
      properties: {
        type: {
          type: 'string',
          enum: ['apiKey'],
        },
        name: {
          type: 'string',
        },
        in: {
          type: 'string',
          enum: ['header', 'query', 'cookie'],
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    HTTPSecurityScheme: {
      type: 'object',
      required: ['scheme', 'type'],
      properties: {
        scheme: {
          type: 'string',
        },
        bearerFormat: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        type: {
          type: 'string',
          enum: ['http'],
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
      oneOf: [
        {
          description: 'Bearer',
          properties: {
            scheme: {
              enum: ['bearer'],
            },
          },
        },
        {
          description: 'Non Bearer',
          not: {
            required: ['bearerFormat'],
          },
          properties: {
            scheme: {
              not: {
                enum: ['bearer'],
              },
            },
          },
        },
      ],
    },
    OAuth2SecurityScheme: {
      type: 'object',
      required: ['type', 'flows'],
      properties: {
        type: {
          type: 'string',
          enum: ['oauth2'],
        },
        flows: {
          $ref: '#/definitions/OAuthFlows',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    OpenIdConnectSecurityScheme: {
      type: 'object',
      required: ['type', 'openIdConnectUrl'],
      properties: {
        type: {
          type: 'string',
          enum: ['openIdConnect'],
        },
        openIdConnectUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        description: {
          type: 'string',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    OAuthFlows: {
      type: 'object',
      properties: {
        implicit: {
          $ref: '#/definitions/ImplicitOAuthFlow',
        },
        password: {
          $ref: '#/definitions/PasswordOAuthFlow',
        },
        clientCredentials: {
          $ref: '#/definitions/ClientCredentialsFlow',
        },
        authorizationCode: {
          $ref: '#/definitions/AuthorizationCodeOAuthFlow',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    ImplicitOAuthFlow: {
      type: 'object',
      required: ['authorizationUrl', 'scopes'],
      properties: {
        authorizationUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        refreshUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        scopes: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    PasswordOAuthFlow: {
      type: 'object',
      required: ['tokenUrl', 'scopes'],
      properties: {
        tokenUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        refreshUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        scopes: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    ClientCredentialsFlow: {
      type: 'object',
      required: ['tokenUrl', 'scopes'],
      properties: {
        tokenUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        refreshUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        scopes: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    AuthorizationCodeOAuthFlow: {
      type: 'object',
      required: ['authorizationUrl', 'tokenUrl', 'scopes'],
      properties: {
        authorizationUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        tokenUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        refreshUrl: {
          type: 'string',
          format: 'uri-reference',
        },
        scopes: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
    },
    Link: {
      type: 'object',
      properties: {
        operationId: {
          type: 'string',
        },
        operationRef: {
          type: 'string',
          format: 'uri-reference',
        },
        parameters: {
          type: 'object',
          additionalProperties: {},
        },
        requestBody: {},
        description: {
          type: 'string',
        },
        server: {
          $ref: '#/definitions/Server',
        },
      },
      patternProperties: {
        '^x-': {},
      },
      additionalProperties: false,
      not: {
        description: 'Operation Id and Operation Ref are mutually exclusive',
        required: ['operationId', 'operationRef'],
      },
    },
    Callback: {
      type: 'object',
      additionalProperties: {
        $ref: '#/definitions/PathItem',
      },
      patternProperties: {
        '^x-': {},
      },
    },
    Encoding: {
      type: 'object',
      properties: {
        contentType: {
          type: 'string',
        },
        headers: {
          type: 'object',
          additionalProperties: {
            $ref: '#/definitions/Header',
          },
        },
        style: {
          type: 'string',
          enum: ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
        },
        explode: {
          type: 'boolean',
        },
        allowReserved: {
          type: 'boolean',
          default: false,
        },
      },
      additionalProperties: false,
    },
  },
};

const OAS_3_1 = {
  $id: 'https://spec.openapis.org/oas/3.1/schema/2021-09-28',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    openapi: {
      type: 'string',
      pattern: '^3\\.1\\.\\d+(-.+)?$',
    },
    info: {
      $ref: '#/$defs/info',
    },
    jsonSchemaDialect: {
      type: 'string',
      format: 'uri',
      default: 'https://spec.openapis.org/oas/3.1/dialect/base',
    },
    servers: {
      type: 'array',
      items: {
        $ref: '#/$defs/server',
      },
    },
    paths: {
      $ref: '#/$defs/paths',
    },
    webhooks: {
      type: 'object',
      additionalProperties: {
        $ref: '#/$defs/path-item-or-reference',
      },
    },
    components: {
      $ref: '#/$defs/components',
    },
    security: {
      type: 'array',
      items: {
        $ref: '#/$defs/security-requirement',
      },
    },
    tags: {
      type: 'array',
      items: {
        $ref: '#/$defs/tag',
      },
    },
    externalDocs: {
      $ref: '#/$defs/external-documentation',
    },
  },
  required: ['openapi', 'info'],
  anyOf: [
    {
      required: ['paths'],
      errorMessage: 'The document must have either "paths", "webhooks" or "components"',
    },
    {
      required: ['components'],
    },
    {
      required: ['webhooks'],
    },
  ],
  $ref: '#/$defs/specification-extensions',
  unevaluatedProperties: false,
  $defs: {
    info: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
        },
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        termsOfService: {
          type: 'string',
        },
        contact: {
          $ref: '#/$defs/contact',
        },
        license: {
          $ref: '#/$defs/license',
        },
        version: {
          type: 'string',
        },
      },
      required: ['title', 'version'],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    contact: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        url: {
          type: 'string',
        },
        email: {
          type: 'string',
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    license: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        identifier: {
          type: 'string',
        },
        url: {
          type: 'string',
          format: 'uri',
        },
      },
      required: ['name'],
      oneOf: [
        {
          required: ['identifier'],
        },
        {
          required: ['url'],
        },
      ],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    server: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri-template',
        },
        description: {
          type: 'string',
        },
        variables: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/server-variable',
          },
        },
      },
      required: ['url'],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'server-variable': {
      type: 'object',
      properties: {
        enum: {
          type: 'array',
          items: {
            type: 'string',
          },
          minItems: 1,
        },
        default: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
      },
      required: ['default'],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    components: {
      type: 'object',
      properties: {
        schemas: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/schema',
          },
        },
        responses: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/response-or-reference',
          },
        },
        parameters: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/parameter-or-reference',
          },
        },
        examples: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/example-or-reference',
          },
        },
        requestBodies: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/request-body-or-reference',
          },
        },
        headers: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/header-or-reference',
          },
        },
        securitySchemes: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/security-scheme-or-reference',
          },
        },
        links: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/link-or-reference',
          },
        },
        callbacks: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/callbacks-or-reference',
          },
        },
        pathItems: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/path-item-or-reference',
          },
        },
      },
      patternProperties: {
        '^(schemas|responses|parameters|examples|requestBodies|headers|securitySchemes|links|callbacks|pathItems)$': {
          $comment:
            'Enumerating all of the property names in the regex above is necessary for unevaluatedProperties to work as expected',
          propertyNames: {
            pattern: '^[a-zA-Z0-9._-]+$',
          },
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    paths: {
      type: 'object',
      patternProperties: {
        '^/': {
          $ref: '#/$defs/path-item',
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'path-item': {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        servers: {
          type: 'array',
          items: {
            $ref: '#/$defs/server',
          },
        },
        parameters: {
          type: 'array',
          items: {
            $ref: '#/$defs/parameter-or-reference',
          },
        },
      },
      patternProperties: {
        '^(get|put|post|delete|options|head|patch|trace)$': {
          $ref: '#/$defs/operation',
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'path-item-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/path-item',
      },
    },
    operation: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        externalDocs: {
          $ref: '#/$defs/external-documentation',
        },
        operationId: {
          type: 'string',
        },
        parameters: {
          type: 'array',
          items: {
            $ref: '#/$defs/parameter-or-reference',
          },
        },
        requestBody: {
          $ref: '#/$defs/request-body-or-reference',
        },
        responses: {
          $ref: '#/$defs/responses',
        },
        callbacks: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/callbacks-or-reference',
          },
        },
        deprecated: {
          default: false,
          type: 'boolean',
        },
        security: {
          type: 'array',
          items: {
            $ref: '#/$defs/security-requirement',
          },
        },
        servers: {
          type: 'array',
          items: {
            $ref: '#/$defs/server',
          },
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'external-documentation': {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
        url: {
          type: 'string',
          format: 'uri',
        },
      },
      required: ['url'],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    parameter: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        in: {
          enum: ['query', 'header', 'path', 'cookie'],
        },
        description: {
          type: 'string',
        },
        required: {
          default: false,
          type: 'boolean',
        },
        deprecated: {
          default: false,
          type: 'boolean',
        },
        allowEmptyValue: {
          default: false,
          type: 'boolean',
        },
        schema: {
          $ref: '#/$defs/schema',
        },
        content: {
          $ref: '#/$defs/content',
        },
      },
      required: ['in'],
      oneOf: [
        {
          required: ['schema'],
        },
        {
          required: ['content'],
        },
      ],
      dependentSchemas: {
        schema: {
          properties: {
            style: {
              type: 'string',
            },
            explode: {
              type: 'boolean',
            },
            allowReserved: {
              default: false,
              type: 'boolean',
            },
          },
          allOf: [
            {
              $ref: '#/$defs/examples',
            },
            {
              $ref: '#/$defs/parameter/dependentSchemas/schema/$defs/styles-for-path',
            },
            {
              $ref: '#/$defs/parameter/dependentSchemas/schema/$defs/styles-for-header',
            },
            {
              $ref: '#/$defs/parameter/dependentSchemas/schema/$defs/styles-for-query',
            },
            {
              $ref: '#/$defs/parameter/dependentSchemas/schema/$defs/styles-for-cookie',
            },
            {
              $ref: '#/$defs/parameter/dependentSchemas/schema/$defs/styles-for-form',
            },
          ],
          $defs: {
            'styles-for-path': {
              if: {
                properties: {
                  in: {
                    const: 'path',
                  },
                },
                required: ['in'],
              },
              then: {
                properties: {
                  name: {
                    pattern: '[^/#?]+$',
                  },
                  style: {
                    default: 'simple',
                    enum: ['matrix', 'label', 'simple'],
                  },
                  required: {
                    const: true,
                  },
                },
                required: ['required'],
              },
            },
            'styles-for-header': {
              if: {
                properties: {
                  in: {
                    const: 'header',
                  },
                },
                required: ['in'],
              },
              then: {
                properties: {
                  style: {
                    default: 'simple',
                    const: 'simple',
                  },
                },
              },
            },
            'styles-for-query': {
              if: {
                properties: {
                  in: {
                    const: 'query',
                  },
                },
                required: ['in'],
              },
              then: {
                properties: {
                  style: {
                    default: 'form',
                    enum: ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
                  },
                },
              },
            },
            'styles-for-cookie': {
              if: {
                properties: {
                  in: {
                    const: 'cookie',
                  },
                },
                required: ['in'],
              },
              then: {
                properties: {
                  style: {
                    default: 'form',
                    const: 'form',
                  },
                },
              },
            },
            'styles-for-form': {
              if: {
                properties: {
                  style: {
                    const: 'form',
                  },
                },
                required: ['style'],
              },
              then: {
                properties: {
                  explode: {
                    default: true,
                  },
                },
              },
              else: {
                properties: {
                  explode: {
                    default: false,
                  },
                },
              },
            },
          },
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'parameter-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/parameter',
      },
    },
    'request-body': {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
        content: {
          $ref: '#/$defs/content',
        },
        required: {
          default: false,
          type: 'boolean',
        },
      },
      required: ['content'],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'request-body-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/request-body',
      },
    },
    content: {
      type: 'object',
      additionalProperties: {
        $ref: '#/$defs/media-type',
      },
      propertyNames: {
        format: 'media-range',
      },
    },
    'media-type': {
      type: 'object',
      properties: {
        schema: {
          $ref: '#/$defs/schema',
        },
        encoding: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/encoding',
          },
        },
      },
      allOf: [
        {
          $ref: '#/$defs/specification-extensions',
        },
        {
          $ref: '#/$defs/examples',
        },
      ],
      unevaluatedProperties: false,
    },
    encoding: {
      type: 'object',
      properties: {
        contentType: {
          type: 'string',
          format: 'media-range',
        },
        headers: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/header-or-reference',
          },
        },
        style: {
          default: 'form',
          enum: ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
        },
        explode: {
          type: 'boolean',
        },
        allowReserved: {
          default: false,
          type: 'boolean',
        },
      },
      allOf: [
        {
          $ref: '#/$defs/specification-extensions',
        },
        {
          $ref: '#/$defs/encoding/$defs/explode-default',
        },
      ],
      unevaluatedProperties: false,
      $defs: {
        'explode-default': {
          if: {
            properties: {
              style: {
                const: 'form',
              },
            },
            required: ['style'],
          },
          then: {
            properties: {
              explode: {
                default: true,
              },
            },
          },
          else: {
            properties: {
              explode: {
                default: false,
              },
            },
          },
        },
      },
    },
    responses: {
      type: 'object',
      properties: {
        default: {
          $ref: '#/$defs/response-or-reference',
        },
      },
      patternProperties: {
        '^[1-5](?:[0-9]{2}|XX)$': {
          $ref: '#/$defs/response-or-reference',
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    response: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
        headers: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/header-or-reference',
          },
        },
        content: {
          $ref: '#/$defs/content',
        },
        links: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/link-or-reference',
          },
        },
      },
      required: ['description'],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'response-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/response',
      },
    },
    callbacks: {
      type: 'object',
      $ref: '#/$defs/specification-extensions',
      additionalProperties: {
        $ref: '#/$defs/path-item-or-reference',
      },
    },
    'callbacks-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/callbacks',
      },
    },
    example: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        value: true,
        externalValue: {
          type: 'string',
          format: 'uri',
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'example-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/example',
      },
    },
    link: {
      type: 'object',
      properties: {
        operationRef: {
          type: 'string',
          format: 'uri-reference',
        },
        operationId: true,
        parameters: {
          $ref: '#/$defs/map-of-strings',
        },
        requestBody: true,
        description: {
          type: 'string',
        },
        body: {
          $ref: '#/$defs/server',
        },
      },
      oneOf: [
        {
          required: ['operationRef'],
        },
        {
          required: ['operationId'],
        },
      ],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'link-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/link',
      },
    },
    header: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
        required: {
          default: false,
          type: 'boolean',
        },
        deprecated: {
          default: false,
          type: 'boolean',
        },
        schema: {
          $ref: '#/$defs/schema',
        },
        content: {
          $ref: '#/$defs/content',
        },
      },
      oneOf: [
        {
          required: ['schema'],
        },
        {
          required: ['content'],
        },
      ],
      dependentSchemas: {
        schema: {
          properties: {
            style: {
              default: 'simple',
              const: 'simple',
            },
            explode: {
              default: false,
              type: 'boolean',
            },
          },
          $ref: '#/$defs/examples',
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    'header-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/header',
      },
    },
    tag: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        externalDocs: {
          $ref: '#/$defs/external-documentation',
        },
      },
      required: ['name'],
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
    },
    reference: {
      type: 'object',
      properties: {
        $ref: {
          type: 'string',
          format: 'uri-reference',
        },
        summary: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
      },
      unevaluatedProperties: false,
    },
    schema: {
      $dynamicAnchor: 'meta',
      type: ['object', 'boolean'],
    },
    'security-scheme': {
      type: 'object',
      properties: {
        type: {
          enum: ['apiKey', 'http', 'mutualTLS', 'oauth2', 'openIdConnect'],
        },
        description: {
          type: 'string',
        },
      },
      required: ['type'],
      allOf: [
        {
          $ref: '#/$defs/specification-extensions',
        },
        {
          $ref: '#/$defs/security-scheme/$defs/type-apikey',
        },
        {
          $ref: '#/$defs/security-scheme/$defs/type-http',
        },
        {
          $ref: '#/$defs/security-scheme/$defs/type-http-bearer',
        },
        {
          $ref: '#/$defs/security-scheme/$defs/type-oauth2',
        },
        {
          $ref: '#/$defs/security-scheme/$defs/type-oidc',
        },
      ],
      unevaluatedProperties: false,
      $defs: {
        'type-apikey': {
          if: {
            properties: {
              type: {
                const: 'apiKey',
              },
            },
            required: ['type'],
          },
          then: {
            properties: {
              name: {
                type: 'string',
              },
              in: {
                enum: ['query', 'header', 'cookie'],
              },
            },
            required: ['name', 'in'],
          },
        },
        'type-http': {
          if: {
            properties: {
              type: {
                const: 'http',
              },
            },
            required: ['type'],
          },
          then: {
            properties: {
              scheme: {
                type: 'string',
              },
            },
            required: ['scheme'],
          },
        },
        'type-http-bearer': {
          if: {
            properties: {
              type: {
                const: 'http',
              },
              scheme: {
                type: 'string',
                pattern: '^[Bb][Ee][Aa][Rr][Ee][Rr]$',
              },
            },
            required: ['type', 'scheme'],
          },
          then: {
            properties: {
              bearerFormat: {
                type: 'string',
              },
            },
          },
        },
        'type-oauth2': {
          if: {
            properties: {
              type: {
                const: 'oauth2',
              },
            },
            required: ['type'],
          },
          then: {
            properties: {
              flows: {
                $ref: '#/$defs/oauth-flows',
              },
            },
            required: ['flows'],
          },
        },
        'type-oidc': {
          if: {
            properties: {
              type: {
                const: 'openIdConnect',
              },
            },
            required: ['type'],
          },
          then: {
            properties: {
              openIdConnectUrl: {
                type: 'string',
                format: 'uri',
              },
            },
            required: ['openIdConnectUrl'],
          },
        },
      },
    },
    'security-scheme-or-reference': {
      if: {
        type: 'object',
        required: ['$ref'],
      },
      then: {
        $ref: '#/$defs/reference',
      },
      else: {
        $ref: '#/$defs/security-scheme',
      },
    },
    'oauth-flows': {
      type: 'object',
      properties: {
        implicit: {
          $ref: '#/$defs/oauth-flows/$defs/implicit',
        },
        password: {
          $ref: '#/$defs/oauth-flows/$defs/password',
        },
        clientCredentials: {
          $ref: '#/$defs/oauth-flows/$defs/client-credentials',
        },
        authorizationCode: {
          $ref: '#/$defs/oauth-flows/$defs/authorization-code',
        },
      },
      $ref: '#/$defs/specification-extensions',
      unevaluatedProperties: false,
      $defs: {
        implicit: {
          type: 'object',
          properties: {
            authorizationUrl: {
              type: 'string',
            },
            refreshUrl: {
              type: 'string',
            },
            scopes: {
              $ref: '#/$defs/map-of-strings',
            },
          },
          required: ['authorizationUrl', 'scopes'],
          $ref: '#/$defs/specification-extensions',
          unevaluatedProperties: false,
        },
        password: {
          type: 'object',
          properties: {
            tokenUrl: {
              type: 'string',
            },
            refreshUrl: {
              type: 'string',
            },
            scopes: {
              $ref: '#/$defs/map-of-strings',
            },
          },
          required: ['tokenUrl', 'scopes'],
          $ref: '#/$defs/specification-extensions',
          unevaluatedProperties: false,
        },
        'client-credentials': {
          type: 'object',
          properties: {
            tokenUrl: {
              type: 'string',
            },
            refreshUrl: {
              type: 'string',
            },
            scopes: {
              $ref: '#/$defs/map-of-strings',
            },
          },
          required: ['tokenUrl', 'scopes'],
          $ref: '#/$defs/specification-extensions',
          unevaluatedProperties: false,
        },
        'authorization-code': {
          type: 'object',
          properties: {
            authorizationUrl: {
              type: 'string',
            },
            tokenUrl: {
              type: 'string',
            },
            refreshUrl: {
              type: 'string',
            },
            scopes: {
              $ref: '#/$defs/map-of-strings',
            },
          },
          required: ['authorizationUrl', 'tokenUrl', 'scopes'],
          $ref: '#/$defs/specification-extensions',
          unevaluatedProperties: false,
        },
      },
    },
    'security-requirement': {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    'specification-extensions': {
      patternProperties: {
        '^x-': true,
      },
    },
    examples: {
      properties: {
        example: true,
        examples: {
          type: 'object',
          additionalProperties: {
            $ref: '#/$defs/example-or-reference',
          },
        },
      },
    },
    'map-of-strings': {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  },
};

const OAS_SCHEMAS = {
  '2.0': OAS_2,
  '3.0': OAS_3,
  3.1: OAS_3_1,
};

function shouldIgnoreError(error) {
  return (
    // oneOf is a fairly error as we have 2 options to choose from for most of the time.
    error.keyword === 'oneOf' ||
    // the required $ref is entirely useless, since oas-schema rules operate on resolved content, so there won't be any $refs in the document
    (error.keyword === 'required' && error.params.missingProperty === '$ref')
  );
}

// this is supposed to cover edge cases we need to cover manually, when it's impossible to detect the most appropriate error, i.e. oneOf consisting of more than 3 members, etc.
// note,  more errors can be included if certain messages reported by AJV are not quite meaningful
const ERROR_MAP = [
  {
    path: /^components\/securitySchemes\/[^/]+$/,
    message: 'Invalid security scheme',
  },
];

// The function removes irrelevant (aka misleading, confusing, useless, whatever you call it) errors.
// There are a few exceptions, i.e. security components I covered manually,
// yet apart from them we usually deal with a relatively simple scenario that can be literally expressed as: "either proper value of $ref property".
// The $ref part is never going to be interesting for us, because both oas-schema rules operate on resolved content, so we won't have any $refs left.
// As you can see, what we deal here wit is actually not really oneOf anymore - it's always the first member of oneOf we match against.
// That being said, we always strip both oneOf and $ref, since we are always interested in the first error.
export function prepareResults(errors) {
  // Update additionalProperties errors to make them more precise and prevent them from being treated as duplicates
  for (const error of errors) {
    if (error.keyword === 'additionalProperties') {
      error.instancePath = `${error.instancePath}/${String(error.params['additionalProperty'])}`;
    }
  }

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];

    if (i + 1 < errors.length && errors[i + 1].instancePath === error.instancePath) {
      errors.splice(i + 1, 1);
      i--;
    } else if (i > 0 && shouldIgnoreError(error) && errors[i - 1].instancePath.startsWith(error.instancePath)) {
      errors.splice(i, 1);
      i--;
    }
  }
}

function applyManualReplacements(errors) {
  for (const error of errors) {
    if (error.path === void 0) continue;

    const joinedPath = error.path.join('/');

    for (const mappedError of ERROR_MAP) {
      if (mappedError.path.test(joinedPath)) {
        error.message = mappedError.message;
        break;
      }
    }
  }
}

export default createRulesetFunction(
  {
    input: null,
    options: null,
  },
  function oasDocumentSchema(targetVal, opts, context) {
    const formats = context.document.formats;
    if (formats === null || formats === void 0) return;

    const schema = formats.has(oas2)
      ? OAS_SCHEMAS['2.0']
      : formats.has(oas3_1)
      ? OAS_SCHEMAS['3.1']
      : OAS_SCHEMAS['3.0'];

    const errors = schemaFn(targetVal, { allErrors: true, schema, prepareResults }, context);

    if (Array.isArray(errors)) {
      applyManualReplacements(errors);
    }

    return errors;
  },
);
