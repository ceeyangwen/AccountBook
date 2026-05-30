const app = getApp();
const logger = require('../../utils/logger.js');

Page({
  data: {
    account: null,
    accountType: '',
    records: [],
    groupedRecords: [],
    summary: {
      totalExpense: 0,
      totalIncome: 0,
      totalTransferOut: 0,
      totalTransferIn: 0
    }
  },

  onLoad: function (options) {
    logger.info('account-detail', '页面加载', options);
    
    const accountId = options.id;
    if (accountId) {
      this.loadAccountDetail(accountId);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  loadAccountDetail: function(accountId) {
    wx.showLoading({
      title: '加载中...'
    });

    // 获取账户信息
    const accounts = app.globalData.accounts || [];
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      wx.hideLoading();
      wx.showToast({
        title: '账户不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 获取账户类型
    const accountCategories = app.globalData.accountCategories || [];
    const categoryInfo = accountCategories.find(cat => cat.name === account.category);
    const accountType = categoryInfo ? categoryInfo.type : 'asset';
    
    // 根据账户类型设置余额标签
    const balanceLabel = (accountType === 'credit' || accountType === 'debt') ? '当前负债' : '当前余额';

    // 加载该账户的所有记录
    const records = app.globalData.records || [];
    const accountRecords = records.filter(record => {
      // 普通支出/收入记录
      if (record.accountId === accountId) {
        return true;
      }
      // 转账记录
      if (record.type === 'transfer') {
        return record.fromAccountId === accountId || record.toAccountId === accountId;
      }
      return false;
    }).map(record => {
      // 预处理记录信息
      const processedRecord = { ...record };
      
      // 计算记录类型
      if (record.type === 'transfer') {
        if (record.fromAccountId === accountId) {
          processedRecord.recordType = 'transfer-out';
          processedRecord.recordIcon = '↗️';
        } else {
          processedRecord.recordType = 'transfer-in';
          processedRecord.recordIcon = '↙️';
        }
      } else {
        processedRecord.recordType = record.type;
        const category = this.getCategory(record.categoryId, record.type);
        processedRecord.recordIcon = category ? category.icon : '📝';
      }
      
      return processedRecord;
    });

    // 按日期分组
    const groupedRecords = this.groupRecordsByDate(accountRecords);

    // 计算统计信息
    const summary = this.calculateSummary(accountRecords, accountId);

    this.setData({
      account,
      accountType,
      balanceLabel,
      records: accountRecords,
      groupedRecords,
      summary
    });

    wx.hideLoading();
    logger.info('account-detail', '加载完成', {
      accountName: account.name,
      recordCount: accountRecords.length,
      summary
    });
  },

  getCategory: function (categoryId, type) {
    const categoriesData = app.globalData.categories[type];
    let category = null;
    
    if (categoriesData && categoriesData.groups) {
      for (const group of categoriesData.groups) {
        const found = group.children && group.children.find(c => c.id === categoryId);
        if (found) {
          category = found;
          break;
        }
      }
      
      if (!category) {
        if (type === 'expense') {
          const otherGroup = categoriesData.groups.find(g => g.id === 'expense-group-11');
          category = otherGroup && otherGroup.children && otherGroup.children.find(c => c.id === 'expense-11-2');
          if (!category) {
            category = categoriesData.groups[categoriesData.groups.length - 1]?.children?.[0];
          }
        } else {
          const salaryGroup = categoriesData.groups.find(g => g.id === 'income-group-1');
          category = salaryGroup && salaryGroup.children && salaryGroup.children.find(c => c.id === 'income-1-1');
          if (!category) {
            category = categoriesData.groups[0]?.children?.[0];
          }
        }
      }
    }
    
    if (!category) {
      category = type === 'expense' 
        ? { id: 'expense-11-2', name: '其他支出', icon: '💸', color: '#C3D3E7' }
        : { id: 'income-1-1', name: '工资收入', icon: '💰', color: '#4ECDC4' };
    }
    
    return category;
  },

  groupRecordsByDate: function(records) {
    const dateMap = {};
    
    records.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
      const dateKey = this.formatDateKey(new Date(record.date));
      
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: new Date(record.date),
          dateText: this.formatDateText(new Date(record.date)),
          records: []
        };
      }
      
      dateMap[dateKey].records.push(record);
    });

    return Object.values(dateMap);
  },

  formatDateKey: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateText: function(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  },

  calculateSummary: function(records, accountId) {
    let totalExpense = 0;
    let totalIncome = 0;
    let totalTransferOut = 0;
    let totalTransferIn = 0;

    records.forEach(record => {
      const amount = parseFloat(record.amount) || 0;
      
      if (record.type === 'expense') {
        if (record.accountId === accountId) {
          totalExpense += amount;
        }
      } else if (record.type === 'income') {
        if (record.accountId === accountId) {
          totalIncome += amount;
        }
      } else if (record.type === 'transfer') {
        if (record.fromAccountId === accountId) {
          totalTransferOut += amount;
        }
        if (record.toAccountId === accountId) {
          totalTransferIn += amount;
        }
      }
    });

    return {
      totalExpense: totalExpense.toFixed(2),
      totalIncome: totalIncome.toFixed(2),
      totalTransferOut: totalTransferOut.toFixed(2),
      totalTransferIn: totalTransferIn.toFixed(2)
    };
  },

  goToEditRecord: function(e) {
    const record = e.currentTarget.dataset.record;
    
    if (record.type === 'transfer') {
      wx.navigateTo({
        url: '/pages/transfer/transfer?recordId=' + record.id
      });
    } else {
      wx.navigateTo({
        url: '/pages/add-record/add-record?recordId=' + record.id
      });
    }
  },

  goToQuickRecord: function() {
    const account = this.data.account;
    if (!account || !account.id) return;

    wx.navigateTo({
      url: '/pages/add-record/add-record?accountId=' + encodeURIComponent(account.id)
    });
  },

  goToQuickTransfer: function() {
    const account = this.data.account;
    if (!account || !account.id) return;

    wx.navigateTo({
      url: '/pages/transfer/transfer?fromAccountId=' + encodeURIComponent(account.id)
    });
  },

  deleteRecord: function(e) {
    const record = e.currentTarget.dataset.record;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          });
          
          app.deleteRecord(record.id, function(success) {
            wx.hideLoading();
            
            if (success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              that.loadAccountDetail(that.data.account.id);
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
});
