const app = getApp();
const logger = require('../../utils/logger.js');

Page({
  data: {
    totalBalance: null,
    groupedAccounts: [],
    showQuickAdd: false,
    currentCategory: '',
    quickAccounts: [],
    debugInfo: '',
    isEditing: false
  },

  onLoad: function() {
    logger.info('accounts', '页面加载');
    this.loadAccounts();
  },

  onShow: function() {
    logger.info('accounts', '页面显示');
    this.loadAccounts();
  },

  loadAccounts: function() {
    logger.info('accounts', '开始加载账户');
    
    this.setData({
      totalBalance: null,
      debugInfo: '正在加载账户数据...'
    });
    
    if (app.globalData.accounts && app.globalData.accounts.length > 0) {
      logger.info('accounts', '直接使用内存中的账户数据');
      this.processAccounts();
    } else {
      app.loadAccounts(() => {
        logger.info('accounts', '账户加载完成回调执行');
        this.processAccounts();
      });
    }
  },

  processAccounts: function() {
    const accounts = app.globalData.accounts || [];
    const accountCategories = app.globalData.accountCategories || [];
    
    logger.info('accounts', '处理账户数据', { accountCount: accounts.length, categoryCount: accountCategories.length });
    
    const grouped = {};
    let totalBalance = 0;
    
    accountCategories.forEach(cat => {
      grouped[cat.name] = {
        categoryInfo: cat,
        accounts: [],
        totalBalance: 0
      };
    });
    
    accounts.forEach(account => {
      logger.info('accounts', '处理单个账户', account);
      const categoryInfo = accountCategories.find(cat => cat.name === account.category);
      if (categoryInfo) {
        account.categoryInfo = categoryInfo;
        grouped[account.category].accounts.push(account);
        
        const balance = parseFloat(account.balance) || 0;
        
        if (account.includeInTotal !== false) {
          if (categoryInfo.type === 'debt' || categoryInfo.type === 'credit') {
            grouped[account.category].totalBalance -= balance;
            totalBalance -= balance;
          } else {
            grouped[account.category].totalBalance += balance;
            totalBalance += balance;
          }
        }
      }
    });
    
    Object.keys(grouped).forEach(category => {
      grouped[category].accounts.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 0;
        const orderB = b.order !== undefined ? b.order : 0;
        return orderA - orderB;
      });
    });
    
    const groupedAccounts = Object.values(grouped).filter(g => g.accounts.length > 0);
    
    logger.info('accounts', '分组后的账户', { groupCount: groupedAccounts.length, totalBalance: totalBalance });
    
    groupedAccounts.forEach(g => {
      g.totalBalance = g.totalBalance.toFixed(2);
    });
    
    this.setData({
      groupedAccounts,
      totalBalance: totalBalance.toFixed(2),
      debugInfo: '账户数量: ' + accounts.length + ', 分组数: ' + groupedAccounts.length
    });
  },

  addAccount: function() {
    wx.navigateTo({
      url: '/pages/account-edit/account-edit'
    });
  },

  editAccount: function(e) {
    const account = e.currentTarget.dataset.account;
    wx.navigateTo({
      url: '/pages/account-edit/account-edit?id=' + account.id
    });
  },

  viewAccountDetail: function(e) {
    const account = e.currentTarget.dataset.account;
    wx.navigateTo({
      url: '/pages/account-detail/account-detail?id=' + account.id
    });
  },

  deleteAccount: function(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除账户「' + name + '」吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          });
          
          app.deleteAccount(id, (success) => {
            wx.hideLoading();
            
            if (success !== false) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
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
  },

  showQuickAdd: function(e) {
    const category = e.currentTarget.dataset.category;
    const defaultAccounts = app.globalData.defaultAccounts || {};
    const quickAccounts = defaultAccounts[category] || [];
    
    if (quickAccounts.length === 0) {
      this.addAccount();
      return;
    }
    
    this.setData({
      showQuickAdd: true,
      currentCategory: category,
      quickAccounts
    });
  },

  hideQuickAdd: function() {
    this.setData({
      showQuickAdd: false
    });
  },

  stopPropagation: function() {
  },

  quickAddAccount: function(e) {
    const account = e.currentTarget.dataset.account;
    const categoryInfo = app.globalData.accountCategories.find(cat => cat.name === this.data.currentCategory);
    
    let url = '/pages/account-edit/account-edit?name=' + encodeURIComponent(account.name) + '&icon=' + account.icon + '&category=' + this.data.currentCategory;
    if (categoryInfo) {
      url += '&color=' + categoryInfo.color;
    }
    
    wx.navigateTo({
      url: url
    });
    
    this.hideQuickAdd();
  },

  toggleEdit: function() {
    this.setData({
      isEditing: !this.data.isEditing
    });
  },

  moveUp: function(e) {
    const groupIndex = e.currentTarget.dataset.groupIndex;
    const index = e.currentTarget.dataset.index;
    
    if (index <= 0) return;
    
    const groupedAccounts = JSON.parse(JSON.stringify(this.data.groupedAccounts));
    const accounts = groupedAccounts[groupIndex].accounts;
    
    const temp = accounts[index];
    accounts[index] = accounts[index - 1];
    accounts[index - 1] = temp;
    
    this.setData({
      groupedAccounts
    });
    
    this.saveOrder();
  },

  moveDown: function(e) {
    const groupIndex = e.currentTarget.dataset.groupIndex;
    const index = e.currentTarget.dataset.index;
    
    const groupedAccounts = this.data.groupedAccounts;
    const accounts = groupedAccounts[groupIndex].accounts;
    
    if (index >= accounts.length - 1) return;
    
    const newGroupedAccounts = JSON.parse(JSON.stringify(groupedAccounts));
    const newAccounts = newGroupedAccounts[groupIndex].accounts;
    
    const temp = newAccounts[index];
    newAccounts[index] = newAccounts[index + 1];
    newAccounts[index + 1] = temp;
    
    this.setData({
      groupedAccounts: newGroupedAccounts
    });
    
    this.saveOrder();
  },

  saveOrder: function() {
    const groupedAccounts = this.data.groupedAccounts;
    const accounts = app.globalData.accounts || [];
    
    let changed = false;
    
    groupedAccounts.forEach(group => {
      group.accounts.forEach((account, index) => {
        const accountIndex = accounts.findIndex(a => a.id === account.id);
        if (accountIndex !== -1) {
          const oldOrder = accounts[accountIndex].order;
          if (oldOrder !== index) {
            accounts[accountIndex].order = index;
            changed = true;
          }
        }
      });
    });
    
    if (changed) {
      app.globalData.accounts = accounts;
      app.saveAccounts(() => {
        logger.info('accounts', '账户顺序已保存');
      });
    }
  }
});
