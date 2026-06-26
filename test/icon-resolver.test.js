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

test('应按账号名称解析常见银行徽章', () => {
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '招商银行储蓄卡' }).label, '招');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '工商银行信用卡' }).label, '工');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '建设银行储蓄卡' }).label, '建');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '农业银行储蓄卡' }).label, '农');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '中国银行储蓄卡' }).label, '中');
  assert.strictEqual(iconResolver.resolveAccountBadge({ name: '交通银行信用卡' }).label, '交');
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
