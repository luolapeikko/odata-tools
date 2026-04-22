# @luolapeikko/odata-mongoose-query-filter

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![Maintainability](https://qlty.sh/gh/luolapeikko/projects/odata-tools/maintainability.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-query-filter)
[![Code Coverage](https://qlty.sh/gh/luolapeikko/projects/odata-tools/coverage.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-query-filter)
[![CI/CD](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-mongoose-query-filter.yml/badge.svg)](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-mongoose-query-filter.yml)

## Builds a Mongoose query filter based on OData $filter query values.

Handles most OData query comparison operators (`eq` | `ne` | `gt` | `ge` | `lt` | `le`), logical operators (`and` | `or` | `not`), array lambda operators (`any` | `all`), and functions (`contains` | `startswith` | `endswith` | `tolower` | `toupper` | `trim` | `length` | `concat` | `indexof` | `substring`).
Automatic ISO DateTime string / Date handling, and uses `toString()` for custom objects in comparisons.

## Usage examples

```typescript
import { parseODataFilter } from "@luolapeikko/odata-mongoose-query-filter";
const data = await MyModel.find(parseODataFilter("name eq 'John'"));
```

```typescript
import { parseODataFilter } from "@luolapeikko/odata-mongoose-query-filter";
const handleRequest = (req, res, next) => {
	const queryFilter = req.query.$filter;
	if (typeof queryFilter === "string") {
		const data: MyModelObject[] = [];
		for await (const item of MyModel.find(parseODataFilter(queryFilter)).cursor()) {
			data.push(item.toObject());
		}
		res.json(data);
	}
};
```
