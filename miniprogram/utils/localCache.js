const logger = require('./logger.js');

const CACHE_PREFIX = 'accountbook_cache';

const getOpenId = function () {
  try {
    return wx.getStorageSync('openid');
  } catch (e) {
    logger.warn('localCache', '读取 openid 失败: ' + (e.message || e));
    return '';
  }
};

const sanitizePathPart = function (value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
};

const getCacheFilePath = function (dataType) {
  const openid = getOpenId();
  if (!openid || !wx.env || !wx.env.USER_DATA_PATH) {
    return null;
  }

  return wx.env.USER_DATA_PATH + '/' + CACHE_PREFIX + '_' + sanitizePathPart(openid) + '_' + sanitizePathPart(dataType) + '.json';
};

const getFileSystemManager = function () {
  try {
    return wx.getFileSystemManager();
  } catch (e) {
    logger.warn('localCache', '获取文件系统失败: ' + (e.message || e));
    return null;
  }
};

const readDataCache = function (dataType) {
  const cacheFilePath = getCacheFilePath(dataType);
  const fs = getFileSystemManager();
  if (!cacheFilePath || !fs) {
    return null;
  }

  try {
    const content = fs.readFileSync(cacheFilePath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'data')) {
      return parsed.data;
    }
    return parsed;
  } catch (e) {
    logger.info('localCache', '读取本地缓存失败或不存在: ' + dataType);
    return null;
  }
};

const writeDataCache = function (dataType, data) {
  const cacheFilePath = getCacheFilePath(dataType);
  const fs = getFileSystemManager();
  if (!cacheFilePath || !fs) {
    return false;
  }

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify({
      data,
      meta: {
        dataType,
        openid: getOpenId(),
        updatedAt: new Date().toISOString()
      }
    }), 'utf8');
    logger.info('localCache', '本地缓存写入成功: ' + dataType);
    return true;
  } catch (e) {
    logger.warn('localCache', '写入本地缓存失败: ' + dataType + ', ' + (e.message || e));
    return false;
  }
};

const clearDataCache = function (dataType) {
  const cacheFilePath = getCacheFilePath(dataType);
  const fs = getFileSystemManager();
  if (!cacheFilePath || !fs) {
    return false;
  }

  try {
    fs.unlinkSync(cacheFilePath);
    return true;
  } catch (e) {
    return false;
  }
};

module.exports = {
  readDataCache,
  writeDataCache,
  clearDataCache
};
