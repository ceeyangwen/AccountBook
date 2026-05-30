
/**
 * 账户余额计算模块
 * 提供统一的余额计算逻辑
 */

const logger = require('./logger.js');

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
  
  logger.info('balanceCalculator', '计算余额', {
    accountName: account.name,
    accountType,
    oldBalance,
    amount,
    isTransferIn
  });

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
  
  logger.info('balanceCalculator', '计算完成', { oldBalance, newBalance });
  
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
    // 转账转入：正数减少负债；反向冲销时传入负数，需恢复负债。
    return (oldBalance - amount).toFixed(2);
  } else {
    // 对于负债/信用类账户，普通操作需要取反：
    // 支出（amount为负）→ 负债增加（余额增加）
    // 收入（amount为正）→ 负债减少（余额减少）
    return (oldBalance - amount).toFixed(2);
  }
}

/**
 * 导出模块供测试使用
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACCOUNT_TYPES,
    calculateNewBalance,
    getAccountType,
    calculateDebtAccountBalance
  };
}
