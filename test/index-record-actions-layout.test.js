/**
 * 首页记录操作入口布局单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('    首页记录操作入口布局单元测试');
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

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

function getRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`未找到样式: ${selector}`);
  }
  return match[1];
}

const root = path.join(__dirname, '..');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.wxss'), 'utf8');

test('记录右侧操作列应固定宽度并右对齐，避免金额长度影响 CTA 位置', () => {
  const recordRight = getRule(wxss, '.record-right');
  assertMatches(recordRight, /width:\s*220rpx;/, 'record-right 应固定宽度');
  assertMatches(recordRight, /display:\s*flex;/, 'record-right 应使用 flex');
  assertMatches(recordRight, /flex-direction:\s*column;/, 'record-right 应纵向排列金额和 CTA');
  assertMatches(recordRight, /align-items:\s*flex-end;/, 'record-right 内容应靠右对齐');
});

test('记录更多按钮应使用固定点击区域并居中显示三个点', () => {
  const recordMore = getRule(wxss, '.record-more');
  assertMatches(recordMore, /width:\s*72rpx;/, 'record-more 应固定宽度');
  assertMatches(recordMore, /height:\s*40rpx;/, 'record-more 应固定高度');
  assertMatches(recordMore, /display:\s*flex;/, 'record-more 应使用 flex');
  assertMatches(recordMore, /align-items:\s*center;/, 'record-more 应垂直居中');
  assertMatches(recordMore, /justify-content:\s*center;/, 'record-more 应水平居中');
  assertMatches(recordMore, /margin-left:\s*0;/, 'record-more 不应通过左边距偏移');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
