import {MongoMemoryServer} from 'mongodb-memory-server';
import {connect, model, Schema} from 'mongoose';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {parseODataSelect} from '../src/index';

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

const MainModel = model('MainSelect', mainSchema);

describe('Mongoose schema compatibility', () => {
	let mongoServer: MongoMemoryServer;

	beforeAll(async () => {
		mongoServer = await MongoMemoryServer.create();
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

	it('builds a projection object from OData $select', () => {
		expect(parseODataSelect('name,record/some,array/other')).toEqual({
			name: 1,
			'record.some': 1,
			'array.other': 1,
		});
	});

	it('supports wildcard selection by returning an empty projection', () => {
		expect(parseODataSelect('*')).toEqual({});
	});

	function findProjected(select: string): Promise<Record<string, unknown>[]> {
		return MainModel.find({}, parseODataSelect(select)).sort({name: 1}).lean<Record<string, unknown>[]>();
	}

	it('selects top-level and nested fields with Mongoose', async () => {
		const results = await findProjected('name,record/some');

		expect(results).toHaveLength(3);
		expect(results[0]).toMatchObject({name: '  Trim  ', record: {some: 'value'}});
		expect(results[1]).toMatchObject({name: 'Demo', record: {some: 'Another'}});
		expect(results[2]).toMatchObject({name: 'Test', record: {some: 'Value'}});
		expect(results[0]).not.toHaveProperty('age');
		expect(results[0]).not.toHaveProperty('createdAt');
	});

	it('selects nested array subfields with Mongoose', async () => {
		const results = await findProjected('name,array/other');

		expect(results).toHaveLength(3);
		expect(results[2]).toMatchObject({
			name: 'Test',
			array: [{other: 'Item1'}, {other: 'Item2'}],
		});
		expect(results[2]).not.toHaveProperty('record');
	});

	afterAll(async () => {
		await MainModel.db.close();
		await mongoServer.stop();
	});
});
