/**
 * 本地文件缓存工具测试
 */

console.log('========================================');
console.log('        本地缓存工具单元测试');
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

function setupWxMock() {
  const files = {};
  const storage = {
    openid: 'user-cache-1'
  };

  global.getApp = function () {
    return {};
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
          if (!Object.prototype.hasOwnProperty.call(files, path)) {
            throw new Error('file not found');
          }
          delete files[path];
        }
      };
    }
  };

  delete require.cache[require.resolve('../miniprogram/utils/localCache.js')];
  const localCache = require('../miniprogram/utils/localCache.js');

  return {
    files,
    storage,
    localCache
  };
}

(async function run() {
  await test('写入后可以按 openid 和 dataType 读取缓存数据', async () => {
    const { localCache } = setupWxMock();
    const accounts = [{ id: 'acc-1', name: '现金', balance: '12.30' }];

    const writeResult = localCache.writeDataCache('accounts', accounts);
    const readResult = localCache.readDataCache('accounts');

    assertEqual(writeResult, true, '写入结果');
    assertDeepEqual(readResult, accounts, '读取结果');
  });

  await test('没有 openid 时不读写本地缓存', async () => {
    const { localCache, storage } = setupWxMock();
    delete storage.openid;

    assertEqual(localCache.writeDataCache('records', []), false, '无 openid 写入结果');
    assertEqual(localCache.readDataCache('records'), null, '无 openid 读取结果');
  });

  await test('缓存文件不存在时返回 null', async () => {
    const { localCache } = setupWxMock();

    assertEqual(localCache.readDataCache('records'), null, '不存在的缓存读取结果');
  });

  await test('可以读取旧格式的原始 JSON 缓存', async () => {
    const { localCache, files } = setupWxMock();
    const records = [{ id: 'r-1', amount: '8.00' }];
    files['/mock-user-data/accountbook_cache_user-cache-1_records.json'] = JSON.stringify(records);

    assertDeepEqual(localCache.readDataCache('records'), records, '旧格式读取结果');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
