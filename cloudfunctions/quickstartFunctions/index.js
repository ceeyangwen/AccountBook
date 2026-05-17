const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const formatTime = () => {
  const now = new Date();
  return now.toISOString();
};

console.log(`[${formatTime()}] 云函数服务启动`);

const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  console.log(`[${formatTime()}] getOpenId 调用`);
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

exports.main = async (event, context) => {
  console.log(`[${formatTime()}] 云函数被调用, type: ${event.type}`);
  console.log(`[${formatTime()}] 请求数据:`, JSON.stringify(event));
  
  try {
    let result;
    switch (event.type) {
      case "getOpenId":
        result = await getOpenId();
        break;
      default:
        console.error(`[${formatTime()}] 未知类型:`, event.type);
        result = { success: false, errMsg: "Unknown type" };
    }
    
    console.log(`[${formatTime()}] 返回结果:`, JSON.stringify(result));
    return result;
  } catch (e) {
    console.error(`[${formatTime()}] 云函数执行错误:`, e.message);
    console.error(`[${formatTime()}] 错误堆栈:`, e.stack);
    return {
      success: false,
      errMsg: e.message
    };
  }
};
