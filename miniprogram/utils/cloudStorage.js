const logger = require('./logger.js');

// 云数据库集合名称
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
    logger.error('cloudStorage', '从数据库获取fileID失败', e);
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
    
    // 先查询是否已存在
    const existingRes = await db.collection(FILE_MAPPING_COLLECTION)
      .where({
        _openid: openid,
        dataType: dataType
      })
      .get();
    
    if (existingRes.data && existingRes.data.length > 0) {
      // 更新现有记录
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
      // 插入新记录
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
    logger.error('cloudStorage', '保存fileID到数据库失败', e);
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

// 从云存储读取数据
const readDataFromCloud = async function (dataType) {
  try {
    const cloudPath = getUserDataPath(dataType);
    if (!cloudPath) {
      logger.warn('cloudStorage', '无法获取用户数据路径');
      return [];
    }
    
    logger.info('cloudStorage', '尝试读取文件: ' + cloudPath);
    
    // 首先尝试从本地存储获取fileID
    let fileID = wx.getStorageSync('fileID_' + dataType);
    logger.info('cloudStorage', '本地存储的fileID: ' + fileID);
    
    // 如果本地没有，从云数据库获取
    if (!fileID) {
      logger.info('cloudStorage', '本地存储没有fileID，尝试从数据库获取');
      fileID = await getFileIDFromDB(dataType);
      if (fileID) {
        // 同步到本地存储
        wx.setStorageSync('fileID_' + dataType, fileID);
      }
    }
    
    if (!fileID) {
      logger.info('cloudStorage', '没有找到fileID，返回空数组');
      return [];
    }
    
    // 使用fileID下载文件
    logger.info('cloudStorage', '使用fileID下载: ' + fileID);
    const downloadRes = await wx.cloud.downloadFile({
      fileID: fileID
    });
    
    if (downloadRes.tempFilePath) {
      const fs = wx.getFileSystemManager();
      const fileContent = fs.readFileSync(downloadRes.tempFilePath, 'utf8');
      logger.info('cloudStorage', '文件读取成功: ' + fileContent);
      
      try {
        const data = JSON.parse(fileContent);
        logger.info('cloudStorage', '数据解析成功: ' + dataType + ', 数据数量: ' + (data ? data.length : 0));
        return data;
      } catch (parseErr) {
        logger.error('cloudStorage', 'JSON解析失败', parseErr);
        return [];
      }
    } else {
      logger.warn('cloudStorage', '下载结果中没有tempFilePath');
      return [];
    }
  } catch (e) {
    logger.error('cloudStorage', '读取文件异常: ' + (e.errMsg || e.message));
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
    
    const jsonData = JSON.stringify(data, null, 2);
    logger.info('cloudStorage', '要写入的数据: ' + jsonData);
    
    const fs = wx.getFileSystemManager();
    const tempFilePath = wx.env.USER_DATA_PATH + '/temp_' + Date.now() + '.json';
    fs.writeFileSync(tempFilePath, jsonData, 'utf8');
    
    logger.info('cloudStorage', '临时文件已创建: ' + tempFilePath);
    
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath
    });
    
    logger.info('cloudStorage', '文件写入成功: ' + cloudPath + ', fileID: ' + uploadRes.fileID);
    
    // 保存fileID到本地存储
    wx.setStorageSync('fileID_' + dataType, uploadRes.fileID);
    
    // 保存fileID到云数据库
    await saveFileIDToDB(dataType, uploadRes.fileID, cloudPath);
    
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {}
    
    return { success: true, fileID: uploadRes.fileID };
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
  writeDataToCloud
};
