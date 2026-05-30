/**
 * 统计页支出分类按大类和小类分层统计
 */

console.log('========================================');
console.log('      统计页分类分层统计单元测试');
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

function assertArrayEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message} - 期望: ${expectedJson}, 实际: ${actualJson}`);
  }
}

function createCurrentMonthDate(day) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function loadStatisticsPage(appData) {
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
    },
    navigateTo: function () {},
    createSelectorQuery: function () {
      return {
        in() {
          return this;
        },
        select() {
          return this;
        },
        boundingClientRect(callback) {
          callback({ width: 320, height: 220 });
          return this;
        },
        exec() {}
      };
    },
    createCanvasContext: function () {
      return {
        clearRect() {},
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        quadraticCurveTo() {},
        stroke() {},
        fill() {},
        arc() {},
        setStrokeStyle() {},
        setFillStyle() {},
        setLineWidth() {},
        setLineCap() {},
        setLineJoin() {},
        setTextAlign() {},
        setFontSize() {},
        fillText() {},
        draw() {}
      };
    }
  };

  delete require.cache[require.resolve('../miniprogram/pages/statistics/statistics.js')];
  require('../miniprogram/pages/statistics/statistics.js');

  pageDefinition.data = {
    ...(pageDefinition.data || {}),
    period: 'month'
  };
  pageDefinition.setData = function (data, callback) {
    this.data = {
      ...this.data,
      ...data
    };
    if (callback) callback();
  };

  return pageDefinition;
}

function createAppData() {
  return {
    accountCategories: [
      { id: 1, name: '现金', type: 'asset' }
    ],
    accounts: [
      { id: 'cash', name: '现金', category: '现金', balance: '100.00', includeInTotal: true },
      { id: 'private', name: '备用金', category: '现金', balance: '999.00', includeInTotal: false }
    ],
    categories: {
      expense: {
        groups: [
          {
            id: 'expense-group-food',
            name: '餐饮',
            icon: '🍜',
            children: [
              { id: 'expense-food-breakfast', name: '早餐', icon: '🥟', color: '#FF6B6B' },
              { id: 'expense-food-lunch', name: '午餐', icon: '🍱', color: '#FFA94D' }
            ]
          },
          {
            id: 'expense-group-traffic',
            name: '交通',
            icon: '🚗',
            children: [
              { id: 'expense-traffic-taxi', name: '打车', icon: '🚕', color: '#4ECDC4' }
            ]
          },
          {
            id: 'expense-group-11',
            name: '其他杂项',
            icon: '💸',
            children: [
              { id: 'expense-11-2', name: '其他支出', icon: '💸', color: '#C3D3E7' }
            ]
          }
        ]
      },
      income: { groups: [] }
    },
    records: [
      {
        id: 'breakfast',
        type: 'expense',
        accountId: 'cash',
        accountName: '现金',
        amount: '10.00',
        date: createCurrentMonthDate(1),
        categoryId: 'expense-food-breakfast',
        note: '包子'
      },
      {
        id: 'lunch',
        type: 'expense',
        accountId: 'cash',
        accountName: '现金',
        amount: '20.00',
        date: createCurrentMonthDate(1),
        categoryId: 'expense-food-lunch',
        note: '工作餐'
      },
      {
        id: 'taxi',
        type: 'expense',
        accountId: 'cash',
        accountName: '现金',
        amount: '5.00',
        date: createCurrentMonthDate(2),
        categoryId: 'expense-traffic-taxi'
      },
      {
        id: 'unknown',
        type: 'expense',
        accountId: 'cash',
        accountName: '现金',
        amount: '7.00',
        date: createCurrentMonthDate(3),
        categoryId: 'missing-category'
      },
      {
        id: 'excluded-lunch',
        type: 'expense',
        accountId: 'private',
        accountName: '备用金',
        amount: '100.00',
        date: createCurrentMonthDate(1),
        categoryId: 'expense-food-lunch'
      }
    ]
  };
}

test('统计页支出分类应先按大类汇总，再展示大类下的小类金额', () => {
  const page = loadStatisticsPage(createAppData());

  page.processStatistics();

  const categories = page.data.expenseCategoryList;

  assertEqual(page.data.totalExpense, '42.00', '总支出应排除不计入总资产账户');
  assertEqual(categories.length, 3, '应展示有支出的大类数量');
  assertEqual(categories[0].id, 'expense-group-food', '金额最高的大类应排在第一');
  assertEqual(categories[0].name, '餐饮', '第一项应为大类名称');
  assertEqual(categories[0].amount, '30.00', '餐饮大类金额');
  assertEqual(categories[0].children.length, 2, '餐饮大类下应展示两个小类');
  assertEqual(categories[0].children[0].name, '午餐', '小类应按金额降序展示');
  assertEqual(categories[0].children[0].amount, '20.00', '午餐金额');
  assertEqual(categories[0].children[1].name, '早餐', '第二个小类名称');
  assertEqual(categories[0].children[1].amount, '10.00', '早餐金额');
  assertEqual(categories[1].name, '其他杂项', '未知小类应归入其他支出所在大类');
  assertEqual(categories[1].amount, '7.00', '其他杂项金额');
  assertEqual(categories[1].children[0].name, '其他支出', '未知小类应落到其他支出');
  assertEqual(categories[1].children[0].amount, '7.00', '其他支出金额');
  assertEqual(categories[2].name, '交通', '交通大类名称');
  assertEqual(categories[2].amount, '5.00', '交通大类金额');
});

test('统计页分类明细应支持按大类和小类下钻查看支出记录', () => {
  const page = loadStatisticsPage(createAppData());

  page.processStatistics();
  page.toggleCategoryDrilldown({ currentTarget: { dataset: { index: 0 } } });

  let food = page.data.expenseCategoryList[0];
  assertEqual(food.isExpanded, true, '点击大类后应展开');
  assertEqual(food.drilldownTitle, '餐饮明细', '大类明细标题');
  assertArrayEqual(food.drillRecords.map(record => record.id), ['breakfast', 'lunch'], '大类明细应展示该大类全部支出记录');
  assertEqual(food.drillRecords[0].accountName, '现金', '明细应展示账户名称');
  assertEqual(food.drillRecords[0].note, '包子', '明细应保留备注');

  page.toggleChildDrilldown({
    currentTarget: {
      dataset: {
        categoryIndex: 0,
        childId: 'expense-food-lunch'
      }
    }
  });

  food = page.data.expenseCategoryList[0];
  assertEqual(food.activeChildCategoryId, 'expense-food-lunch', '点击小类后应标记当前小类');
  assertEqual(food.drilldownTitle, '午餐明细', '小类明细标题');
  assertArrayEqual(food.drillRecords.map(record => record.id), ['lunch'], '小类明细应只展示该小类记录');

  page.toggleCategoryDrilldown({ currentTarget: { dataset: { index: 0 } } });
  food = page.data.expenseCategoryList[0];
  assertEqual(food.isExpanded, true, '从小类明细点击大类应切回大类全部明细');
  assertEqual(food.activeChildCategoryId, '', '切回大类明细后不应保留小类选中');
  assertArrayEqual(food.drillRecords.map(record => record.id), ['breakfast', 'lunch'], '切回大类后应展示全部支出记录');

  page.toggleCategoryDrilldown({ currentTarget: { dataset: { index: 0 } } });
  food = page.data.expenseCategoryList[0];
  assertEqual(food.isExpanded, false, '再次点击同一大类应收起明细');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
