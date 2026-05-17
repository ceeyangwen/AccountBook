/**
 * 账号详情功能单元测试
 */

const {
  filterAndProcessRecords,
  calculateAccountSummary,
  groupRecordsByDate,
  formatDateText
} = require('./test-utils.js');

console.log('========================================');
console.log('      账号详情功能单元测试');
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

// 测试数据
const testCategories = {
  expense: [
    { id: 1, name: '餐饮', icon: '🍜', color: '#FF6B6B' },
    { id: 2, name: '交通', icon: '🚗', color: '#4ECDC4' }
  ],
  income: [
    { id: 9, name: '工资', icon: '💰', color: '#FF6B6B' },
    { id: 10, name: '兼职', icon: '💼', color: '#4ECDC4' }
  ]
};

const testRecords = [
  // 账户1的支出记录
  {
    id: '1',
    type: 'expense',
    amount: '20.00',
    accountId: 'acc1',
    accountName: '现金',
    categoryId: 1,
    categoryName: '餐饮',
    categoryIcon: '🍜',
    note: '早餐',
    date: '2026-05-15',
    createdAt: '2026-05-15T10:00:00.000Z'
  },
  // 账户1的收入记录
  {
    id: '2',
    type: 'income',
    amount: '500.00',
    accountId: 'acc1',
    accountName: '现金',
    categoryId: 9,
    categoryName: '工资',
    categoryIcon: '💰',
    note: '工资',
    date: '2026-05-14',
    createdAt: '2026-05-14T18:00:00.000Z'
  },
  // 账户2的支出记录
  {
    id: '3',
    type: 'expense',
    amount: '100.00',
    accountId: 'acc2',
    accountName: '招商银行信用卡',
    categoryId: 2,
    categoryName: '交通',
    categoryIcon: '🚗',
    note: '打车',
    date: '2026-05-15',
    createdAt: '2026-05-15T12:00:00.000Z'
  },
  // 转账记录：从acc1转acc2
  {
    id: '4',
    type: 'transfer',
    amount: '200.00',
    fromAccountId: 'acc1',
    fromAccountName: '现金',
    toAccountId: 'acc2',
    toAccountName: '招商银行信用卡',
    note: '还款',
    date: '2026-05-13',
    createdAt: '2026-05-13T20:00:00.000Z'
  },
  // 转账记录：从acc2转acc1
  {
    id: '5',
    type: 'transfer',
    amount: '50.00',
    fromAccountId: 'acc2',
    fromAccountName: '招商银行信用卡',
    toAccountId: 'acc1',
    toAccountName: '现金',
    note: '提取',
    date: '2026-05-12',
    createdAt: '2026-05-12T09:00:00.000Z'
  }
];

console.log('1. 测试 filterAndProcessRecords 函数\n');

test('应正确过滤出账户1的所有记录', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  assertEqual(processed.length, 4, '账户1应有4条记录');
});

test('应正确过滤出账户2的所有记录', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc2', testCategories);
  assertEqual(processed.length, 3, '账户2应有3条记录');
});

test('应正确标记转账记录的类型（转出）', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  const transferOut = processed.find(r => r.id === '4');
  assertEqual(transferOut.recordType, 'transfer-out', '应为转出记录');
  assertEqual(transferOut.recordIcon, '↗️', '转出图标应为↗️');
});

test('应正确标记转账记录的类型（转入）', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  const transferIn = processed.find(r => r.id === '5');
  assertEqual(transferIn.recordType, 'transfer-in', '应为转入记录');
  assertEqual(transferIn.recordIcon, '↙️', '转入图标应为↙️');
});

test('应正确获取支出记录的图标', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  const expense = processed.find(r => r.id === '1');
  assertEqual(expense.recordIcon, '🍜', '支出记录图标应为🍜');
});

test('应正确获取收入记录的图标', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  const income = processed.find(r => r.id === '2');
  assertEqual(income.recordIcon, '💰', '收入记录图标应为💰');
});

console.log('\n2. 测试 calculateAccountSummary 函数\n');

test('应正确计算账户1的统计信息', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  const summary = calculateAccountSummary(processed, 'acc1');
  assertEqual(summary.totalExpense, '20.00', '支出总额应为20');
  assertEqual(summary.totalIncome, '500.00', '收入总额应为500');
  assertEqual(summary.totalTransferOut, '200.00', '转出总额应为200');
  assertEqual(summary.totalTransferIn, '50.00', '转入总额应为50');
});

test('应正确计算账户2的统计信息', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc2', testCategories);
  const summary = calculateAccountSummary(processed, 'acc2');
  assertEqual(summary.totalExpense, '100.00', '支出总额应为100');
  assertEqual(summary.totalIncome, '0.00', '收入总额应为0');
  assertEqual(summary.totalTransferOut, '50.00', '转出总额应为50');
  assertEqual(summary.totalTransferIn, '200.00', '转入总额应为200');
});

test('空记录的统计应为0', () => {
  const summary = calculateAccountSummary([], 'acc1');
  assertEqual(summary.totalExpense, '0.00', '支出应为0');
  assertEqual(summary.totalIncome, '0.00', '收入应为0');
  assertEqual(summary.totalTransferOut, '0.00', '转出应为0');
  assertEqual(summary.totalTransferIn, '0.00', '转入应为0');
});

console.log('\n3. 测试 formatDateText 函数\n');

test('应正确格式化日期文本', () => {
  const date = new Date('2026-05-17');
  const text = formatDateText(date);
  // 2026-05-17 是周日
  assertEqual(text, '2026年5月17日 周日', '日期格式不对');
});

console.log('\n4. 测试 groupRecordsByDate 函数\n');

test('应正确按日期分组记录', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  const grouped = groupRecordsByDate(processed);
  // 应该有3个日期分组
  assertEqual(grouped.length, 4, '应为4个日期分组');
});

test('分组后的记录应该按日期倒序排列', () => {
  const processed = filterAndProcessRecords(testRecords, 'acc1', testCategories);
  const grouped = groupRecordsByDate(processed);
  // 第一个应该是5月15日，第二个5月14日，第三个5月13日，第四个5月12日
  const firstDate = grouped[0].dateText;
  assertEqual(firstDate.includes('5月15日'), true, '第一条应为5月15日');
});

console.log('\n5. 测试边界情况\n');

test('空记录数组处理', () => {
  const processed = filterAndProcessRecords([], 'acc1', testCategories);
  assertEqual(processed.length, 0, '空记录处理');
  const grouped = groupRecordsByDate([]);
  assertEqual(grouped.length, 0, '空记录分组');
});

test('无效金额处理', () => {
  const invalidRecord = [{
    id: 'invalid',
    type: 'expense',
    amount: null,
    accountId: 'acc1',
    date: '2026-05-17'
  }];
  const summary = calculateAccountSummary(invalidRecord, 'acc1');
  assertEqual(summary.totalExpense, '0.00', '无效金额应处理为0');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}