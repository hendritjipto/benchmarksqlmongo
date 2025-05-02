// filename: generateData.js

import { faker } from '@faker-js/faker';
import { MongoClient } from 'mongodb';
import sql from 'mssql';

const MONGO_URI = 'mongodb://root:password@localhost:27017';
const MONGO_DB = 'testdb';
const MONGO_COLLECTION = 'dummyData';

const SQL_CONFIG = {
  user: 'sa',
  password: 'YourStrong!Passw0rd',
  server: 'localhost',
  database: 'master',
  options: {
    encrypt: false, // for local dev
    trustServerCertificate: true,
  },
};

const RECORD_COUNT = 10000000;

function getRandomDuration() {
  return faker.number.int({ min: 10000, max: 99999 })
}

function generateDataArray() {
  const data = [];
  for (let i = 0; i < RECORD_COUNT; i++) {
    const arrayIndex = Math.floor(i / (RECORD_COUNT / 10));
    if (!data[arrayIndex]) {
      data[arrayIndex] = [];
    }
    data[arrayIndex].push({
      totalDuration: getRandomDuration(),
      createdAt: faker.date.past(),
    });
  }
  return data;
}

async function generateMongoData(data) {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(MONGO_DB);
    const collection = db.collection(MONGO_COLLECTION);

    // Clear existing data
    await collection.deleteMany({});

    console.log(`Inserting ${RECORD_COUNT} documents into MongoDB...`);
    // Insert data in chunks to handle the nested array structure
    let insertedCount = 0;
    for (const batch of data) {
      const result = await collection.insertMany(batch);
      insertedCount += result.insertedCount;
      process.stdout.write(`Inserted ${insertedCount} / ${RECORD_COUNT}\r`);
    }
    //console.log(`Inserted ${result.insertedCount} documents into MongoDB.`);
  } catch (err) {
    console.error('MongoDB error:', err);
  } finally {
    await client.close();
  }
}

async function generateSqlData(data) {
  try {
    const pool = await sql.connect(SQL_CONFIG);

    // Create table if not exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DummyData' AND xtype='U')
      CREATE TABLE DummyData (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        totalDuration BIGINT NOT NULL,
        createdAt DATETIME NOT NULL
      )
    `);

    // Clear existing data
    await pool.request().query('DELETE FROM DummyData');

    console.log(`Inserting ${RECORD_COUNT} rows into SQL Server...`);

    const batchSize = 10000;
    for (let i = 0; i < RECORD_COUNT; i += batchSize) {
    // Extract and flatten data from the nested array structure
    const batch = [];
    const end = Math.min(i + batchSize, RECORD_COUNT);
    
    for (let j = i; j < end; j++) {
      const arrayIndex = Math.floor(j / (RECORD_COUNT / 10));
      const innerIndex = j % (RECORD_COUNT / 10);
      if (data[arrayIndex] && data[arrayIndex][innerIndex]) {
        batch.push(data[arrayIndex][innerIndex]);
      }
    }

      const table = new sql.Table('DummyData');
      table.columns.add('totalDuration', sql.BigInt, { nullable: false });
      table.columns.add('createdAt', sql.DateTime, { nullable: false });

      batch.forEach(row => {
        table.rows.add(row.totalDuration, row.createdAt);
      });

      await pool.request().bulk(table);
      process.stdout.write(`Inserted ${Math.min(i + batchSize, RECORD_COUNT)} / ${RECORD_COUNT}\r`);
    }
    console.log('\nInsertion into SQL Server completed.');

    await pool.close();
  } catch (err) {
    console.error('SQL Server error:', err);
  }
}

async function main() {
  const data = generateDataArray();
  await generateMongoData(data);
  await generateSqlData(data);
}

main();
