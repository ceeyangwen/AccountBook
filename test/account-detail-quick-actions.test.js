/**
 * 账号详情快捷操作单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      账号详情快捷操作单元测试');
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

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

const root = path.join(__dirname, '..');

function createAppMock() {
  const categories = {
    expense: {
      groups: [
        {
          id: 'expense-group-food',
          name: '食品酒水',
          children: [
            { id: 'expense-food-meal', groupId: 'expense-group-food', name: '三餐', icon: '🍽️', color: '#4ECDC4' }
          ]
        }
      ]
    },
    income: {
      groups: [
        {
          id: 'income-group-job',
          name: '职业收入',
          children: [
            { id: 'income-job-salary', groupId: 'income-group-job', name: '工资收入', icon: '💰', color: '#4ECDC4' }
          ]
        }
      ]
    }
  };

  return {
    globalData: {
      accounts: [
        { id: 'cash', name: '现金', category: '现金', balance: '100.00', icon: '💵' },
        { id: 'card', name: '招商信用卡', category: '信用卡', balance: '200.00', icon: '💳' }
      ],
      records: [],
      categories,
      accountCategories: [
        { id: 1, name: '现金', icon: '💵', type: 'asset' },
        { id: 2, name: '信用卡', icon: '💳', type: 'credit' }
      ]
    },
    getFlatCategories(type) {
      return categories[type].groups.flatMap(group => {
        return group.children.map(child => ({
          ...child,
          groupId: group.id
        }));
      });
    }
  };
}

function loadPage(pagePath, appMock) {
  let pageDefinition = null;
  let navigatedUrl = '';

  global.getApp = function () {
    return appMock;
  };
  global.Page = function (definition) {
    pageDefinition = definition;
  };
  global.wx = {
    getStorageSync() {
      return false;
    },
    setStorageSync() {},
    showLoading() {},
    hideLoading() {},
    showToast() {},
    navigateBack() {},
    navigateTo(options) {
      navigatedUrl = options.url;
    }
  };

  delete require.cache[require.resolve(pagePath)];
  require(pagePath);

  pageDefinition.data = {
    ...(pageDefinition.data || {})
  };
  pageDefinition.setData = function (data, callback) {
    this.data = {
      ...this.data,
      ...data
    };
    if (callback) callback();
  };
  pageDefinition.getNavigatedUrl = function () {
    return navigatedUrl;
  };

  return pageDefinition;
}

test('账号详情页应展示记一笔和转账快捷操作入口', () => {
  const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/account-detail/account-detail.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/account-detail/account-detail.wxss'), 'utf8');

  assertMatches(wxml, /class="quick-action-section/, '账号详情页应有快捷操作区域');
  assertMatches(wxml, /bindtap="goToQuickRecord"[\s\S]*记一笔/, '应有记一笔快捷入口');
  assertMatches(wxml, /bindtap="goToQuickTransfer"[\s\S]*转账/, '应有转账快捷入口');
  assertMatches(wxss, /\.quick-action-section\s*\{/, '快捷操作区域应有样式');
  assertMatches(wxss, /\.quick-action-button\s*\{/, '快捷操作按钮应有样式');
});

test('账号详情快捷操作应带当前账号跳转到记一笔和转账页', () => {
  const page = loadPage('../miniprogram/pages/account-detail/account-detail.js', createAppMock());

  page.onLoad({ id: 'card' });
  page.goToQuickRecord();
  assertEqual(page.getNavigatedUrl(), '/pages/add-record/add-record?accountId=card', '记一笔应带当前账号ID');

  page.goToQuickTransfer();
  assertEqual(page.getNavigatedUrl(), '/pages/transfer/transfer?fromAccountId=card', '转账应默认当前账号为转出账户');
});

test('记一笔页应支持通过 accountId 参数预选账号', () => {
  const page = loadPage('../miniprogram/pages/add-record/add-record.js', createAppMock());

  page.onLoad({ accountId: 'card' });

  assertEqual(page.data.selectedAccountId, 'card', '记一笔页应预选传入账号');
});

test('转账页应支持通过 fromAccountId 参数预选转出账号', () => {
  const page = loadPage('../miniprogram/pages/transfer/transfer.js', createAppMock());

  page.onLoad({ fromAccountId: 'card' });

  assertEqual(page.data.fromAccountId, 'card', '转账页应预选传入转出账号');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
