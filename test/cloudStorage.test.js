/**
 * 云存储读取逻辑单元测试
 */

console.log('========================================');
console.log('      云存储读取逻辑单元测试');
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

function assertIncludes(collection, expected, message) {
  if (!collection.includes(expected)) {
    throw new Error(`${message} - 未找到: ${expected}`);
  }
}

function setupWxMock(options = {}) {
  const openid = 'o88VW3aY1u4Z2QNPe4mpzNr8g1Eg';
  const storage = { openid };
  const attemptedFileIDs = [];
  const expectedFileID = 'cloud://cloud1-d3gvv57hn4dfa5588.636c-cloud1-d3gvv57hn4dfa5588-1433781415/users/o88VW3aY1u4Z2QNPe4mpzNr8g1Eg/accounts.json';
  const cachedFileID = options.cachedFileID;
  const fileData = options.fileData || [{ id: 'acc-1', name: '现金' }];
  const fileDataByFileID = options.fileDataByFileID || {};
  const callFunctionResult = options.callFunctionResult;
  const callFunctionHandler = options.callFunctionHandler;
  const callFunctionRequests = [];
  const uploadRequests = [];
  const uploadError = options.uploadError;

  if (cachedFileID) {
    storage.fileID_accounts = cachedFileID;
  }

  global.getApp = function () {
    return {};
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
    removeStorageSync: function (key) {
      delete storage[key];
    },
    showModal: function () {},
    getFileSystemManager: function () {
      return {
        readFileSync: function () {
          const currentFileID = attemptedFileIDs[attemptedFileIDs.length - 1];
          if (Object.prototype.hasOwnProperty.call(fileDataByFileID, currentFileID)) {
            return JSON.stringify(fileDataByFileID[currentFileID]);
          }
          return JSON.stringify(fileData);
        },
        writeFileSync: function () {},
        unlinkSync: function () {}
      };
    },
    cloud: {
      getEnv: function () {
        return 'cloud1-d3gvv57hn4dfa5588';
      },
      callFunction: async function (request) {
        callFunctionRequests.push(request);
        if (callFunctionHandler) {
          return callFunctionHandler(request);
        }
        if (callFunctionResult) {
          return callFunctionResult;
        }
        throw { errMsg: 'cloud callFunction:fail function not found' };
      },
      downloadFile: async function ({ fileID }) {
        attemptedFileIDs.push(fileID);
        if (fileID !== expectedFileID && !Object.prototype.hasOwnProperty.call(fileDataByFileID, fileID)) {
          throw { errMsg: 'cloud downloadFile:fail file not exist' };
        }
        return { tempFilePath: '/tmp/accounts.json' };
      },
      uploadFile: async function (request) {
        uploadRequests.push(request);
        if (uploadError) {
          throw uploadError;
        }
        return { fileID: expectedFileID };
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

  delete require.cache[require.resolve('../miniprogram/utils/cloudStorage.js')];
  delete require.cache[require.resolve('../miniprogram/utils/logger.js')];

  return {
    expectedFileID,
    attemptedFileIDs,
    callFunctionRequests,
    uploadRequests,
    cloudStorage: require('../miniprogram/utils/cloudStorage.js')
  };
}

(async function run() {
  await test('应兼容控制台上传文件生成的完整 File ID', async () => {
    const { cloudStorage, expectedFileID, attemptedFileIDs } = setupWxMock();

    const data = await cloudStorage.readDataFromCloud('accounts');

    assertEqual(data.length, 1, '账户数量');
    assertEqual(data[0].id, 'acc-1', '账户ID');
    assertIncludes(attemptedFileIDs, expectedFileID, '应尝试完整 File ID');
  });

  await test('accounts.json 是导出备份对象时应取其中 accounts 数组', async () => {
    const { cloudStorage } = setupWxMock({
      fileData: {
        version: '1.0',
        records: [],
        accounts: [{ id: 'acc-2', name: '支付宝' }],
        categories: {}
      }
    });

    const data = await cloudStorage.readDataFromCloud('accounts');

    assertEqual(Array.isArray(data), true, '返回值应为账户数组');
    assertEqual(data.length, 1, '账户数量');
    assertEqual(data[0].id, 'acc-2', '账户ID');
  });

  await test('缓存 File ID 下载到空账户时应继续尝试控制台完整 File ID', async () => {
    const staleFileID = 'cloud://cloud1-d3gvv57hn4dfa5588/stale/accounts.json';
    const consoleFileID = 'cloud://cloud1-d3gvv57hn4dfa5588.636c-cloud1-d3gvv57hn4dfa5588-1433781415/users/o88VW3aY1u4Z2QNPe4mpzNr8g1Eg/accounts.json';
    const { cloudStorage, expectedFileID, attemptedFileIDs } = setupWxMock({
      cachedFileID: staleFileID,
      fileDataByFileID: {
        [staleFileID]: [],
        [consoleFileID]: [{ id: 'acc-3', name: '银行卡' }]
      }
    });

    const data = await cloudStorage.readDataFromCloud('accounts');

    assertEqual(data.length, 1, '账户数量');
    assertEqual(data[0].id, 'acc-3', '账户ID');
    assertIncludes(attemptedFileIDs, staleFileID, '应先尝试缓存 File ID');
    assertIncludes(attemptedFileIDs, expectedFileID, '缓存为空后应继续尝试完整 File ID');
  });

  await test('前端下载失败时应通过云函数兜底读取账号数据', async () => {
    const { cloudStorage } = setupWxMock({
      callFunctionResult: {
        result: {
          success: true,
          data: [{ id: 'acc-4', name: '微信钱包' }]
        }
      }
    });

    global.wx.cloud.downloadFile = async function () {
      throw { errMsg: 'cloud downloadFile:fail permission denied' };
    };

    const data = await cloudStorage.readDataFromCloud('accounts');

    assertEqual(data.length, 1, '账户数量');
    assertEqual(data[0].id, 'acc-4', '账户ID');
  });

  await test('应优先使用云函数账号数据，避免旧 File ID 返回过期账号', async () => {
    const staleFileID = 'cloud://cloud1-d3gvv57hn4dfa5588/stale/accounts.json';
    const { cloudStorage } = setupWxMock({
      cachedFileID: staleFileID,
      fileDataByFileID: {
        [staleFileID]: [{ id: 'stale-acc', name: '旧账号' }]
      },
      callFunctionResult: {
        result: {
          success: true,
          data: [{ id: 'fresh-acc', name: '云函数账号' }]
        }
      }
    });

    const data = await cloudStorage.readDataFromCloud('accounts');

    assertEqual(data.length, 1, '账户数量');
    assertEqual(data[0].id, 'fresh-acc', '应使用云函数返回的新账号');
  });

  await test('写入账号应优先通过云函数，避免前端上传权限错误', async () => {
    const { cloudStorage, callFunctionRequests } = setupWxMock({
      uploadError: { errMsg: 'Have no access right to the storage STORAGE_EXCEED_AUTHORITY' },
      callFunctionHandler: async function (request) {
        if (request.data.type === 'writeStorageData') {
          return {
            result: {
              success: true,
              fileID: 'cloud://cloud1-d3gvv57hn4dfa5588.636c-cloud1-d3gvv57hn4dfa5588-1433781415/users/o88VW3aY1u4Z2QNPe4mpzNr8g1Eg/accounts.json'
            }
          };
        }
        throw { errMsg: 'unexpected callFunction type' };
      }
    });

    const result = await cloudStorage.writeDataToCloud('accounts', [{ id: 'acc-write', name: '现金' }]);

    assertEqual(result.success, true, '写入结果');
    assertEqual(callFunctionRequests[0].data.type, 'writeStorageData', '应调用写入云函数');
    assertEqual(callFunctionRequests[0].data.dataType, 'accounts', '写入类型');
  });

  await test('云函数写入失败时不应退回前端上传，避免正式版云存储权限错误掩盖真实原因', async () => {
    const { cloudStorage, uploadRequests } = setupWxMock({
      callFunctionHandler: async function (request) {
        if (request.data.type === 'writeStorageData') {
          return {
            result: {
              success: false,
              errMsg: 'cloud function write failed'
            }
          };
        }
        throw { errMsg: 'unexpected callFunction type' };
      }
    });

    const result = await cloudStorage.writeDataToCloud('accounts', [{ id: 'acc-write-fail', name: '现金' }]);

    assertEqual(result.success, false, '写入结果');
    assertEqual(result.errMsg, 'cloud function write failed', '应返回云函数真实错误');
    assertEqual(uploadRequests.length, 0, '不应退回前端 uploadFile');
  });

  console.log('\n========================================');
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
})();
