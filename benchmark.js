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
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function sumTotalDurationMongo() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const collection = client.db(MONGO_DB).collection(MONGO_COLLECTION);

    console.log('Running sum aggregation on MongoDB...');
    const start = Date.now();

    const result = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalSum: { $sum: "$totalDuration" }
        }
      }
    ]).toArray();

    const end = Date.now();
    const totalSum = result[0]?.totalSum || 0;

    console.log(`MongoDB sum: ${totalSum}`);
    console.log(`MongoDB aggregation took ${end - start} ms`);

  } catch (err) {
    console.error('MongoDB error:', err);
  } finally {
    await client.close();
  }
}

async function sumTotalDurationSql() {
  try {
    const pool = await sql.connect(SQL_CONFIG);

    console.log('Running sum query on SQL Server...');
    const start = Date.now();

    const result = await pool.request()
      .query('SELECT SUM(totalDuration) AS totalSum FROM DummyData');

    const end = Date.now();
    const totalSum = result.recordset[0]?.totalSum || 0;

    console.log(`SQL Server sum: ${totalSum}`);
    console.log(`SQL Server query took ${end - start} ms`);

    await pool.close();
  } catch (err) {
    console.error('SQL Server error:', err);
  }
}

async function runBenchmark() {
  await sumTotalDurationMongo();
  console.log('---------------------------');
  await sumTotalDurationSql();
}

runBenchmark();
