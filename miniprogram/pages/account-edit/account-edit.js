const app = getApp();
const logger = require('../../utils/logger.js');
const cloudStorage = require('../../utils/cloudStorage.js');

Page({
  data: {
    isEdit: false,
    id: '',
    name: '',
    category: '',
    categoryIndex: 0,
    accountCategories: [],
    selectedCategory: null,
    selectedIcon: '💰',
    balance: '0',
    note: '',
    color: '#FF6B6B',
    includeInTotal: true,
    isHidden: false,
    balanceLabel: '账户余额'
  },

  onLoad: function(options) {
    logger.info('account-edit', '页面加载', options);
    
    const accountCategories = app.globalData.accountCategories || [];
    const defaultCategory = accountCategories[0];
    const icons = app.globalData.icons || [];
    
    let balanceLabel = '账户余额';
    if (defaultCategory.type === 'credit' || defaultCategory.type === 'debt') {
      balanceLabel = '账户负债';
    }
    
    this.setData({
      accountCategories: accountCategories,
      selectedCategory: defaultCategory,
      category: defaultCategory.name,
      selectedIcon: defaultCategory.icon,
      color: defaultCategory.color,
      icons: icons,
      balanceLabel: balanceLabel
    });
    
    if (options.id) {
      this.loadAccount(options.id);
    } else {
      if (options.name) {
        this.setData({
          name: decodeURIComponent(options.name)
        });
      }
      if (options.icon) {
        this.setData({
          selectedIcon: decodeURIComponent(options.icon)
        });
      }
      if (options.category) {
        const categoryName = decodeURIComponent(options.category);
        const categoryIndex = accountCategories.findIndex(cat => cat.name === categoryName);
        if (categoryIndex !== -1) {
          this.setData({
            categoryIndex: categoryIndex,
            category: categoryName,
            selectedCategory: accountCategories[categoryIndex],
            color: accountCategories[categoryIndex].color
          });
        }
      }
      if (options.color) {
        this.setData({
          color: decodeURIComponent(options.color)
        });
      }
      
      wx.setNavigationBarTitle({
        title: '新建账户'
      });
    }
  },
  
  loadAccount: function(id) {
    logger.info('account-edit', '加载账户', { id });
    
    const accounts = app.globalData.accounts || [];
    const account = accounts.find(acc => acc.id === id);
    
    if (account) {
      const accountCategories = app.globalData.accountCategories || [];
      const categoryIndex = accountCategories.findIndex(cat => cat.name === account.category);
      const selectedCategory = categoryIndex !== -1 ? accountCategories[categoryIndex] : null;
      
      let balanceLabel = '账户余额';
      if (selectedCategory && (selectedCategory.type === 'credit' || selectedCategory.type === 'debt')) {
        balanceLabel = '账户负债';
      }
      
      this.setData({
        isEdit: true,
        id: account.id,
        name: account.name,
        category: account.category,
        categoryIndex: categoryIndex !== -1 ? categoryIndex : 0,
        selectedCategory: selectedCategory,
        selectedIcon: account.icon,
        balance: account.balance.toString(),
        note: account.note || '',
        color: account.color,
        includeInTotal: account.includeInTotal !== undefined ? account.includeInTotal : true,
        isHidden: account.isHidden === true,
        balanceLabel: balanceLabel
      });
      
      wx.setNavigationBarTitle({
        title: '编辑账户'
      });
    } else {
      logger.error('account-edit', '未找到账户', { id });
      wx.showToast({
        title: '账户不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onNameInput: function(e) {
    this.setData({
      name: e.detail.value
    });
  },

  onCategoryChange: function(e) {
    const index = parseInt(e.detail.value);
    const selectedCategory = this.data.accountCategories[index];
    
    let balanceLabel = '账户余额';
    if (selectedCategory.type === 'credit' || selectedCategory.type === 'debt') {
      balanceLabel = '账户负债';
    }
    
    this.setData({
      categoryIndex: index,
      selectedCategory,
      category: selectedCategory.name,
      selectedIcon: selectedCategory.icon,
      color: selectedCategory.color,
      balanceLabel: balanceLabel
    });
  },

  selectIcon: function(e) {
    const icon = e.currentTarget.dataset.icon;
    this.setData({
      selectedIcon: icon
    });
  },

  onBalanceInput: function(e) {
    let value = e.detail.value;
    if (value.indexOf('.') !== -1) {
      const parts = value.split('.');
      if (parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    this.setData({
      balance: value
    });
  },

  onNoteInput: function(e) {
    this.setData({
      note: e.detail.value
    });
  },

  onIncludeInTotalChange: function(e) {
    this.setData({
      includeInTotal: e.detail.value
    });
  },

  onHiddenChange: function(e) {
    this.setData({
      isHidden: e.detail.value
    });
  },

  saveAccount: function() {
    const { isEdit, id, name, categoryIndex, selectedIcon, balance, note, color, includeInTotal, isHidden } = this.data;
    const selectedCategory = this.data.accountCategories[categoryIndex];
    
    logger.info('account-edit', '准备保存账户', {
      isEdit,
      id,
      name,
      categoryIndex,
      selectedCategory: selectedCategory ? selectedCategory.name : null,
      selectedIcon,
      balance,
      note,
      includeInTotal,
      isHidden
    });
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入账户名称',
        icon: 'none'
      });
      return;
    }
    
    if (!selectedCategory) {
      wx.showToast({
        title: '请选择账户类别',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '保存中...'
    });
    
    const accountData = {
      name: name.trim(),
      category: selectedCategory.name,
      icon: selectedIcon,
      color: color,
      balance: parseFloat(balance) || 0,
      note: note.trim(),
      includeInTotal: includeInTotal,
      isHidden: isHidden === true
    };
    
    logger.info('account-edit', '账户数据准备完成', accountData);
    
    if (isEdit) {
      accountData.id = id;
      
      app.updateAccount(accountData, (success) => {
        wx.hideLoading();
        
        if (success !== false) {
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 1500
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      });
    } else {
      app.addAccount(accountData, (success) => {
        wx.hideLoading();
        
        logger.info('account-edit', '添加账户回调', { success });
        
        if (success !== false) {
          wx.showToast({
            title: '创建成功',
            icon: 'success',
            duration: 1500
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: '创建失败',
            icon: 'none'
          });
        }
      });
    }
  },

  deleteAccount: function() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个账户吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          });
          
          app.deleteAccount(this.data.id, (success) => {
            wx.hideLoading();
            
            if (success !== false) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
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
