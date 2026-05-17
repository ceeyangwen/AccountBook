/**
 * 测试用的 logger 模拟
 */
const testLogger = {
  info: function() {},
  error: function() {},
  warn: function() {}
};

/**
 * 账户余额计算模块（纯功能版本，不依赖小程序环境）
 * 提供统一的余额计算逻辑，用于单元测试
 */

// 账户类型枚举
const ACCOUNT_TYPES = {
  ASSET: 'asset',        // 资产类（现金、储蓄卡、虚拟账户等）
  CREDIT: 'credit',      // 信用类（信用卡）
  DEBT: 'debt',          // 负债类（负债账户）
  INVEST: 'invest',      // 投资类（基金、股票）
  RECEIVABLE: 'receivable' // 债权类
};

/**
 * 计算新的账户余额
 * @param {Object} account - 账户对象
 * @param {number} amount - 变动金额（正数表示增加，负数表示减少）
 * @param {boolean} isTransferIn - 是否是转账转入（仅对转账操作有效）
 * @returns {string} 新的余额（保留两位小数）
 */
function calculateNewBalance(account, amount, isTransferIn = false) {
  const oldBalance = parseFloat(account.balance) || 0;
  const accountType = getAccountType(account.category);
  
  let newBalance;

  // 根据账户类型处理余额
  switch (accountType) {
    case ACCOUNT_TYPES.CREDIT:
    case ACCOUNT_TYPES.DEBT:
      // 信用类和负债类账户
      newBalance = calculateDebtAccountBalance(oldBalance, amount, isTransferIn);
      break;
      
    case ACCOUNT_TYPES.ASSET:
    case ACCOUNT_TYPES.INVEST:
    case ACCOUNT_TYPES.RECEIVABLE:
    default:
      // 资产类、投资类、债权类账户：直接加减
      newBalance = (oldBalance + amount).toFixed(2);
      break;
  }
  
  return newBalance;
}

/**
 * 获取账户类型
 * @param {string} categoryName - 账户分类名称
 * @returns {string} 账户类型
 */
function getAccountType(categoryName) {
  const categoryMap = {
    '现金': ACCOUNT_TYPES.ASSET,
    '信用卡': ACCOUNT_TYPES.CREDIT,
    '储蓄卡': ACCOUNT_TYPES.ASSET,
    '基金账户': ACCOUNT_TYPES.INVEST,
    '股票账户': ACCOUNT_TYPES.INVEST,
    '虚拟账户': ACCOUNT_TYPES.ASSET,
    '负债账户': ACCOUNT_TYPES.DEBT,
    '债权账户': ACCOUNT_TYPES.RECEIVABLE
  };
  
  return categoryMap[categoryName] || ACCOUNT_TYPES.ASSET;
}

/**
 * 计算负债/信用类账户的余额
 * @param {number} oldBalance - 旧余额
 * @param {number} amount - 变动金额（正数表示增加，负数表示减少）
 * @param {boolean} isTransferIn - 是否是转账转入
 * @returns {string} 新余额
 */
function calculateDebtAccountBalance(oldBalance, amount, isTransferIn) {
  if (isTransferIn) {
    // 转账转入：减少负债（余额减少）
    return (oldBalance - Math.abs(amount)).toFixed(2);
  } else {
    // 对于负债/信用类账户，普通操作需要取反：
    // 支出（amount为负）→ 负债增加（余额增加）
    // 收入（amount为正）→ 负债减少（余额减少）
    return (oldBalance - amount).toFixed(2);
  }
}

/**
 * 账号详情功能的核心逻辑（可测试版）
 */

/**
 * 过滤并处理一个账号的所有记录
 * @param {Array} records - 所有记录
 * @param {string} accountId - 账号ID
 * @returns {Array} 处理后的记录数组
 */
function filterAndProcessRecords(records, accountId, categories = {}) {
  return records.filter(record => {
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
      const typeCategories = categories[record.type] || [];
      const category = typeCategories.find(c => c.id === record.categoryId);
      processedRecord.recordIcon = category ? category.icon : '📝';
    }
    
    return processedRecord;
  });
}

/**
 * 计算一个账号的统计信息
 * @param {Array} records - 该账号的记录
 * @param {string} accountId - 账号ID
 * @returns {Object} 统计信息
 */
function calculateAccountSummary(records, accountId) {
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
}

/**
 * 按日期分组记录
 * @param {Array} records - 记录数组
 * @returns {Array} 分组后的记录
 */
function groupRecordsByDate(records) {
  const dateMap = {};
  
  records.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
    const date = new Date(record.date);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        date: date,
        dateText: formatDateText(date),
        records: []
      };
    }
    
    dateMap[dateKey].records.push(record);
  });

  return Object.values(dateMap);
}

/**
 * 格式化日期文本
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期文本
 */
function formatDateText(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
}

/**
 * 计算所有账户的总余额（考虑 includeInTotal 属性）
 * @param {Array} accounts - 账户数组
 * @param {Array} accountCategories - 账户分类数组
 * @returns {string} 总余额（保留两位小数）
 */
function calculateTotalBalance(accounts, accountCategories) {
  let totalBalance = 0;
  
  accounts.forEach(account => {
    const categoryInfo = accountCategories.find(cat => cat.name === account.category);
    if (categoryInfo) {
      const balance = parseFloat(account.balance) || 0;
      
      // 只有 includeInTotal 为 true 的账户才计入总余额
      if (account.includeInTotal !== false) {
        // 资产、投资和债权类型账户累加余额，负债和信用类型账户扣除余额
        if (categoryInfo.type === 'debt' || categoryInfo.type === 'credit') {
          // 负债和信用类账户，余额应该扣除（显示为负数）
          totalBalance -= balance;
        } else {
          // 资产、投资和债权类账户，余额累加
          totalBalance += balance;
        }
      }
    }
  });
  
  return totalBalance.toFixed(2);
}

/**
 * 导出模块供测试使用
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACCOUNT_TYPES,
    calculateNewBalance,
    getAccountType,
    calculateDebtAccountBalance,
    filterAndProcessRecords,
    calculateAccountSummary,
    groupRecordsByDate,
    formatDateText,
    calculateTotalBalance
  };
}