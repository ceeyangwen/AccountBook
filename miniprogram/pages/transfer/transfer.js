const app = getApp();
const logger = require('../../utils/logger.js');
const amountExpression = require('../../utils/amountExpression.js');
const accountVisibility = require('../../utils/accountVisibility.js');

Page({
  data: {
    amount: '',
    note: '',
    date: '',
    dateText: '',
    accounts: [],
    groupedAccounts: [],
    fromAccountId: null,
    toAccountId: null,
    selectedFromAccountCategoryId: null,
    selectedFromAccountCategory: null,
    selectedToAccountCategoryId: null,
    selectedToAccountCategory: null,
    showFromPicker: false,
    showToPicker: false,
    showHiddenAccounts: false,
    isEdit: false,
    recordId: null
  },

  onLoad: function (options) {
    logger.info('transfer', '页面加载', options);
    
    const recordId = options.recordId;
    if (recordId) {
      // 编辑模式
      const record = app.globalData.records.find(r => r.id === recordId);
      if (record) {
        logger.info('transfer', '找到要编辑的转账记录', record);
        
        const date = new Date(record.date);
        
        this.setData({
          isEdit: true,
          recordId: recordId,
          amount: record.amount,
          note: record.note || '',
          date: this.formatDate(date),
          dateText: this.formatDateText(date),
          fromAccountId: record.fromAccountId,
          toAccountId: record.toAccountId
        });
      }
    } else {
      // 新增模式
      const now = new Date();
      const date = this.formatDate(now);
      const fromAccountId = options.fromAccountId;
      
      const newState = {
        date,
        dateText: this.formatDateText(now)
      };
      if (fromAccountId) {
        newState.fromAccountId = fromAccountId;
      }

      this.setData(newState);
    }
    
    this.loadAccounts();
  },

  onShow: function() {
    this.loadAccounts();
  },

  formatDate: function (date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateText: function (date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  },

  loadAccounts: function() {
    const allAccounts = app.globalData.accounts || [];
    const showHiddenAccounts = accountVisibility.getShowHiddenAccounts();
    const fromAccountId = this.data.fromAccountId && allAccounts.some(account => account.id === this.data.fromAccountId)
      ? this.data.fromAccountId
      : null;
    const toAccountId = this.data.toAccountId && allAccounts.some(account => account.id === this.data.toAccountId)
      ? this.data.toAccountId
      : null;
    const visibleAccounts = accountVisibility.getVisibleAccounts(allAccounts, {
      showHidden: showHiddenAccounts,
      keepIds: [fromAccountId, toAccountId]
    });
    const accounts = accountVisibility.decorateAccounts(visibleAccounts, showHiddenAccounts);
    const groupedAccounts = this.groupAccountsByCategory(accounts);
    
    this.setData({
      accounts,
      groupedAccounts,
      fromAccountId,
      toAccountId,
      showHiddenAccounts
    });
  },

  groupAccountsByCategory: function(accounts) {
    const categoryMap = {};

    accounts.forEach(account => {
      const category = account.category || '未分类';
      if (!categoryMap[category]) {
        categoryMap[category] = {
          id: category,
          name: category,
          icon: this.getCategoryIcon(category),
          children: []
        };
      }
      categoryMap[category].children.push(account);
    });

    const accountCategories = app.globalData.accountCategories || [];
    const knownGroups = accountCategories
      .map(category => categoryMap[category.name])
      .filter(Boolean);
    const knownNames = new Set(knownGroups.map(group => group.name));
    const unknownGroups = Object.values(categoryMap).filter(group => !knownNames.has(group.name));

    return knownGroups.concat(unknownGroups);
  },

  getCategoryIcon: function(category) {
    const accountCategories = app.globalData.accountCategories || [];
    const found = accountCategories.find(item => item.name === category);
    if (found && found.icon) {
      return found.icon;
    }

    const iconMap = {
      '现金': '💵',
      '信用卡': '💳',
      '储蓄卡': '🏦',
      '基金账户': '📊',
      '股票账户': '📈',
      '虚拟账户': '📱',
      '负债账户': '📝',
      '债权账户': '📋'
    };
    return iconMap[category] || '💵';
  },

  onAmountInput: function (e) {
    const value = amountExpression.sanitizeAmountExpression(e.detail.value);
    this.setData({
      amount: value
    });
    return value;
  },

  onAmountBlur: function () {
    this.formatAmountInput(false);
  },

  formatAmountInput: function (showError) {
    const rawAmount = this.data.amount;
    if (!rawAmount) return null;

    try {
      const formattedAmount = amountExpression.formatAmountExpression(rawAmount);
      this.setData({
        amount: formattedAmount
      });
      return formattedAmount;
    } catch (e) {
      if (showError) {
        wx.showToast({
          title: e.message || '金额表达式有误',
          icon: 'none'
        });
      }
      return null;
    }
  },

  showFromPicker: function() {
    this.setData({
      showFromPicker: true,
      selectedFromAccountCategoryId: null,
      selectedFromAccountCategory: null
    });
  },

  hideFromPicker: function() {
    this.setData({
      showFromPicker: false,
      selectedFromAccountCategoryId: null,
      selectedFromAccountCategory: null
    });
  },

  showToPicker: function() {
    this.setData({
      showToPicker: true,
      selectedToAccountCategoryId: null,
      selectedToAccountCategory: null
    });
  },

  hideToPicker: function() {
    this.setData({
      showToPicker: false,
      selectedToAccountCategoryId: null,
      selectedToAccountCategory: null
    });
  },

  selectFromAccountCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      selectedFromAccountCategoryId: category.id,
      selectedFromAccountCategory: category
    });
  },

  backToFromAccountCategories: function() {
    this.setData({
      selectedFromAccountCategoryId: null,
      selectedFromAccountCategory: null
    });
  },

  selectToAccountCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      selectedToAccountCategoryId: category.id,
      selectedToAccountCategory: category
    });
  },

  backToToAccountCategories: function() {
    this.setData({
      selectedToAccountCategoryId: null,
      selectedToAccountCategory: null
    });
  },

  onPopupTap: function() {
    // 用 catchtap 阻止弹窗内部点击冒泡到遮罩层。
  },

  selectFromAccount: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.toAccountId) {
      wx.showToast({
        title: '转出账户不能与转入账户相同',
        icon: 'none'
      });
      return;
    }
    this.setData({
      fromAccountId: id,
      showFromPicker: false,
      selectedFromAccountCategoryId: null,
      selectedFromAccountCategory: null
    });
  },

  selectToAccount: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.fromAccountId) {
      wx.showToast({
        title: '转入账户不能与转出账户相同',
        icon: 'none'
      });
      return;
    }
    this.setData({
      toAccountId: id,
      showToPicker: false,
      selectedToAccountCategoryId: null,
      selectedToAccountCategory: null
    });
  },

  onDateChange: function (e) {
    const dateStr = e.detail.value;
    const date = new Date(dateStr);
    this.setData({
      date: dateStr,
      dateText: this.formatDateText(date)
    });
  },

  onNoteInput: function (e) {
    this.setData({
      note: e.detail.value
    });
  },

  getAccountById: function(id) {
    return this.data.accounts.find(acc => acc.id === id);
  },

  saveTransfer: function () {
    if (!this.data.amount) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      });
      return;
    }

    const formattedAmount = this.formatAmountInput(true);
    const { note, date, fromAccountId, toAccountId, isEdit, recordId } = this.data;

    if (!formattedAmount) {
      return;
    }
    
    if (parseFloat(formattedAmount) <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      });
      return;
    }
    
    if (!fromAccountId) {
      wx.showToast({
        title: '请选择转出账户',
        icon: 'none'
      });
      return;
    }

    if (!toAccountId) {
      wx.showToast({
        title: '请选择转入账户',
        icon: 'none'
      });
      return;
    }

    if (fromAccountId === toAccountId) {
      wx.showToast({
        title: '转出和转入账户不能相同',
        icon: 'none'
      });
      return;
    }

    const fromAccount = this.getAccountById(fromAccountId);
    const toAccount = this.getAccountById(toAccountId);

    const transferRecord = {
      type: 'transfer',
      amount: formattedAmount,
      fromAccountId: fromAccountId,
      fromAccountName: fromAccount ? fromAccount.name : '',
      fromAccountIcon: fromAccount ? fromAccount.icon : '',
      toAccountId: toAccountId,
      toAccountName: toAccount ? toAccount.name : '',
      toAccountIcon: toAccount ? toAccount.icon : '',
      note: note.trim(),
      date: date
    };

    logger.info('transfer', isEdit ? '更新转账记录' : '保存转账记录', transferRecord);

    wx.showLoading({
      title: isEdit ? '更新中...' : '保存中...'
    });

    const callback = (success) => {
      wx.hideLoading();
      
      if (success !== false) {
        wx.showToast({
          title: isEdit ? '更新成功' : '转账成功',
          icon: 'success',
          duration: 1500
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: isEdit ? '更新失败' : '转账失败',
          icon: 'none'
        });
      }
    };

    if (isEdit) {
      app.updateRecord(recordId, transferRecord, callback);
    } else {
      app.addTransfer(transferRecord, callback);
    }
  }
});
