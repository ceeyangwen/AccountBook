/**
 * 隐藏账号可见性单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('        隐藏账号可见性单元测试');
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

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message} - 期望 ${expectedJson}, 实际 ${actualJson}`);
  }
}

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

const root = path.join(__dirname, '..');
const accountVisibility = require(path.join(root, 'miniprogram/utils/accountVisibility.js'));
const { calculateTotalBalance } = require(path.join(root, 'test/test-utils.js'));

test('旧账号没有 isHidden 属性时应默认可见', () => {
  const accounts = [
    { id: 'cash', name: '现金' },
    { id: 'secret', name: '备用账户', isHidden: true }
  ];

  const visibleAccounts = accountVisibility.getVisibleAccounts(accounts, {
    showHidden: false
  });

  assertDeepEqual(visibleAccounts.map(account => account.id), ['cash'], '旧账号应保留，只有 isHidden 为 true 的账号隐藏');
});

test('开启显示隐藏账号后应展示所有账号', () => {
  const accounts = [
    { id: 'cash', name: '现金' },
    { id: 'secret', name: '备用账户', isHidden: true }
  ];

  const visibleAccounts = accountVisibility.getVisibleAccounts(accounts, {
    showHidden: true
  });

  assertDeepEqual(visibleAccounts.map(account => account.id), ['cash', 'secret'], '显示隐藏账号时不应过滤');
});

test('编辑旧记录时应保留当前已选隐藏账号', () => {
  const accounts = [
    { id: 'cash', name: '现金' },
    { id: 'secret', name: '备用账户', isHidden: true }
  ];

  const visibleAccounts = accountVisibility.getVisibleAccounts(accounts, {
    showHidden: false,
    keepIds: ['secret']
  });

  assertDeepEqual(visibleAccounts.map(account => account.id), ['cash', 'secret'], '已选隐藏账号应被保留');
});

test('隐藏账号名称默认应脱敏，打开显示后恢复真实名称', () => {
  const hiddenAccount = { id: 'secret', name: '备用账户', isHidden: true };
  const oldAccount = { id: 'cash', name: '现金' };

  assertEqual(accountVisibility.getDisplayAccountName(hiddenAccount, false), '已隐藏账号', '隐藏账号应脱敏');
  assertEqual(accountVisibility.getDisplayAccountName(hiddenAccount, true), '备用账户', '打开显示后应恢复真实名称');
  assertEqual(accountVisibility.getDisplayAccountName(oldAccount, false), '现金', '旧账号默认不应脱敏');
});

test('隐藏账号仍应按 includeInTotal 逻辑计入总资产', () => {
  const accountCategories = [
    { name: '现金', type: 'asset' },
    { name: '信用卡', type: 'credit' }
  ];
  const accounts = [
    { id: 'cash', name: '现金', category: '现金', balance: '100.00', isHidden: true },
    { id: 'card', name: '信用卡', category: '信用卡', balance: '20.00', isHidden: true },
    { id: 'excluded', name: '不计入账户', category: '现金', balance: '999.00', isHidden: true, includeInTotal: false }
  ];

  assertEqual(calculateTotalBalance(accounts, accountCategories), '80.00', '隐藏账号仍应计入总资产，除非 includeInTotal 为 false');
});

test('账号页总资产计算应基于全部账号而不是可见账号', () => {
  const accountsJs = fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.js'), 'utf8');

  assertMatches(accountsJs, /allAccounts\.forEach\(account => \{[\s\S]*totalBalance \+= balance[\s\S]*\}\);[\s\S]*accounts\.forEach\(account => \{/, '账号页应先用全部账号计算总资产，再用可见账号分组展示');
});

test('页面应接入隐藏账号编辑、开关、列表标签和记录脱敏', () => {
  const files = {
    accountEditJs: fs.readFileSync(path.join(root, 'miniprogram/pages/account-edit/account-edit.js'), 'utf8'),
    accountEditWxml: fs.readFileSync(path.join(root, 'miniprogram/pages/account-edit/account-edit.wxml'), 'utf8'),
    accountsJs: fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.js'), 'utf8'),
    accountsWxml: fs.readFileSync(path.join(root, 'miniprogram/pages/accounts/accounts.wxml'), 'utf8'),
    addRecordJs: fs.readFileSync(path.join(root, 'miniprogram/pages/add-record/add-record.js'), 'utf8'),
    addRecordWxml: fs.readFileSync(path.join(root, 'miniprogram/pages/add-record/add-record.wxml'), 'utf8'),
    transferJs: fs.readFileSync(path.join(root, 'miniprogram/pages/transfer/transfer.js'), 'utf8'),
    transferWxml: fs.readFileSync(path.join(root, 'miniprogram/pages/transfer/transfer.wxml'), 'utf8'),
    indexJs: fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.js'), 'utf8'),
    indexWxml: fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.wxml'), 'utf8'),
    settingsJs: fs.readFileSync(path.join(root, 'miniprogram/pages/settings/settings.js'), 'utf8'),
    settingsWxml: fs.readFileSync(path.join(root, 'miniprogram/pages/settings/settings.wxml'), 'utf8')
  };

  assertMatches(files.accountEditJs, /isHidden:\s*false/, '账号编辑页应默认不隐藏，兼容旧数据');
  assertMatches(files.accountEditJs, /account\.isHidden\s*===\s*true/, '加载旧账号时应只有 true 才算隐藏');
  assertMatches(files.accountEditWxml, /隐藏账号[\s\S]*checked="\{\{isHidden\}\}"/, '账号编辑页应有隐藏账号开关');

  assertMatches(files.accountsJs, /accountVisibility\.getVisibleAccounts/, '账号页应使用统一可见性过滤');
  assertMatches(files.accountsWxml, /hidden-account-label[\s\S]*account\.isHidden === true[\s\S]*隐藏/, '账号页应为隐藏账号显示标签');

  assertMatches(files.settingsJs, /showHiddenAccounts/, '我的页应维护显示隐藏账号开关状态');
  assertMatches(files.settingsJs, /accountVisibility\.setShowHiddenAccounts/, '我的页应把开关写入本地');
  assertMatches(files.settingsWxml, /显示隐藏账号[\s\S]*switch[\s\S]*bindchange="onShowHiddenAccountsChange"/, '我的页应提供显示隐藏账号开关');

  assertMatches(files.addRecordJs, /accountVisibility\.getVisibleAccounts[\s\S]*keepIds:\s*\[selectedAccountId\]/, '记一笔选择账号时应过滤隐藏账号并保留当前已选账号');
  assertMatches(files.addRecordWxml, /item\.displayName/, '记一笔账号展示应使用脱敏名称');

  assertMatches(files.transferJs, /accountVisibility\.getVisibleAccounts[\s\S]*keepIds:\s*\[fromAccountId,\s*toAccountId\]/, '转账选择账号时应过滤隐藏账号并保留当前转出转入账号');
  assertMatches(files.transferWxml, /item\.displayName/, '转账账号展示应使用脱敏名称');

  assertMatches(files.indexJs, /accountVisibility\.getDisplayAccountName/, '首页记录应对隐藏账号名称脱敏');
  assertMatches(files.indexWxml, /accountDisplayName|fromAccountDisplayName/, '首页记录应显示处理后的账号名称');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
