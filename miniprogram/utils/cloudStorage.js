const logger = require('./logger.js');

// 当前云开发环境和云存储资源 ID。
// 控制台展示的完整 File ID 形如：
// cloud://<envId>.<storageResourceId>/users/<openid>/records.json
const CLOUD_ENV_ID = 'cloud1-d3gvv57hn4dfa5588';
const CLOUD_STORAGE_RESOURCE_ID = '636c-cloud1-d3gvv57hn4dfa5588-1433781415';
const FILE_MAPPING_COLLECTION = 'file_mappings';

// 获取用户数据文件路径
const getUserDataPath = function (dataType) {
  const openid = wx.getStorageSync('openid');
  if (!openid) {
    logger.warn('cloudStorage', 'openid不存在');
    return null;
  }
  return 'users/' + openid + '/' + dataType + '.json';
};

const formatBackupTimestamp = function (date) {
  const pad = function (value) {
    return String(value).padStart(2, '0');
  };

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
};

const getUserBackupPath = function (timestamp, dataType) {
  const openid = wx.getStorageSync('openid');
  if (!openid) {
    logger.warn('cloudStorage', 'openid不存在');
    return null;
  }

  return 'users/' + openid + '/backups/' + timestamp + '/' + dataType + '.json';
};

const getBackupBasePath = function (timestamp) {
  const recordsPath = getUserBackupPath(timestamp, 'records');
  return recordsPath ? recordsPath.replace('/records.json', '') : null;
};

const getBackupItems = function (backupData) {
  return [
    { dataType: 'records', data: backupData.records || [] },
    { dataType: 'accounts', data: backupData.accounts || [] },
    { dataType: 'categories', data: backupData.categories || {} }
  ];
};

const addCandidate = function (candidates, fileID) {
  if (fileID && !candidates.includes(fileID)) {
    candidates.push(fileID);
  }
};

const normalizeEnvID = function (env) {
  if (!env) return '';
  if (typeof env === 'string') return env;
  return env.env || env.envID || env.currentEnv || '';
};

const getCloudEnvID = function () {
  try {
    const envID = normalizeEnvID(wx.cloud.getEnv && wx.cloud.getEnv());
    return envID || CLOUD_ENV_ID;
  } catch (e) {
    logger.warn('cloudStorage', '获取环境ID失败，使用默认环境ID: ' + (e.message || e));
    return CLOUD_ENV_ID;
  }
};

const getConsoleFileID = function (cloudPath) {
  if (!CLOUD_ENV_ID || !CLOUD_STORAGE_RESOURCE_ID) {
    return null;
  }
  return `cloud://${CLOUD_ENV_ID}.${CLOUD_STORAGE_RESOURCE_ID}/${cloudPath}`;
};

// 从云数据库获取fileID
const getFileIDFromDB = async function (dataType) {
  try {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('openid');
    
    if (!openid) {
      logger.warn('cloudStorage', 'openid不存在，无法从数据库获取fileID');
      return null;
    }
    
    const res = await db.collection(FILE_MAPPING_COLLECTION)
      .where({
        _openid: openid,
        dataType: dataType
      })
      .get();
    
    if (res.data && res.data.length > 0) {
      const mapping = res.data[0];
      logger.info('cloudStorage', '从数据库获取到fileID: ' + mapping.fileID);
      return mapping.fileID;
    }
    
    logger.info('cloudStorage', '数据库中没有找到文件映射');
    return null;
  } catch (e) {
    logger.warn('cloudStorage', '从数据库获取fileID失败: ' + (e.errMsg || e.message || e));
    return null;
  }
};

// 保存fileID到云数据库
const saveFileIDToDB = async function (dataType, fileID, cloudPath) {
  try {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('openid');
    
    if (!openid) {
      logger.warn('cloudStorage', 'openid不存在，无法保存fileID到数据库');
      return;
    }
    
    const existingRes = await db.collection(FILE_MAPPING_COLLECTION)
      .where({
        _openid: openid,
        dataType: dataType
      })
      .get();
    
    if (existingRes.data && existingRes.data.length > 0) {
      await db.collection(FILE_MAPPING_COLLECTION)
        .doc(existingRes.data[0]._id)
        .update({
          data: {
            fileID: fileID,
            cloudPath: cloudPath,
            updatedAt: new Date()
          }
        });
      logger.info('cloudStorage', '文件映射已更新到数据库');
    } else {
      await db.collection(FILE_MAPPING_COLLECTION).add({
        data: {
          dataType: dataType,
          fileID: fileID,
          cloudPath: cloudPath,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      logger.info('cloudStorage', '文件映射已保存到数据库');
    }
  } catch (e) {
    logger.warn('cloudStorage', '保存fileID到数据库失败: ' + (e.errMsg || e.message || e));
  }
};

const getFileIDCandidates = async function (dataType, cloudPath) {
  const candidates = [];
  const envID = getCloudEnvID();
  
  addCandidate(candidates, wx.getStorageSync('fileID_' + dataType));
  addCandidate(candidates, await getFileIDFromDB(dataType));
  addCandidate(candidates, getConsoleFileID(cloudPath));
  
  if (envID) {
    addCandidate(candidates, `cloud://${envID}/${cloudPath}`);
  }
  
  return candidates;
};

const downloadJSONFile = async function (fileID, dataType) {
  logger.info('cloudStorage', '开始下载文件: ' + fileID);
  const downloadRes = await wx.cloud.downloadFile({
    fileID: fileID
  });
  
  logger.info('cloudStorage', '下载结果: ' + JSON.stringify(downloadRes));
  
  if (!downloadRes.tempFilePath) {
    throw new Error('下载结果中没有tempFilePath');
  }
  
  logger.info('cloudStorage', 'tempFilePath: ' + downloadRes.tempFilePath);
  
  const fs = wx.getFileSystemManager();
  const fileContent = fs.readFileSync(downloadRes.tempFilePath, 'utf8');
  logger.info('cloudStorage', '文件内容长度: ' + fileContent.length + ' 字符');
  
  try {
    const data = normalizeDataByType(JSON.parse(fileContent), dataType);
    const dataCount = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : '非对象');
    logger.info('cloudStorage', '数据解析成功: ' + dataType + ', 数据数量: ' + dataCount);
    return data;
  } catch (parseErr) {
    throw new Error('JSON解析失败: ' + (parseErr.message || parseErr));
  }
};

const normalizeDataByType = function (data, dataType) {
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data[dataType])) {
    logger.info('cloudStorage', dataType + '.json 为备份对象格式，已提取 ' + dataType + ' 数组');
    return data[dataType];
  }
  
  if (dataType === 'categories' && data && typeof data === 'object' && !Array.isArray(data) && data.categories) {
    logger.info('cloudStorage', 'categories.json 为备份对象格式，已提取 categories 对象');
    return data.categories;
  }
  
  return data;
};

const isEmptyCloudData = function (data) {
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  
  if (data && typeof data === 'object') {
    return Object.keys(data).length === 0;
  }
  
  return !data;
};

const readDataByCloudFunction = async function (dataType) {
  try {
    logger.info('cloudStorage', '尝试通过云函数读取: ' + dataType);
    
    const res = await wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'readStorageData',
        dataType: dataType
      }
    });
    
    if (res.result && res.result.success) {
      const data = normalizeDataByType(res.result.data, dataType);
      const dataCount = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : '非对象');
      logger.info('cloudStorage', '云函数读取成功: ' + dataType + ', 数据数量: ' + dataCount);
      return data;
    }
    
    logger.warn('cloudStorage', '云函数读取失败: ' + (res.result && res.result.errMsg ? res.result.errMsg : '未知错误'));
    return null;
  } catch (e) {
    logger.warn('cloudStorage', '云函数读取异常: ' + (e.errMsg || e.message || e));
    return null;
  }
};

const writeDataByCloudFunction = async function (dataType, data) {
  try {
    logger.info('cloudStorage', '尝试通过云函数写入: ' + dataType);
    
    const res = await wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'writeStorageData',
        dataType: dataType,
        data: data
      }
    });
    
    if (res.result && res.result.success) {
      logger.info('cloudStorage', '云函数写入成功: ' + dataType + ', fileID: ' + (res.result.fileID || 'N/A'));
      if (res.result.fileID) {
        wx.setStorageSync('fileID_' + dataType, res.result.fileID);
      }
      return {
        success: true,
        fileID: res.result.fileID
      };
    }
    
    logger.warn('cloudStorage', '云函数写入失败: ' + (res.result && res.result.errMsg ? res.result.errMsg : '未知错误'));
    return { success: false, errMsg: res.result && res.result.errMsg };
  } catch (e) {
    logger.warn('cloudStorage', '云函数写入异常: ' + (e.errMsg || e.message || e));
    return { success: false, errMsg: e.errMsg || e.message || e };
  }
};

const createBackupByCloudFunction = async function (backupData) {
  try {
    logger.info('cloudStorage', '尝试通过云函数创建独立备份文件');

    const res = await wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'createBackupData',
        data: backupData
      }
    });

    if (res.result && res.result.success && Array.isArray(res.result.files) && res.result.files.length === getBackupItems(backupData).length) {
      logger.info('cloudStorage', '云函数创建备份成功: ' + ((res.result.files && res.result.files.length) || 0) + ' 个文件');
      return {
        success: true,
        backupPath: res.result.backupPath,
        files: res.result.files || []
      };
    }

    if (res.result && res.result.success) {
      logger.warn('cloudStorage', '云函数备份返回格式不是独立文件列表，可能未部署最新版云函数');
      return { success: false, errMsg: '云函数版本过旧，请重新部署' };
    }

    logger.warn('cloudStorage', '云函数创建备份失败: ' + (res.result && res.result.errMsg ? res.result.errMsg : '未知错误'));
    return { success: false, errMsg: res.result && res.result.errMsg };
  } catch (e) {
    logger.warn('cloudStorage', '云函数创建备份异常: ' + (e.errMsg || e.message || e));
    return { success: false, errMsg: e.errMsg || e.message || e };
  }
};

// 测试云存储是否可用
const testCloudStorage = async function () {
  try {
    logger.info('cloudStorage', '开始测试云存储');
    
    const testPath = 'test/' + Date.now() + '.json';
    const testData = JSON.stringify({ test: true, time: new Date().toISOString() });
    
    const fs = wx.getFileSystemManager();
    const tempFilePath = wx.env.USER_DATA_PATH + '/test_' + Date.now() + '.json';
    fs.writeFileSync(tempFilePath, testData, 'utf8');
    
    logger.info('cloudStorage', '临时文件已创建: ' + tempFilePath);
    
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: testPath,
        filePath: tempFilePath
      });
      
      logger.info('cloudStorage', '上传测试成功', uploadRes);
      
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
      
      return {
        success: true,
        message: '云存储上传功能正常',
        fileID: uploadRes.fileID
      };
    } catch (uploadErr) {
      logger.error('cloudStorage', '上传测试失败', uploadErr);
      
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
      
      return {
        success: false,
        message: '上传失败: ' + (uploadErr.errMsg || uploadErr.message),
        error: uploadErr
      };
    }
  } catch (e) {
    logger.error('cloudStorage', '云存储测试异常', e);
    return {
      success: false,
      message: '测试异常: ' + (e.message || e),
      error: e
    };
  }
};

const createBackupInCloud = async function (backupData) {
  try {
    const timestamp = formatBackupTimestamp(new Date());
    const backupPath = getBackupBasePath(timestamp);
    if (!backupPath) {
      const openid = wx.getStorageSync('openid');
      logger.error('cloudStorage', '无法获取用户备份路径', { openid: openid });

      wx.showModal({
        title: '备份失败',
        content: '无法获取用户信息 (openid: ' + (openid || 'null') + ')，请重新打开小程序',
        showCancel: false
      });

      return { success: false, errMsg: '无法获取用户信息' };
    }

    logger.info('cloudStorage', '创建备份目录: ' + backupPath);

    const functionResult = await createBackupByCloudFunction(backupData);
    if (functionResult.success) {
      return functionResult;
    }

    const backupItems = getBackupItems(backupData);
    const fs = wx.getFileSystemManager();
    const uploadedFiles = [];

    for (let i = 0; i < backupItems.length; i++) {
      const item = backupItems[i];
      const cloudPath = getUserBackupPath(timestamp, item.dataType);
      const jsonData = JSON.stringify(item.data, null, 2);
      const tempFilePath = wx.env.USER_DATA_PATH + '/backup_' + item.dataType + '_' + Date.now() + '.json';

      logger.info('cloudStorage', '创建备份文件: ' + cloudPath + ', 数据长度: ' + jsonData.length + ' 字符');
      fs.writeFileSync(tempFilePath, jsonData, 'utf8');

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });

      uploadedFiles.push({
        dataType: item.dataType,
        fileID: uploadRes.fileID,
        cloudPath: cloudPath
      });

      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }

    logger.info('cloudStorage', '备份文件创建成功: ' + uploadedFiles.length + ' 个文件');

    return {
      success: true,
      backupPath: backupPath,
      files: uploadedFiles
    };
  } catch (e) {
    logger.error('cloudStorage', '创建备份文件失败', e);

    return {
      success: false,
      errMsg: e.errMsg || e.message || e
    };
  }
};

// 从云存储读取数据
const readDataFromCloud = async function (dataType) {
  try {
    const cloudPath = getUserDataPath(dataType);
    if (!cloudPath) {
      logger.warn('cloudStorage', '无法获取用户数据路径');
      return [];
    }
    
    logger.info('cloudStorage', '尝试读取文件: ' + cloudPath);

    const functionData = await readDataByCloudFunction(dataType);
    if (!isEmptyCloudData(functionData)) {
      return functionData;
    }
    
    const fileIDCandidates = await getFileIDCandidates(dataType, cloudPath);
    logger.info('cloudStorage', '候选FileID数量: ' + fileIDCandidates.length);
    
    let lastErr = null;
    let emptyData = null;
    for (let i = 0; i < fileIDCandidates.length; i++) {
      const fileID = fileIDCandidates[i];
      try {
        const data = await downloadJSONFile(fileID, dataType);
        if (isEmptyCloudData(data) && i < fileIDCandidates.length - 1) {
          emptyData = data;
          logger.warn('cloudStorage', '候选FileID读取为空，继续尝试下一个: ' + fileID);
          continue;
        }
        
        wx.setStorageSync('fileID_' + dataType, fileID);
        return data;
      } catch (downloadErr) {
        lastErr = downloadErr;
        logger.warn('cloudStorage', '候选FileID读取失败: ' + fileID + ' | ' + (downloadErr.errMsg || downloadErr.message || downloadErr));
      }
    }
    
    if (lastErr) {
      logger.error('cloudStorage', '所有候选FileID读取失败: ' + (lastErr.errMsg || lastErr.message || lastErr));
    }
    
    return emptyData || [];
  } catch (e) {
    const errMsg = e.errMsg || e.message || JSON.stringify(e);
    logger.error('cloudStorage', '读取文件异常: ' + errMsg);
    
    // 如果是文件不存在的错误，返回空数组
    if (errMsg.includes('file not exist') || errMsg.includes('不存在')) {
      logger.info('cloudStorage', '文件不存在，返回空数组');
      return [];
    }
    
    return [];
  }
};

// 写入数据到云存储
const writeDataToCloud = async function (dataType, data) {
  try {
    const cloudPath = getUserDataPath(dataType);
    if (!cloudPath) {
      const openid = wx.getStorageSync('openid');
      logger.error('cloudStorage', '无法获取用户数据路径', { openid: openid });
      
      wx.showModal({
        title: '错误',
        content: '无法获取用户信息 (openid: ' + (openid || 'null') + ')，请重新打开小程序',
        showCancel: false
      });
      
      return { success: false, errMsg: '无法获取用户信息' };
    }
    
    logger.info('cloudStorage', '写入文件: ' + cloudPath);

    const functionResult = await writeDataByCloudFunction(dataType, data);
    if (functionResult.success) {
      return functionResult;
    }

    logger.error('cloudStorage', '云函数写入失败，已停止前端直传以避免正式版云存储权限错误: ' + (functionResult.errMsg || '未知错误'));
    return {
      success: false,
      errMsg: functionResult.errMsg || '云函数写入失败，请检查 quickstartFunctions 是否已部署到当前环境'
    };
  } catch (e) {
    logger.error('cloudStorage', '写入文件失败', e);
    
    wx.showModal({
      title: '写入失败',
      content: '错误: ' + (e.errMsg || e.message),
      showCancel: false
    });
    
    return { success: false, errMsg: e.errMsg || e.message };
  }
};

module.exports = {
  testCloudStorage,
  readDataFromCloud,
  writeDataToCloud,
  createBackupInCloud
};
