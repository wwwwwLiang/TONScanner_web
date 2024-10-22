const express = require('express');
const cors = require('cors');
const multer = require('multer');;
const path = require('path');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

const port = 3000;
const currentDirectory = path.dirname(require.main.filename);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(currentDirectory, 'uploads')); // 文件存储目录
    },
    filename: function (req, file, cb) {
        cb(null, `${req.body.projectName}.zip`); // 保持原文件名
    }
});
const upload = multer({ storage: storage });



app.get('/taskList', (req, res) => {
    // 从数据库中读取检测记录列表

    /*示例
        name: 项目名称
        time: 检测时间（时间戳）
        taskID: 随机生成
        stast: 0:检测中 1:检测完成 2:检测失败
        problem: 长度为8的数组，依次记录每种错误的数量。
                'BR', 'PL', 'UR', 'GVR', 'IFM', 'UBM', 'ID', 'LEP'
    */
    let contractList = [
        {
            name: 'task1',
            time: '2024-10-19 22:30:44',
            taskID: '3f93dd9087dff5b0db915e67f88ad344',
            state: 0,   //0:检测中 1:检测完成 2:检测失败
            problem: [0, 0, 0, 0, 0, 0, 0, 0], //
        },
        {
            name: 'task2',
            time: '2024-10-18 22:30:44',
            taskID: '5e3212678d4d26af9e87f038032d6e59',
            state: 1,
            problem: [0, 2, 1, 0, 0, 1, 0, 5],
        },
        {
            name: 'task3',
            time: '2024-10-17 22:30:44',
            taskID: '9d11c9f200bad2cee3f29a5a60d65cd7',
            state: 1,
            problem: [0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
            name: 'task4',
            time: '2024-10-16 22:30:44',
            taskID: '5179d2a843f14af0341142e3e2ce8457',
            state: 2,
            problem: [1, 2, 1, 3, 0, 1, 0, 5],
        },
        {
            name: 'task5',
            time: '2024-10-15 22:30:44',
            taskID: 'dc14759bc60e62c488c2ab2cc324700f',
            state: 1,
            problem: [0, 2, 1, 9, 0, 1, 5, 5],
        }
    ]

    res.send(contractList);
})

app.get('/taskDetail', (req, res) => {
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

app.post('/uploadContract', upload.single('file'), (req, res) => {
    const entranceFile = req.body.entranceFile;
    console.log(entranceFile);
    console.log(req.file);

    /*  接收两个字段
        file: 压缩包，包含所有合约文件
        entranceFile: 字符串 入口文件名
    */

    // 将文件送入TONSacnner进行检测，并在检测任务列表中添加一条记录，state为0

    //检测完成后，将state改为1，同时补充检测结果的详细信息

    res.send({
        msg: '上传成功，请稍后查看检测结果'
    })
})



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
