const app = getApp();
const logger = require('../../utils/logger.js');

Page({
  data: {
    recordType: 'expense',
    amount: '',
    note: '',
    date: '',
    dateText: '',
    categories: [],
    selectedCategoryId: null,
    selectedGroupId: null,
    selectedGroup: null,
    selectedCategoryDisplay: null,
    accounts: [],
    selectedAccountId: null,
    showAccountPicker: false,
    isEdit: false,
    recordId: null
  },

  onLoad: function (options) {
    logger.info('add-record', '页面加载', options);
    
    const recordId = options.recordId;
    if (recordId) {
      // 编辑模式
      const record = app.globalData.records.find(r => r.id === recordId);
      if (record) {
        logger.info('add-record', '找到要编辑的记录', record);
        
        const date = new Date(record.date);
        
        this.setData({
          isEdit: true,
          recordId: recordId,
          recordType: record.type,
          amount: record.amount,
          note: record.note || '',
          date: this.formatDate(date),
          dateText: this.formatDateText(date),
          selectedCategoryId: record.categoryId,
          selectedAccountId: record.accountId
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
    
    this.updateCategories();
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

  updateCategories: function () {
    const categoryData = app.globalData.categories[this.data.recordType];
    const categories = app.getFlatCategories(this.data.recordType);
    
    // 重置选择状态，但保留已选的类别
    let newState = {
      categoryData,
      categories
    };
    
    // 如果是编辑模式且已有选择的类别，找到对应的组
    if (this.data.selectedCategoryId) {
      let selectedCategory = categories.find(cat => cat.id === this.data.selectedCategoryId);
      
      if (!selectedCategory) {
        // 找不到旧分类，使用默认分类
        if (this.data.recordType === 'expense') {
          const otherGroup = categoryData.groups.find(g => g.id === 'expense-group-11');
          selectedCategory = otherGroup && otherGroup.children && otherGroup.children.find(c => c.id === 'expense-11-2');
          if (!selectedCategory) {
            selectedCategory = categories[categories.length - 1];
          }
        } else {
          const salaryGroup = categoryData.groups.find(g => g.id === 'income-group-1');
          selectedCategory = salaryGroup && salaryGroup.children && salaryGroup.children.find(c => c.id === 'income-1-1');
          if (!selectedCategory) {
            selectedCategory = categories[0];
          }
        }
        
        if (selectedCategory) {
          newState.selectedCategoryId = selectedCategory.id;
        }
      }
      
      if (selectedCategory) {
        const selectedGroup = categoryData.groups.find(g => g.id === selectedCategory.groupId);
        if (selectedGroup) {
          newState.selectedGroupId = selectedGroup.id;
          newState.selectedGroup = selectedGroup;
          newState.selectedCategoryDisplay = {
            ...selectedCategory,
            groupName: selectedGroup.name
          };
        }
      }
    }
    
    this.setData(newState);
  },

  selectGroup: function(e) {
    const group = e.currentTarget.dataset.group;
    this.setData({
      selectedGroupId: group.id,
      selectedGroup: group
    });
  },

  backToGroups: function() {
    this.setData({
      selectedGroupId: null,
      selectedGroup: null
    });
  },

  selectCategory: function(e) {
    const id = e.currentTarget.dataset.id;
    const cat = e.currentTarget.dataset.cat;
    this.setData({
      selectedCategoryId: id,
      selectedCategoryDisplay: {
        ...cat,
        groupName: this.data.selectedGroup.name
      }
    });
  },

  loadAccounts: function() {
    const accounts = app.globalData.accounts || [];
    const selectedAccountId = this.data.selectedAccountId || accounts[0]?.id;
    
    this.setData({
      accounts,
      selectedAccountId
    });
  },

  switchType: function (e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      recordType: type
    });
    this.updateCategories();
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



  selectAccount: function (e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedAccountId: id,
      showAccountPicker: false
    });
  },

  showAccountPicker: function() {
    this.setData({
      showAccountPicker: true
    });
  },

  hideAccountPicker: function() {
    this.setData({
      showAccountPicker: false
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

  getSelectedAccount: function() {
    const { accounts, selectedAccountId } = this.data;
    return accounts.find(acc => acc.id === selectedAccountId);
  },

  saveRecord: function () {
    const { recordType, amount, note, date, selectedCategoryId, selectedAccountId, isEdit, recordId } = this.data;
    
    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      });
      return;
    }
    
    if (!selectedCategoryId) {
      wx.showToast({
        title: '请选择类别',
        icon: 'none'
      });
      return;
    }

    if (!selectedAccountId) {
      wx.showToast({
        title: '请选择账户',
        icon: 'none'
      });
      return;
    }

    const selectedAccount = this.getSelectedAccount();
    const selectedCategory = this.data.categories.find(cat => cat.id === selectedCategoryId);

    const record = {
      type: recordType,
      amount: parseFloat(amount).toFixed(2),
      categoryId: selectedCategoryId,
      categoryName: selectedCategory ? selectedCategory.name : '',
      categoryIcon: selectedCategory ? selectedCategory.icon : '',
      accountId: selectedAccountId,
      accountName: selectedAccount ? selectedAccount.name : '',
      note: note.trim(),
      date: date
    };

    logger.info('add-record', isEdit ? '更新记录' : '保存记录', record);

    wx.showLoading({
      title: isEdit ? '更新中...' : '保存中...'
    });

    const callback = (success) => {
      wx.hideLoading();
      
      if (success !== false) {
        wx.showToast({
          title: isEdit ? '更新成功' : '保存成功',
          icon: 'success',
          duration: 1500
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: isEdit ? '更新失败' : '保存失败',
          icon: 'none'
        });
      }
    };

    if (isEdit) {
      app.updateRecord(recordId, record, callback);
    } else {
      app.addRecord(record, callback);
    }
  }
});
