const app = getApp();
const logger = require('../../utils/logger.js');

Page({
  data: {
    amount: '',
    note: '',
    date: '',
    dateText: '',
    accounts: [],
    fromAccountId: null,
    toAccountId: null,
    showFromPicker: false,
    showToPicker: false,
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
      
      this.setData({
        date,
        dateText: this.formatDateText(now)
      });
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
    const accounts = app.globalData.accounts || [];
    
    this.setData({
      accounts
    });
  },

  onAmountInput: function (e) {
    let value = e.detail.value;
    if (value.indexOf('.') !== -1) {
      const parts = value.split('.');
      if (parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    this.setData({
      amount: value
    });
  },

  showFromPicker: function() {
    this.setData({ showFromPicker: true });
  },

  hideFromPicker: function() {
    this.setData({ showFromPicker: false });
  },

  showToPicker: function() {
    this.setData({ showToPicker: true });
  },

  hideToPicker: function() {
    this.setData({ showToPicker: false });
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
      showFromPicker: false
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
      showToPicker: false
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
    const { amount, note, date, fromAccountId, toAccountId, isEdit, recordId } = this.data;
    
    if (!amount || parseFloat(amount) <= 0) {
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
      amount: parseFloat(amount).toFixed(2),
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
