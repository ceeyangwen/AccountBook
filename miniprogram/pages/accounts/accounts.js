const app = getApp();
const logger = require('../../utils/logger.js');

Page({
  data: {
    totalBalance: null,
    groupedAccounts: [],
    showQuickAdd: false,
    currentCategory: '',
    quickAccounts: [],
    debugInfo: ''
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
    
    // 优先使用内存中的数据，避免云存储读取失败导致数据清空
    if (app.globalData.accounts && app.globalData.accounts.length > 0) {
      logger.info('accounts', '直接使用内存中的账户数据');
      this.processAccounts();
    } else {
      // 只有内存中没有数据时，才从云存储加载
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
        
        // 只有 includeInTotal 为 true 的账户才计入总余额
        if (account.includeInTotal !== false) {
          // 资产、投资和债权类型账户累加余额，负债和信用类型账户扣除余额
          if (categoryInfo.type === 'debt' || categoryInfo.type === 'credit') {
            // 负债和信用类账户，余额应该扣除（显示为负数）
            grouped[account.category].totalBalance -= balance;
            totalBalance -= balance;
          } else {
            // 资产、投资和债权类账户，余额累加
            grouped[account.category].totalBalance += balance;
            totalBalance += balance;
          }
        }
      }
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
  }
});
