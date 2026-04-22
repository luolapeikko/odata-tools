export type TokenType = 'identifier' | 'string' | 'number' | 'datetime' | 'boolean' | 'null' | 'lparen' | 'rparen' | 'comma' | 'slash' | 'colon';

export interface Token {
	type: TokenType;
	value: string;
}

export type ComparisonOperator = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';
export type LogicalOperator = 'and' | 'or';

export interface ComparisonNode {
	kind: 'comparison';
	operator: ComparisonOperator;
	left: AstNode;
	right: AstNode;
}

export interface LogicalNode {
	kind: 'logical';
	operator: LogicalOperator;
	left: AstNode;
	right: AstNode;
}

export interface NotNode {
	kind: 'not';
	operand: AstNode;
}

export interface FunctionCallNode {
	kind: 'functionCall';
	name: string;
	args: AstNode[];
}

export interface LiteralNode {
	kind: 'literal';
	value: string | number | boolean | null;
}

export interface PropertyNode {
	kind: 'property';
	path: string[];
}

export interface LambdaNode {
	kind: 'lambda';
	path: string[];
	operator: 'any' | 'all';
	variable: string;
	predicate: AstNode;
}

export type AstNode = ComparisonNode | LogicalNode | NotNode | FunctionCallNode | LiteralNode | PropertyNode | LambdaNode;
