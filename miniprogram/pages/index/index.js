const app = getApp();
const accountVisibility = require('../../utils/accountVisibility.js');
const iconResolver = require('../../utils/iconResolver.js');

const TRANSFER_BADGE = {
  label: '转',
  symbol: '↔',
  className: 'type-transfer',
  color: '#22D3EE',
  background: 'rgba(34, 211, 238, 0.16)',
  source: 'resolved'
};

Page({
  data: {
    currentMonth: '',
    monthlyExpense: '0.00',
    monthlyIncome: '0.00',
    balance: '0.00',
    monthlyExpenseAmountSizeClass: '',
    monthlyIncomeAmountSizeClass: '',
    balanceAmountSizeClass: '',
    groupedRecords: [],
    loading: true,
    showActionSheet: false,
    currentRecord: null
  },

  onLoad: function () {
    this.updateCurrentMonth();
  },

  onShow: function () {
    this.loadRecords();
  },

  updateCurrentMonth: function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.setData({
      currentMonth: `${year}年${month}月`
    });
  },

  loadRecords: function () {
    this.setData({ loading: true });
    
    app.loadRecords(() => {
      app.loadAccounts(() => {
        this.processRecords();
      });
    });
  },

  processRecords: function () {
    const records = app.globalData.records || [];
    const accounts = app.globalData.accounts || [];
    const accountMap = {};
    const showHiddenAccounts = accountVisibility.getShowHiddenAccounts();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let monthlyExpense = 0;
    let monthlyIncome = 0;
    const groupedRecords = [];
    const dateMap = {};

    accounts.forEach(account => {
      accountMap[account.id] = account;
    });

    records.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();
      
      const shouldIncludeInSummary = this.shouldIncludeRecordInSummary(record, accountMap);

      // 只统计计入总资产账号的支出和收入，转账不计入月度统计
      if (recordYear === currentYear && recordMonth === currentMonth) {
        if (record.type === 'expense' && shouldIncludeInSummary) {
          monthlyExpense += parseFloat(record.amount);
        } else if (record.type === 'income' && shouldIncludeInSummary) {
          monthlyIncome += parseFloat(record.amount);
        }
      }

      const dateKey = this.formatDateKey(recordDate);
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: recordDate,
          dateText: this.formatDateText(recordDate),
          records: [],
          dayExpense: 0,
          dayIncome: 0
        };
      }
      
      let category;
      if (record.type === 'transfer') {
        category = {
          id: 'transfer',
          name: '转账',
          icon: '↔',
          color: '#4ECDC4'
        };
      } else {
        category = this.getCategory(record.categoryId, record.type);
      }
      
      const processedRecord = {
        ...record,
        category,
        categoryBadge: record.type === 'transfer'
          ? TRANSFER_BADGE
          : iconResolver.resolveCategoryBadge(category, category.groupName),
        amountSizeClass: this.getAmountSizeClass(this.formatRecordAmountText(record))
      };

      if (record.type === 'transfer') {
        const fromAccount = accountMap[record.fromAccountId] || { name: record.fromAccountName };
        const toAccount = accountMap[record.toAccountId] || { name: record.toAccountName };
        processedRecord.fromAccountDisplayName = accountVisibility.getDisplayAccountName(fromAccount, showHiddenAccounts);
        processedRecord.toAccountDisplayName = accountVisibility.getDisplayAccountName(toAccount, showHiddenAccounts);
      } else {
        const account = accountMap[record.accountId] || { name: record.accountName };
        processedRecord.accountDisplayName = accountVisibility.getDisplayAccountName(account, showHiddenAccounts);
      }

      dateMap[dateKey].records.push(processedRecord);
      
      if (record.type === 'expense' && shouldIncludeInSummary) {
        dateMap[dateKey].dayExpense += parseFloat(record.amount);
      } else if (record.type === 'income' && shouldIncludeInSummary) {
        dateMap[dateKey].dayIncome += parseFloat(record.amount);
      }
    });

    for (let key in dateMap) {
      dateMap[key].dayExpense = dateMap[key].dayExpense.toFixed(2);
      dateMap[key].dayIncome = dateMap[key].dayIncome.toFixed(2);
      groupedRecords.push(dateMap[key]);
    }

    const monthlyExpenseText = monthlyExpense.toFixed(2);
    const monthlyIncomeText = monthlyIncome.toFixed(2);
    const balanceText = (monthlyIncome - monthlyExpense).toFixed(2);

    this.setData({
      groupedRecords,
      monthlyExpense: monthlyExpenseText,
      monthlyIncome: monthlyIncomeText,
      balance: balanceText,
      monthlyExpenseAmountSizeClass: this.getAmountSizeClass('-¥' + monthlyExpenseText),
      monthlyIncomeAmountSizeClass: this.getAmountSizeClass('+¥' + monthlyIncomeText),
      balanceAmountSizeClass: this.getAmountSizeClass((parseFloat(balanceText) >= 0 ? '+' : '') + '¥' + balanceText),
      loading: false
    });
  },

  formatRecordAmountText: function(record) {
    if (record.type === 'transfer') {
      return '¥' + record.amount;
    }

    return (record.type === 'expense' ? '-' : '+') + '¥' + record.amount;
  },

  getAmountSizeClass: function(amountText) {
    const length = String(amountText || '').length;

    if (length >= 12) {
      return 'amount-size-xs';
    }

    if (length >= 10) {
      return 'amount-size-sm';
    }

    return '';
  },

  shouldIncludeRecordInSummary: function(record, accountMap) {
    if (!record || (record.type !== 'expense' && record.type !== 'income')) {
      return false;
    }

    const account = accountMap[record.accountId];
    if (!account) {
      return false;
    }

    return account.includeInTotal !== false;
  },

  getCategory: function (categoryId, type) {
    const categoriesData = app.globalData.categories[type];
    let category = null;
    
    if (categoriesData && categoriesData.groups) {
      for (const group of categoriesData.groups) {
        const found = group.children && group.children.find(c => c.id === categoryId);
        if (found) {
          category = {
            ...found,
            groupName: group.name
          };
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

  formatDateKey: function (date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month}-${day}`;
  },

  formatDateText: function (date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  },

  goToAddRecord: function () {
    wx.navigateTo({
      url: '/pages/add-record/add-record'
    });
  },

  goToTransfer: function () {
    wx.navigateTo({
      url: '/pages/transfer/transfer'
    });
  },

  showRecordActions: function (e) {
    const record = e.currentTarget.dataset.record;
    this.setData({
      showActionSheet: true,
      currentRecord: record
    });
  },

  hideActionSheet: function () {
    this.setData({
      showActionSheet: false,
      currentRecord: null
    });
  },

  editRecord: function () {
    const record = this.data.currentRecord;
    this.hideActionSheet();
    
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

  deleteRecord: function () {
    const record = this.data.currentRecord;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function (res) {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          });
          
          app.deleteRecord(record.id, function (success) {
            wx.hideLoading();
            
            if (success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              that.loadRecords();
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
    
    this.hideActionSheet();
  }
});
