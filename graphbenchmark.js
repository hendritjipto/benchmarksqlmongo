import { MongoClient } from 'mongodb';
import sql from 'mssql';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import fs from 'fs';

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

const RUNS = 100;

async function sumTotalDurationMongo(client) {
    const collection = client.db(MONGO_DB).collection(MONGO_COLLECTION);

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
    return { timeMs: end - start, totalSum };
}

async function sumTotalDurationSql(pool) {
    const start = Date.now();

    const result = await pool.request()
        .query('SELECT SUM(totalDuration) AS totalSum FROM DummyData');

    const end = Date.now();
    const totalSum = result.recordset[0]?.totalSum || 0;
    return { timeMs: end - start, totalSum };
}

async function runBenchmark() {
    const mongoClient = new MongoClient(MONGO_URI);
    const sqlPool = await sql.connect(SQL_CONFIG);

    await mongoClient.connect();

    const mongoTimes = [];
    const sqlTimes = [];

    let mongoSum = null;
    let sqlSum = null;

    console.log(`Running benchmark ${RUNS} times...`);

    for (let i = 0; i < RUNS; i++) {
        const mongoResult = await sumTotalDurationMongo(mongoClient);
        const sqlResult = await sumTotalDurationSql(sqlPool);

        // Check sums are consistent
        if (mongoSum === null) mongoSum = mongoResult.totalSum;
        if (sqlSum === null) sqlSum = sqlResult.totalSum;
        if (mongoSum !== mongoResult.totalSum || sqlSum !== sqlResult.totalSum) {
            console.warn(`Warning: Sum mismatch on iteration ${i + 1}`);
        }

        mongoTimes.push(mongoResult.timeMs);
        sqlTimes.push(sqlResult.timeMs);

        process.stdout.write(`Completed iteration ${i + 1} / ${RUNS}\r`);
    }
    console.log('\nBenchmark completed.');

    await mongoClient.close();
    await sqlPool.close();

    return { mongoTimes, sqlTimes };
}

async function createChart(mongoTimes, sqlTimes) {
    const width = 1000; // px
    const height = 600; // px
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    const configuration = {
        type: 'line',
        data: {
            labels: Array.from({ length: RUNS }, (_, i) => i + 1),
            datasets: [
                {
                    label: 'MongoDB Sum Execution Time (ms)',
                    data: mongoTimes,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                    tension: 0.1,
                },
                {
                    label: 'SQL Server Sum Execution Time (ms)',
                    data: sqlTimes,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                    tension: 0.1,
                }
            ]
        },
        options: {
            responsive: false,
            plugins: {
                title: {
                    display: true,
                    text: 'MongoDB vs SQL Server Sum(totalDuration) Execution Time (100 runs)',
                    font: { size: 18 }
                },
                legend: { position: 'top' }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Run Number' }
                },
                y: {
                    title: { display: true, text: 'Execution Time (ms)' },
                    beginAtZero: true
                }
            }
        },
        plugins: [{
            id: 'custom_canvas_background_color',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = 'white';  // Set your background color here
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    };

    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);

    fs.writeFileSync('benchmark_chart.png', imageBuffer);
    console.log('Chart saved as benchmark_chart.png');
}

async function createPieChart(mongoTimes, sqlTimes) {
    let mongoFaster = 0;
    let sqlFaster = 0;
    let tie = 0;

    for (let i = 0; i < mongoTimes.length; i++) {
        if (mongoTimes[i] < sqlTimes[i]) mongoFaster++;
        else if (sqlTimes[i] < mongoTimes[i]) sqlFaster++;
        else tie++;
    }

    const width = 600;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    const configuration = {
        type: 'pie',
        data: {
            labels: [
                'MongoDB Faster',
                'SQL Server Faster',
                ...(tie > 0 ? ['Tie'] : [])
            ],
            datasets: [{
                data: [mongoFaster, sqlFaster, ...(tie > 0 ? [tie] : [])],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    ...(tie > 0 ? ['rgba(200, 200, 200, 0.8)'] : [])
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    ...(tie > 0 ? ['rgba(200, 200, 200, 1)'] : [])
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Who Was Faster? (100 Runs)',
                    font: { size: 18 }
                },
                legend: { position: 'top' }
            }
        },
        plugins: [{
            id: 'custom_canvas_background_color',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    };

    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync('benchmark_pie.png', imageBuffer);
    console.log('Pie chart saved as benchmark_pie.png');
}

async function main() {
    const { mongoTimes, sqlTimes } = await runBenchmark();
    await createChart(mongoTimes, sqlTimes);
    await createPieChart(mongoTimes, sqlTimes);
}

main().catch(console.error);
