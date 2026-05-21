/**
 * 云端备份导出单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      云端备份导出单元测试');
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

function assertNotMatches(actual, pattern, message) {
  if (pattern.test(actual)) {
    throw new Error(`${message} - 不应匹配: ${pattern}`);
  }
}

const root = path.join(__dirname, '..');
const settingsJs = fs.readFileSync(path.join(root, 'miniprogram/pages/settings/settings.js'), 'utf8');
const settingsWxml = fs.readFileSync(path.join(root, 'miniprogram/pages/settings/settings.wxml'), 'utf8');
const cloudStorageJs = fs.readFileSync(path.join(root, 'miniprogram/utils/cloudStorage.js'), 'utf8');
const cloudFunctionJs = fs.readFileSync(path.join(root, 'cloudfunctions/quickstartFunctions/index.js'), 'utf8');

const exportDataMatch = settingsJs.match(/exportData:\s*(?:async\s*)?function\s*\(\)\s*\{([\s\S]*?)\n  \},\n\n  importData:/);
const exportDataBody = exportDataMatch ? exportDataMatch[1] : '';

test('我的页导出数据备份应改为云端备份，不再复制到剪贴板', () => {
  assertMatches(settingsWxml, /备份到云端/, '菜单文案应表达云端备份');
  assertMatches(exportDataBody, /cloudStorage\.createBackupInCloud/, '导出数据应调用云端备份方法');
  assertMatches(exportDataBody, /wx\.showLoading\(\{\s*title:\s*'备份中\.\.\.'/, '备份时应显示加载状态');
  assertMatches(exportDataBody, /title:\s*'备份成功'/, '备份成功后应提示用户');
  assertMatches(exportDataBody, /3 个独立备份文件/, '成功提示应说明会生成独立备份文件');
  assertNotMatches(exportDataBody, /wx\.setClipboardData/, '导出数据备份不应再复制到剪贴板');
});

test('云存储工具应为每类数据创建独立备份文件', () => {
  assertMatches(cloudStorageJs, /const createBackupInCloud\s*=\s*async function/, '应有 createBackupInCloud 方法');
  assertMatches(cloudStorageJs, /type:\s*'createBackupData'/, '应通过云函数创建备份');
  assertMatches(cloudStorageJs, /const getBackupItems\s*=\s*function/, '应把 records/accounts/categories 分成独立备份项');
  assertMatches(cloudStorageJs, /users\/'\s*\+\s*openid\s*\+\s*'\/backups\/'\s*\+\s*timestamp\s*\+\s*'\/'\s*\+\s*dataType\s*\+\s*'\.json'/, '备份文件应写入当前用户时间戳目录，并保留原文件名');
  assertMatches(cloudStorageJs, /files:\s*uploadedFiles/, '应返回多个备份文件信息');
  assertMatches(cloudStorageJs, /createBackupInCloud/, '应导出 createBackupInCloud');
});

test('云函数应支持服务端创建每类数据的独立备份文件', () => {
  assertMatches(cloudFunctionJs, /const createBackupData\s*=\s*async/, '云函数应有 createBackupData');
  assertMatches(cloudFunctionJs, /const getBackupItems\s*=\s*\(data\)\s*=>/, '云函数应把备份数据拆成独立文件');
  assertMatches(cloudFunctionJs, /users\/\$\{wxContext\.OPENID\}\/backups\/\$\{timestamp\}\/\$\{item\.dataType\}\.json/, '云函数备份文件应写入用户时间戳目录，并保留原文件名');
  assertMatches(cloudFunctionJs, /files:\s*uploadedFiles/, '云函数应返回多个备份文件信息');
  assertMatches(cloudFunctionJs, /case "createBackupData":/, '云函数入口应分发 createBackupData');
});

console.log('\n========================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
