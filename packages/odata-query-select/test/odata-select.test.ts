import {describe, expect, it} from 'vitest';
import {applyODataSelect, createODataSelectPicker, parseODataSelect} from '../src/index.js';

interface Person {
	name: string;
	age: number;
	city?: string;
	address?: {
		city?: string;
		zip?: string;
	};
	tags: string[];
	numbers: {name: string; value: number}[];
}

describe('parseODataSelect', () => {
	it('parses simple and nested paths', () => {
		const ast = parseODataSelect('name,address/city');
		expect(ast).toEqual({
			items: [
				{kind: 'path', path: ['name']},
				{kind: 'path', path: ['address', 'city']},
			],
		});
	});

	it('supports wildcard', () => {
		const ast = parseODataSelect('*,name');
		expect(ast).toEqual({
			items: [{kind: 'wildcard'}, {kind: 'path', path: ['name']}],
		});
	});

	it('deduplicates repeated paths', () => {
		const ast = parseODataSelect('name,name,address/city,address/city');
		expect(ast).toEqual({
			items: [
				{kind: 'path', path: ['name']},
				{kind: 'path', path: ['address', 'city']},
			],
		});
	});

	it('throws on empty or malformed input', () => {
		expect(() => parseODataSelect('')).toThrowError();
		expect(() => parseODataSelect('name,')).toThrowError();
		expect(() => parseODataSelect('address//city')).toThrowError();
	});
});

describe('createODataSelectPicker', () => {
	const source: Person = {
		name: 'John',
		age: 30,
		address: {city: 'Seattle', zip: '98101'},
		tags: ['friend', 'vip'],
		numbers: [
			{name: 'home', value: 123},
			{name: 'work', value: 456},
		],
	};

	it('picks selected top-level fields', () => {
		const picker = createODataSelectPicker<Person>('name,age');
		expect(picker(source)).toEqual({name: 'John', age: 30});
	});

	it('picks selected nested fields and preserves shape', () => {
		const picker = createODataSelectPicker<Person>('address/city');
		expect(picker(source)).toEqual({address: {city: 'Seattle'}});
	});

	it('returns a shallow copy when wildcard is present', () => {
		const picker = createODataSelectPicker<Person>('*');
		expect(picker(source)).toEqual(source);
		expect(picker(source)).not.toBe(source);
	});

	it('skips missing fields by default', () => {
		const picker = createODataSelectPicker<Person>('name,city');
		expect(picker(source)).toEqual({name: 'John'});
	});

	it('can include missing fields as undefined', () => {
		const picker = createODataSelectPicker<Person>('name,city', {includeMissingFields: true});
		expect(picker(source)).toEqual({name: 'John', city: undefined});
	});

	it('can exclude explicitly undefined values', () => {
		const picker = createODataSelectPicker<Person>('name,city', {
			includeMissingFields: true,
			includeUndefinedValues: false,
		});
		expect(picker(source)).toEqual({name: 'John'});
	});

	it('picks primitive array fields as-is', () => {
		const picker = createODataSelectPicker<Person>('tags');
		expect(picker(source)).toEqual({tags: ['friend', 'vip']});
	});

	it('picks object array fields as-is', () => {
		const picker = createODataSelectPicker<Person>('numbers');
		expect(picker(source)).toEqual({
			numbers: [
				{name: 'home', value: 123},
				{name: 'work', value: 456},
			],
		});
	});

	it('treats nested array item paths as missing', () => {
		const picker = createODataSelectPicker<Person>('numbers/name', {includeMissingFields: true});
		expect(picker(source)).toEqual({numbers: {name: undefined}});
	});
});

describe('applyODataSelect', () => {
	it('applies selection directly without creating picker manually', () => {
		const result = applyODataSelect('name,address/zip', {
			name: 'John',
			age: 30,
			address: {city: 'Seattle', zip: '98101'},
		});

		expect(result).toEqual({
			name: 'John',
			address: {zip: '98101'},
		});
	});

	it('applies $select for primitive array field tags', () => {
		const result = applyODataSelect<Person>('tags', {
			name: 'John',
			age: 30,
			tags: ['friend', 'vip'],
			numbers: [
				{name: 'home', value: 123},
				{name: 'work', value: 456},
			],
		});

		expect(result).toEqual({
			tags: ['friend', 'vip'],
		});
	});

	it('applies $select for object array field numbers', () => {
		const result = applyODataSelect<Person>('numbers', {
			name: 'John',
			age: 30,
			tags: ['friend', 'vip'],
			numbers: [
				{name: 'home', value: 123},
				{name: 'work', value: 456},
			],
		});

		expect(result).toEqual({
			numbers: [
				{name: 'home', value: 123},
				{name: 'work', value: 456},
			],
		});
	});

	it('treats nested array item paths as missing in $select', () => {
		const result = applyODataSelect<Person>(
			'numbers/name',
			{
				name: 'John',
				age: 30,
				tags: ['friend', 'vip'],
				numbers: [
					{name: 'home', value: 123},
					{name: 'work', value: 456},
				],
			},
			{includeMissingFields: true},
		);

		expect(result).toEqual({
			numbers: {name: undefined},
		});
	});
});
