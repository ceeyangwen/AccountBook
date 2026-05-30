/**
 * 统计页总资产趋势算法单元测试
 */

const path = require('path');

console.log('========================================');
console.log('      统计页总资产趋势算法单元测试');
console.log('========================================\n');

let passed = 0;
let failed = 0;

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
    throw new Error(`${message} - 期望 ${expected}, 实际 ${actual}`);
  }
}

function loadStatisticsPage() {
  const statisticsPath = path.join(__dirname, '../miniprogram/pages/statistics/statistics.js');
  delete require.cache[require.resolve(statisticsPath)];

  let pageDefinition = null;
  const previousGetApp = global.getApp;
  const previousPage = global.Page;

  global.getApp = function() {
    return {
      globalData: {
        accountCategories: [
          { name: '现金', type: 'asset' },
          { name: '信用卡', type: 'credit' },
          { name: '负债账户', type: 'debt' }
        ],
        categories: {
          expense: { groups: [] },
          income: { groups: [] }
        }
      }
    };
  };
  global.Page = function(definition) {
    pageDefinition = definition;
  };

  require(statisticsPath);

  global.getApp = previousGetApp;
  global.Page = previousPage;

  return pageDefinition;
}

function findTrend(trend, date) {
  return trend.find(item => item.date === date);
}

const statisticsPage = loadStatisticsPage();

test('信用卡支出后总资产趋势应下降，而不是反向上涨', () => {
  const accounts = [
    { id: 'card', name: '信用卡', category: '信用卡', balance: '10.00' }
  ];
  const records = [
    {
      id: 'r1',
      type: 'expense',
      accountId: 'card',
      amount: '10.00',
      date: '2025-01-22'
    }
  ];

  const trend = statisticsPage.calculateAssetTrend.call({ data: { period: 'month' } }, records, accounts, 2025, 0);

  assertEqual(findTrend(trend, '2025-01-21').balance, '0.00', '支出前一天总资产');
  assertEqual(findTrend(trend, '2025-01-22').balance, '-10.00', '信用卡支出当天总资产');
});

test('现金转入信用卡还款不应改变总资产趋势', () => {
  const accounts = [
    { id: 'cash', name: '现金', category: '现金', balance: '90.00' },
    { id: 'card', name: '信用卡', category: '信用卡', balance: '10.00' }
  ];
  const records = [
    {
      id: 't1',
      type: 'transfer',
      fromAccountId: 'cash',
      toAccountId: 'card',
      amount: '10.00',
      date: '2025-01-22'
    }
  ];

  const trend = statisticsPage.calculateAssetTrend.call({ data: { period: 'month' } }, records, accounts, 2025, 0);

  assertEqual(findTrend(trend, '2025-01-21').balance, '80.00', '还款前一天总资产');
  assertEqual(findTrend(trend, '2025-01-22').balance, '80.00', '还款当天总资产');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
