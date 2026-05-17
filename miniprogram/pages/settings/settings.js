const app = getApp();
const cloudStorage = require('../../utils/cloudStorage.js');
const logger = require('../../utils/logger.js');

Page({
  data: {},

  onLoad: function () {},

  goToCategoryManage: function () {
    wx.navigateTo({
      url: '/pages/category-manage/category-manage'
    });
  },

  exportData: function () {
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

    const dataStr = JSON.stringify({
      version: '1.0',
      exportTime: new Date().toISOString(),
      records: records,
      accounts: accounts,
      categories: categories
    }, null, 2);

    wx.setClipboardData({
      data: dataStr,
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: '数据已复制到剪贴板，可粘贴保存到备忘录或其他地方作为备份',
          showCancel: false,
          confirmText: '好的'
        });
      }
    });
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
      });
    });
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
