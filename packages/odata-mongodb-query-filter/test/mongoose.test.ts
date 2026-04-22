import {MongoMemoryServer} from 'mongodb-memory-server';
import {connect, model, Schema} from 'mongoose';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {parseODataFilter} from '../src/index';

type Main = {
	name: string;
	age: number;
	createdAt: Date;
	record: {
		some: string;
	};
	array: {other: string}[];
};

const subRecordSchema = new Schema<Main['record']>(
	{
		some: {type: String, required: true},
	},
	{_id: false},
);

const subArraySchema = new Schema<Main['array'][number]>(
	{
		other: {type: String, required: true},
	},
	{_id: false},
);

const mainSchema = new Schema<Main>({
	name: {type: String, required: true},
	age: {type: Number, required: true},
	createdAt: {type: Date, required: true},
	record: {type: subRecordSchema, required: true},
	array: {type: [subArraySchema], required: true},
});

const MainModel = model('Main', mainSchema);

describe('Mongoose schema compatibility', () => {
	beforeAll(async () => {
		const mongoServer = await MongoMemoryServer.create();
		const uri = mongoServer.getUri();
		await connect(uri);

		await MainModel.insertMany([
			{
				name: 'Test',
				age: 30,
				createdAt: new Date('2023-01-01T10:00:00Z'),
				record: {some: 'Value'},
				array: [{other: 'Item1'}, {other: 'Item2'}],
			},
			{
				name: 'Demo',
				age: 45,
				createdAt: new Date('2024-03-15T09:30:00Z'),
				record: {some: 'Another'},
				array: [{other: 'Item2'}],
			},
			{
				name: '  Trim  ',
				age: 21,
				createdAt: new Date('2022-07-05T12:00:00Z'),
				record: {some: 'value'},
				array: [{other: 'Item1'}],
			},
		]);
	});

	async function findNames(filter: string): Promise<string[]> {
		const results = await MainModel.find(parseODataFilter(filter)).sort({name: 1});
		return results.map((item) => item.name);
	}

	it('supports comparison operators', async () => {
		expect(await findNames("name eq 'Test'")).toEqual(['Test']);
		expect(await findNames("name ne 'Test'")).toEqual(['  Trim  ', 'Demo']);
		expect(await findNames('age gt 30')).toEqual(['Demo']);
		expect(await findNames('age ge 30')).toEqual(['Demo', 'Test']);
		expect(await findNames('age lt 30')).toEqual(['  Trim  ']);
		expect(await findNames('age le 30')).toEqual(['  Trim  ', 'Test']);
		expect(await findNames('createdAt ge 2024-01-01T00:00:00Z')).toEqual(['Demo']);
	});

	it('supports logical and not operators', async () => {
		expect(await findNames("name eq 'Test' or name eq 'Demo'")).toEqual(['Demo', 'Test']);
		expect(await findNames('age gt 20 and age lt 40')).toEqual(['  Trim  ', 'Test']);
		expect(await findNames("not(name eq 'Test')")).toEqual(['  Trim  ', 'Demo']);
	});

	it('supports nested property filtering', async () => {
		expect(await findNames("record/some eq 'Value'")).toEqual(['Test']);
	});

	it('supports string functions', async () => {
		expect(await findNames("contains(name,'es')")).toEqual(['Test']);
		expect(await findNames("startswith(name,'De')")).toEqual(['Demo']);
		expect(await findNames("endswith(name,'mo')")).toEqual(['Demo']);
		expect(await findNames("tolower(record/some) eq 'value'")).toEqual(['  Trim  ', 'Test']);
		expect(await findNames("toupper(record/some) eq 'ANOTHER'")).toEqual(['Demo']);
		expect(await findNames("trim(name) eq 'Trim'")).toEqual(['  Trim  ']);
		expect(await findNames('length(name) eq 4')).toEqual(['Demo', 'Test']);
		expect(await findNames("concat(record/some,'X') eq 'ValueX'")).toEqual(['Test']);
		expect(await findNames("indexof(name,'es') eq 1")).toEqual(['Test']);
		expect(await findNames("substring(name,1,2) eq 'es'")).toEqual(['Test']);
	});

	it('supports lambda any and all', async () => {
		expect(await findNames("array/any(a: a/other eq 'Item2')")).toEqual(['Demo', 'Test']);
		expect(await findNames("array/all(a: a/other eq 'Item1')")).toEqual(['  Trim  ']);
	});

	afterAll(async () => {
		await MainModel.db.close();
	});
});
