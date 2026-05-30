/**
 * 分类默认数据与云端同步单元测试
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('      分类默认数据与云端同步单元测试');
console.log('========================================\n');

let passed = 0;
let failed = 0;

async function test(description, testFn) {
  try {
    await testFn();
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

function assertIncludes(list, value, message) {
  if (!list.includes(value)) {
    throw new Error(`${message} - 未找到 ${value}`);
  }
}

function assertMatches(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message} - 未匹配: ${pattern}`);
  }
}

async function flushPromises(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function getHomeGroup(categories) {
  return categories.expense.groups.find(group => group.id === 'expense-group-3');
}

function setupAppMock(options = {}) {
  let appInstance = null;
  let savedCategories = null;
  const storage = {
    openid: 'test-openid'
  };
  const cloudCategories = options.cloudCategories || null;

  global.App = function(definition) {
    appInstance = definition;
  };

  global.getApp = function() {
    return appInstance || {};
  };

  global.wx = {
    env: {
      USER_DATA_PATH: '/tmp'
    },
    getStorageSync: function(key) {
      return storage[key];
    },
    setStorageSync: function(key, value) {
      storage[key] = value;
    },
    showToast: function() {},
    showModal: function() {},
    getFileSystemManager: function() {
      return {
        readFileSync: function() {
          return '[]';
        },
        writeFileSync: function() {},
        unlinkSync: function() {}
      };
    },
    cloud: {
      init: function() {},
      getEnv: function() {
        return 'cloud1-d3gvv57hn4dfa5588';
      },
      callFunction: function({ data, success }) {
        if (data && data.type === 'getOpenId') {
          if (success) {
            success({ result: { openid: 'test-openid' } });
          }
          return Promise.resolve({ result: { openid: 'test-openid' } });
        }

        if (data && data.type === 'readStorageData' && data.dataType === 'categories') {
          return Promise.resolve({
            result: {
              success: !!cloudCategories,
              data: cloudCategories
            }
          });
        }

        if (data && data.type === 'writeStorageData' && data.dataType === 'categories') {
          savedCategories = data.data;
          return Promise.resolve({
            result: {
              success: true,
              fileID: 'cloud://cloud1-d3gvv57hn4dfa5588/users/test-openid/categories.json'
            }
          });
        }

        return Promise.resolve({ result: { success: false } });
      },
      downloadFile: async function() {
        return { tempFilePath: '/tmp/categories.json' };
      },
      database: function() {
        return {
          collection: function() {
            return {
              where: function() {
                return {
                  get: async function() {
                    return { data: [] };
                  }
                };
              },
              add: async function() {
                return {};
              }
            };
          }
        };
      }
    }
  };

  delete require.cache[require.resolve('../miniprogram/app.js')];
  delete require.cache[require.resolve('../miniprogram/utils/cloudStorage.js')];
  delete require.cache[require.resolve('../miniprogram/utils/logger.js')];
  delete require.cache[require.resolve('../miniprogram/utils/balanceCalculator.js')];
  require('../miniprogram/app.js');
  appInstance.onLaunch();

  return {
    app: appInstance,
    getSavedCategories: function() {
      return savedCategories;
    }
  };
}

function createOldCloudCategories() {
  return {
    expense: {
      groups: [
        {
          id: 'expense-group-3',
          name: '居家物业',
          icon: '🏠',
          color: '#FFE66D',
          children: [
            { id: 'expense-3-1', name: '日常用品', icon: '🛒', color: '#FFE66D' },
            { id: 'custom-pet', name: '养宠物', icon: '🐾', color: '#FFE66D' }
          ]
        }
      ]
    },
    income: {
      groups: [
        {
          id: 'income-group-1',
          name: '职业收入',
          icon: '💼',
          color: '#4ECDC4',
          children: [
            { id: 'income-1-1', name: '工资收入', icon: '💰', color: '#4ECDC4' }
          ]
        }
      ]
    }
  };
}

(async function run() {
  await test('默认居家物业分类应包含养娃小类', async () => {
    const { app } = setupAppMock();
    const names = getHomeGroup(app.DEFAULT_CATEGORIES).children.map(category => category.name);

    assertIncludes(names, '养娃', '居家物业默认小类');
  });

  await test('首次加载分类应读取云端分类，而不是直接使用内存默认分类', async () => {
    const cloudCategories = createOldCloudCategories();
    const { app } = setupAppMock({ cloudCategories });

    app.globalData.categories = JSON.parse(JSON.stringify(app.DEFAULT_CATEGORIES));
    app.globalData.categoriesLoaded = false;

    let callbackCalled = false;
    app.loadCategories(() => {
      callbackCalled = true;
    });
    await flushPromises();

    assertEqual(callbackCalled, true, '加载回调');
    assertEqual(getHomeGroup(app.globalData.categories).children.some(category => category.id === 'custom-pet'), true, '应保留云端自定义小类');
  });

  await test('旧数据迁移不应覆盖用户自定义分类，并应把新增默认小类同步到云端', async () => {
    const { app, getSavedCategories } = setupAppMock();
    app.globalData.records = [];
    app.globalData.categories = createOldCloudCategories();
    app.globalData.categoriesLoaded = true;

    app.migrateOldData();
    await flushPromises();

    const homeChildren = getHomeGroup(app.globalData.categories).children;
    const names = homeChildren.map(category => category.name);
    const savedNames = getHomeGroup(getSavedCategories()).children.map(category => category.name);

    assertIncludes(names, '养宠物', '迁移后应保留用户自定义分类');
    assertIncludes(names, '养娃', '迁移后应补齐新增默认分类');
    assertIncludes(savedNames, '养宠物', '云端保存时应保留用户自定义分类');
    assertIncludes(savedNames, '养娃', '云端保存时应包含新增默认分类');
  });

  await test('管理分类页面应通过 app.loadCategories 拉取分类，编辑保存失败不应直接返回', async () => {
    const root = path.join(__dirname, '..');
    const manageJs = fs.readFileSync(path.join(root, 'miniprogram/pages/category-manage/category-manage.js'), 'utf8');
    const editJs = fs.readFileSync(path.join(root, 'miniprogram/pages/category-edit/category-edit.js'), 'utf8');

    assertMatches(manageJs, /app\.loadCategories\(\(\)\s*=>\s*\{[\s\S]*categories:\s*app\.globalData\.categories\[this\.data\.currentTab\]/, '管理分类页应先走 app.loadCategories');
    assertMatches(editJs, /handleSaveResult:\s*function\(success\)[\s\S]*if \(success !== false\)[\s\S]*wx\.navigateBack/, '分类编辑页应只在保存成功后返回');
    assertMatches(editJs, /title:\s*'保存失败，请稍后重试'/, '分类编辑页保存失败应提示');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
