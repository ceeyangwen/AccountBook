/**
 * 首页和统计页收支汇总应遵守 includeInTotal 标志
 */

console.log('========================================');
console.log('    收支汇总 includeInTotal 单元测试');
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
    throw new Error(`${message} - 期望: ${expected}, 实际: ${actual}`);
  }
}

function createCurrentMonthDate(day) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function loadPage(pagePath, appData) {
  let pageDefinition = null;

  global.getApp = function () {
    return {
      globalData: appData
    };
  };

  global.Page = function (definition) {
    pageDefinition = definition;
  };

  global.wx = {
    getStorageSync: function () {
      return false;
    }
  };

  delete require.cache[require.resolve(pagePath)];
  require(pagePath);

  pageDefinition.data = {
    ...(pageDefinition.data || {})
  };
  pageDefinition.setData = function (data) {
    this.data = {
      ...this.data,
      ...data
    };
  };

  return pageDefinition;
}

function createAppData() {
  const includedAccount = {
    id: 'acc-included',
    name: '现金',
    category: '现金',
    balance: '100.00',
    includeInTotal: true
  };
  const excludedAccount = {
    id: 'acc-excluded',
    name: '备用金',
    category: '现金',
    balance: '999.00',
    includeInTotal: false
  };

  return {
    accountCategories: [
      { id: 1, name: '现金', type: 'asset' }
    ],
    categories: {
      expense: {
        groups: [
          {
            id: 'expense-group-11',
            name: '其他杂项',
            children: [
              { id: 'expense-11-2', name: '其他支出', icon: '💸', color: '#C3D3E7' }
            ]
          }
        ]
      },
      income: {
        groups: [
          {
            id: 'income-group-1',
            name: '职业收入',
            children: [
              { id: 'income-1-1', name: '工资收入', icon: '💰', color: '#4ECDC4' }
            ]
          }
        ]
      }
    },
    accounts: [includedAccount, excludedAccount],
    records: [
      {
        id: 'expense-included',
        type: 'expense',
        accountId: 'acc-included',
        amount: '20.00',
        date: createCurrentMonthDate(5),
        categoryId: 'expense-11-2'
      },
      {
        id: 'expense-excluded',
        type: 'expense',
        accountId: 'acc-excluded',
        amount: '80.00',
        date: createCurrentMonthDate(5),
        categoryId: 'expense-11-2'
      },
      {
        id: 'income-included',
        type: 'income',
        accountId: 'acc-included',
        amount: '100.00',
        date: createCurrentMonthDate(5),
        categoryId: 'income-1-1'
      },
      {
        id: 'income-excluded',
        type: 'income',
        accountId: 'acc-excluded',
        amount: '300.00',
        date: createCurrentMonthDate(5),
        categoryId: 'income-1-1'
      }
    ]
  };
}

test('首页本月账单和每日收支应排除不计入总资产的账号记录', () => {
  const indexPage = loadPage('../miniprogram/pages/index/index.js', createAppData());

  indexPage.processRecords();

  assertEqual(indexPage.data.monthlyExpense, '20.00', '首页本月支出');
  assertEqual(indexPage.data.monthlyIncome, '100.00', '首页本月收入');
  assertEqual(indexPage.data.balance, '80.00', '首页本月结余');
  assertEqual(indexPage.data.groupedRecords[0].dayExpense, '20.00', '首页当日支出');
  assertEqual(indexPage.data.groupedRecords[0].dayIncome, '100.00', '首页当日收入');
});

test('首页长金额应生成自适应字号类', () => {
  const appData = createAppData();
  appData.records = [
    {
      id: 'long-expense',
      type: 'expense',
      accountId: 'acc-included',
      amount: '2381.22',
      date: createCurrentMonthDate(5),
      categoryId: 'expense-11-2'
    },
    {
      id: 'long-income',
      type: 'income',
      accountId: 'acc-included',
      amount: '50049.70',
      date: createCurrentMonthDate(5),
      categoryId: 'income-1-1'
    }
  ];
  const indexPage = loadPage('../miniprogram/pages/index/index.js', appData);

  indexPage.processRecords();

  assertEqual(indexPage.data.monthlyExpenseAmountSizeClass, '', '较短支出金额不应缩小');
  assertEqual(indexPage.data.monthlyIncomeAmountSizeClass, 'amount-size-sm', '长收入金额应使用中等缩小字号');
  assertEqual(indexPage.data.balanceAmountSizeClass, 'amount-size-sm', '长结余金额应使用中等缩小字号');
  const longIncomeRecord = indexPage.data.groupedRecords[0].records.find(record => record.id === 'long-income');
  assertEqual(longIncomeRecord.amountSizeClass, 'amount-size-sm', '长记录金额应使用中等缩小字号');
});

test('统计页收支概览和支出分类应排除不计入总资产的账号记录', () => {
  const statisticsPage = loadPage('../miniprogram/pages/statistics/statistics.js', createAppData());
  statisticsPage.data.period = 'month';

  statisticsPage.processStatistics();

  assertEqual(statisticsPage.data.totalExpense, '20.00', '统计页支出');
  assertEqual(statisticsPage.data.totalIncome, '100.00', '统计页收入');
  assertEqual(statisticsPage.data.balance, '80.00', '统计页结余');
  assertEqual(statisticsPage.data.expenseCategoryList.length, 1, '统计页支出分类数量');
  assertEqual(statisticsPage.data.expenseCategoryList[0].amount, '20.00', '统计页支出分类金额');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
