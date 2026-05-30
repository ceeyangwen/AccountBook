/**
 * 账户余额计算模块单元测试
 */

const {
  calculateNewBalance,
  getAccountType,
  calculateDebtAccountBalance,
  ACCOUNT_TYPES
} = require('./test-utils.js');

console.log('========================================');
console.log('    账户余额计算模块单元测试');
console.log('========================================\n');

// 测试统计
let passed = 0;
let failed = 0;

// 测试辅助函数
function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.error(`   错误: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - 期望: ${expected}, 实际: ${actual}`);
  }
}

console.log('1. 测试 getAccountType 函数\n');

test('应正确识别现金账户为资产类', () => {
  assertEqual(getAccountType('现金'), ACCOUNT_TYPES.ASSET, '现金账户类型');
});

test('应正确识别信用卡账户为信用类', () => {
  assertEqual(getAccountType('信用卡'), ACCOUNT_TYPES.CREDIT, '信用卡账户类型');
});

test('应正确识别储蓄卡账户为资产类', () => {
  assertEqual(getAccountType('储蓄卡'), ACCOUNT_TYPES.ASSET, '储蓄卡账户类型');
});

test('应正确识别负债账户为负债类', () => {
  assertEqual(getAccountType('负债账户'), ACCOUNT_TYPES.DEBT, '负债账户类型');
});

test('应正确识别基金账户为投资类', () => {
  assertEqual(getAccountType('基金账户'), ACCOUNT_TYPES.INVEST, '基金账户类型');
});

test('应正确识别股票账户为投资类', () => {
  assertEqual(getAccountType('股票账户'), ACCOUNT_TYPES.INVEST, '股票账户类型');
});

test('应正确识别债权账户为债权类', () => {
  assertEqual(getAccountType('债权账户'), ACCOUNT_TYPES.RECEIVABLE, '债权账户类型');
});

test('应正确识别未知账户为资产类', () => {
  assertEqual(getAccountType('未知'), ACCOUNT_TYPES.ASSET, '未知账户类型');
});

console.log('\n2. 测试资产类账户余额计算\n');

test('现金账户支出20元，余额应减少20元', () => {
  const account = { name: '现金', category: '现金', balance: '100.00' };
  const newBalance = calculateNewBalance(account, -20, false);
  assertEqual(newBalance, '80.00', '现金支出');
});

test('现金账户收入50元，余额应增加50元', () => {
  const account = { name: '现金', category: '现金', balance: '100.00' };
  const newBalance = calculateNewBalance(account, 50, false);
  assertEqual(newBalance, '150.00', '现金收入');
});

test('基金账户投资收益100元，余额应增加100元', () => {
  const account = { name: '基金账户', category: '基金账户', balance: '500.00' };
  const newBalance = calculateNewBalance(account, 100, false);
  assertEqual(newBalance, '600.00', '基金收益');
});

console.log('\n3. 测试信用/负债类账户余额计算\n');

test('信用卡支出20元，余额应增加20元（负债增加）', () => {
  const account = { name: '招商银行信用卡', category: '信用卡', balance: '0.00' };
  const newBalance = calculateNewBalance(account, -20, false);
  assertEqual(newBalance, '20.00', '信用卡支出');
});

test('信用卡还款100元（收入），余额应减少100元（负债减少）', () => {
  const account = { name: '招商银行信用卡', category: '信用卡', balance: '200.00' };
  const newBalance = calculateNewBalance(account, 100, false);
  assertEqual(newBalance, '100.00', '信用卡还款');
});

test('负债账户支出50元，余额应增加50元', () => {
  const account = { name: '个人借款', category: '负债账户', balance: '500.00' };
  const newBalance = calculateNewBalance(account, -50, false);
  assertEqual(newBalance, '550.00', '负债支出');
});

test('负债账户还款30元，余额应减少30元', () => {
  const account = { name: '个人借款', category: '负债账户', balance: '100.00' };
  const newBalance = calculateNewBalance(account, 30, false);
  assertEqual(newBalance, '70.00', '负债还款');
});

console.log('\n4. 测试转账逻辑\n');

test('现金转信用卡20元，信用卡余额应减少20元（负债减少）', () => {
  const account = { name: '招商银行信用卡', category: '信用卡', balance: '100.00' };
  const newBalance = calculateNewBalance(account, 20, true);
  assertEqual(newBalance, '80.00', '信用卡转入');
});

test('现金转信用卡20元，现金余额应减少20元', () => {
  const account = { name: '现金', category: '现金', balance: '200.00' };
  const newBalance = calculateNewBalance(account, -20, false);
  assertEqual(newBalance, '180.00', '现金转出');
});

test('信用卡转储蓄卡50元，信用卡余额应增加50元（负债增加）', () => {
  const account = { name: '招商银行信用卡', category: '信用卡', balance: '100.00' };
  const newBalance = calculateNewBalance(account, -50, false);
  assertEqual(newBalance, '150.00', '信用卡转出');
});

console.log('\n5. 测试 calculateDebtAccountBalance 函数\n');

test('债务账户普通操作（非转账）应正确取反', () => {
  // 支出 -20 → 余额 +20
  assertEqual(calculateDebtAccountBalance(0, -20, false), '20.00', '债务支出');
  // 收入 +50 → 余额 -50
  assertEqual(calculateDebtAccountBalance(100, 50, false), '50.00', '债务收入');
});

test('债务账户转账转入应减少负债', () => {
  assertEqual(calculateDebtAccountBalance(100, 30, true), '70.00', '债务转入');
  assertEqual(calculateDebtAccountBalance(50, -30, true), '80.00', '债务转入反向冲销');
});

console.log('\n6. 测试边界情况\n');

test('零余额账户操作', () => {
  const account = { name: '测试', category: '信用卡', balance: '0.00' };
  assertEqual(calculateNewBalance(account, -10, false), '10.00', '零余额支出');
  assertEqual(calculateNewBalance(account, 10, false), '-10.00', '零余额收入');
});

test('小数精度处理', () => {
  const account = { name: '测试', category: '现金', balance: '10.50' };
  assertEqual(calculateNewBalance(account, -3.25, false), '7.25', '小数减法');
  assertEqual(calculateNewBalance(account, 5.75, false), '16.25', '小数加法');
});

test('负数余额处理', () => {
  const account = { name: '测试', category: '信用卡', balance: '-50.00' };
  assertEqual(calculateNewBalance(account, -30, false), '-20.00', '负数余额支出');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
