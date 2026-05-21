/**
 * 金额表达式输入单元测试
 */

const fs = require('fs');
const path = require('path');
const {
  evaluateAmountExpression,
  formatAmountExpression,
  sanitizeAmountExpression
} = require('../miniprogram/utils/amountExpression.js');

console.log('========================================');
console.log('      金额表达式输入单元测试');
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

function assertThrows(testFn, message) {
  let thrown = false;
  try {
    testFn();
  } catch (e) {
    thrown = true;
  }
  if (!thrown) {
    throw new Error(message);
  }
}

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

test('应按乘除优先级计算金额表达式', () => {
  assertEqual(formatAmountExpression('10+2*3'), '16.00', '10+2*3');
  assertEqual(formatAmountExpression('100/4-5'), '20.00', '100/4-5');
});

test('应支持小数、空格和中文键盘常见乘除符号', () => {
  assertEqual(formatAmountExpression('12.5 + 7.5'), '20.00', '小数加法');
  assertEqual(formatAmountExpression('8×2＋4÷2'), '18.00', '中文符号');
});

test('应支持括号和一元负号，但结果必须为有限数字', () => {
  assertEqual(formatAmountExpression('(10+5)*2'), '30.00', '括号计算');
  assertEqual(evaluateAmountExpression('-1+3'), 2, '一元负号计算');
  assertThrows(() => evaluateAmountExpression('10/0'), '除以 0 应报错');
});

test('输入清洗应只保留金额表达式允许的字符', () => {
  assertEqual(sanitizeAmountExpression('￥1a2+三3×4'), '12+3*4', '非法字符清洗');
});

test('记一笔和转账金额输入框应允许表达式并在失焦时计算回填', () => {
  const root = path.join(__dirname, '..');
  const addRecordWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/add-record/add-record.wxml'), 'utf8');
  const transferWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/transfer/transfer.wxml'), 'utf8');

  assertMatches(addRecordWxml, /class="amount-input"[\s\S]*type="text"[\s\S]*bindblur="onAmountBlur"/, '记一笔金额输入框应使用文本输入并绑定失焦计算');
  assertMatches(transferWxml, /class="amount-input"[\s\S]*type="text"[\s\S]*bindblur="onAmountBlur"/, '转账金额输入框应使用文本输入并绑定失焦计算');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
