#!/usr/bin/env node

/**
 * 账号编辑页属性保存单元测试
 */

const path = require('path');

console.log('========================================');
console.log('      账号编辑页属性保存单元测试');
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

function createAccountEditPage(app) {
  const root = path.join(__dirname, '..');
  const pagePath = path.join(root, 'miniprogram/pages/account-edit/account-edit.js');
  const loggerPath = path.join(root, 'miniprogram/utils/logger.js');
  const cloudStoragePath = path.join(root, 'miniprogram/utils/cloudStorage.js');

  delete require.cache[require.resolve(pagePath)];
  delete require.cache[require.resolve(loggerPath)];
  delete require.cache[require.resolve(cloudStoragePath)];

  const previousPage = global.Page;
  const previousGetApp = global.getApp;

  let pageDefinition;
  global.getApp = function() {
    return app;
  };
  global.wx = {
    showLoading: function() {},
    hideLoading: function() {},
    showToast: function() {},
    setNavigationBarTitle: function() {},
    navigateBack: function() {}
  };
  global.setTimeout = function(callback) {
    callback();
    return 0;
  };
  global.Page = function(definition) {
    pageDefinition = definition;
  };

  require(loggerPath).info = function() {};
  require(loggerPath).error = function() {};
  require(pagePath);

  global.Page = previousPage;
  global.getApp = previousGetApp;

  pageDefinition.data = JSON.parse(JSON.stringify(pageDefinition.data));
  pageDefinition.setData = function(data) {
    this.data = {
      ...this.data,
      ...data
    };
  };

  return pageDefinition;
}

function createApp(spy) {
  return {
    globalData: {
      accountCategories: [
        { id: 1, name: '现金', icon: '💵', color: '#22D3EE', type: 'asset' }
      ],
      icons: [],
      accounts: [
        {
          id: 'cash',
          name: '现金',
          category: '现金',
          icon: '💵',
          color: '#22D3EE',
          balance: '100.00'
        }
      ]
    },
    addAccount: function(account, callback) {
      spy.added = account;
      callback(true);
    },
    updateAccount: function(account, callback) {
      spy.updated = account;
      callback(true);
    }
  };
}

test('编辑旧账号时统计和隐藏属性应有兼容默认值', () => {
  const spy = {};
  const page = createAccountEditPage(createApp(spy));

  page.onLoad({ id: 'cash' });

  assertEqual(page.data.includeInTotal, true, '旧账号默认计入总资产');
  assertEqual(page.data.isHidden, false, '旧账号默认不隐藏');
});

test('新建账号时应按开关保存 includeInTotal 和 isHidden', () => {
  const spy = {};
  const page = createAccountEditPage(createApp(spy));

  page.onLoad({});
  page.setData({
    name: '备用金',
    balance: '12.34',
    includeInTotal: false,
    isHidden: true
  });
  page.saveAccount();

  assertEqual(spy.added.includeInTotal, false, '新建账号应保存不计入总资产');
  assertEqual(spy.added.isHidden, true, '新建账号应保存隐藏属性');
});

test('编辑账号时应按开关更新 includeInTotal 和 isHidden', () => {
  const spy = {};
  const page = createAccountEditPage(createApp(spy));

  page.onLoad({ id: 'cash' });
  page.setData({
    includeInTotal: false,
    isHidden: true
  });
  page.saveAccount();

  assertEqual(spy.updated.id, 'cash', '编辑账号应保留账号 id');
  assertEqual(spy.updated.includeInTotal, false, '编辑账号应更新不计入总资产');
  assertEqual(spy.updated.isHidden, true, '编辑账号应更新隐藏属性');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
