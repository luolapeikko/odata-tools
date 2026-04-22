import {type AstNode, type ComparisonOperator, type LogicalOperator, parseODataAstNode} from '@luolapeikko/odata-query-filter';

export type MongoLiteral = string | number | boolean | Date | null;

type BuildContext = {
	readonly scopedVariables: ReadonlySet<string>;
};

/**
 * All possible MongoDB expression types that can be generated from OData filters.
 */
export type MongoExpression =
	| MongoLiteral
	| string
	| {readonly [operator: string]: MongoExpression | readonly MongoExpression[] | {readonly [key: string]: MongoExpression | string} | boolean};

/**
 * The resulting filter object type that can be used in Mongoose queries.
 */
export type ODataMongooseFilter = {
	readonly $expr: MongoExpression;
};

const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function getArgument(args: MongoExpression[], index: number, functionName: string): MongoExpression {
	const argument = args[index];
	if (argument === undefined) {
		throw new Error(`Function '${functionName}' expects argument at index ${index}`);
	}
	return argument;
}

function toLiteralValue(value: string | number | boolean | null): MongoLiteral {
	if (typeof value === 'string' && ISO_DATETIME_REGEX.test(value)) {
		return new Date(value);
	}
	return value;
}

function createScopedContext(context: BuildContext, variableName: string): BuildContext {
	const scopedVariables = new Set(context.scopedVariables);
	scopedVariables.add(variableName);
	return {scopedVariables};
}

function toPropertyReference(path: string[], context: BuildContext): string {
	const [first, ...rest] = path;

	if (first !== undefined && context.scopedVariables.has(first)) {
		return rest.length > 0 ? `$$${first}.${rest.join('.')}` : `$$${first}`;
	}

	return `$${path.join('.')}`;
}

function createComparisonExpression(operator: ComparisonOperator, left: MongoExpression, right: MongoExpression): MongoExpression {
	switch (operator) {
		case 'eq':
			return {$eq: [left, right]};
		case 'ne':
			return {$ne: [left, right]};
		case 'gt':
			return {$gt: [left, right]};
		case 'ge':
			return {$gte: [left, right]};
		case 'lt':
			return {$lt: [left, right]};
		case 'le':
			return {$lte: [left, right]};
		default:
			throw new Error(`Unsupported comparison operator '${operator satisfies never}'`);
	}
}

function createLogicalExpression(operator: LogicalOperator, left: MongoExpression, right: MongoExpression): MongoExpression {
	return operator === 'and' ? {$and: [left, right]} : {$or: [left, right]};
}

function createFunctionCallExpression(name: string, args: MongoExpression[]): MongoExpression {
	const arg0 = getArgument(args, 0, name);

	switch (name) {
		case 'tolower':
			return {$toLower: arg0};
		case 'toupper':
			return {$toUpper: arg0};
		case 'trim':
			return {$trim: {input: arg0}};
		case 'length':
			return {$strLenCP: arg0};
		case 'concat': {
			const arg1 = getArgument(args, 1, name);
			return {$concat: [arg0, arg1]};
		}
		case 'indexof': {
			const arg1 = getArgument(args, 1, name);
			return {$indexOfCP: [arg0, arg1]};
		}
		case 'substring': {
			const arg1 = getArgument(args, 1, name);

			if (args.length > 2) {
				const arg2 = getArgument(args, 2, name);
				return {$substrCP: [arg0, arg1, arg2]};
			}

			// No length argument: take from start to end of string
			return {$substrCP: [arg0, arg1, {$subtract: [{$strLenCP: arg0}, arg1]}]};
		}
		case 'contains': {
			const arg1 = getArgument(args, 1, name);
			// $indexOfCP returns -1 when not found, >= 0 when found
			return {$gte: [{$indexOfCP: [arg0, arg1]}, 0]};
		}
		case 'startswith': {
			const arg1 = getArgument(args, 1, name);
			return {$eq: [{$indexOfCP: [arg0, arg1]}, 0]};
		}
		case 'endswith': {
			const arg1 = getArgument(args, 1, name);
			// Guard: if len(x) < len(y) the field can't end with y → false
			const lenX = {$strLenCP: arg0};
			const lenY = {$strLenCP: arg1};
			return {
				$cond: [{$gte: [lenX, lenY]}, {$eq: [{$substrCP: [arg0, {$subtract: [lenX, lenY]}, lenY]}, arg1]}, false],
			};
		}
		default:
			throw new Error(`Unsupported function '${name}'`);
	}
}

function buildExpression(node: AstNode, context: BuildContext): MongoExpression {
	const kind = node.kind;
	switch (kind) {
		case 'literal':
			return toLiteralValue(node.value);
		case 'property':
			return toPropertyReference(node.path, context);
		case 'comparison':
			return createComparisonExpression(node.operator, buildExpression(node.left, context), buildExpression(node.right, context));
		case 'logical':
			return createLogicalExpression(node.operator, buildExpression(node.left, context), buildExpression(node.right, context));
		case 'not':
			return {$not: [buildExpression(node.operand, context)]};
		case 'functionCall':
			return createFunctionCallExpression(
				node.name,
				node.args.map((argument) => buildExpression(argument, context)),
			);
		case 'lambda': {
			const arrayExpression = toPropertyReference(node.path, context);
			const scopedContext = createScopedContext(context, node.variable);
			const mappedPredicateExpression = {
				$map: {
					as: node.variable,
					in: buildExpression(node.predicate, scopedContext),
					input: arrayExpression,
				},
			};

			const lambdaExpression: MongoExpression =
				node.operator === 'any' ? {$anyElementTrue: [mappedPredicateExpression]} : {$allElementsTrue: [mappedPredicateExpression]};

			return {
				$cond: [{$isArray: arrayExpression}, lambdaExpression, false],
			};
		}
		default:
			throw new Error(`Unsupported AST node kind '${kind satisfies never}'`);
	}
}

/**
 * Parses an OData $filter string and builds a MongoDB filter object that can be used in Mongoose queries.
 * @param filter The OData $filter string to parse.
 * @returns A MongoDB filter object that can be used in Mongoose queries.
 */
export function parseODataFilter(filter: string): ODataMongooseFilter {
	const node = parseODataAstNode(filter);
	const context: BuildContext = {scopedVariables: new Set<string>()};
	return {$expr: buildExpression(node, context)};
}
