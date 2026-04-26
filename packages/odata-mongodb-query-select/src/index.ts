import {parseODataSelect as parseODataSelectAst, type SelectAst} from '@luolapeikko/odata-query-select';

export type MongoProjectionValue = 0 | 1;

export type ODataMongoSelect = {
	readonly [field: string]: MongoProjectionValue;
};

function toMongoProjection(ast: SelectAst): ODataMongoSelect {
	const projection: Record<string, MongoProjectionValue> = {};

	for (const item of ast.items) {
		if (item.kind === 'wildcard') {
			return {};
		}

		projection[item.path.join('.')] = 1;
	}

	return projection;
}

/**
 * Parses an OData $select string and builds a MongoDB projection object that can be used in MongoDB or Mongoose queries.
 * @param select The OData $select string or pre-parsed AST.
 * @returns A MongoDB projection object that can be used in Model.find({}, projection).
 * @example
 * const data = await MyModel.find({}, parseODataSelect('name,record/some'));
 */
export function parseODataSelect(select: string | SelectAst): ODataMongoSelect {
	const ast = typeof select === 'string' ? parseODataSelectAst(select) : select;
	return toMongoProjection(ast);
}
