# BenchmarkSQL for MongoDB

A Node.js implementation of BenchmarkSQL adapted for MongoDB performance testing.

## Overview

BenchmarkSQL is a tool for fair measurement of database performance. This version is specifically customized to work with MongoDB, allowing you to benchmark MongoDB's performance under various workloads.

## Prerequisites

- Node.js 14 or higher
- Docker
- npm or yarn

## Getting Started

### Installation

1. Clone the repository:
    ```
    git clone https://github.com/yourusername/benchmarksqlmongo.git
    cd benchmarksqlmongo
    ```

2. Install dependencies:
    ```
    npm install
    ```

### Configuration

Edit the configuration files in the `config` directory:

- `mongodb.js` - MongoDB connection settings
- `benchmark.js` - Benchmark parameters

### Running the Benchmark

```
npm start
```

## Features

- TPC-C like workload for MongoDB
- Customizable number of warehouses and terminals
- Detailed statistics and performance metrics
- Support for sharded MongoDB clusters

## Documentation

For detailed information about the benchmark parameters and metrics, see the `docs` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## Acknowledgements

This project is based on the original BenchmarkSQL, adapted for MongoDB with a Node.js implementation.