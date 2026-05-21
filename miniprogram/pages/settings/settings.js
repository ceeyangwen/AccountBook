const app = getApp();
const cloudStorage = require('../../utils/cloudStorage.js');
const logger = require('../../utils/logger.js');
const accountVisibility = require('../../utils/accountVisibility.js');

const getCategoryCount = function (categories) {
  if (!categories) return 0;
  if (Array.isArray(categories)) return categories.length;
  if (typeof categories !== 'object') return 0;
  
  const expenseCount = categories.expense && Array.isArray(categories.expense.groups)
    ? categories.expense.groups.length
    : 0;
  const incomeCount = categories.income && Array.isArray(categories.income.groups)
    ? categories.income.groups.length
    : 0;
  
  return expenseCount + incomeCount || Object.keys(categories).length;
};

Page({
  data: {
    showHiddenAccounts: false
  },

  onLoad: function () {
    this.loadPrivacySettings();
  },

  onShow: function () {
    this.loadPrivacySettings();
  },

  loadPrivacySettings: function () {
    this.setData({
      showHiddenAccounts: accountVisibility.getShowHiddenAccounts()
    });
  },

  onShowHiddenAccountsChange: function (e) {
    const showHiddenAccounts = e.detail.value === true;
    accountVisibility.setShowHiddenAccounts(showHiddenAccounts);
    this.setData({
      showHiddenAccounts
    });
    wx.showToast({
      title: showHiddenAccounts ? '已显示隐藏账号' : '已隐藏敏感账号',
      icon: 'none'
    });
  },

  goToCategoryManage: function () {
    wx.navigateTo({
      url: '/pages/category-manage/category-manage'
    });
  },

  exportData: async function () {
    const records = app.globalData.records || [];
    const accounts = app.globalData.accounts || [];
    const categories = app.globalData.categories;
    
    if (records.length === 0 && accounts.length === 0) {
      wx.showToast({
        title: '暂无数据可导出',
        icon: 'none'
      });
      return;
    }

    const backupData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      records: records,
      accounts: accounts,
      categories: categories
    };

    wx.showLoading({ title: '备份中...' });

    try {
      const result = await cloudStorage.createBackupInCloud(backupData);

      wx.hideLoading();

      if (result.success) {
        wx.showModal({
          title: '备份成功',
          content: `已在云存储生成 3 个独立备份文件。\n\n目录: ${result.backupPath || 'N/A'}\n\n包含 accounts.json、records.json、categories.json，可在云开发控制台按需下载或复制恢复。`,
          showCancel: false,
          confirmText: '好的'
        });
      } else {
        wx.showModal({
          title: '备份失败',
          content: '无法创建云端备份: ' + (result.errMsg || '未知错误'),
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showModal({
        title: '备份失败',
        content: '发生错误: ' + (e.message || e),
        showCancel: false
      });
    }
  },

  importData: function () {
    wx.showModal({
      title: '从云端导入',
      content: '此操作将从云存储读取数据并覆盖本地数据。\n\n请确保已通过云开发控制台上传了正确的数据文件。',
      confirmText: '确认导入',
      confirmColor: '#10B981',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doImportData();
        }
      }
    });
  },

  importFromClipboard: function () {
    wx.showModal({
      title: '粘贴数据导入',
      content: '请先将导出的JSON数据复制到剪贴板，然后点击确认。\n\n注意：此操作将覆盖现有数据！',
      confirmText: '确认导入',
      confirmColor: '#10B981',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doImportFromClipboard();
        }
      }
    });
  },

  doImportFromClipboard: async function () {
    wx.showLoading({ title: '导入中...' });
    
    try {
      const clipboardData = await wx.getClipboardData();
      const dataStr = clipboardData.data;
      
      if (!dataStr || dataStr.trim() === '') {
        wx.hideLoading();
        wx.showModal({
          title: '导入失败',
          content: '剪贴板为空，请先复制数据',
          showCancel: false
        });
        return;
      }
      
      let importedData;
      try {
        importedData = JSON.parse(dataStr);
      } catch (e) {
        wx.hideLoading();
        wx.showModal({
          title: '导入失败',
          content: 'JSON格式错误，请检查数据格式',
          showCancel: false
        });
        return;
      }
      
      let successCount = 0;
      let recordCount = 0;
      let accountCount = 0;
      let categoryCount = 0;
      
      // 导入记账记录
      if (importedData.records && Array.isArray(importedData.records)) {
        app.globalData.records = importedData.records;
        await cloudStorage.writeDataToCloud('records', importedData.records);
        recordCount = importedData.records.length;
        successCount++;
      }
      
      // 导入账户
      if (importedData.accounts && Array.isArray(importedData.accounts)) {
        app.globalData.accounts = importedData.accounts;
        await cloudStorage.writeDataToCloud('accounts', importedData.accounts);
        accountCount = importedData.accounts.length;
        successCount++;
      }
      
      // 导入分类
      if (importedData.categories) {
        app.globalData.categories = importedData.categories;
        await cloudStorage.writeDataToCloud('categories', importedData.categories);
        categoryCount = getCategoryCount(importedData.categories);
        successCount++;
      }
      
      wx.hideLoading();
      
      wx.showModal({
        title: '导入成功',
        content: `成功导入 ${successCount}/3 类数据\n\n• 记账记录: ${recordCount} 条\n• 账户: ${accountCount} 个\n• 分类: ${categoryCount} 个`,
        showCancel: false,
        confirmText: '好的'
      });
    } catch (e) {
      wx.hideLoading();
      wx.showModal({
        title: '导入失败',
        content: '发生错误: ' + (e.message || e),
        showCancel: false
      });
    }
  },

  doImportData: async function () {
    wx.showLoading({ title: '导入中...' });
    
    try {
      const records = await cloudStorage.readDataFromCloud('records');
      const accounts = await cloudStorage.readDataFromCloud('accounts');
      const categories = await cloudStorage.readDataFromCloud('categories');
      
      let successCount = 0;
      let totalCount = 0;
      
      // 处理记账记录
      totalCount++;
      if (records && records.length > 0) {
        app.globalData.records = records;
        await cloudStorage.writeDataToCloud('records', records);
        successCount++;
        logger.info('settings', `导入记账记录: ${records.length} 条`);
      } else {
        logger.warn('settings', '记账记录为空或读取失败');
      }
      
      // 处理账户
      totalCount++;
      if (accounts && accounts.length > 0) {
        app.globalData.accounts = accounts;
        await cloudStorage.writeDataToCloud('accounts', accounts);
        successCount++;
        logger.info('settings', `导入账户: ${accounts.length} 个`);
      } else {
        logger.warn('settings', '账户为空或读取失败');
      }
      
      // 处理分类（分类可能是对象格式，不是数组）
      totalCount++;
      if (categories) {
        // 分类可能是数组或对象，两种格式都支持
        if (Array.isArray(categories) && categories.length > 0) {
          app.globalData.categories = categories;
          await cloudStorage.writeDataToCloud('categories', categories);
          successCount++;
          logger.info('settings', `导入分类: ${categories.length} 个`);
        } else if (typeof categories === 'object' && Object.keys(categories).length > 0) {
          // 如果是对象格式，转换为数组或直接使用
          app.globalData.categories = categories;
          await cloudStorage.writeDataToCloud('categories', categories);
          successCount++;
          const catCount = getCategoryCount(categories);
          logger.info('settings', `导入分类(对象格式): ${catCount} 个`);
        } else {
          logger.warn('settings', '分类数据为空');
        }
      } else {
        logger.warn('settings', '分类为空或读取失败');
      }
      
      wx.hideLoading();
      
      // 计算各类数据的实际数量
      const recordCount = records && records.length ? records.length : 0;
      const accountCount = accounts && accounts.length ? accounts.length : 0;
      const categoryCount = getCategoryCount(categories);
      
      wx.showModal({
        title: '导入完成',
        content: `导入结果: ${successCount}/${totalCount} 类数据\n\n• 记账记录: ${recordCount} 条\n• 账户: ${accountCount} 个\n• 分类: ${categoryCount} 个`,
        showCancel: false,
        confirmText: '好的'
      });
    } catch (e) {
      wx.hideLoading();
      logger.error('settings', '导入数据失败', e);
      wx.showModal({
        title: '导入失败',
        content: '发生错误: ' + (e.message || e) + '\n\n请检查：\n1. 云存储中是否有数据文件\n2. 云存储权限是否配置正确\n3. 文件内容是否为有效JSON格式',
        showCancel: false
      });
    }
  },

  testCloudStorage: async function () {
    wx.showLoading({ title: '测试云存储中...' });
    
    try {
      const result = await cloudStorage.testCloudStorage();
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showModal({
          title: '✅ 云存储测试成功',
          content: result.message + '\n\nFileID: ' + (result.fileID || 'N/A'),
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '❌ 云存储测试失败',
          content: result.message + '\n\n请检查：\n1. 是否已开通云开发\n2. 云存储权限是否配置正确\n3. 云函数是否已部署',
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showModal({
        title: '测试异常',
        content: '发生错误: ' + (e.message || e),
        showCancel: false
      });
    }
  },

  debugData: async function () {
    wx.showLoading({ title: '读取数据中...' });
    
    try {
      const records = await cloudStorage.readDataFromCloud('records');
      const accounts = await cloudStorage.readDataFromCloud('accounts');
      const categories = await cloudStorage.readDataFromCloud('categories');
      
      wx.hideLoading();
      
      const debugStr = JSON.stringify({
        openid: wx.getStorageSync('openid'),
        globalData: {
          records: app.globalData.records || [],
          accounts: app.globalData.accounts || [],
          categories: app.globalData.categories
        },
        cloudData: {
          records: records,
          accounts: accounts,
          categories: categories
        }
      }, null, 2);
      
      console.log('调试数据:', debugStr);
      
      wx.setClipboardData({
        data: debugStr,
        success: () => {
          wx.showModal({
            title: '调试数据已复制',
            content: '数据已复制到剪贴板，可发给开发者分析问题',
            showCancel: false
          });
        }
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: '读取失败',
        icon: 'none'
      });
    }
  },

  showOpenid: function () {
    const openid = wx.getStorageSync('openid');
    wx.showModal({
      title: '当前用户信息',
      content: `OpenID: ${openid || '未获取'}\n\n请确认这个OpenID是否与云存储中文件目录的OpenID一致`,
      showCancel: false,
      confirmText: '好的'
    });
  },

  exportLogs: function () {
    const logsStr = logger.exportLogs();
    const logs = logger.getLogs();
    
    if (logs.length === 0) {
      wx.showToast({
        title: '暂无日志',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: logsStr,
      success: () => {
        wx.showModal({
          title: '日志已复制',
          content: `共 ${logs.length} 条日志已复制到剪贴板，可发给开发者分析问题`,
          showCancel: false
        });
      }
    });
  },

  clearLogs: function () {
    wx.showModal({
      title: '确认清空',
      content: '此操作将删除所有本地日志，确定继续吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          const success = logger.clearLogs();
          if (success) {
            wx.showToast({
              title: '清空成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '清空失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  refreshData: function () {
    wx.showLoading({ title: '刷新中...' });
    
    app.loadRecords(() => {
      app.loadAccounts(() => {
        app.loadCategories(() => {
          wx.hideLoading();
          wx.showToast({
            title: '刷新成功',
            icon: 'success'
          });
        }, true);
      }, true);
    }, true);
  },

  clearData: function () {
    wx.showModal({
      title: '确认清空',
      content: '此操作将删除所有云端数据，无法恢复，确定继续吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '清空中...'
          });
          
          app.clearAllData((success) => {
            wx.hideLoading();
            if (success) {
              wx.showToast({
                title: '清空成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: '清空失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
});
