# @luolapeikko/odata-mongodb-query-select

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![Maintainability](https://qlty.sh/gh/luolapeikko/projects/odata-tools/maintainability.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-tools)
[![Code Coverage](https://qlty.sh/gh/luolapeikko/projects/odata-tools/coverage.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-tools)
[![CI/CD](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-mongodb-query-select.yml/badge.svg)](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-mongodb-query-select.yml)

## Builds a MongoDB/Mongoose projection object based on OData $select query values.
The OData $select expression is parsed into an AST and then translated into a MongoDB projection object.
You can use the projection with both Mongoose find queries and the MongoDB Node.js driver.

Nested OData paths use slash syntax and are translated to Mongo dot notation:

record/some -> record.some
array/other -> array.other
Wildcard selection (*) returns an empty projection object, which means all fields are returned by default.

## Usage examples

### Mongoose find

```typescript
import { parseODataSelect } from "@luolapeikko/odata-mongodb-query-select";

const querySelect = req.query.$select;
if (typeof querySelect === "string") {
	const projection = parseODataSelect(querySelect);
	const data = await MyModel.find({}, projection);
	res.json(data);
}
```

### MongoDB Node.js driver find

```typescript
import { parseODataSelect } from "@luolapeikko/odata-mongodb-query-select";

const querySelect = req.query.$select;
if (typeof querySelect === "string") {
	const projection = parseODataSelect(querySelect);
	const cursor = db.collection("items").find({}, { projection });
	const data = await cursor.toArray();
	res.json(data);
}
```
