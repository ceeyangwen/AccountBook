/**
 * App 本地缓存同步测试
 */

console.log('========================================');
console.log('      App 本地缓存同步单元测试');
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
    throw new Error(`${message} - 期望: ${expected}, 实际: ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message} - 期望: ${expectedJson}, 实际: ${actualJson}`);
  }
}

async function flushPromises(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function setupAppMock(options = {}) {
  let appInstance = null;
  const files = {};
  const storage = {
    openid: 'user-cache-1'
  };
  const readDeferred = options.readDeferred || null;
  const cloudReadData = options.cloudReadData || [];
  const cloudWrites = [];

  global.App = function (definition) {
    appInstance = definition;
  };

  global.getApp = function () {
    return appInstance || {};
  };

  global.wx = {
    env: {
      USER_DATA_PATH: '/mock-user-data'
    },
    getStorageSync: function (key) {
      return storage[key];
    },
    setStorageSync: function (key, value) {
      storage[key] = value;
    },
    showToast: function () {},
    showModal: function () {},
    getFileSystemManager: function () {
      return {
        readFileSync: function (path) {
          if (!Object.prototype.hasOwnProperty.call(files, path)) {
            throw new Error('file not found');
          }
          return files[path];
        },
        writeFileSync: function (path, content) {
          files[path] = content;
        },
        unlinkSync: function (path) {
          delete files[path];
        }
      };
    },
    cloud: {
      getEnv: function () {
        return 'cloud1-d3gvv57hn4dfa5588';
      },
      callFunction: function ({ data }) {
        if (data.type === 'readStorageData') {
          if (readDeferred) {
            return readDeferred.promise;
          }
          return Promise.resolve({
            result: {
              success: true,
              data: cloudReadData
            }
          });
        }

        if (data.type === 'writeStorageData') {
          cloudWrites.push({
            dataType: data.dataType,
            data: data.data
          });
          return Promise.resolve({
            result: {
              success: true,
              fileID: 'cloud://mock/' + data.dataType + '.json'
            }
          });
        }

        return Promise.resolve({ result: { success: true } });
      },
      database: function () {
        return {
          collection: function () {
            return {
              where: function () {
                return {
                  get: async function () {
                    return { data: [] };
                  }
                };
              }
            };
          }
        };
      }
    }
  };

  delete require.cache[require.resolve('../miniprogram/app.js')];
  delete require.cache[require.resolve('../miniprogram/utils/cloudStorage.js')];
  delete require.cache[require.resolve('../miniprogram/utils/localCache.js')];
  delete require.cache[require.resolve('../miniprogram/utils/logger.js')];
  delete require.cache[require.resolve('../miniprogram/utils/balanceCalculator.js')];
  require('../miniprogram/app.js');

  appInstance.globalData = {
    records: [],
    accounts: [],
    categories: {
      expense: { groups: [] },
      income: { groups: [] }
    },
    categoriesLoaded: false
  };

  const localCache = require('../miniprogram/utils/localCache.js');

  return {
    app: appInstance,
    files,
    storage,
    localCache,
    cloudWrites
  };
}

(async function run() {
  await test('loadAccounts 有本地缓存时先回调缓存数据，再后台刷新云端并更新缓存', async () => {
    const readDeferred = createDeferred();
    const { app, localCache } = setupAppMock({ readDeferred });
    const cachedAccounts = [{ id: 'acc-cache', name: '缓存现金', balance: '10.00' }];
    const cloudAccounts = [{ id: 'acc-cloud', name: '云端现金', balance: '20.00' }];
    const callbackCounts = [];

    localCache.writeDataCache('accounts', cachedAccounts);
    app.loadAccounts(() => {
      callbackCounts.push(app.globalData.accounts.length);
    });

    await flushPromises();
    assertEqual(callbackCounts.length, 1, '缓存应立即触发一次回调');
    assertDeepEqual(app.globalData.accounts, cachedAccounts, '应先使用本地缓存账号');

    readDeferred.resolve({
      result: {
        success: true,
        data: cloudAccounts
      }
    });
    await flushPromises(12);

    assertDeepEqual(app.globalData.accounts, cloudAccounts, '云端刷新后应更新内存账号');
    assertDeepEqual(localCache.readDataCache('accounts'), cloudAccounts, '云端刷新后应更新本地缓存');
  });

  await test('forceRefresh 加载账号时跳过本地缓存并使用云端数据', async () => {
    const cloudAccounts = [{ id: 'acc-cloud', name: '云端现金', balance: '20.00' }];
    const { app, localCache } = setupAppMock({ cloudReadData: cloudAccounts });
    const cachedAccounts = [{ id: 'acc-cache', name: '缓存现金', balance: '10.00' }];
    const callbackCounts = [];

    localCache.writeDataCache('accounts', cachedAccounts);
    app.loadAccounts(() => {
      callbackCounts.push(app.globalData.accounts.length);
    }, true);
    await flushPromises(12);

    assertEqual(callbackCounts.length, 1, 'forceRefresh 应只在云端加载后回调');
    assertDeepEqual(app.globalData.accounts, cloudAccounts, 'forceRefresh 应使用云端账号');
  });

  await test('后台刷新返回空账号时不应覆盖已有缓存账号', async () => {
    const { app, localCache } = setupAppMock({ cloudReadData: [] });
    const cachedAccounts = [{ id: 'acc-cache', name: '缓存现金', balance: '10.00' }];

    localCache.writeDataCache('accounts', cachedAccounts);
    app.loadAccounts(() => {});
    await flushPromises(12);

    assertDeepEqual(app.globalData.accounts, cachedAccounts, '空云端结果不应覆盖缓存账号');
    assertDeepEqual(localCache.readDataCache('accounts'), cachedAccounts, '空云端结果不应覆盖本地缓存');
  });

  await test('成功添加账号后应同步写入本地缓存和云端', async () => {
    const { app, localCache, cloudWrites } = setupAppMock();
    app.globalData.accounts = [];
    let callbackResult = null;

    app.addAccount({ name: '微信钱包', category: '虚拟账户', balance: '66.00' }, success => {
      callbackResult = success;
    });
    await flushPromises(12);

    assertEqual(callbackResult, true, '添加账号回调结果');
    assertEqual(cloudWrites.length, 1, '云端写入次数');
    assertEqual(cloudWrites[0].dataType, 'accounts', '云端写入类型');
    assertEqual(localCache.readDataCache('accounts').length, 1, '本地缓存账号数量');
  });

  await test('保存分类成功后应同步写入本地缓存', async () => {
    const { app, localCache } = setupAppMock();
    app.globalData.categories = {
      expense: { groups: [{ id: 'expense-group-1', name: '支出', children: [] }] },
      income: { groups: [] }
    };
    let callbackResult = null;

    app.saveCategories(success => {
      callbackResult = success;
    });
    await flushPromises(12);

    assertEqual(callbackResult, true, '保存分类回调结果');
    assertDeepEqual(localCache.readDataCache('categories'), app.globalData.categories, '本地缓存分类');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
