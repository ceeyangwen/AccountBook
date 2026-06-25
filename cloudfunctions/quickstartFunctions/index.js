const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const formatTime = () => {
  const now = new Date();
  return now.toISOString();
};

const formatFileTimestamp = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const CLOUD_ENV_ID = "cloud1-d3gvv57hn4dfa5588";
const CLOUD_STORAGE_RESOURCE_ID = "636c-cloud1-d3gvv57hn4dfa5588-1433781415";
const PERFORMANCE_LOG_RETENTION_DAYS = 7;
const PERFORMANCE_LOG_MAX_ENTRIES = 200;

console.log(`[${formatTime()}] 云函数服务启动`);

const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  console.log(`[${formatTime()}] getOpenId 调用`);
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

const normalizeDataByType = (data, dataType) => {
  if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data[dataType])) {
    return data[dataType];
  }

  if (dataType === "categories" && data && typeof data === "object" && !Array.isArray(data) && data.categories) {
    return data.categories;
  }

  return data;
};

const isValidDataType = (dataType) => {
  return ["records", "accounts", "categories"].includes(dataType);
};

const getDataCount = (data) => {
  if (Array.isArray(data)) {
    return data.length;
  }

  if (data && typeof data === "object") {
    return Object.keys(data).length;
  }

  return 0;
};

const getStorageFileIDCandidates = (cloudPath) => {
  return [
    `cloud://${CLOUD_ENV_ID}.${CLOUD_STORAGE_RESOURCE_ID}/${cloudPath}`,
    `cloud://${CLOUD_ENV_ID}/${cloudPath}`
  ];
};

const toFiniteNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : null;
};

const truncateText = (value, maxLength) => {
  return String(value || "").slice(0, maxLength);
};

const sanitizePerformanceLog = (log) => {
  const sourceLog = log && typeof log === "object" && !Array.isArray(log) ? log : {};
  const serverPerformance = sourceLog.serverPerformance && typeof sourceLog.serverPerformance === "object"
    ? sourceLog.serverPerformance
    : {};

  return {
    timestamp: sourceLog.timestamp || formatTime(),
    source: truncateText(sourceLog.source || "miniprogram", 40),
    operation: truncateText(sourceLog.operation || "unknown", 60),
    dataType: truncateText(sourceLog.dataType || "", 40),
    success: sourceLog.success !== false,
    durationMs: toFiniteNumber(sourceLog.durationMs),
    dataCount: toFiniteNumber(sourceLog.dataCount),
    errMsg: truncateText(sourceLog.errMsg || "", 160),
    serverPerformance: {
      totalMs: toFiniteNumber(serverPerformance.totalMs),
      stringifyMs: toFiniteNumber(serverPerformance.stringifyMs),
      uploadMs: toFiniteNumber(serverPerformance.uploadMs),
      byteLength: toFiniteNumber(serverPerformance.byteLength)
    }
  };
};

const readPerformanceLogEntries = async (cloudPath) => {
  const fileIDCandidates = getStorageFileIDCandidates(cloudPath);

  for (const fileID of fileIDCandidates) {
    try {
      const downloadRes = await cloud.downloadFile({ fileID });
      const parsed = JSON.parse(downloadRes.fileContent.toString("utf8"));

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed && Array.isArray(parsed.entries)) {
        return parsed.entries;
      }
    } catch (e) {
      console.warn(`[${formatTime()}] 性能日志读取失败: ${fileID}`, e.message);
    }
  }

  return [];
};

const appendPerformanceLog = async (log) => {
  const wxContext = cloud.getWXContext();
  const cloudPath = `users/${wxContext.OPENID}/performance-logs/save-performance.json`;
  const existingEntries = await readPerformanceLogEntries(cloudPath);
  const cutoffTime = Date.now() - PERFORMANCE_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const retainedEntries = existingEntries.filter(entry => {
    const entryTime = Date.parse(entry && entry.timestamp);
    return Number.isFinite(entryTime) && entryTime >= cutoffTime;
  });
  const deletedByAge = existingEntries.length - retainedEntries.length;

  retainedEntries.push(sanitizePerformanceLog(log));
  retainedEntries.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const overflowCount = Math.max(0, retainedEntries.length - PERFORMANCE_LOG_MAX_ENTRIES);
  const entries = overflowCount > 0
    ? retainedEntries.slice(overflowCount)
    : retainedEntries;
  const fileContent = Buffer.from(JSON.stringify({
    updatedAt: formatTime(),
    retentionDays: PERFORMANCE_LOG_RETENTION_DAYS,
    maxEntries: PERFORMANCE_LOG_MAX_ENTRIES,
    entries
  }), "utf8");

  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent
  });

  console.log(`[${formatTime()}] 性能日志写入成功: ${entries.length} 条, 删除 ${deletedByAge + overflowCount} 条`);

  return {
    success: true,
    fileID: uploadRes.fileID,
    cloudPath,
    retainedCount: entries.length,
    deletedCount: deletedByAge + overflowCount
  };
};

const readStorageData = async (dataType) => {
  if (!isValidDataType(dataType)) {
    return { success: false, errMsg: "Invalid dataType" };
  }

  const wxContext = cloud.getWXContext();
  const cloudPath = `users/${wxContext.OPENID}/${dataType}.json`;
  const fileIDCandidates = getStorageFileIDCandidates(cloudPath);

  let lastErr = null;

  for (const fileID of fileIDCandidates) {
    try {
      console.log(`[${formatTime()}] 尝试读取云存储文件: ${fileID}`);
      const downloadRes = await cloud.downloadFile({ fileID });
      const fileContent = downloadRes.fileContent.toString("utf8");
      const data = normalizeDataByType(JSON.parse(fileContent), dataType);
      const count = Array.isArray(data) ? data.length : (data && typeof data === "object" ? Object.keys(data).length : 0);

      console.log(`[${formatTime()}] 云存储读取成功: ${dataType}, 数量: ${count}`);

      return {
        success: true,
        data,
        fileID,
        count
      };
    } catch (e) {
      lastErr = e;
      console.error(`[${formatTime()}] 云存储读取失败: ${fileID}`, e.message);
    }
  }

  return {
    success: false,
    errMsg: lastErr ? lastErr.message : "Storage file not found"
  };
};

const writeStorageData = async (dataType, data) => {
  if (!isValidDataType(dataType)) {
    return { success: false, errMsg: "Invalid dataType" };
  }

  const startedAt = Date.now();
  const wxContext = cloud.getWXContext();
  const cloudPath = `users/${wxContext.OPENID}/${dataType}.json`;
  const stringifyStartedAt = Date.now();
  const jsonData = JSON.stringify(data);
  const stringifyMs = Date.now() - stringifyStartedAt;
  const fileContent = Buffer.from(jsonData, "utf8");

  console.log(`[${formatTime()}] 写入云存储文件: ${cloudPath}, 数量: ${getDataCount(data)}, 字节数: ${fileContent.length}`);

  const uploadStartedAt = Date.now();
  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent
  });
  const uploadMs = Date.now() - uploadStartedAt;

  console.log(`[${formatTime()}] 云存储写入成功: ${uploadRes.fileID}`);

  return {
    success: true,
    fileID: uploadRes.fileID,
    cloudPath,
    performance: {
      totalMs: Date.now() - startedAt,
      stringifyMs,
      uploadMs,
      byteLength: fileContent.length,
      dataCount: getDataCount(data)
    }
  };
};

const getBackupItems = (data) => {
  return [
    { dataType: "records", data: data.records || [] },
    { dataType: "accounts", data: data.accounts || [] },
    { dataType: "categories", data: data.categories || {} }
  ];
};

const createBackupData = async (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { success: false, errMsg: "Invalid backup data" };
  }

  const wxContext = cloud.getWXContext();
  const timestamp = formatFileTimestamp();
  const backupPath = `users/${wxContext.OPENID}/backups/${timestamp}`;
  const backupItems = getBackupItems(data);
  const uploadedFiles = [];

  for (const item of backupItems) {
    const cloudPath = `users/${wxContext.OPENID}/backups/${timestamp}/${item.dataType}.json`;
    const fileContent = Buffer.from(JSON.stringify(item.data, null, 2), "utf8");

    console.log(`[${formatTime()}] 创建云端备份文件: ${cloudPath}, 字节数: ${fileContent.length}`);

    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent
    });

    uploadedFiles.push({
      dataType: item.dataType,
      fileID: uploadRes.fileID,
      cloudPath
    });

    console.log(`[${formatTime()}] 云端备份创建成功: ${uploadRes.fileID}`);
  }

  return {
    success: true,
    backupPath,
    files: uploadedFiles
  };
};

exports.main = async (event, context) => {
  console.log(`[${formatTime()}] 云函数被调用, type: ${event.type}`);
  console.log(`[${formatTime()}] 请求摘要:`, JSON.stringify({
    type: event.type,
    dataType: event.dataType,
    dataCount: getDataCount(event.data)
  }));
  
  try {
    let result;
    switch (event.type) {
      case "getOpenId":
        result = await getOpenId();
        break;
      case "readStorageData":
        result = await readStorageData(event.dataType);
        break;
      case "writeStorageData":
        result = await writeStorageData(event.dataType, event.data);
        break;
      case "createBackupData":
        result = await createBackupData(event.data);
        break;
      case "appendPerformanceLog":
        result = await appendPerformanceLog(event.log);
        break;
      default:
        console.error(`[${formatTime()}] 未知类型:`, event.type);
        result = { success: false, errMsg: "Unknown type" };
    }
    
    console.log(`[${formatTime()}] 返回结果:`, JSON.stringify(result));
    return result;
  } catch (e) {
    console.error(`[${formatTime()}] 云函数执行错误:`, e.message);
    console.error(`[${formatTime()}] 错误堆栈:`, e.stack);
    return {
      success: false,
      errMsg: e.message
    };
  }
};
