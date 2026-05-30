/**
 * 统计页布局样式单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      统计页布局样式单元测试');
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

function assertIncludes(actual, expected, message) {
  if (!actual.includes(expected)) {
    throw new Error(`${message} - 未找到: ${expected}`);
  }
}

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

function assertNotMatches(actual, pattern, message) {
  if (pattern.test(actual)) {
    throw new Error(`${message} - 不应匹配: ${pattern}`);
  }
}

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/statistics/statistics.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'miniprogram/pages/statistics/statistics.wxss'), 'utf8');
const js = fs.readFileSync(path.join(root, 'miniprogram/pages/statistics/statistics.js'), 'utf8');

test('总资产趋势底部应使用稳定三列网格对齐', () => {
  assertMatches(wxss, /\.trend-footer\s*\{[\s\S]*display:\s*grid;/, 'trend-footer 应使用 grid');
  assertIncludes(wxss, 'grid-template-columns: 1fr 2rpx 1fr;', '底部应为左右等宽加中线');
});

test('期末金额文本不应包含换行缩进，避免被渲染出额外行高', () => {
  assertMatches(
    wxml,
    /<text class="summary-amount \{\{assetTrend\[assetTrend\.length-1\]\.balance >= assetTrend\[0\]\.balance \? 'income' : 'expense'\}\}">¥\{\{assetTrend\[assetTrend\.length-1\]\.balance\}\}<\/text>/,
    '期末金额应在 text 标签内单行渲染'
  );
});

test('总资产趋势应使用 Canvas 绘制并支持图表区域触摸选择', () => {
  assertMatches(wxml, /<canvas[\s\S]*canvas-id="assetTrendCanvas"[\s\S]*class="asset-trend-canvas"/, '应有资产趋势 Canvas');
  assertMatches(wxml, /bindtouchstart="onTrendTouch"[\s\S]*bindtouchmove="onTrendTouch"/, 'Canvas 应支持点击和滑动选择');
  assertMatches(wxml, /class="trend-detail-panel"/, '应有固定详情面板');
  assertMatches(wxml, /\{\{selectedTrend\.label\}\}/, '详情面板应展示选中日期');
  assertNotMatches(wxml, /wx:for="\{\{chartSegments\}\}"/, '不应再用 DOM 线段拼折线');
  assertNotMatches(wxml, /bindtap="onPointTap"/, '不应再依赖点中圆点查看详情');
  assertNotMatches(wxml, /class="zoom-controls"/, '不应再展示缩放按钮');
});

test('统计页应提供 Canvas 绘制和触摸吸附逻辑', () => {
  assertMatches(js, /drawAssetTrendChart:\s*function/, '应有 Canvas 绘制方法');
  assertMatches(js, /onTrendTouch:\s*function/, '应有趋势图触摸处理方法');
  assertMatches(js, /selectTrendPointByX:\s*function/, '应按横坐标吸附最近数据点');
  assertMatches(js, /updateSelectedTrend:\s*function/, '应更新选中详情数据');
  assertNotMatches(js, /zoomIn:\s*function/, '不应保留旧缩放逻辑');
  assertNotMatches(js, /onPointTap:\s*function/, '不应保留旧点选逻辑');
});

test('支出分类统计应按大类展示并在卡片内展示小类明细', () => {
  assertMatches(js, /expenseCategoryGroupMap/, '统计逻辑应先构建支出大类映射');
  assertMatches(js, /childMap/, '统计逻辑应保留大类下的小类金额');
  assertMatches(wxml, /wx:for="\{\{item\.children\}\}"/, '大类卡片内应遍历小类明细');
  assertMatches(wxml, /class="category-child-list"/, '应有小类明细列表容器');
  assertMatches(wxml, /class="category-child-name"/, '应展示小类名称');
  assertMatches(wxml, /class="category-child-amount"/, '应展示小类金额');
  assertMatches(wxss, /\.category-child-list\s*\{/, '小类明细列表应有样式');
});

test('支出分类统计应提供大类和小类明细下钻入口', () => {
  assertMatches(js, /toggleCategoryDrilldown:\s*function/, '应有大类明细展开方法');
  assertMatches(js, /toggleChildDrilldown:\s*function/, '应有小类明细筛选方法');
  assertMatches(js, /goToDrilldownRecord:\s*function/, '明细记录应可进入编辑页');
  assertMatches(wxml, /bindtap="toggleCategoryDrilldown"/, '大类卡片应可点击展开明细');
  assertMatches(wxml, /catchtap="toggleChildDrilldown"/, '小类行应可点击筛选明细');
  assertMatches(wxml, /wx:for="\{\{item\.drillRecords\}\}"/, '展开后应遍历明细记录');
  assertMatches(wxml, /class="category-drilldown"/, '应有分类明细容器');
  assertMatches(wxml, /class="drill-record-row"/, '应有明细记录行');
  assertMatches(wxss, /\.category-drilldown\s*\{/, '分类明细区域应有样式');
  assertMatches(wxss, /\.drill-record-row\s*\{/, '明细记录行应有样式');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
