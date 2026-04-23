export interface SelectPathNode {
	kind: 'path';
	path: string[];
}

export interface SelectWildcardNode {
	kind: 'wildcard';
}

export type SelectNode = SelectPathNode | SelectWildcardNode;

export interface SelectAst {
	items: SelectNode[];
}

export interface ODataSelectPickerOptions {
	/**
	 * Include selected keys with value undefined when the source path does not exist.
	 * @default false
	 */
	includeMissingFields?: boolean;

	/**
	 * Include values that are explicitly undefined in the source object.
	 * @default true
	 */
	includeUndefinedValues?: boolean;
}

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertValidPathSegment(segment: string): void {
	if (!IDENTIFIER_REGEX.test(segment)) {
		throw new Error(`Invalid $select segment '${segment}'`);
	}
}

function parsePathItem(item: string): SelectNode {
	if (item === '*') {
		return {kind: 'wildcard'};
	}

	const path = item.split('/').map((segment) => segment.trim());
	if (path.length === 0 || path.some((segment) => segment.length === 0)) {
		throw new Error(`Invalid $select path '${item}'`);
	}

	for (const segment of path) {
		assertValidPathSegment(segment);
	}

	return {kind: 'path', path};
}

/**
 * Parses an OData $select string into an AST.
 * @param select The OData $select string.
 * @returns Parsed select AST.
 */
export function parseODataSelect(select: string): SelectAst {
	const trimmed = select.trim();
	if (trimmed.length === 0) {
		throw new Error('OData $select cannot be empty');
	}

	const rawItems = trimmed.split(',').map((item) => item.trim());
	if (rawItems.some((item) => item.length === 0)) {
		throw new Error(`Invalid $select '${select}'`);
	}

	const unique = new Set<string>();
	const items: SelectNode[] = [];

	for (const rawItem of rawItems) {
		const node = parsePathItem(rawItem);
		const key = node.kind === 'wildcard' ? '*' : node.path.join('/');
		if (!unique.has(key)) {
			unique.add(key);
			items.push(node);
		}
	}

	return {items};
}

function getPathValue(source: unknown, path: string[]): {exists: boolean; value: unknown} {
	let cursor: unknown = source;
	for (const segment of path) {
		if (cursor === null || typeof cursor !== 'object' || !(segment in cursor)) {
			return {exists: false, value: undefined};
		}
		cursor = (cursor as Record<string, unknown>)[segment];
	}
	return {exists: true, value: cursor};
}

function setPathValue(target: Record<string, unknown>, path: string[], value: unknown): void {
	let cursor = target;
	const lastIndex = path.length - 1;

	for (let i = 0; i < lastIndex; i++) {
		const segment = path[i];
		if (segment === undefined) {
			continue;
		}

		const currentValue = cursor[segment];
		if (currentValue === null || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
			cursor[segment] = {};
		}

		cursor = cursor[segment] as Record<string, unknown>;
	}

	const last = path[lastIndex];
	if (last !== undefined) {
		cursor[last] = value;
	}
}

/**
 * Creates a function that projects a source object based on OData $select.
 * @param select OData $select string or pre-parsed AST.
 * @param options Picker behavior options.
 * @returns A function that returns a projected object.
 */
export function createODataSelectPicker<T extends object>(select: string | SelectAst, options: ODataSelectPickerOptions = {}): (data: T) => Partial<T> {
	const ast = typeof select === 'string' ? parseODataSelect(select) : select;
	const includeMissingFields = options.includeMissingFields ?? false;
	const includeUndefinedValues = options.includeUndefinedValues ?? true;
	const hasWildcard = ast.items.some((item) => item.kind === 'wildcard');

	return (data: T): Partial<T> => {
		if (hasWildcard) {
			return {...data};
		}

		const output: Record<string, unknown> = {};
		for (const item of ast.items) {
			if (item.kind !== 'path') {
				continue;
			}

			const result = getPathValue(data, item.path);
			if (!result.exists) {
				if (includeMissingFields) {
					setPathValue(output, item.path, undefined);
				}
				continue;
			}

			if (result.value === undefined && !includeUndefinedValues) {
				continue;
			}

			setPathValue(output, item.path, result.value);
		}

		return output as Partial<T>;
	};
}

/**
 * Applies OData $select directly to a single object.
 * @param select OData $select string or pre-parsed AST.
 * @param data The source object.
 * @param options Picker behavior options.
 * @returns Projected object.
 */
export function applyODataSelect<T extends object>(select: string | SelectAst, data: T, options?: ODataSelectPickerOptions): Partial<T> {
	return createODataSelectPicker<T>(select, options)(data);
}
