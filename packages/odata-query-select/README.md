# @luolapeikko/odata-query-select

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![Maintainability](https://qlty.sh/gh/luolapeikko/projects/odata-tools/maintainability.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-tools)
[![Code Coverage](https://qlty.sh/gh/luolapeikko/projects/odata-tools/coverage.svg)](https://qlty.sh/gh/luolapeikko/projects/odata-tools)
[![CI/CD](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-query-select.yml/badge.svg)](https://github.com/luolapeikko/odata-tools/actions/workflows/odata-query-select.yml)

## Builds a data selector based on $select query values.

Parses OData `$select` values into an AST and applies field projection to plain JavaScript/TypeScript objects.
Supports top-level and nested property selection (for example `name,address/city`), wildcard selection (`*`), and duplicate item normalization.

## Usage examples

```typescript
import {createODataSelectPicker} from '@luolapeikko/odata-query-select';

interface Person {
	name: string;
	age: number;
	address?: {city?: string; zip?: string};
}

const personList: Person[] = [
	{name: 'John', age: 30, address: {city: 'Seattle', zip: '98101'}},
	{name: 'Mary', age: 25, address: {city: 'Portland', zip: '97201'}},
];

const selectPicker = createODataSelectPicker<Person>('name,address/city');
console.log(personList.map(selectPicker));
// [{name: 'John', address: {city: 'Seattle'}}, {name: 'Mary', address: {city: 'Portland'}}]
```

```typescript
import {applyODataSelect} from '@luolapeikko/odata-query-select';

const handleRequest = (req, res, next) => {
	const dataObject = await getSomeData();
	const querySelect = req.query.$select;
	if (typeof querySelect === 'string') {
		const selectedData = applyODataSelect(querySelect, dataObject);
		res.json(selectedData);
	}
};
```