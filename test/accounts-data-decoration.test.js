#!/usr/bin/env node

/**
 * 账号页展示装饰字段不应污染原始账号数据
 */

const path = require('path');

console.log('========================================');
console.log('    账号页展示字段数据隔离单元测试');
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createAccountsPage(app) {
  const root = path.join(__dirname, '..');
  const pagePath = path.join(root, 'miniprogram/pages/accounts/accounts.js');
  const loggerPath = path.join(root, 'miniprogram/utils/logger.js');
  delete require.cache[require.resolve(pagePath)];
  delete require.cache[require.resolve(loggerPath)];

  const previousPage = global.Page;
  const previousGetApp = global.getApp;
  const previousWx = global.wx;

  let pageDefinition;
  global.getApp = function() {
    return app;
  };
  global.wx = {
    getStorageSync: function() {
      return false;
    }
  };
  global.Page = function(definition) {
    pageDefinition = definition;
  };

  require(loggerPath).info = function() {};
  require(pagePath);

  global.Page = previousPage;
  global.getApp = previousGetApp;
  global.wx = previousWx;

  pageDefinition.data = JSON.parse(JSON.stringify(pageDefinition.data));
  pageDefinition.setData = function(data) {
    this.data = {
      ...this.data,
      ...data
    };
  };

  return pageDefinition;
}

test('账号页隐藏账号不展示，但仍按 includeInTotal 参与总资产统计', () => {
  const app = {
    globalData: {
      accounts: [
        { id: 'cash', name: '现金', category: '现金', balance: '100.00' },
        { id: 'hidden-cash', name: '隐藏现金', category: '现金', balance: '50.00', isHidden: true },
        { id: 'card', name: '信用卡', category: '信用卡', balance: '20.00', isHidden: true },
        { id: 'excluded', name: '不统计', category: '现金', balance: '999.00', includeInTotal: false }
      ],
      accountCategories: [
        { name: '现金', icon: '💵', color: '#22D3EE', type: 'asset' },
        { name: '信用卡', icon: '💳', color: '#F87171', type: 'credit' }
      ]
    },
    loadAccounts: function(callback) {
      callback();
    }
  };

  const page = createAccountsPage(app);
  page.processAccounts();

  const visibleIds = page.data.groupedAccounts
    .flatMap(group => group.accounts)
    .map(account => account.id);
  assert(visibleIds.includes('cash'), '普通账号应展示');
  assert(visibleIds.includes('excluded'), '不计入总资产但非隐藏账号仍应展示');
  assert(!visibleIds.includes('hidden-cash'), '隐藏资产账号默认不展示');
  assert(!visibleIds.includes('card'), '隐藏信用卡账号默认不展示');
  assert(page.data.totalAssetBalance === '150.00', '总资产应包含隐藏但计入统计的资产账号');
  assert(page.data.totalDebtBalance === '20.00', '总负债应包含隐藏但计入统计的信用账号');
  assert(page.data.totalBalance === '130.00', '净资产应排除不计入总资产账号，并包含隐藏账号');
});

test('账号页展示用 badge/categoryInfo 不应写回 app.globalData.accounts', () => {
  const originalAccount = {
    id: 'cash',
    name: '现金',
    category: '现金',
    balance: '100.00'
  };
  const app = {
    globalData: {
      accounts: [originalAccount],
      accountCategories: [
        { name: '现金', icon: '💵', color: '#22D3EE', type: 'asset' }
      ]
    },
    loadAccounts: function(callback) {
      callback();
    }
  };

  const page = createAccountsPage(app);
  page.processAccounts();

  const displayedAccount = page.data.groupedAccounts[0].accounts[0];
  assert(displayedAccount.badge, '展示账号应包含 badge');
  assert(displayedAccount.categoryInfo, '展示账号应包含 categoryInfo');
  assert(!Object.prototype.hasOwnProperty.call(originalAccount, 'badge'), '原始账号不应被写入 badge');
  assert(!Object.prototype.hasOwnProperty.call(originalAccount, 'categoryInfo'), '原始账号不应被写入 categoryInfo');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
