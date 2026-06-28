/**
 * 首页月份筛选和每日交易折叠单元测试
 */

console.log('========================================');
console.log('    首页月份筛选和每日交易折叠单元测试');
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

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(`${message} - 实际: ${value}`);
  }
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
  return {
    categories: {
      expense: {
        groups: [
          {
            id: 'expense-group-11',
            name: '其他杂项',
            children: [
              { id: 'expense-11-2', name: '其他支出', icon: '费', color: '#C3D3E7' }
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
              { id: 'income-1-1', name: '工资收入', icon: '薪', color: '#4ECDC4' }
            ]
          }
        ]
      }
    },
    accounts: [
      {
        id: 'acc-main',
        name: '现金',
        includeInTotal: true
      }
    ],
    records: [
      {
        id: 'may-expense',
        type: 'expense',
        accountId: 'acc-main',
        amount: '25.00',
        date: '2026-05-17',
        categoryId: 'expense-11-2'
      },
      {
        id: 'may-income',
        type: 'income',
        accountId: 'acc-main',
        amount: '100.00',
        date: '2026-05-17',
        categoryId: 'income-1-1'
      },
      {
        id: 'june-expense',
        type: 'expense',
        accountId: 'acc-main',
        amount: '8.00',
        date: '2026-06-01',
        categoryId: 'expense-11-2'
      }
    ]
  };
}

test('首页选择月份后应只汇总并展示该月份交易', () => {
  const indexPage = loadPage('../miniprogram/pages/index/index.js', createAppData());

  indexPage.onMonthChange({ detail: { value: '2026-05-01' } });

  assertEqual(indexPage.data.currentMonth, '2026年5月', '首页当前月份文案');
  assertEqual(indexPage.data.monthlyExpense, '25.00', '选中月份支出');
  assertEqual(indexPage.data.monthlyIncome, '100.00', '选中月份收入');
  assertEqual(indexPage.data.groupedRecords.length, 1, '只应展示一个日期分组');
  assertEqual(indexPage.data.groupedRecords[0].records.length, 2, '只应展示选中月份记录');
  assertEqual(indexPage.data.groupedRecords[0].records[0].id, 'may-expense', '不应展示其他月份记录');
});

test('首页月份筛选不能早于2026年5月', () => {
  const indexPage = loadPage('../miniprogram/pages/index/index.js', createAppData());

  indexPage.onMonthChange({ detail: { value: '2026-04-01' } });

  assertEqual(indexPage.data.selectedMonthValue, '2026-05', '首页选中月份应夹到最早可选月份');
  assertEqual(indexPage.data.currentMonth, '2026年5月', '首页当前月份文案应显示最早可选月份');
  assertEqual(indexPage.data.monthlyExpense, '25.00', '低于下限时应展示5月支出');
  assertEqual(indexPage.data.monthlyIncome, '100.00', '低于下限时应展示5月收入');
});

test('首页日期分组应支持折叠和展开', () => {
  const indexPage = loadPage('../miniprogram/pages/index/index.js', createAppData());

  indexPage.onMonthChange({ detail: { value: '2026-05-01' } });
  const dateKey = indexPage.data.groupedRecords[0].dateKey;

  indexPage.toggleDateGroup({ currentTarget: { dataset: { dateKey } } });

  assertTruthy(indexPage.data.collapsedDateGroups[dateKey], '折叠状态应记录到页面状态');
  assertEqual(indexPage.data.groupedRecords[0].isCollapsed, true, '日期分组应变为折叠');

  indexPage.toggleDateGroup({ currentTarget: { dataset: { dateKey } } });

  assertEqual(indexPage.data.collapsedDateGroups[dateKey], undefined, '再次点击应清除折叠状态');
  assertEqual(indexPage.data.groupedRecords[0].isCollapsed, false, '日期分组应恢复展开');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
