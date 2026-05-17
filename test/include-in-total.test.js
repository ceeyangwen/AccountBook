/**
 * includeInTotal 属性功能单元测试
 */

const {
  calculateTotalBalance
} = require('./test-utils.js');

console.log('========================================');
console.log(' includeInTotal 属性功能单元测试');
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

// 测试数据 - 账户分类
const accountCategories = [
  { id: 1, name: '现金', icon: '💵', color: '#FF6B6B', type: 'asset' },
  { id: 2, name: '信用卡', icon: '💳', color: '#4ECDC4', type: 'credit' },
  { id: 3, name: '储蓄卡', icon: '🏦', color: '#FFE66D', type: 'asset' },
  { id: 4, name: '基金账户', icon: '📊', color: '#A8E6CF', type: 'invest' },
  { id: 5, name: '负债账户', icon: '📝', color: '#DDA0DD', type: 'debt' }
];

console.log('1. 测试默认行为（includeInTotal 未设置）\n');

test('未设置 includeInTotal 属性的账户应该计入总余额', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00' } // 未设置，默认计入
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '100.00', '默认计入');
});

console.log('\n2. 测试 includeInTotal: true 的情况\n');

test('显式设置 includeInTotal: true 的账户应该计入总余额', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '100.00', '显式 true');
});

test('多个 includeInTotal: true 的账户应该正确累加', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00', includeInTotal: true },
    { id: '2', name: '储蓄卡', category: '储蓄卡', balance: '200.00', includeInTotal: true },
    { id: '3', name: '基金', category: '基金账户', balance: '300.00', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '600.00', '多个 true 累加');
});

console.log('\n3. 测试 includeInTotal: false 的情况\n');

test('includeInTotal: false 的账户不应该计入总余额', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00', includeInTotal: false }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '0.00', '显式 false 不计入');
});

test('只有 includeInTotal: false 的账户时总余额应该为 0', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00', includeInTotal: false },
    { id: '2', name: '基金', category: '基金账户', balance: '200.00', includeInTotal: false }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '0.00', '全部 false');
});

console.log('\n4. 测试混合情况（true 和 false 同时存在）\n');

test('混合情况应该只计入 true 和默认的账户', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00', includeInTotal: true },
    { id: '2', name: '备用金', category: '现金', balance: '50.00', includeInTotal: false }, // 不计入
    { id: '3', name: '储蓄卡', category: '储蓄卡', balance: '200.00' }, // 默认计入
    { id: '4', name: '基金', category: '基金账户', balance: '300.00', includeInTotal: false } // 不计入
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '300.00', '混合情况 100 + 200');
});

console.log('\n5. 测试负债/信用类账户（负数处理）\n');

test('信用类账户（信用卡）应正确扣除余额', () => {
  const accounts = [
    { id: '1', name: '信用卡', category: '信用卡', balance: '100.00', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '-100.00', '信用卡扣除');
});

test('负债类账户应正确扣除余额', () => {
  const accounts = [
    { id: '1', name: '负债', category: '负债账户', balance: '200.00', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '-200.00', '负债扣除');
});

test('关闭 includeInTotal 的负债账户不计入', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '500.00', includeInTotal: true },
    { id: '2', name: '负债', category: '负债账户', balance: '200.00', includeInTotal: false } // 不计入
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '500.00', '负债不计入');
});

console.log('\n6. 测试复杂混合场景\n');

test('复杂场景：资产、负债、开启和关闭的组合', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00', includeInTotal: true },
    { id: '2', name: '储蓄卡', category: '储蓄卡', balance: '500.00', includeInTotal: true },
    { id: '3', name: '信用卡', category: '信用卡', balance: '200.00', includeInTotal: true }, // 负200
    { id: '4', name: '私房钱', category: '现金', balance: '300.00', includeInTotal: false }, // 不计入
    { id: '5', name: '基金', category: '基金账户', balance: '1000.00', includeInTotal: true },
    { id: '6', name: '借款', category: '负债账户', balance: '500.00', includeInTotal: false } // 不计入
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  // 100 + 500 - 200 + 1000 = 1400
  assertEqual(result, '1400.00', '复杂场景');
});

console.log('\n7. 测试边界情况\n');

test('空账户列表应该返回 0', () => {
  const result = calculateTotalBalance([], accountCategories);
  assertEqual(result, '0.00', '空数组');
});

test('零余额账户不影响结果', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '0.00', includeInTotal: true },
    { id: '2', name: '储蓄卡', category: '储蓄卡', balance: '0.00', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '0.00', '零余额');
});

test('小数余额应该正确计算', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.50', includeInTotal: true },
    { id: '2', name: '储蓄卡', category: '储蓄卡', balance: '200.75', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '301.25', '小数计算');
});

test('负数余额账户应正确处理', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '-50.00', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '-50.00', '负数余额');
});

console.log('\n8. 测试与账户详情页逻辑一致性\n');

test('所有账户都开启时的行为应与传统计算一致', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00', includeInTotal: true },
    { id: '2', name: '储蓄卡', category: '储蓄卡', balance: '200.00', includeInTotal: true },
    { id: '3', name: '信用卡', category: '信用卡', balance: '50.00', includeInTotal: true }
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  // 100 + 200 - 50 = 250
  assertEqual(result, '250.00', '传统行为一致');
});

test('关闭功能应该向后兼容：未设置属性的账户默认开启', () => {
  const accounts = [
    { id: '1', name: '现金', category: '现金', balance: '100.00' }, // 无属性，默认开启
    { id: '2', name: '储蓄卡', category: '储蓄卡', balance: '200.00' }, // 无属性，默认开启
    { id: '3', name: '特殊', category: '现金', balance: '50.00', includeInTotal: false } // 显式关闭
  ];
  const result = calculateTotalBalance(accounts, accountCategories);
  assertEqual(result, '300.00', '向后兼容');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
