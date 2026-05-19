/**
 * App 启动时 openid 尚未就绪的加载竞态测试
 */

console.log('========================================');
console.log('      openid 加载竞态单元测试');
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

async function flushPromises(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function setupAppMock() {
  let appInstance = null;
  let openidSuccess = null;
  const storage = {};

  global.App = function (definition) {
    appInstance = definition;
  };

  global.getApp = function () {
    return appInstance || {};
  };

  global.wx = {
    env: {
      USER_DATA_PATH: '/tmp'
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
          if (path.includes('accounts')) {
            return JSON.stringify([{ id: 'acc-1', name: '现金', category: '现金', balance: 230 }]);
          }
          if (path.includes('categories')) {
            return JSON.stringify({ expense: { groups: [] }, income: { groups: [] } });
          }
          return '[]';
        },
        writeFileSync: function () {},
        unlinkSync: function () {}
      };
    },
    cloud: {
      init: function () {},
      getEnv: function () {
        return 'cloud1-d3gvv57hn4dfa5588';
      },
      callFunction: function ({ success }) {
        openidSuccess = success;
      },
      downloadFile: async function ({ fileID }) {
        if (fileID.includes('/accounts.json')) {
          return { tempFilePath: '/tmp/accounts.json' };
        }
        if (fileID.includes('/categories.json')) {
          return { tempFilePath: '/tmp/categories.json' };
        }
        return { tempFilePath: '/tmp/records.json' };
      },
      uploadFile: async function () {
        return {
          fileID: 'cloud://cloud1-d3gvv57hn4dfa5588.636c-cloud1-d3gvv57hn4dfa5588-1433781415/users/o88VW3aY1u4Z2QNPe4mpzNr8g1Eg/categories.json'
        };
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
              },
              add: async function () {
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

  return {
    app: appInstance,
    resolveOpenid: function () {
      openidSuccess({
        result: {
          openid: 'o88VW3aY1u4Z2QNPe4mpzNr8g1Eg'
        }
      });
    }
  };
}

(async function run() {
  await test('账号加载应等待 openid 就绪后再读取云端账号', async () => {
    const { app, resolveOpenid } = setupAppMock();
    const callbackAccountCounts = [];

    app.onLaunch();
    app.loadAccounts(() => {
      callbackAccountCounts.push(app.globalData.accounts.length);
    });

    await flushPromises();
    assertEqual(callbackAccountCounts.length, 0, 'openid 就绪前不应回调账号空数据');

    resolveOpenid();
    await flushPromises(12);

    assertEqual(callbackAccountCounts.length > 0, true, 'openid 就绪后应回调');
    assertEqual(callbackAccountCounts[0], 1, '账号数量');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
