import type { Pylon } from "@pylon/core";
import { z } from "zod";
import type {
	OpenAPIGenerateOptions,
	OpenAPISpec,
	PathItem,
	SchemaObject,
} from "./types.js";

/**
 * Helper to access Zod's internal _def property.
 * Zod _def is a public property but its shape is not part of the public API,
 * so we must cast through `any` to access the internal fields we need.
 */
// biome-ignore lint/suspicious/noExplicitAny: Zod _def property access requires any cast
function def(schema: z.ZodTypeAny): any {
	return schema._def;
}

/**
 * Generate a multi-version OpenAPI spec from Pylon configuration.
 *
 * Converts Zod schemas to OpenAPI SchemaObjects for each version.
 * Generates paths for CRUD endpoints with version-specific request/response schemas.
 *
 * @example
 * ```ts
 * const spec = generateOpenAPI(pylon, {
 *   versions: ['v2', 'v3', 'v4'],
 *   info: { title: 'My API', version: '1.0.0' },
 * });
 * ```
 */
export function generateOpenAPI(
	pylon: Pylon,
	options: OpenAPIGenerateOptions = {},
): OpenAPISpec {
	const normalizer = pylon.normalizer;
	const schemas = pylon.config.schemas;
	const versions =
		options.versions ?? [...normalizer.listVersions()].map((v) => v.name);

	// Build the base OpenAPI spec
	const spec: OpenAPISpec = {
		openapi: "3.1.0",
		info: {
			title: options.info?.title ?? "API",
			description: options.info?.description,
			version: options.info?.version ?? normalizer.getCurrentVersion(),
			...(options.info?.contact ? { contact: options.info.contact } : {}),
			...(options.info?.license ? { license: options.info.license } : {}),
		},
		servers: options.servers,
		paths: {},
		components: {
			schemas: {},
			...(options.securitySchemes
				? { securitySchemes: options.securitySchemes }
				: {}),
		},
	};

	// Convert Zod schemas to OpenAPI SchemaObjects per version
	for (const version of versions) {
		const schema = schemas[version];
		if (!schema) continue;

		const schemaObj = zodToOpenAPISchema(schema);
		if (spec.components?.schemas) {
			spec.components.schemas[`${version}_request`] = schemaObj;
		}
	}

	// Generate paths from schemas
	const inferredPaths = inferPathsFromSchemas(schemas, versions, normalizer);
	Object.assign(spec.paths, inferredPaths);

	return spec;
}

/**
 * Convert a Zod schema to an OpenAPI SchemaObject.
 *
 * Supports: z.object, z.string, z.number, z.boolean, z.array, z.enum,
 * z.nativeEnum, z.optional, z.nullable, z.default, z.union, z.intersection,
 * z.literal, z.record, z.any, z.unknown.
 */
export function zodToOpenAPISchema(zodSchema: z.ZodTypeAny): SchemaObject {
	if (zodSchema instanceof z.ZodObject) {
		const shape = zodSchema.shape;
		const properties: Record<string, SchemaObject> = {};
		const required: string[] = [];

		for (const [key, value] of Object.entries(shape)) {
			const zodValue = value as z.ZodTypeAny;
			const isOptional =
				zodValue instanceof z.ZodOptional || zodValue instanceof z.ZodDefault;

			properties[key] = zodToOpenAPISchema(zodValue);

			if (!isOptional) {
				required.push(key);
			}
		}

		return {
			type: "object",
			properties,
			...(required.length > 0 ? { required } : {}),
		};
	}

	if (zodSchema instanceof z.ZodString) {
		const obj: SchemaObject = { type: "string" };
		const checks = def(zodSchema).checks ?? [];
		for (const check of checks) {
			if (check.kind === "email") obj.format = "email";
			if (check.kind === "url") obj.format = "uri";
			if (check.kind === "uuid") obj.format = "uuid";
			if (check.kind === "min") obj.minLength = check.value;
			if (check.kind === "max") obj.maxLength = check.value;
			if (check.kind === "regex")
				obj.pattern = check.regex?.source ?? check.actual;
		}
		// Handle default values on string schemas
		const defaultValue = def(zodSchema).defaultValue;
		if (defaultValue !== undefined) {
			obj.default =
				typeof defaultValue === "function" ? defaultValue() : defaultValue;
		}
		return obj;
	}

	if (zodSchema instanceof z.ZodNumber) {
		const obj: SchemaObject = { type: "number" };
		const checks = def(zodSchema).checks ?? [];
		for (const check of checks) {
			if (check.kind === "min") obj.minimum = check.value;
			if (check.kind === "max") obj.maximum = check.value;
			if (check.kind === "int") obj.type = "integer";
		}
		return obj;
	}

	if (zodSchema instanceof z.ZodBoolean) {
		return { type: "boolean" };
	}

	if (zodSchema instanceof z.ZodArray) {
		return {
			type: "array",
			items: zodToOpenAPISchema(def(zodSchema).type as z.ZodTypeAny),
		};
	}

	if (zodSchema instanceof z.ZodEnum) {
		return {
			type: "string",
			enum: def(zodSchema).values as string[],
		};
	}

	if (zodSchema instanceof z.ZodEnum && 'values' in def(zodSchema) && typeof def(zodSchema).values === 'object' && !Array.isArray(def(zodSchema).values)) {
		const values = Object.values(def(zodSchema).values);
		return {
			type: "string",
			enum: values.filter((v: unknown) => typeof v === "string") as string[],
		};
	}

	if (zodSchema instanceof z.ZodUnion) {
		return {
			oneOf: (def(zodSchema).options as z.ZodTypeAny[]).map(
				(opt: z.ZodTypeAny) => zodToOpenAPISchema(opt),
			),
		};
	}

	if (zodSchema instanceof z.ZodIntersection) {
		return {
			allOf: [
				zodToOpenAPISchema(def(zodSchema).left as z.ZodTypeAny),
				zodToOpenAPISchema(def(zodSchema).right as z.ZodTypeAny),
			],
		};
	}

	if (
		zodSchema instanceof z.ZodOptional ||
		zodSchema instanceof z.ZodDefault ||
		zodSchema instanceof z.ZodNullable
	) {
		const inner = def(zodSchema).innerType ?? def(zodSchema).defaultValue;
		const result = zodToOpenAPISchema(
			inner instanceof z.ZodType ? inner : z.any(),
		);
		if (zodSchema instanceof z.ZodNullable) result.nullable = true;
		if (zodSchema instanceof z.ZodDefault) {
			const dv = def(zodSchema).defaultValue;
			result.default = typeof dv === "function" ? dv() : dv;
		}
		return result;
	}

	if (zodSchema instanceof z.ZodLiteral) {
		const literalValue = def(zodSchema).value;
		return {
			type: typeof literalValue === "number" ? "number" : "string",
			enum: [literalValue],
		};
	}

	if (zodSchema instanceof z.ZodRecord) {
		return {
			type: "object",
			additionalProperties: zodToOpenAPISchema(
				def(zodSchema).valueType as z.ZodTypeAny,
			),
		};
	}

	// Default fallback for unknown types (z.any, z.unknown, etc.)
	return {};
}

/**
 * Infer API paths from schemas by looking at key patterns.
 * Creates generic CRUD paths for each version.
 */
export function inferPathsFromSchemas(
	schemas: Record<string, z.ZodTypeAny>,
	versions: string[],
	// biome-ignore lint/suspicious/noExplicitAny: normalizer type is opaque to this package
	normalizer: any,
): Record<string, Record<string, PathItem>> {
	const paths: Record<string, Record<string, PathItem>> = {};

	for (const version of versions) {
		const schema = schemas[version];
		if (!schema) continue;

		const isDeprecated = (
			normalizer.listVersions() as Array<{
				name: string;
				deprecated?: boolean;
			}>
		).find(
			(v: { name: string; deprecated?: boolean }) => v.name === version,
		)?.deprecated;

		paths[`/${version}/users`] = {
			get: {
				operationId: `listUsers_${version.replace(/[^a-zA-Z0-9]/g, "_")}`,
				summary: `List users (${version})`,
				parameters: [
					{
						name: "X-API-Version",
						in: "header" as const,
						required: true,
						schema: { type: "string", default: version } as SchemaObject,
					},
				],
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: `#/components/schemas/${version}_request`,
								},
							},
						},
					},
				},
				...(isDeprecated ? { deprecated: true } : {}),
			},
			post: {
				operationId: `createUser_${version.replace(/[^a-zA-Z0-9]/g, "_")}`,
				summary: `Create user (${version})`,
				parameters: [
					{
						name: "X-API-Version",
						in: "header" as const,
						required: true,
						schema: { type: "string", default: version } as SchemaObject,
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: `#/components/schemas/${version}_request`,
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Created",
						content: {
							"application/json": {
								schema: {
									$ref: `#/components/schemas/${version}_request`,
								},
							},
						},
					},
				},
				...(isDeprecated ? { deprecated: true } : {}),
			},
		};
	}

	return paths;
}
