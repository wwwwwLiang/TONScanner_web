var mysql = require('mysql');

// 创建数据库连接池
var pool = mysql.createPool({
    connectionLimit: 10, // 连接池的最大连接数
    host: 'localhost',
    user: 'lteng',
    password: 'ArP^x_~7u^YR]NMHeVeD',
    database: 'ton'
});

const taskTableName = 'tasks';
const detailTableName = 'details';

// 获取连接函数
async function getConnection() {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error getting a database connection:', err);
                return reject(err);
            }
            resolve(connection);
        });
    });
}

async function createTaskTableIfNotExists(connection) {
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS ${taskTableName} (
            taskID VARCHAR(36) NOT NULL UNIQUE PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TINYINT NOT NULL CHECK (status IN (0, 1, 2)),
            br_count INT DEFAULT 0,
            pl_count INT DEFAULT 0,
            ur_count INT DEFAULT 0,
            gvr_count INT DEFAULT 0,
            ifm_count INT DEFAULT 0,
            ubm_count INT DEFAULT 0,
            id_count INT DEFAULT 0,
            lep_count INT DEFAULT 0
        );
    `;

    return new Promise((resolve, reject) => {
        connection.query(createTableSql, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

async function insertData(connection, data) {
    const insertSql = `
        INSERT INTO ${taskTableName} (name, taskID, status, br_count, pl_count, ur_count, gvr_count, ifm_count, ubm_count, id_count, lep_count) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const values = [
        data.name,
        data.taskID,
        data.status,
        data.br_count,
        data.pl_count,
        data.ur_count,
        data.gvr_count,
        data.ifm_count,
        data.ubm_count,
        data.id_count,
        data.lep_count
    ];

    return new Promise((resolve, reject) => {
        connection.query(insertSql, values, (err, results) => {
            if (err) {
                // 处理主键冲突错误
                if (err.code === 'ER_DUP_ENTRY') {
                    return reject(new Error(`TaskID '${data.taskID}' already exists.`));
                }
                return reject(new Error(`Insert failed: ${err.message}`));
            }
            resolve(results);
        });
    });
}

async function updateData(connection, taskID, data) {
    const updateSql = `
        UPDATE ${taskTableName}
        SET 
            br_count = ?, 
            pl_count = ?, 
            ur_count = ?, 
            gvr_count = ?, 
            ifm_count = ?, 
            ubm_count = ?, 
            id_count = ?, 
            lep_count = ?
        WHERE taskID = ?;
    `;

    const values = [
        data.br_count,
        data.pl_count,
        data.ur_count,
        data.gvr_count,
        data.ifm_count,
        data.ubm_count,
        data.id_count,
        data.lep_count,
        taskID
    ];

    return new Promise((resolve, reject) => {
        connection.query(updateSql, values, (err, results) => {
            if (err) {
                return reject(new Error(`Update failed: ${err.message}`));
            }

            // 检查更新是否影响了任何行
            if (results.affectedRows === 0) {
                return reject(new Error(`No record found with taskID '${taskID}'.`));
            }
            resolve(results);
        });
    });
}

async function updateStatus(connection, taskID, status) {
    const updateSql = `
        UPDATE ${taskTableName}
        SET 
            status = ?
        WHERE taskID = ?;
    `;

    const values = [
        status,
        taskID
    ];

    return new Promise((resolve, reject) => {
        connection.query(updateSql, values, (err, results) => {
            if (err) {
                return reject(new Error(`Update failed: ${err.message}`));
            }

            // 检查更新是否影响了任何行
            if (results.affectedRows === 0) {
                return reject(new Error(`No record found with taskID '${taskID}'.`));
            }
            resolve(results);
        });
    });
}

async function deleteData(connection, taskID) {
    // 检查记录是否存在
    const checkSql = `SELECT COUNT(*) AS count FROM ?? WHERE taskID = ?;`;
    const checkValues = [taskTableName, taskID];
    try {
        const [checkResult] = await new Promise((resolve, reject) => {
            connection.query(checkSql, checkValues, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (checkResult.count === 0) {
            console.log(`No record found with taskID: ${taskID}`);
            return; // 如果记录不存在，返回
        }

        // 如果记录存在，执行删除操作
        const deleteSql = `
            DELETE FROM ?? WHERE taskID = ?;
        `;

        const deleteValues = [taskTableName, taskID];

        const deleteResult = await new Promise((resolve, reject) => {
            connection.query(deleteSql, deleteValues, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        console.log(`Deleted record with taskID: ${taskID}`);
        return deleteResult;
    } catch (err) {
        console.error('Error during delete operation:', err);
    }
}

async function queryData(connection, taskID) {
    const querySql = `SELECT * FROM ?? WHERE taskID = ?;`;

    const queryValues = [taskTableName, taskID];

    return new Promise((resolve, reject) => {
        connection.query(querySql, queryValues, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

async function queryAllData(connection) {
    const querySql = `SELECT * FROM ??;`;

    const queryValues = [taskTableName];

    return new Promise((resolve, reject) => {
        connection.query(querySql, queryValues, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

async function insertEmptyData(connection, tashID, name) {
    //  在数据库中插入一条空数据
    const data = {
        taskID: tashID,
        name: name,
        status: 0,
        br_count: 0,
        pl_count: 0,
        ur_count: 0,
        gvr_count: 0,
        ifm_count: 0,
        ubm_count: 0,
        id_count: 0,
        lep_count: 0
    };

    await insertData(connection, data);
}

async function createDetailTableIfNotExists(connection) {
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS ${detailTableName} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            taskID VARCHAR(255),
            problemType INT,
            errorMessage TEXT,
            codeSnippet TEXT,
            FOREIGN KEY (taskID) REFERENCES ${taskTableName}(taskID)
        );
    `;

    return new Promise((resolve, reject) => {
        connection.query(createTableSql, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

async function insertDefectDetail(connection, detailData) {
    const insertSql = `
        INSERT INTO ${detailTableName} (taskID, problemType, errorMessage, codeSnippet)
        VALUES (?, ?, ?, ?);
    `;

    const values = [
        detailData.taskID,
        detailData.problemType,
        detailData.errorMessage,
        detailData.codeSnippet
    ];

    return new Promise((resolve, reject) => {
        connection.query(insertSql, values, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

async function queryDefectDetailsByTaskID(connection, taskID) {
    const selectSql = `
        SELECT problemType, errorMessage, codeSnippet 
        FROM ${detailTableName}
        WHERE taskID = ?;
    `;

    return new Promise((resolve, reject) => {
        connection.query(selectSql, [taskID], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

module.exports = {
    getConnection,
    createTaskTableIfNotExists,
    createDetailTableIfNotExists,
    insertData,
    updateData,
    updateStatus,
    queryData,
    queryAllData,
    deleteData,
    insertEmptyData,
    insertDefectDetail,
    queryDefectDetailsByTaskID
};

// // sql 使用示例
// (async () => {
//     try {
//         const connection = await getConnection();
//         console.log('Connected to the database.');

//         await createTableIfNotExists(connection);
//         console.log('Table checked/created successfully.');

//         // 插入数据示例
//         const data = {
//             taskID: '123e4567-e89b-12d3-a456-426614174000', // 使用 UUID 格式的 taskID
//             name: 'Test Project',
//             status: 0,
//             br_count: 1,
//             pl_count: 0,
//             ur_count: 2,
//             gvr_count: 0,
//             ifm_count: 1,
//             ubm_count: 0,
//             id_count: 0,
//             lep_count: 1
//         };

//         await deleteData(connection, data.taskID);
//         await insertData(connection, data);
//         console.log('Data inserted successfully.');

//         // 查询数据示例
//         const queryResults = await queryData(connection);
//         const queryAllResults = await queryAllData(connection);
//         console.log('Query results:', queryAllResults);

//         connection.release(); // 最后释放连接
//     } catch (err) {
//         console.error('Error during database operations:', err);
//     }
// })();
