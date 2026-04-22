# @luolapeikko/odata-mongodb-query-filter

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![Maintainability](https://qlty.sh/gh/luolapeikko/projects/odata-tools/maintainability.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-query-filter)
[![Code Coverage](https://qlty.sh/gh/luolapeikko/projects/odata-tools/coverage.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-query-filter)
[![CI/CD](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-mongodb-query-filter.yml/badge.svg)](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-mongodb-query-filter.yml)

## Builds a MongoDB/Mongoose query filter based on OData $filter query values.

The OData `$filter` expression is parsed into an AST and then translated into a MongoDB aggregation expression wrapped in `{ $expr: ... }`, which allows the full MongoDB expression language to be used inside `Model.find()`.

### Comparison operators

| OData | MongoDB |
| ----- | ------- |
| `eq`  | `$eq`   |
| `ne`  | `$ne`   |
| `gt`  | `$gt`   |
| `ge`  | `$gte`  |
| `lt`  | `$lt`   |
| `le`  | `$lte`  |

### Logical & negation operators

| OData | MongoDB |
| ----- | ------- |
| `and` | `$and`  |
| `or`  | `$or`   |
| `not` | `$not`  |

### String functions

| OData                               | MongoDB                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `contains(field, value)`            | `{ $gte: [{ $indexOfCP: [field, value] }, 0] }`       |
| `startswith(field, value)`          | `{ $eq: [{ $indexOfCP: [field, value] }, 0] }`        |
| `endswith(field, value)`            | suffix slice comparison using `$substrCP` and `$cond` |
| `tolower(field)`                    | `$toLower`                                            |
| `toupper(field)`                    | `$toUpper`                                            |
| `trim(field)`                       | `{ $trim: { input: field } }`                         |
| `length(field)`                     | `$strLenCP`                                           |
| `concat(a, b)`                      | `{ $concat: [a, b] }`                                 |
| `indexof(field, value)`             | `{ $indexOfCP: [field, value] }`                      |
| `substring(field, start[, length])` | `$substrCP`                                           |

### Other features

- **Nested properties** — `/`-separated paths (e.g. `record/some`) are translated to dot-notation field references (e.g. `$record.some`).
- **ISO 8601 date strings** — string literals that match the ISO 8601 datetime format are automatically converted to `Date` objects before the query is built.
- **Lambda operators** — `any` and `all` over array fields are translated to `$anyElementTrue` / `$allElementsTrue` wrapping a `$map` expression. The lambda variable is bound as a scoped `$$variable` reference.

```
// any: array/any(a: a/other eq 'Item2')
{ $expr: { $cond: [{ $isArray: "$array" }, { $anyElementTrue: [{ $map: { input: "$array", as: "a", in: { $eq: ["$$a.other", "Item2"] } } }] }, false] } }

// all: array/all(a: a/other eq 'Item1')
{ $expr: { $cond: [{ $isArray: "$array" }, { $allElementsTrue: [{ $map: { input: "$array", as: "a", in: { $eq: ["$$a.other", "Item1"] } } }] }, false] } }
```

## Usage examples

```typescript
import { parseODataFilter } from "@luolapeikko/odata-mongodb-query-filter";
const data = await MyModel.find(parseODataFilter("name eq 'John'"));
```

```typescript
import { parseODataFilter } from "@luolapeikko/odata-mongodb-query-filter";
const handleRequest = (req, res, next) => {
	const queryFilter = req.query.$filter;
	if (typeof queryFilter === "string") {
		const data: MyModelDocument[] = [];
		for await (const item of MyModel.find(parseODataFilter(queryFilter)).cursor()) {
			data.push(item);
		}
		res.json(data);
	}
};
```
