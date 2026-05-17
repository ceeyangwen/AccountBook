const logger = require('./logger.js');

// 获取用户数据文件路径
const getUserDataPath = function (dataType) {
  const openid = wx.getStorageSync('openid');
  if (!openid) {
    logger.warn('cloudStorage', 'openid不存在');
    return null;
  }
  return 'users/' + openid + '/' + dataType + '.json';
};

// 获取存储的fileID
const getStoredFileID = function (dataType) {
  return wx.getStorageSync('fileID_' + dataType);
};

// 存储fileID
const storeFileID = function (dataType, fileID) {
  wx.setStorageSync('fileID_' + dataType, fileID);
};

// 测试云存储是否可用
const testCloudStorage = async function () {
  try {
    logger.info('cloudStorage', '开始测试云存储');
    
    // 生成测试文件名
    const testPath = 'test/' + Date.now() + '.json';
    const testData = JSON.stringify({ test: true, time: new Date().toISOString() });
    
    // 创建临时文件
    const fs = wx.getFileSystemManager();
    const tempFilePath = wx.env.USER_DATA_PATH + '/test_' + Date.now() + '.json';
    fs.writeFileSync(tempFilePath, testData, 'utf8');
    
    logger.info('cloudStorage', '临时文件已创建: ' + tempFilePath);
    
    // 尝试上传
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: testPath,
        filePath: tempFilePath
      });
      
      logger.info('cloudStorage', '上传测试成功', uploadRes);
      
      // 删除临时文件
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
      
      // 删除临时文件
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
    const filePath = getUserDataPath(dataType);
    if (!filePath) {
      logger.warn('cloudStorage', '无法获取用户数据路径');
      return [];
    }
    
    logger.info('cloudStorage', '尝试读取文件: ' + filePath);
    
    // 获取存储的fileID，如果没有则使用cloudPath
    const storedFileID = getStoredFileID(dataType);
    let fileID = storedFileID || filePath;
    logger.info('cloudStorage', '使用fileID: ' + fileID);
    
    // 使用云存储下载
    const downloadRes = await wx.cloud.downloadFile({
      fileID: fileID
    });
    
    logger.info('cloudStorage', '下载结果: ' + JSON.stringify(downloadRes));
    
    if (downloadRes.tempFilePath) {
      // 读取文件内容
      const fs = wx.getFileSystemManager();
      const fileContent = fs.readFileSync(downloadRes.tempFilePath, 'utf8');
      logger.info('cloudStorage', '读取到的内容: ' + fileContent);
      
      try {
        const data = JSON.parse(fileContent);
        logger.info('cloudStorage', '文件读取成功: ' + dataType + ', 数据数量: ' + (data ? data.length : 0));
        
        // 如果使用cloudPath成功读取，保存fileID供下次使用
        if (!storedFileID && downloadRes.fileID) {
          storeFileID(dataType, downloadRes.fileID);
          logger.info('cloudStorage', '保存fileID以供下次使用: ' + downloadRes.fileID);
        }
        
        return data;
      } catch (parseErr) {
        logger.error('cloudStorage', 'JSON解析失败', parseErr);
        return [];
      }
    } else {
      logger.warn('cloudStorage', '下载结果中没有tempFilePath');
      
      // 如果使用cloudPath失败，尝试使用存储的fileID重新下载（如果有）
      if (!storedFileID) {
        logger.info('cloudStorage', '没有存储的fileID，返回空数组');
        return [];
      }
      
      logger.info('cloudStorage', '尝试使用存储的fileID重新下载');
      try {
        const retryRes = await wx.cloud.downloadFile({
          fileID: storedFileID
        });
        
        if (retryRes.tempFilePath) {
          const fs = wx.getFileSystemManager();
          const fileContent = fs.readFileSync(retryRes.tempFilePath, 'utf8');
          logger.info('cloudStorage', '重试读取到的内容: ' + fileContent);
          
          try {
            const data = JSON.parse(fileContent);
            logger.info('cloudStorage', '重试文件读取成功: ' + dataType + ', 数据数量: ' + (data ? data.length : 0));
            return data;
          } catch (parseErr) {
            logger.error('cloudStorage', '重试JSON解析失败', parseErr);
            return [];
          }
        } else {
          logger.warn('cloudStorage', '重试下载结果中也没有tempFilePath');
          return [];
        }
      } catch (retryErr) {
        logger.warn('cloudStorage', '重试读取文件异常: ' + (retryErr.errMsg || retryErr.message));
        return [];
      }
    }
  } catch (e) {
    logger.warn('cloudStorage', '读取文件异常(文件可能不存在): ' + (e.errMsg || e.message));
    
    // 如果是文件不存在的错误，尝试使用存储的fileID重新下载
    const storedFileID = getStoredFileID(dataType);
    if (storedFileID) {
      logger.info('cloudStorage', '尝试使用存储的fileID重新下载');
      try {
        const retryRes = await wx.cloud.downloadFile({
          fileID: storedFileID
        });
        
        if (retryRes.tempFilePath) {
          const fs = wx.getFileSystemManager();
          const fileContent = fs.readFileSync(retryRes.tempFilePath, 'utf8');
          logger.info('cloudStorage', '重试读取到的内容: ' + fileContent);
          
          try {
            const data = JSON.parse(fileContent);
            logger.info('cloudStorage', '重试文件读取成功: ' + dataType + ', 数据数量: ' + (data ? data.length : 0));
            return data;
          } catch (parseErr) {
            logger.error('cloudStorage', '重试JSON解析失败', parseErr);
            return [];
          }
        }
      } catch (retryErr) {
        logger.warn('cloudStorage', '重试读取文件异常: ' + (retryErr.errMsg || retryErr.message));
      }
    }
    
    return [];
  }
};

// 写入数据到云存储
const writeDataToCloud = async function (dataType, data) {
  try {
    const filePath = getUserDataPath(dataType);
    if (!filePath) {
      const openid = wx.getStorageSync('openid');
      logger.error('cloudStorage', '无法获取用户数据路径', { openid: openid });
      
      wx.showModal({
        title: '错误',
        content: '无法获取用户信息 (openid: ' + (openid || 'null') + ')，请重新打开小程序',
        showCancel: false
      });
      
      return { success: false, errMsg: '无法获取用户信息' };
    }
    
    logger.info('cloudStorage', '写入文件: ' + filePath);
    
    const jsonData = JSON.stringify(data, null, 2);
    logger.info('cloudStorage', '要写入的数据: ' + jsonData);
    
    // 创建临时文件
    const fs = wx.getFileSystemManager();
    const tempFilePath = wx.env.USER_DATA_PATH + '/temp_' + Date.now() + '.json';
    fs.writeFileSync(tempFilePath, jsonData, 'utf8');
    
    logger.info('cloudStorage', '临时文件已创建: ' + tempFilePath);
    
    // 上传到云存储
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: filePath,
      filePath: tempFilePath
    });
    
    logger.info('cloudStorage', '文件写入成功: ' + filePath + ', fileID: ' + uploadRes.fileID);
    
    // 保存fileID到本地存储，用于后续读取
    storeFileID(dataType, uploadRes.fileID);
    
    // 删除临时文件
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      // 忽略删除临时文件的错误
    }
    
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
