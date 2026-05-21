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

const readStorageData = async (dataType) => {
  if (!isValidDataType(dataType)) {
    return { success: false, errMsg: "Invalid dataType" };
  }

  const wxContext = cloud.getWXContext();
  const cloudPath = `users/${wxContext.OPENID}/${dataType}.json`;
  const fileIDCandidates = [
    `cloud://${CLOUD_ENV_ID}.${CLOUD_STORAGE_RESOURCE_ID}/${cloudPath}`,
    `cloud://${CLOUD_ENV_ID}/${cloudPath}`
  ];

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

  const wxContext = cloud.getWXContext();
  const cloudPath = `users/${wxContext.OPENID}/${dataType}.json`;
  const fileContent = Buffer.from(JSON.stringify(data, null, 2), "utf8");

  console.log(`[${formatTime()}] 写入云存储文件: ${cloudPath}, 字节数: ${fileContent.length}`);

  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent
  });

  console.log(`[${formatTime()}] 云存储写入成功: ${uploadRes.fileID}`);

  return {
    success: true,
    fileID: uploadRes.fileID,
    cloudPath
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
  console.log(`[${formatTime()}] 请求数据:`, JSON.stringify(event));
  
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
