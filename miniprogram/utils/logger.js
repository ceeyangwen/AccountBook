const app = getApp();

const LOG_STORAGE_KEY = 'app_logs';
const MAX_LOGS = 200;

const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : '0' + n;
};

const getLogs = () => {
  try {
    return wx.getStorageSync(LOG_STORAGE_KEY) || [];
  } catch (e) {
    return [];
  }
};

const saveLog = (logEntry) => {
  try {
    let logs = getLogs();
    logs.unshift(logEntry);
    
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(0, MAX_LOGS);
    }
    
    wx.setStorageSync(LOG_STORAGE_KEY, logs);
  } catch (e) {
    console.error('保存日志失败:', e);
  }
};

const logger = {
  info: function(tag, message, data = null) {
    const timestamp = formatTime(new Date());
    const logData = data ? ` | ${JSON.stringify(data)}` : '';
    const logStr = `[INFO][${timestamp}][${tag}] ${message}${logData}`;
    console.log(logStr);
    
    saveLog({
      type: 'INFO',
      timestamp: timestamp,
      tag: tag,
      message: message,
      data: data
    });
  },

  error: function(tag, message, error = null) {
    const timestamp = formatTime(new Date());
    let logError = '';
    let errorData = error;
    
    if (error) {
      if (typeof error === 'string') {
        logError = ` | ${error}`;
      } else if (error instanceof Error) {
        logError = ` | ${error.message} | Stack: ${error.stack}`;
        errorData = {
          message: error.message,
          stack: error.stack
        };
      } else {
        logError = ` | ${JSON.stringify(error)}`;
      }
    }
    
    const logStr = `[ERROR][${timestamp}][${tag}] ${message}${logError}`;
    console.error(logStr);
    
    saveLog({
      type: 'ERROR',
      timestamp: timestamp,
      tag: tag,
      message: message,
      data: errorData
    });
  },

  warn: function(tag, message, data = null) {
    const timestamp = formatTime(new Date());
    const logData = data ? ` | ${JSON.stringify(data)}` : '';
    const logStr = `[WARN][${timestamp}][${tag}] ${message}${logData}`;
    console.warn(logStr);
    
    saveLog({
      type: 'WARN',
      timestamp: timestamp,
      tag: tag,
      message: message,
      data: data
    });
  },

  debug: function(tag, message, data = null) {
    const timestamp = formatTime(new Date());
    const logData = data ? ` | ${JSON.stringify(data)}` : '';
    const logStr = `[DEBUG][${timestamp}][${tag}] ${message}${logData}`;
    console.log(logStr);
    
    saveLog({
      type: 'DEBUG',
      timestamp: timestamp,
      tag: tag,
      message: message,
      data: data
    });
  },

  cloudCall: async function(tag, name, data, successCallback, failCallback) {
    this.info(tag, `调用云函数: ${name}`, data);
    
    try {
      const res = await wx.cloud.callFunction({
        name: name,
        data: data
      });
      
      if (res.result && res.result.success) {
        this.info(tag, `云函数调用成功: ${name}`);
        if (successCallback) successCallback(res.result);
      } else {
        const errMsg = res.result?.errMsg || '未知错误';
        this.error(tag, `云函数调用失败: ${name}`, errMsg);
        if (failCallback) failCallback(errMsg);
      }
      
      return res;
    } catch (error) {
      this.error(tag, `云函数调用异常: ${name}`, error);
      if (failCallback) failCallback(error.message || error);
      return { success: false, error: error };
    }
  },

  getLogs: function() {
    return getLogs();
  },

  exportLogs: function(limit = 100) {
    const logs = getLogs();
    const recentLogs = logs.slice(0, limit);
    return JSON.stringify({
      version: '1.0',
      exportTime: formatTime(new Date()),
      logs: recentLogs
    }, null, 2);
  },

  clearLogs: function() {
    try {
      wx.removeStorageSync(LOG_STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('清空日志失败:', e);
      return false;
    }
  }
};

module.exports = logger;
module.exports.logger = logger;