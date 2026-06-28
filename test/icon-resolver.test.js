#!/usr/bin/env node

const assert = require('assert');
const iconResolver = require('../miniprogram/utils/iconResolver.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error.message);
    failed++;
  }
}

console.log('========================================');
console.log('      深色徽章图标解析单元测试');
console.log('========================================\n');

test('应按账号名称解析支付宝、微信、花呗和京东白条徽章', () => {
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '支付宝' }).label, '付');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '微信钱包' }).label, '微');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '花呗' }).label, '花');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '京东白条' }).label, '京');
});

test('常见支付账号应解析为公司 logo 样式而不是通用文字徽章', () => {
  const wechatBadge = iconResolver.resolveAccountBadge({ name: '微信钱包' });
  const alipayBadge = iconResolver.resolveAccountBadge({ name: '支付宝' });
  const cashBadge = iconResolver.resolveAccountBadge({ name: '现金' });

  assert.strictEqual(wechatBadge.logo, true);
  assert.strictEqual(alipayBadge.logo, true);
  assert.ok(wechatBadge.className.indexOf('account-logo') !== -1);
  assert.ok(alipayBadge.className.indexOf('account-logo') !== -1);
  assert.strictEqual(wechatBadge.iconShape, 'wechat');
  assert.strictEqual(alipayBadge.iconShape, 'alipay');
  assert.strictEqual(wechatBadge.iconImage, '/images/account-logos/wechat.png');
  assert.strictEqual(alipayBadge.iconImage, '/images/account-logos/alipay.png');
  assert.strictEqual(wechatBadge.background, '#FFFFFF');
  assert.strictEqual(alipayBadge.background, '#FFFFFF');
  assert.strictEqual(cashBadge.logo, false);
  assert.strictEqual(cashBadge.iconImage, '');
  assert.strictEqual(cashBadge.symbol, '¥');
});

test('应按账号名称解析常见银行徽章', () => {
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '招商银行储蓄卡' }).label, '招');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '工商银行信用卡' }).label, '工');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '建设银行储蓄卡' }).label, '建');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '农业银行储蓄卡' }).label, '农');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '中国银行储蓄卡' }).label, '中');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '交通银行信用卡' }).label, '交');
});

test('常见银行账号应解析为各自银行 logo 样式', () => {
  const cmbBadge = iconResolver.resolveAccountBadge({ name: '招商银行储蓄卡' });
  const icbcBadge = iconResolver.resolveAccountBadge({ name: '工商银行信用卡' });
  const ccbBadge = iconResolver.resolveAccountBadge({ name: '建设银行储蓄卡' });

  assert.strictEqual(cmbBadge.logo, true);
  assert.strictEqual(icbcBadge.logo, true);
  assert.strictEqual(ccbBadge.logo, true);
  assert.ok(cmbBadge.className.indexOf('bank-logo') !== -1);
  assert.ok(icbcBadge.className.indexOf('bank-logo') !== -1);
  assert.ok(ccbBadge.className.indexOf('bank-logo') !== -1);
  assert.strictEqual(cmbBadge.iconShape, 'cmb');
  assert.strictEqual(icbcBadge.iconShape, 'icbc');
  assert.strictEqual(ccbBadge.iconShape, 'ccb');
  assert.strictEqual(cmbBadge.iconImage, '/images/account-logos/cmb.png');
  assert.strictEqual(icbcBadge.iconImage, '/images/account-logos/icbc.png');
  assert.strictEqual(ccbBadge.iconImage, '/images/account-logos/ccb.png');
  assert.strictEqual(cmbBadge.background, '#FFFFFF');
  assert.strictEqual(icbcBadge.background, '#FFFFFF');
  assert.strictEqual(ccbBadge.background, '#FFFFFF');
});

test('截图中的短银行和金融机构名称也应解析为具体 logo 样式', () => {
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '招商', category: '储蓄卡' }).iconShape, 'cmb');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '兴业', category: '储蓄卡' }).iconShape, 'cib');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '工商', category: '储蓄卡' }).iconShape, 'icbc');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '农业', category: '储蓄卡' }).iconShape, 'abc');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '建设', category: '储蓄卡' }).iconShape, 'ccb');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '微众', category: '储蓄卡' }).iconShape, 'webank');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '泉州', category: '储蓄卡' }).iconShape, 'qzbank');
});

test('默认账户大类和收入分类应解析为短标签徽章', () => {
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '基金账户', category: '基金账户', icon: '📊' }).label, '基');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '股票账户', category: '股票账户', icon: '📈' }).label, '股');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '虚拟账户', category: '虚拟账户', icon: '📱' }).label, '虚');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '负债账户', category: '负债账户', icon: '📝' }).label, '债');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '债权账户', category: '债权账户', icon: '📋' }).label, '权');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '加班收入', icon: '⏱️' }, '职业收入').label, '班');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '信用卡还款', icon: '💳' }, '其他收入').label, '还');
});

test('应按支出和收入类别名称解析类别徽章', () => {
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '三餐' }, '食品酒水').label, '餐');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '公共交通' }, '行车交通').label, '行');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '水电煤气' }, '居家物业').label, '家');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '工资收入' }, '职业收入').label, '薪');
  assert.strictEqual(iconResolver.resolveCategoryBadge({ name: '投资收入' }, '职业收入').label, '投');
});

test('未知账号和类别应安全回退且不修改输入对象', () => {
  const account = { name: '自定义账户', icon: '自' };
  const category = { name: '自定义类别', icon: '类' };
  const accountBefore = JSON.stringify(account);
  const categoryBefore = JSON.stringify(category);

  assert.strictEqual(iconResolver.resolveAccountBadge(account).label, '自');
  assert.strictEqual(iconResolver.resolveCategoryBadge(category).label, '自');
  assert.strictEqual(JSON.stringify(account), accountBefore);
  assert.strictEqual(JSON.stringify(category), categoryBefore);
});

test('解析出的徽章应包含 WXML 可直接使用的颜色字段', () => {
  const badge = iconResolver.resolveAccountBadge({ name: '微信钱包' });
  assert.ok(badge.color);
  assert.ok(badge.background);
  assert.ok(badge.className);
  assert.ok(badge.symbol);
});

console.log(`\n测试完成: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
