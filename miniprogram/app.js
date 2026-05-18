const logger = require('./utils/logger.js');
const cloudStorage = require('./utils/cloudStorage.js');
const balanceCalculator = require('./utils/balanceCalculator.js');

App({
  onLaunch: function () {
    logger.info('App', '应用启动');
    
    // 默认分类数据常量
    this.DEFAULT_CATEGORIES = {
      expense: {
        groups: [
          {
            id: 'expense-group-1',
            name: '衣服饰品',
            icon: '👗',
            color: '#FF6B6B',
            children: [
              { id: 'expense-1-1', name: '衣服裤子', icon: '👕', color: '#FF6B6B' },
              { id: 'expense-1-2', name: '化妆用品', icon: '💄', color: '#FF8A8A' },
              { id: 'expense-1-3', name: '鞋帽包包', icon: '👜', color: '#FFA9A9' }
            ]
          },
          {
            id: 'expense-group-2',
            name: '食品酒水',
            icon: '🍜',
            color: '#4ECDC4',
            children: [
              { id: 'expense-2-2', name: '三餐', icon: '🍽️', color: '#7EDDD6' },
              { id: 'expense-2-3', name: '水果零食', icon: '🍎', color: '#A8EDE4' },
              { id: 'expense-2-4', name: '下午茶', icon: '☕', color: '#D3F3EF' },
              { id: 'expense-2-5', name: '酒水', icon: '🍺', color: '#4ECDC4' },
              { id: 'expense-2-6', name: '宵夜', icon: '🍢', color: '#7EDDD6' }
            ]
          },
          {
            id: 'expense-group-3',
            name: '居家物业',
            icon: '🏠',
            color: '#FFE66D',
            children: [
              { id: 'expense-3-1', name: '日常用品', icon: '🛒', color: '#FFE66D' },
              { id: 'expense-3-2', name: '水电煤气', icon: '⚡', color: '#FFF09D' },
              { id: 'expense-3-3', name: '房租', icon: '🏠', color: '#FFF6C4' },
              { id: 'expense-3-4', name: '物业管理', icon: '🏢', color: '#FFE66D' },
              { id: 'expense-3-5', name: '维修保养', icon: '🔧', color: '#FFF09D' },
              { id: 'expense-3-6', name: '柴米油盐', icon: '🍚', color: '#FFF6C4' },
              { id: 'expense-3-7', name: '装修', icon: '🪜', color: '#FFE66D' },
              { id: 'expense-3-8', name: '购房', icon: '🏡', color: '#FFF09D' }
            ]
          },
          {
            id: 'expense-group-4',
            name: '行车交通',
            icon: '🚗',
            color: '#A8E6CF',
            children: [
              { id: 'expense-4-1', name: '公共交通', icon: '🚌', color: '#A8E6CF' },
              { id: 'expense-4-2', name: '打车租车', icon: '🚕', color: '#C8F0DE' },
              { id: 'expense-4-3', name: '私家车费用', icon: '🚙', color: '#E8F9F0' },
              { id: 'expense-4-4', name: '停车费用', icon: '🅿️', color: '#A8E6CF' }
            ]
          },
          {
            id: 'expense-group-5',
            name: '交流通信',
            icon: '📱',
            color: '#87CEEB',
            children: [
              { id: 'expense-5-1', name: '手机费', icon: '📱', color: '#87CEEB' },
              { id: 'expense-5-2', name: '上网费', icon: '🌐', color: '#A8D8F0' },
              { id: 'expense-5-3', name: '邮寄费', icon: '📦', color: '#C9E7F5' }
            ]
          },
          {
            id: 'expense-group-6',
            name: '休闲娱乐',
            icon: '🎮',
            color: '#FFB6C1',
            children: [
              { id: 'expense-6-1', name: '运动健身', icon: '💪', color: '#FFB6C1' },
              { id: 'expense-6-2', name: '腐败聚会', icon: '🎉', color: '#FFD1DC' },
              { id: 'expense-6-3', name: '休闲玩乐', icon: '🎡', color: '#FFE6EB' },
              { id: 'expense-6-4', name: '旅游度假', icon: '✈️', color: '#FFB6C1' },
              { id: 'expense-6-5', name: '买玩具', icon: '🎁', color: '#FFD1DC' }
            ]
          },
          {
            id: 'expense-group-7',
            name: '学习进修',
            icon: '📚',
            color: '#DDA0DD',
            children: [
              { id: 'expense-7-1', name: '书画杂志', icon: '📖', color: '#DDA0DD' },
              { id: 'expense-7-2', name: '培训进修', icon: '🎓', color: '#E8BDE8' }
            ]
          },
          {
            id: 'expense-group-8',
            name: '人情往来',
            icon: '🎁',
            color: '#C0C0C0',
            children: [
              { id: 'expense-8-1', name: '送礼请客', icon: '🎁', color: '#C0C0C0' },
              { id: 'expense-8-2', name: '孝敬家长', icon: '👨‍👩‍👧', color: '#D0D0D0' },
              { id: 'expense-8-3', name: '慈善捐助', icon: '❤️', color: '#E0E0E0' }
            ]
          },
          {
            id: 'expense-group-9',
            name: '医疗保健',
            icon: '💊',
            color: '#F08080',
            children: [
              { id: 'expense-9-1', name: '药品费', icon: '💊', color: '#F08080' },
              { id: 'expense-9-2', name: '保健费', icon: '💪', color: '#F5A3A3' },
              { id: 'expense-9-3', name: '美容费', icon: '💅', color: '#FAC6C6' },
              { id: 'expense-9-4', name: '治疗费', icon: '🏥', color: '#F08080' }
            ]
          },
          {
            id: 'expense-group-10',
            name: '金融保险',
            icon: '💰',
            color: '#87CEFA',
            children: [
              { id: 'expense-10-1', name: '按揭还款', icon: '🏦', color: '#87CEFA' },
              { id: 'expense-10-2', name: '消费税收', icon: '📋', color: '#A8D8F0' },
              { id: 'expense-10-3', name: '利息支出', icon: '📈', color: '#C9E7F5' },
              { id: 'expense-10-4', name: '赔偿罚款', icon: '⚠️', color: '#87CEFA' },
              { id: 'expense-10-5', name: '保险投资', icon: '🛡️', color: '#A8D8F0' }
            ]
          },
          {
            id: 'expense-group-11',
            name: '其他杂项',
            icon: '💸',
            color: '#B0C4DE',
            children: [
              { id: 'expense-11-1', name: '意外丢失', icon: '❌', color: '#B0C4DE' },
              { id: 'expense-11-2', name: '其他支出', icon: '💸', color: '#C3D3E7' },
              { id: 'expense-11-3', name: '烂账损失', icon: '📉', color: '#D6E2F0' },
              { id: 'expense-11-4', name: '早安红包', icon: '🧧', color: '#B0C4DE' },
              { id: 'expense-11-5', name: '刷单', icon: '🖱️', color: '#C3D3E7' }
            ]
          }
        ]
      },
      income: {
        groups: [
          {
            id: 'income-group-1',
            name: '职业收入',
            icon: '💼',
            color: '#4ECDC4',
            children: [
              { id: 'income-1-1', name: '工资收入', icon: '💰', color: '#4ECDC4' },
              { id: 'income-1-2', name: '利息收入', icon: '📈', color: '#7EDDD6' },
              { id: 'income-1-3', name: '加班收入', icon: '⏱️', color: '#A8EDE4' },
              { id: 'income-1-4', name: '奖金收入', icon: '🏆', color: '#4ECDC4' },
              { id: 'income-1-5', name: '投资收入', icon: '📊', color: '#7EDDD6' },
              { id: 'income-1-6', name: '兼职收入', icon: '💼', color: '#A8EDE4' },
              { id: 'income-1-7', name: '刷单收入', icon: '🖱️', color: '#4ECDC4' }
            ]
          },
          {
            id: 'income-group-2',
            name: '其他收入',
            icon: '💵',
            color: '#FFE66D',
            children: [
              { id: 'income-2-1', name: '礼金收入', icon: '🎁', color: '#FFE66D' },
              { id: 'income-2-2', name: '中奖收入', icon: '🎰', color: '#FFF09D' },
              { id: 'income-2-3', name: '意外收入', icon: '✨', color: '#FFF6C4' },
              { id: 'income-2-4', name: '经营所得', icon: '🏪', color: '#FFE66D' },
              { id: 'income-2-5', name: '信用卡还款', icon: '💳', color: '#FFF09D' },
              { id: 'income-2-6', name: '乱账收入', icon: '❓', color: '#FFF6C4' }
            ]
          }
        ]
      }
    };

    // 初始化全局数据
    this.globalData = {
      records: [],
      accounts: [],
      categories: JSON.parse(JSON.stringify(this.DEFAULT_CATEGORIES)),
      accountCategories: [
        { id: 1, name: '现金', icon: '💵', color: '#FF6B6B', type: 'asset' },
        { id: 2, name: '信用卡', icon: '💳', color: '#4ECDC4', type: 'credit' },
        { id: 3, name: '储蓄卡', icon: '🏦', color: '#FFE66D', type: 'asset' },
        { id: 4, name: '基金账户', icon: '📊', color: '#A8E6CF', type: 'invest' },
        { id: 5, name: '股票账户', icon: '📈', color: '#87CEEB', type: 'invest' },
        { id: 6, name: '虚拟账户', icon: '📱', color: '#FFB6C1', type: 'asset' },
        { id: 7, name: '负债账户', icon: '📝', color: '#DDA0DD', type: 'debt' },
        { id: 8, name: '债权账户', icon: '📋', color: '#C0C0C0', type: 'receivable' }
      ],
      defaultAccounts: {
        '现金': [
          { name: '现金', icon: '💵' }
        ],
        '信用卡': [
          { name: '花呗', icon: '🐜' },
          { name: '京东白条', icon: '🐕' },
          { name: '招商银行信用卡', icon: '💳' },
          { name: '工商银行信用卡', icon: '💳' },
          { name: '建设银行信用卡', icon: '💳' },
          { name: '其他信用卡', icon: '💳' }
        ],
        '储蓄卡': [
          { name: '招商银行储蓄卡', icon: '🏦' },
          { name: '工商银行储蓄卡', icon: '🏦' },
          { name: '建设银行储蓄卡', icon: '🏦' },
          { name: '农业银行储蓄卡', icon: '🏦' },
          { name: '中国银行储蓄卡', icon: '🏦' },
          { name: '其他储蓄卡', icon: '🏦' }
        ],
        '虚拟账户': [
          { name: '微信钱包', icon: '💬' },
          { name: '支付宝', icon: '💙' },
          { name: 'QQ钱包', icon: '🐧' }
        ]
      },
      icons: [
        { icon: '💰' }, { icon: '💵' }, { icon: '💴' }, { icon: '💶' }, { icon: '💷' },
        { icon: '💳' }, { icon: '🏦' }, { icon: '💹' }, { icon: '📈' }, { icon: '📊' },
        { icon: '💼' }, { icon: '💎' }, { icon: '🏛️' }, { icon: '📱' }, { icon: '💬' },
        { icon: '🐜' }, { icon: '🐕' }, { icon: '🐧' }, { icon: '💙' }, { icon: '🟢' },
        { icon: '🔴' }, { icon: '🟠' }, { icon: '🟡' }, { icon: '🔵' }, { icon: '🟣' }
      ]
    };

    if (!wx.cloud) {
      logger.error('App', '请使用 2.2.3 或以上的基础库以使用云能力');
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showModal({
        title: '提示',
        content: '请使用 2.2.3 或以上的基础库以使用云能力',
        showCancel: false
      });
    } else {
      logger.info('App', '初始化云开发');
      try {
        wx.cloud.init({
          env: 'cloud1-d3gvv57hn4dfa5588',
          traceUser: true
        });
        logger.info('App', '云开发初始化成功');
      } catch (e) {
        logger.error('App', '云开发初始化失败', e);
        wx.showModal({
          title: '初始化失败',
          content: '云开发初始化失败: ' + (e.message || e),
          showCancel: false
        });
      }
      
      // 获取 openid
      this.getOpenId();
    }
  },

  getOpenId: function(callback) {
    logger.info('App', '开始获取openid');
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId'
      },
      success: res => {
        logger.info('App', '云函数返回结果', res);
        
        if (res.result && res.result.openid) {
          const openid = res.result.openid;
          wx.setStorageSync('openid', openid);
          logger.info('App', '获取openid成功', { openid });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1000
          });
          
          // 加载数据
          this.loadRecords(() => {
            this.loadAccounts(() => {
              this.loadCategories(() => {
                // 完成所有加载后，检查并迁移旧数据
                this.migrateOldData();
              });
            });
          });
        } else {
          logger.error('App', '获取openid失败，返回结果异常', res);
          wx.showModal({
            title: '获取用户信息失败',
            content: '请确保已部署云函数',
            showCancel: false
          });
        }
        
        if (callback) callback();
      },
      fail: err => {
        logger.error('App', '获取openid失败', err);
        
        wx.showModal({
          title: '云函数调用失败',
          content: '请确保已上传并部署云函数: ' + (err.errMsg || ''),
          showCancel: false
        });
        
        if (callback) callback();
      }
    });
  },

  loadRecords: function(callback, forceRefresh = false) {
    logger.info('App', '开始加载记账记录', { forceRefresh });
    
    if (!forceRefresh && this.globalData.records && this.globalData.records.length > 0) {
      logger.info('App', '使用内存中已有记账记录', { count: this.globalData.records.length });
      if (callback) callback();
      return;
    }
    
    cloudStorage.readDataFromCloud('records')
      .then(data => {
        if (data && data.length > 0) {
          data.sort((a, b) => {
            if (a.date !== b.date) {
              return new Date(b.date) - new Date(a.date);
            }
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
          
          this.globalData.records = data;
          logger.info('App', '记账记录加载成功', { count: data.length });
        } else {
          logger.info('App', '云存储没有记账记录，保持现有数据', { 
            existingCount: (this.globalData.records || []).length 
          });
        }
        
        if (callback) callback();
      })
      .catch(err => {
        logger.error('App', '加载记录失败', err);
        if (callback) callback();
      });
  },

  addRecord: function(record, callback) {
    logger.info('App', '开始添加记账记录', record);
    
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    const records = this.globalData.records || [];
    records.unshift(newRecord);
    
    if (record.accountId) {
      this.updateAccountBalance(record.accountId, record.type === 'expense' ? -parseFloat(record.amount) : parseFloat(record.amount));
    }
    
    cloudStorage.writeDataToCloud('records', records)
      .then(result => {
        if (result.success) {
          this.globalData.records = records;
          logger.info('App', '记账记录添加成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '记账记录添加失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '添加记录失败', err);
        if (callback) callback(false);
      });
  },

  updateAccountBalance: function(accountId, amount, isTransferIn = false) {
    const accounts = this.globalData.accounts || [];
    const account = accounts.find(acc => acc.id === accountId);
    
    if (account) {
      const oldBalance = parseFloat(account.balance) || 0;
      const newBalance = balanceCalculator.calculateNewBalance(account, amount, isTransferIn);
      
      account.balance = newBalance;
      
      logger.info('App', '更新账户余额', { 
        accountId, 
        accountName: account.name,
        accountCategory: account.category,
        oldBalance, 
        change: amount, 
        newBalance,
        isTransferIn
      });
      
      cloudStorage.writeDataToCloud('accounts', accounts)
        .then(result => {
          if (result.success) {
            logger.info('App', '账户余额更新成功');
          } else {
            logger.error('App', '账户余额更新失败', result.errMsg);
          }
        })
        .catch(err => {
          logger.error('App', '账户余额更新异常', err);
        });
    }
  },

  addTransfer: function(transfer, callback) {
    logger.info('App', '开始添加转账记录', transfer);
    
    const newTransfer = {
      ...transfer,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    const records = this.globalData.records || [];
    records.unshift(newTransfer);
    
    if (transfer.fromAccountId) {
      this.updateAccountBalance(transfer.fromAccountId, -parseFloat(transfer.amount), false);
    }
    
    if (transfer.toAccountId) {
      this.updateAccountBalance(transfer.toAccountId, parseFloat(transfer.amount), true);
    }
    
    cloudStorage.writeDataToCloud('records', records)
      .then(result => {
        if (result.success) {
          this.globalData.records = records;
          logger.info('App', '转账记录添加成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '转账记录添加失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '添加转账失败', err);
        if (callback) callback(false);
      });
  },

  deleteRecord: function(id, callback) {
    logger.info('App', '删除记录', { id });
    
    const record = this.globalData.records.find(rec => rec.id === id);
    if (!record) {
      logger.error('App', '未找到要删除的记录');
      if (callback) callback(false);
      return;
    }
    
    logger.info('App', '找到要删除的记录', record);
    
    if (record.type === 'transfer') {
      if (record.fromAccountId) {
        this.updateAccountBalance(record.fromAccountId, parseFloat(record.amount), false);
      }
      if (record.toAccountId) {
        this.updateAccountBalance(record.toAccountId, -parseFloat(record.amount), true);
      }
    } else {
      if (record.accountId) {
        this.updateAccountBalance(record.accountId, record.type === 'expense' ? parseFloat(record.amount) : -parseFloat(record.amount));
      }
    }
    
    const records = this.globalData.records.filter(rec => rec.id !== id);
    
    cloudStorage.writeDataToCloud('records', records)
      .then(result => {
        if (result.success) {
          this.globalData.records = records;
          logger.info('App', '记录删除成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '记录删除失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '删除记录失败', err);
        if (callback) callback(false);
      });
  },

  updateRecord: function(id, newRecord, callback) {
    logger.info('App', '更新记录', { id, newRecord });
    
    const oldRecord = this.globalData.records.find(rec => rec.id === id);
    if (!oldRecord) {
      logger.error('App', '未找到要更新的记录');
      if (callback) callback(false);
      return;
    }
    
    logger.info('App', '找到要更新的记录', oldRecord);
    
    if (oldRecord.type === 'transfer') {
      if (oldRecord.fromAccountId) {
        this.updateAccountBalance(oldRecord.fromAccountId, parseFloat(oldRecord.amount), false);
      }
      if (oldRecord.toAccountId) {
        this.updateAccountBalance(oldRecord.toAccountId, -parseFloat(oldRecord.amount), true);
      }
    } else {
      if (oldRecord.accountId) {
        this.updateAccountBalance(oldRecord.accountId, oldRecord.type === 'expense' ? parseFloat(oldRecord.amount) : -parseFloat(oldRecord.amount));
      }
    }
    
    const records = this.globalData.records.map(rec => {
      if (rec.id === id) {
        return {
          ...rec,
          ...newRecord,
          id: id,
          updatedAt: new Date().toISOString()
        };
      }
      return rec;
    });
    
    const updatedRecord = records.find(rec => rec.id === id);
    if (updatedRecord.type === 'transfer') {
      if (updatedRecord.fromAccountId) {
        this.updateAccountBalance(updatedRecord.fromAccountId, -parseFloat(updatedRecord.amount), false);
      }
      if (updatedRecord.toAccountId) {
        this.updateAccountBalance(updatedRecord.toAccountId, parseFloat(updatedRecord.amount), true);
      }
    } else {
      if (updatedRecord.accountId) {
        this.updateAccountBalance(updatedRecord.accountId, updatedRecord.type === 'expense' ? -parseFloat(updatedRecord.amount) : parseFloat(updatedRecord.amount));
      }
    }
    
    cloudStorage.writeDataToCloud('records', records)
      .then(result => {
        if (result.success) {
          this.globalData.records = records;
          logger.info('App', '记录更新成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '记录更新失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '更新记录失败', err);
        if (callback) callback(false);
      });
  },

  loadAccounts: function(callback, forceRefresh = false) {
    logger.info('App', '开始加载账户', { forceRefresh });
    
    if (!forceRefresh && this.globalData.accounts && this.globalData.accounts.length > 0) {
      logger.info('App', '使用内存中已有账户数据');
      if (callback) callback();
      return;
    }
    
    cloudStorage.readDataFromCloud('accounts')
      .then(data => {
        if (data && data.length > 0) {
          this.globalData.accounts = data;
          logger.info('App', '账户加载成功', { count: data.length });
        } else {
          logger.info('App', '云存储没有账户数据或读取失败，使用空数组');
          this.globalData.accounts = [];
        }
        
        if (callback) callback();
      })
      .catch(err => {
        logger.error('App', '加载账户失败', err);
        this.globalData.accounts = [];
        if (callback) callback();
      });
  },

  addAccount: function(account, callback) {
    logger.info('App', '开始添加账户', account);
    
    const newAccount = {
      ...account,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      order: 0
    };
    
    const accounts = this.globalData.accounts || [];
    accounts.push(newAccount);
    
    cloudStorage.writeDataToCloud('accounts', accounts)
      .then(result => {
        if (result.success) {
          this.globalData.accounts = accounts;
          logger.info('App', '账户添加成功', { count: accounts.length });
          
          wx.showToast({
            title: '添加成功',
            icon: 'success',
            duration: 1000
          });
          
          if (callback) callback(true);
        } else {
          logger.error('App', '账户添加失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '添加账户失败', err);
        if (callback) callback(false);
      });
  },

  updateAccount: function(account, callback) {
    logger.info('App', '开始更新账户', account);
    
    const accounts = this.globalData.accounts || [];
    const index = accounts.findIndex(acc => acc.id === account.id);
    
    if (index !== -1) {
      accounts[index] = {
        ...accounts[index],
        ...account,
        updatedAt: new Date().toISOString()
      };
    }
    
    cloudStorage.writeDataToCloud('accounts', accounts)
      .then(result => {
        if (result.success) {
          this.globalData.accounts = accounts;
          logger.info('App', '账户更新成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '账户更新失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '更新账户失败', err);
        if (callback) callback(false);
      });
  },

  deleteAccount: function(id, callback) {
    logger.info('App', '删除账户', { id });
    
    const accounts = this.globalData.accounts.filter(acc => acc.id !== id);
    
    cloudStorage.writeDataToCloud('accounts', accounts)
      .then(result => {
        if (result.success) {
          this.globalData.accounts = accounts;
          logger.info('App', '账户删除成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '账户删除失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '删除账户失败', err);
        if (callback) callback(false);
      });
  },

  loadCategories: function(callback, forceRefresh = false) {
    logger.info('App', '开始加载分类', { forceRefresh });
    
    if (!forceRefresh) {
      logger.info('App', '使用内存中已有分类数据');
      if (callback) callback();
      return;
    }
    
    cloudStorage.readDataFromCloud('categories')
      .then(data => {
        if (data && data.expense && data.income) {
          this.globalData.categories = data;
          logger.info('App', '分类数据从云存储加载成功');
        } else {
          logger.info('App', '云存储没有分类数据或格式不对，使用默认数据并保存到云端');
          this.saveCategories();
        }
        if (callback) callback();
      })
      .catch(err => {
        logger.error('App', '加载分类失败，使用默认数据', err);
        this.saveCategories();
        if (callback) callback();
      });
  },

  saveCategories: function(callback) {
    logger.info('App', '保存分类数据到云端');
    
    cloudStorage.writeDataToCloud('categories', this.globalData.categories)
      .then(result => {
        if (result.success) {
          logger.info('App', '分类数据保存到云端成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '分类数据保存到云端失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '保存分类到云端失败', err);
        if (callback) callback(false);
      });
  },

  saveAccounts: function(callback) {
    logger.info('App', '保存账户数据到云端');
    
    cloudStorage.writeDataToCloud('accounts', this.globalData.accounts)
      .then(result => {
        if (result.success) {
          logger.info('App', '账户数据保存到云端成功');
          if (callback) callback(true);
        } else {
          logger.error('App', '账户数据保存到云端失败', result.errMsg);
          if (callback) callback(false);
        }
      })
      .catch(err => {
        logger.error('App', '保存账户到云端失败', err);
        if (callback) callback(false);
      });
  },

  migrateOldData: function() {
    logger.info('App', '开始检查并迁移旧数据');
    
    let needSave = false;
    const records = this.globalData.records || [];
    
    // 获取默认分类的映射
    const defaultExpenseCategory = {
      id: 'expense-11-2',
      name: '其他支出',
      icon: '💸',
      color: '#C3D3E7',
      groupId: 'expense-group-11',
      groupName: '其他杂项'
    };
    
    const defaultIncomeCategory = {
      id: 'income-1-1',
      name: '工资收入',
      icon: '💰',
      color: '#4ECDC4',
      groupId: 'income-group-1',
      groupName: '职业收入'
    };
    
    // 检查并更新每条记录
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // 判断是否是旧格式的数据（旧分类系统使用数字ID，新的使用字符串ID）
      // 或者没有 categoryName 的记录
      if ((!record.categoryId || typeof record.categoryId === 'number') && 
          record.type !== 'transfer') {
        logger.info('App', '发现需要迁移的记录', record);
        
        const defaultCategory = record.type === 'expense' ? defaultExpenseCategory : defaultIncomeCategory;
        
        records[i] = {
          ...record,
          categoryId: defaultCategory.id,
          categoryName: defaultCategory.name,
          categoryIcon: defaultCategory.icon
        };
        
        needSave = true;
        logger.info('App', '记录迁移完成', records[i]);
      }
      
      // 检查分类名称或图标是否需要更新（v1.0.1 版本更新）
      // 日常药品 -> 日常用品, 💊 -> 🛒
      if (record.categoryName === '日常药品' || record.categoryIcon === '💊') {
        logger.info('App', '发现需要更新的分类记录', record);
        
        records[i] = {
          ...record,
          categoryId: 'expense-3-1',
          categoryName: '日常用品',
          categoryIcon: '🛒'
        };
        
        needSave = true;
        logger.info('App', '分类更新完成', records[i]);
      }
      
      // 检查早午餐和早晚餐的分类
      if (record.categoryName === '早午餐' || record.categoryName === '早晚餐') {
        logger.info('App', '发现需要更新的食品分类记录', record);
        
        records[i] = {
          ...record,
          categoryId: 'expense-2-2',
          categoryName: '三餐',
          categoryIcon: '🍽️'
        };
        
        needSave = true;
        logger.info('App', '食品分类更新完成', records[i]);
      }
    }
    
    // 如果有更新，保存到云端
    if (needSave) {
      cloudStorage.writeDataToCloud('records', records)
        .then(result => {
          if (result.success) {
            this.globalData.records = records;
            logger.info('App', '旧数据迁移完成并保存到云端');
          }
        })
        .catch(err => {
          logger.error('App', '保存迁移后的记录失败', err);
        });
    } else {
      logger.info('App', '没有需要迁移的数据');
    }
    
    // 无论是否有记录需要迁移，都强制更新分类数据到云端
    this.globalData.categories = JSON.parse(JSON.stringify(this.DEFAULT_CATEGORIES));
    this.saveCategories();
  },

  clearAllData: function(callback) {
    logger.info('App', '清空所有数据');
    
    Promise.all([
      cloudStorage.writeDataToCloud('records', []),
      cloudStorage.writeDataToCloud('accounts', [])
    ])
    .then(([recordsResult, accountsResult]) => {
      if (recordsResult.success && accountsResult.success) {
        this.globalData.records = [];
        this.globalData.accounts = [];
        logger.info('App', '所有数据清空成功');
        if (callback) callback(true);
      } else {
        logger.error('App', '数据清空失败');
        if (callback) callback(false);
      }
    })
    .catch(err => {
      logger.error('App', '清空数据失败', err);
      if (callback) callback(false);
    });
  },

  exportAllData: function(callback) {
    logger.info('App', '导出所有数据');
    
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      records: this.globalData.records || [],
      accounts: this.globalData.accounts || [],
      categories: this.globalData.categories
    };
    
    if (callback) callback(exportData);
  },

  importAllData: function(importData, callback) {
    logger.info('App', '导入所有数据');
    
    Promise.all([
      cloudStorage.writeDataToCloud('records', importData.records || []),
      cloudStorage.writeDataToCloud('accounts', importData.accounts || []),
      importData.categories ? cloudStorage.writeDataToCloud('categories', importData.categories) : Promise.resolve({ success: true })
    ])
    .then(([recordsResult, accountsResult, categoriesResult]) => {
      if (recordsResult.success && accountsResult.success && categoriesResult.success) {
        this.globalData.records = importData.records || [];
        this.globalData.accounts = importData.accounts || [];
        if (importData.categories) {
          this.globalData.categories = importData.categories;
        }
        logger.info('App', '数据导入成功');
        if (callback) callback(true);
      } else {
        logger.error('App', '数据导入失败');
        if (callback) callback(false);
      }
    })
    .catch(err => {
      logger.error('App', '导入数据失败', err);
      if (callback) callback(false);
    });
  },

  addCategory: function(categoryType, groupId, category, callback) {
    logger.info('App', '添加分类', { categoryType, groupId, category });
    
    const categories = this.globalData.categories[categoryType];
    const group = categories.groups.find(g => g.id === groupId);
    
    if (group) {
      const newCategory = {
        ...category,
        id: `${categoryType}-${Date.now()}`
      };
      group.children = group.children || [];
      group.children.push(newCategory);
      
      this.saveCategories(success => {
        if (success) {
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
        }
        if (callback) callback(success);
      });
    }
  },

  updateCategory: function(categoryType, groupId, categoryId, category, callback) {
    logger.info('App', '更新分类', { categoryType, groupId, categoryId, category });
    
    const categories = this.globalData.categories[categoryType];
    const group = categories.groups.find(g => g.id === groupId);
    
    if (group && group.children) {
      const index = group.children.findIndex(c => c.id === categoryId);
      if (index !== -1) {
        group.children[index] = { ...group.children[index], ...category };
        
        this.saveCategories(success => {
          if (success) {
            wx.showToast({
              title: '更新成功',
              icon: 'success'
            });
          }
          if (callback) callback(success);
        });
      }
    }
  },

  deleteCategory: function(categoryType, groupId, categoryId, callback) {
    logger.info('App', '删除分类', { categoryType, groupId, categoryId });
    
    const categories = this.globalData.categories[categoryType];
    const group = categories.groups.find(g => g.id === groupId);
    
    if (group && group.children) {
      group.children = group.children.filter(c => c.id !== categoryId);
      
      this.saveCategories(success => {
        if (success) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
        if (callback) callback(success);
      });
    }
  },

  addCategoryGroup: function(categoryType, group, callback) {
    logger.info('App', '添加分类组', { categoryType, group });
    
    const categories = this.globalData.categories[categoryType];
    const newGroup = {
      ...group,
      id: `${categoryType}-group-${Date.now()}`,
      children: []
    };
    categories.groups.push(newGroup);
    
    this.saveCategories(success => {
      if (success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      }
      if (callback) callback(success);
    });
  },

  updateCategoryGroup: function(categoryType, groupId, group, callback) {
    logger.info('App', '更新分类组', { categoryType, groupId, group });
    
    const categories = this.globalData.categories[categoryType];
    const index = categories.groups.findIndex(g => g.id === groupId);
    
    if (index !== -1) {
      categories.groups[index] = { ...categories.groups[index], ...group };
      
      this.saveCategories(success => {
        if (success) {
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
        }
        if (callback) callback(success);
      });
    }
  },

  deleteCategoryGroup: function(categoryType, groupId, callback) {
    logger.info('App', '删除分类组', { categoryType, groupId });
    
    const categories = this.globalData.categories[categoryType];
    categories.groups = categories.groups.filter(g => g.id !== groupId);
    
    this.saveCategories(success => {
      if (success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }
      if (callback) callback(success);
    });
  },

  getFlatCategories: function(categoryType) {
    const categories = this.globalData.categories[categoryType];
    const flat = [];
    
    categories.groups.forEach(group => {
      (group.children || []).forEach(child => {
        flat.push({
          ...child,
          groupId: group.id,
          groupName: group.name
        });
      });
    });
    
    return flat;
  }
});
