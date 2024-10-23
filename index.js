const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');;
const path = require('path');
const unzipper = require('unzipper');
const { exec } = require('child_process');
const crypto = require('crypto');
const { getConnection, createTaskTableIfNotExists, createDetailTableIfNotExists, insertData, updateData, queryData, queryAllData, deleteData, insertEmptyData } = require('./runsql');
const { runTonscanner, formatDateTime } = require('./utils');
const app = express();

function generateTaskID() {
    return crypto.randomBytes(16).toString('hex'); // 16 bytes = 32 hex characters
}

app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

const port = 18800;
const currentDirectory = path.dirname(require.main.filename);
let connection; // 数据库连接

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(currentDirectory, 'uploads')); // 文件存储目录
    },
    filename: function (req, file, cb) {
        cb(null, `${req.body.projectName}.zip`); // 保持原文件名
    }
});
const upload = multer({ storage: storage });


app.get('/taskList', async (req, res) => {
    // 从数据库中读取检测记录列表

    /*示例
        name: 项目名称
        time: 检测时间（时间戳）
        taskID: 随机生成
        states: 0:检测中 1:检测完成 2:检测失败
        defect: 依次记录每种错误的数量。
                'BR', 'PL', 'UR', 'GVR', 'IFM', 'UBM', 'ID', 'LEP'
    */
    const taskInfos = await queryAllData(connection);
    let contractList = taskInfos.map(task => ({
        name: task.name,
        time: formatDateTime(task.time),
        taskID: task.taskID,
        state: task.status,
        problem: [
            task.br_count,
            task.pl_count,
            task.ur_count,
            task.gvr_count,
            task.ifm_count,
            task.ubm_count,
            task.id_count,
            task.lep_count
        ]
    }));

    res.send(contractList);
})

app.get('/taskDetail', async (req, res) => {
    const taskID = req.query.taskID;
    console.log(taskID);
    // 根据taskID读取检测任务详情

    let taskInfo = {
        name: 'example0.fc',
        taskID: '6d28191eb56cdc038aaf545263109bde',
        time: '2024-10-19 22:30:44',
        problem: [0, 0, 0, 0, 0, 0, 0, 0],
        problemsList: [
            {
                type: 7,
                error: 'new_lookup.fc:14:27: warning: Lack of end_parse.',
                code: 'slice sender_addr = cs~load_msg_addr();'
            },
            {
                type: 1,
                error: 'math-utils.fc:24:35: warning: PressionLoss',
                code: '      return (available_seconds * tokens_per_second, available_seconds, time_now);'
            },
            {
                type: 1,
                error: 'math-utils.fc:32:31: warning: PressionLoss',
                code: 'return (available_seconds * tokens_per_second, available_seconds, time_now);'
            },
            {
                type: 7,
                error: 'new_lookup.fc:34:43: warning: Lack of end_parse.',
                code: 'self:tokens_all    = tokens_ref~load_coins(); ;; 124'
            },
            {
                type: 5,
                error: 'handles.fc:34:45: warning: UnHandle bounced message with op: 0xf8a7ea5',
                code: 'send_raw_message(msg.end_cell(),64)'
            },
        ]
    };

    res.send(JSON.stringify(taskInfo));
})

app.post('/uploadContract', upload.single('file'), async (req, res) => {
    /*  接收两个字段
        file: 压缩包，包含所有合约文件
        entranceFile: 字符串 入口文件名
    */
    const entranceFile = req.body.entranceFile;
    const filePath = req.file.path; // 压缩包
    const uploadDir = path.join(__dirname, 'uploads');
    const resultDir = path.join(__dirname, 'results');

    const taskID = generateTaskID();
    const resultFile = path.join(resultDir, `${taskID}.json`);

    // 解压目录
    const fileNameWithoutExt = path.basename(req.file.filename, '.zip');
    const outputDir = path.join(uploadDir, `${fileNameWithoutExt}-${taskID}`);
    fs.mkdirSync(outputDir, { recursive: true });

    // 确认文件已经上传成功
    console.log(`Received file: ${req.file.filename}`);
    console.log(`Entrance file: ${entranceFile}`);

    fs.createReadStream(filePath)
    .pipe(unzipper.Extract({ path: outputDir }))
    .on('close', async () => {
        console.log('File unzipped successfully.');
        
        // 插入空数据
        await insertEmptyData(connection, taskID, fileNameWithoutExt);
        console.log(`Init task: ${taskID}`);

        const entranceFilePath = path.join(outputDir, entranceFile);

        // 检查解压后的入口文件是否存在
        if (fs.existsSync(entranceFilePath)) {
            // 立即返回成功响应
            res.send({
                msg: '上传成功，检测已添加到队列'
            });

            runTonscanner(taskID, entranceFilePath, resultFile);
        } else {
            res.status(400).send({
                msg: '入口文件不存在，请检查文件名是否正确'
            });
        }
    })
    .on('error', (err) => {
        console.error(`Error during file extraction: ${err.message}`);
        res.status(500).send({
            msg: '解压文件失败',
            error: err.message
        });
    });
})

app.listen(port, async () => {
    console.log(`Example app listening on port ${port}`)
    try {
        connection = await getConnection();
        console.log('Connected to the database.');

        await createTaskTableIfNotExists(connection);
        await createDetailTableIfNotExists(connection);
        console.log('Table checked/created successfully.');
    } catch (err) {
        console.error('Error during database operations:', err);
    }
})
