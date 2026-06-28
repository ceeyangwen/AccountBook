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
    selectedMonthValue: '',
    monthPickerEnd: '',
    monthlyExpense: '0.00',
    monthlyIncome: '0.00',
    balance: '0.00',
    monthlyExpenseBudget: '18,000',
    monthlyIncomeBudget: '20,000',
    expenseBudgetRate: 0,
    incomeBudgetRate: 0,
    averageDailyBalance: '0',
    balanceRate: '0.0',
    monthlyExpenseAmountSizeClass: '',
    monthlyIncomeAmountSizeClass: '',
    balanceAmountSizeClass: '',
    groupedRecords: [],
    collapsedDateGroups: {},
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
    const monthValue = this.formatMonthValue(now);
    this.setData({
      currentMonth: this.formatMonthText(monthValue),
      selectedMonthValue: monthValue,
      monthPickerEnd: monthValue
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
    const selectedMonth = this.getSelectedMonthParts();
    const currentYear = selectedMonth.year;
    const currentMonth = selectedMonth.monthIndex;
    
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
      const isSelectedMonth = recordYear === currentYear && recordMonth === currentMonth;
      
      if (!isSelectedMonth) {
        return;
      }

      const shouldIncludeInSummary = this.shouldIncludeRecordInSummary(record, accountMap);

      // 只统计计入总资产账号的支出和收入，转账不计入月度统计
      if (record.type === 'expense' && shouldIncludeInSummary) {
        monthlyExpense += parseFloat(record.amount);
      } else if (record.type === 'income' && shouldIncludeInSummary) {
        monthlyIncome += parseFloat(record.amount);
      }

      const dateKey = this.formatDateKey(recordDate);
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          dateKey,
          date: recordDate,
          dateText: this.formatDateText(recordDate),
          isCollapsed: !!this.data.collapsedDateGroups[dateKey],
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
    const dayOfMonth = this.getAverageDayCount(currentYear, currentMonth, now);

    this.setData({
      groupedRecords,
      monthlyExpense: monthlyExpenseText,
      monthlyIncome: monthlyIncomeText,
      balance: balanceText,
      expenseBudgetRate: this.getBudgetRate(monthlyExpense, 18000),
      incomeBudgetRate: this.getBudgetRate(monthlyIncome, 20000),
      averageDailyBalance: this.formatIntegerAmount((monthlyIncome - monthlyExpense) / dayOfMonth),
      balanceRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome * 100).toFixed(1) : '0.0',
      monthlyExpenseAmountSizeClass: this.getAmountSizeClass('-¥' + monthlyExpenseText),
      monthlyIncomeAmountSizeClass: this.getAmountSizeClass('+¥' + monthlyIncomeText),
      balanceAmountSizeClass: this.getAmountSizeClass((parseFloat(balanceText) >= 0 ? '+' : '') + '¥' + balanceText),
      loading: false
    });
  },

  onMonthChange: function (e) {
    const monthValue = this.normalizeMonthValue(e.detail.value);

    this.setData({
      selectedMonthValue: monthValue,
      currentMonth: this.formatMonthText(monthValue)
    });

    this.processRecords();
  },

  toggleDateGroup: function (e) {
    const dateKey = e.currentTarget.dataset.dateKey;
    if (!dateKey) {
      return;
    }

    const collapsedDateGroups = {
      ...(this.data.collapsedDateGroups || {})
    };

    if (collapsedDateGroups[dateKey]) {
      delete collapsedDateGroups[dateKey];
    } else {
      collapsedDateGroups[dateKey] = true;
    }

    const groupedRecords = (this.data.groupedRecords || []).map(group => ({
      ...group,
      isCollapsed: group.dateKey === dateKey ? !!collapsedDateGroups[dateKey] : group.isCollapsed
    }));

    this.setData({
      collapsedDateGroups,
      groupedRecords
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

  getBudgetRate: function(value, budget) {
    if (!budget) return 0;
    const rate = Math.round((Number(value) || 0) / budget * 100);
    return Math.max(0, Math.min(100, rate));
  },

  formatIntegerAmount: function(value) {
    const amount = Math.round(Math.abs(Number(value) || 0));
    return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  formatMonthValue: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  },

  normalizeMonthValue: function(monthValue) {
    const match = String(monthValue || '').match(/^(\d{4})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }

    return this.formatMonthValue(new Date());
  },

  formatMonthText: function(monthValue) {
    const [year, month] = this.normalizeMonthValue(monthValue).split('-');
    return `${Number(year)}年${Number(month)}月`;
  },

  getSelectedMonthParts: function() {
    const [year, month] = this.normalizeMonthValue(this.data.selectedMonthValue).split('-').map(Number);
    return {
      year,
      monthIndex: month - 1
    };
  },

  getAverageDayCount: function(year, monthIndex, today) {
    if (year === today.getFullYear() && monthIndex === today.getMonth()) {
      return today.getDate() || 1;
    }

    return new Date(year, monthIndex + 1, 0).getDate();
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

  goToAccounts: function () {
    wx.switchTab({
      url: '/pages/accounts/accounts'
    });
  },

  goToStatistics: function () {
    wx.switchTab({
      url: '/pages/statistics/statistics'
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
