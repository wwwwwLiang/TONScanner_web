# TONScannerWeb

## Introduction
TONScannerWeb is a web-based application designed to upload, analyze, and detect issues in FunC smart contract files. The tool scans uploaded files for potential defects and reports them in a structured manner. The web interface allows users to upload smart contracts, processes the files, and displays results, including details about code issues and vulnerabilities detected.

## Project Structure
- `index.js`: The main entry point of the web application, handling routes, file uploads, and task queuing.
- `runsql.js`: Contains functions for interacting with the MySQL database (e.g., insert, update, query data).
- `utils.js`: Utility functions for handling client-side interactions.
- `dist/`: Compiled frontend code, including index.html and JavaScript files
- `upload/:` Directory where uploaded files are temporarily stored.
- `results/`: Directory where scan results are stored in JSON format.
- `TONScanner`: The core tool used to analyze FunC smart contracts for defects.

## Installation
1. Clone the repository:
```bash
git clone https://github.com/wwwwwLiang/TONScanner_web.git
cd TONScanner_web
mkdir results
mkdir uploads
```

2. Install dependencies:
```bash
npm install
```

3.Set up MySQL database:
- Create a MySQL database and update connection settings in `runsql.js`.

4. Build TONScanner:
- Build TONScanner from source code through `build.sh` to automatically configure the environment.

## Usage
1. Start the server:
```bash
node index.js
```

2. Upload a smart contract:
- Open http://localhost:18800/ in your browser, upload the zip file and specify the entry file of the contract for analysis.

3. View results:
- Results will be processed and stored in the database, and users can view the analysis of uploaded files.