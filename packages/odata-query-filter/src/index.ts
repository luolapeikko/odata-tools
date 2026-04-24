import {evaluate} from './evaluate';
import {Parser} from './Parser';
import {tokenize} from './tokenize';
import type {FilterAstNode} from './tokenTypes';

export * from './tokenTypes';

export function parseODataAstNode(filter: string): FilterAstNode {
	const parser = new Parser(tokenize(filter));
	return parser.parse();
}

/**
 * Build a filter function from an OData filter string.
 * @param filter The OData filter string.
 * @returns A function that takes an object of type T and returns a boolean indicating whether the object matches the filter.
 * @example
 * const filter = createODataFilter<{name: string; age: number}>("name eq 'John' and age gt 30");
 * const filter = createODataFilter<{name: string; age: number}>("name eq 'John' or name eq 'Jane'");
 */
export function createODataFilter<T>(filter: string | FilterAstNode): (data: T) => boolean {
	const astNode = typeof filter === 'string' ? parseODataAstNode(filter) : filter;
	return (data: T) => Boolean(evaluate(astNode, data as unknown as Record<string, unknown>));
}
