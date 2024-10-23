const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { updateData, updateStatus, insertDefectDetail } = require('./runsql');

const defectTypeMap = {
    'BadRandomness': 'br_count',
    'PrecisionLoss': 'pl_count',
    'UncheckReturn': 'ur_count',
    'GobalVarRedefined': 'gvr_count',
    'ImproperFunctionModifier': 'ifm_count',
    'UnHandleBouncedMessage': 'ubm_count',
    'InconsistentData': 'id_count',
    'LackEndParse': 'lep_count',
};

const defectTypeId = {
    'BadRandomness': 0,
    'PrecisionLoss': 1,
    'UncheckReturn': 2,
    'GobalVarRedefined': 3,
    'ImproperFunctionModifier': 4,
    'UnHandleBouncedMessage': 5,
    'InconsistentData': 6,
    'LackEndParse': 7,
};

// 读取并解析结果文件的函数
async function parseResultFile(connection, taskID, resultFilePath) {
    if (!fs.existsSync(resultFilePath)) {
        // 检测失败
        await updateStatus(connection, taskID, 2);
        return null;
    }

    const resultData = JSON.parse(fs.readFileSync(resultFilePath, 'utf-8'));

    let taskInfo = {
        taskID: taskID,
        count: {
            br_count: 0,
            pl_count: 0,
            ur_count: 0,
            gvr_count: 0,
            ifm_count: 0,
            ubm_count: 0,
            id_count: 0,
            lep_count: 0
        },
        defectDetails: []
    };

    const uploadDir = path.join(__dirname, 'uploads');
    resultData.forEach(problem => {
        const where = problem.wheres[0];
        const absolutePath = where.message.split(':')[0];
        const relativePath = absolutePath.replace(/^.*\/uploads\/[^\/]+\//, "");
        const problemType = defectTypeId[problem.detector];
        taskInfo.count[defectTypeMap[problem.detector]]++;
        const problemDetail = {
            type: problemType,
            error: relativePath,
            code: getContextWithLineNumbers(absolutePath, where.char_offs,  problem.msg)
        };
        
        taskInfo.defectDetails.push(problemDetail);
    });

    await updateData(connection, taskID, taskInfo.count);
    await updateStatus(connection, taskID, 1);

    for (const detail of taskInfo.defectDetails) {
        const detailData = {
            taskID: taskID,
            problemType: detail.type,
            errorMessage: detail.error,
            codeSnippet: detail.code
        };
        await insertDefectDetail(connection, detailData);
    }

    return taskInfo;
}

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Error executing command: ${error.message}`));
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// 处理任务队列的函数
async function runTonscanner(connection, taskID, entranceFilePath, resultFile) {
    console.log(`Processing task for: ${entranceFilePath}`);

    const command = `TonScanner -s ${entranceFilePath} -j ${resultFile}`;
    console.log(`Executing command: ${command}`);

    // 执行检测命令
    try {
        const { stdout, stderr } = await execPromise(command);
        console.log(`Command stdout: ${stdout}`);
        if (stderr) {
            console.error(`Command stderr: ${stderr}`);
        }
    } catch (error) {
        console.error(`Error executing command: ${error.message}`);
    }

    await parseResultFile(connection, taskID, resultFile);
}

function getContextWithLineNumbers(filePath, charOffs, errorMessage, contextLines = 3) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        let currentCharCount = 0;
        let lineNumber = 0;

        for (let i = 0; i < lines.length; i++) {
            currentCharCount += lines[i].length + 1; // +1 计入换行符
            if (currentCharCount > charOffs) {
                lineNumber = i; // 找到包含错误的行号
                break;
            }
        }
        // 计算上下文行的起始和结束索引
        const startLine = Math.max(0, lineNumber - contextLines);
        const endLine = Math.min(lines.length - 1, lineNumber + contextLines);

        let result = '';
        for (let i = startLine; i <= endLine; i++) {
            const line = lines[i];
            // 附加行号和行内容
            result += `${i + 1}: ${line}\n`;
            // 如果是出错的行，标记具体位置
            if (i === lineNumber) {
                const position = ' '.repeat(charOffs - currentCharCount + lines[i].length) + '^';
                result += position + ` ${errorMessage}\n`;
            }
        }
        return result;
    } catch (err) {
        console.error(`Error reading file: ${err.message}`);
    }
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
    runTonscanner,
    formatDateTime
};

// // 示例用法
// (async () => {
//     const taskID = '056dc3b810cf62adf7e671c757eee566';
//     const resultFilePath = '/home/lteng/Projects/TONScanner_web/results/056dc3b810cf62adf7e671c757eee566.json'
//     const connection = await getConnection();
//     const parsedTaskInfo = await parseResultFile(connection, taskID, resultFilePath);
//     const res = await queryDefectDetailsByTaskID(connection, taskID);
//     console.log(res);
// })();