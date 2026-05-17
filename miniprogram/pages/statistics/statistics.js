const app = getApp();

Page({
  data: {
    period: 'month',
    showExpense: true,
    totalIncome: '0.00',
    totalExpense: '0.00',
    balance: '0.00',
    expenseCategoryList: [],
    pieChartData: [],
    pieGradient: '',
    assetTrend: [],
    maxBalance: 0,
    halfBalance: 0,
    chartPoints: [],
    chartSegments: [],
    zoomLevel: 1,
    zoomLevelDisplay: '1.0',
    selectedPointIndex: -1,
    loading: true
  },

  onLoad: function () {
    const savedZoomLevel = wx.getStorageSync('statisticsZoomLevel');
    if (savedZoomLevel) {
      this.setData({ 
        zoomLevel: savedZoomLevel,
        zoomLevelDisplay: savedZoomLevel.toFixed(1)
      });
    }
    this.loadStatistics();
  },

  onShow: function () {
    const savedZoomLevel = wx.getStorageSync('statisticsZoomLevel');
    if (savedZoomLevel && savedZoomLevel !== this.data.zoomLevel) {
      this.setData({ 
        zoomLevel: savedZoomLevel,
        zoomLevelDisplay: savedZoomLevel.toFixed(1)
      });
    }
    this.loadStatistics();
  },

  switchPeriod: function (e) {
    const period = e.currentTarget.dataset.period;
    this.setData({
      period
    });
    this.loadStatistics();
  },

  loadStatistics: function () {
    this.setData({ loading: true });
    
    app.loadRecords(() => {
      app.loadAccounts(() => {
        this.processStatistics();
      });
    });
  },

  processStatistics: function () {
    const records = app.globalData.records || [];
    const accounts = app.globalData.accounts || [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    // 收集需要统计的账户 ID
    const includedAccountIds = new Set();
    accounts.forEach(account => {
      if (account.includeInTotal !== false) {
        includedAccountIds.add(account.id);
      }
    });
    
    const expenseCategoryMap = {};
    
    const expenseCategories = app.globalData.categories.expense;
    
    if (expenseCategories && expenseCategories.groups) {
      expenseCategories.groups.forEach(group => {
        (group.children || []).forEach(cat => {
          expenseCategoryMap[cat.id] = {
            ...cat,
            amount: 0
          };
        });
      });
    }
    
    records.forEach(record => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();
      
      let isInPeriod = false;
      if (this.data.period === 'month') {
        isInPeriod = recordYear === currentYear && recordMonth === currentMonth;
      } else {
        isInPeriod = recordYear === currentYear;
      }
      
      if (!isInPeriod) return;
      
      // 只统计 includeInTotal 为 true 的账户
      if (!record.accountId || !includedAccountIds.has(record.accountId)) return;
      
      if (record.type === 'income') {
        totalIncome += parseFloat(record.amount);
      } else if (record.type === 'expense') {
        totalExpense += parseFloat(record.amount);
        
        const categoryId = record.categoryId;
        
        if (expenseCategoryMap[categoryId]) {
          expenseCategoryMap[categoryId].amount += parseFloat(record.amount);
        } else {
          const otherCat = expenseCategoryMap['expense-11-2'];
          if (otherCat) {
            otherCat.amount += parseFloat(record.amount);
          }
        }
      }
    });
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B195', '#C06C84'
    ];
    
    let expenseCategoryList = Object.values(expenseCategoryMap).filter(cat => cat.amount > 0);
    expenseCategoryList.sort((a, b) => b.amount - a.amount);
    
    expenseCategoryList = expenseCategoryList.map((cat, index) => ({
      ...cat,
      color: colors[index % colors.length],
      amount: cat.amount.toFixed(2),
      percent: totalExpense > 0 ? ((cat.amount / totalExpense) * 100).toFixed(1) : '0.0'
    }));
    
    // 生成圆锥渐变字符串
    const pieGradient = this.generatePieGradient(expenseCategoryList);
    const pieChartData = this.calculatePieChartData(expenseCategoryList);
    
    const assetTrend = this.calculateAssetTrend(records, accounts, currentYear, currentMonth);
    
    const balances = assetTrend.map(t => parseFloat(t.balance));
    const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
    const minBalance = balances.length > 0 ? Math.min(...balances) : 0;
    
    const maxAbsBalance = Math.max(Math.abs(maxBalance), Math.abs(minBalance));
    const yAxisTop = maxAbsBalance;
    const yAxisBottom = -maxAbsBalance;
    
    const { chartPoints, chartSegments } = this.calculateChartPositions(assetTrend, maxAbsBalance);
    
    this.setData({
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      balance: (totalIncome - totalExpense).toFixed(2),
      expenseCategoryList,
      pieChartData,
      pieGradient,
      assetTrend,
      yAxisTop: yAxisTop.toFixed(2),
      yAxisBottom: yAxisBottom.toFixed(2),
      chartPoints: chartPoints,
      chartSegments: chartSegments,
      zoomLevelDisplay: this.data.zoomLevel.toFixed(1),
      loading: false
    });
  },

  generatePieGradient: function(list) {
    if (!list || list.length === 0) return '#CCCCCC';
    
    const total = list.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    let currentPercent = 0;
    const gradientParts = [];
    
    list.forEach((item, index) => {
      const percent = (parseFloat(item.amount) / total) * 100;
      const nextPercent = currentPercent + percent;
      gradientParts.push(`${item.color} ${currentPercent.toFixed(1)}% ${nextPercent.toFixed(1)}%`);
      currentPercent = nextPercent;
    });
    
    return gradientParts.join(', ');
  },

  calculatePieChartData: function(list) {
    if (!list || list.length === 0) return [];
    
    const total = list.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B195', '#C06C84'
    ];
    
    let currentAngle = 0;
    return list.map((item, index) => {
      const angle = (parseFloat(item.amount) / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      return {
        ...item,
        color: colors[index % colors.length],
        startAngle,
        endAngle: currentAngle
      };
    });
  },

  calculateChartPositions: function(trend, maxBalance) {
    if (!trend || trend.length === 0) {
      return { chartPoints: [], chartSegments: [] };
    }
    
    const chartWidth = 260 * this.data.zoomLevel;
    const chartHeight = 140;
    const padding = 10;
    
    const balances = trend.map(t => parseFloat(t.balance)).filter(b => !isNaN(b));
    const actualMinBalance = balances.length > 0 ? Math.min(...balances) : 0;
    const actualMaxBalance = balances.length > 0 ? Math.max(...balances) : 0;
    
    const maxAbsBalance = Math.max(Math.abs(actualMinBalance), Math.abs(actualMaxBalance));
    
    const minBalance = -maxAbsBalance;
    const maxBal = maxAbsBalance;
    const range = maxBal - minBalance || 1;
    
    const points = trend.map((data, i) => {
      const x = padding + (i / (trend.length - 1 || 1)) * (chartWidth - 2 * padding);
      const balance = parseFloat(data.balance);
      const normalizedY = (balance - minBalance) / range;
      const y = (chartHeight - padding) - normalizedY * (chartHeight - 2 * padding);
      
      return {
        x: x,
        y: y,
        data: data,
        active: false
      };
    });
    
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const width = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      segments.push({
        x1: p1.x,
        y1: p1.y,
        width: width,
        angle: angle
      });
    }
    
    return { chartPoints: points, chartSegments: segments };
  },

  calculateAssetTrend: function(records, accounts, year, month) {
    const trend = [];
    const now = new Date();
    const isMonthView = this.data.period === 'month';
    const accountCategories = app.globalData.accountCategories || [];
    
    // 收集需要统计的账户 ID
    const includedAccountIds = new Set();
    const accountMap = {};
    
    accounts.forEach(account => {
      if (account.includeInTotal !== false) {
        includedAccountIds.add(account.id);
        accountMap[account.id] = account;
      }
    });
    
    // 先计算所有账户在当前日期的余额
    const accountBalances = {};
    accounts.forEach(account => {
      if (includedAccountIds.has(account.id)) {
        accountBalances[account.id] = parseFloat(account.balance || 0);
      }
    });
    
    // 为每天计算每个账户的余额，需要从现在往回倒推
    if (isMonthView) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const currentDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : daysInMonth;
      
      // 创建日期列表，从当前日期开始倒推
      const daysToCalculate = [];
      for (let day = currentDay; day >= 1; day--) {
        daysToCalculate.push(day);
      }
      
      // 按日期从最新到最旧排序记录
      const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const dailyData = {};
      
      daysToCalculate.forEach(day => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 先计算这一天结束时的总资产
        let totalBalance = 0;
        Object.entries(accountBalances).forEach(([accountId, balance]) => {
          const account = accountMap[accountId];
          const categoryInfo = accountCategories.find(cat => cat.name === account.category);
          
          if (categoryInfo) {
            if (categoryInfo.type === 'debt' || categoryInfo.type === 'credit') {
              totalBalance -= balance;
            } else {
              totalBalance += balance;
            }
          }
        });
        
        // 保存这一天的数据
        dailyData[day] = {
          totalBalance: totalBalance,
          expense: 0,
          income: 0
        };
        
        // 处理这一天的记录，倒推余额
        sortedRecords.forEach(record => {
          const recordDate = new Date(record.date);
          const recordYear = recordDate.getFullYear();
          const recordMonth = recordDate.getMonth();
          const recordDay = recordDate.getDate();
          
          if (recordYear === year && recordMonth === month && recordDay === day) {
            const amount = parseFloat(record.amount);
            
            if (record.type === 'income' && record.accountId && includedAccountIds.has(record.accountId)) {
              accountBalances[record.accountId] -= amount;
              dailyData[day].income += amount;
            } else if (record.type === 'expense' && record.accountId && includedAccountIds.has(record.accountId)) {
              accountBalances[record.accountId] += amount;
              dailyData[day].expense += amount;
            } else if (record.type === 'transfer') {
              if (record.fromAccountId && includedAccountIds.has(record.fromAccountId)) {
                accountBalances[record.fromAccountId] += amount;
              }
              if (record.toAccountId && includedAccountIds.has(record.toAccountId)) {
                accountBalances[record.toAccountId] -= amount;
              }
            }
          }
        });
      });
      
      // 按日期顺序构建趋势数据
      for (let day = 1; day <= currentDay; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        trend.push({
          date: dateStr,
          label: `${month + 1}/${day}`,
          balance: dailyData[day].totalBalance.toFixed(2),
          expense: dailyData[day].expense.toFixed(2),
          income: dailyData[day].income.toFixed(2)
        });
      }
    } else {
      const currentMonth = now.getFullYear() === year ? now.getMonth() : 11;
      
      // 月份视图，直接用 calculateInitialBalance 计算每个月的结束余额
      for (let m = 0; m <= currentMonth; m++) {
        const monthEndDay = new Date(year, m + 1, 0).getDate();
        const monthEndBalance = this.calculateInitialBalance(records, accounts, year, m + 1, 1);
        
        // 计算这个月的收入和支出
        let monthExpense = 0;
        let monthIncome = 0;
        
        records.forEach(record => {
          const recordDate = new Date(record.date);
          const recordYear = recordDate.getFullYear();
          const recordMonth = recordDate.getMonth();
          
          if (recordYear === year && recordMonth === m && 
              record.accountId && includedAccountIds.has(record.accountId)) {
            const amount = parseFloat(record.amount);
            if (record.type === 'expense') {
              monthExpense += amount;
            } else if (record.type === 'income') {
              monthIncome += amount;
            }
          }
        });
        
        trend.push({
          date: `${year}-${String(m + 1).padStart(2, '0')}`,
          label: `${m + 1}月`,
          balance: monthEndBalance.toFixed(2),
          expense: monthExpense.toFixed(2),
          income: monthIncome.toFixed(2)
        });
      }
    }
    
    return trend;
  },

  calculateInitialBalance: function(records, accounts, year, month, day) {
    const beforeDate = new Date(year, month, day);
    const accountCategories = app.globalData.accountCategories || [];
    
    // 收集需要统计的账户 ID
    const includedAccountIds = new Set();
    const accountMap = {};
    
    accounts.forEach(account => {
      if (account.includeInTotal !== false) {
        includedAccountIds.add(account.id);
        accountMap[account.id] = account;
      }
    });
    
    // 为每个账户单独计算其在指定日期的余额
    const accountBalances = {};
    
    // 先初始化所有账户的当前余额
    accounts.forEach(account => {
      if (includedAccountIds.has(account.id)) {
        accountBalances[account.id] = parseFloat(account.balance || 0);
      }
    });
    
    // 反向处理记录，从当前时间倒推到指定日期
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedRecords.forEach(record => {
      const recordDate = new Date(record.date);
      if (recordDate < beforeDate) {
        // 记录在指定日期之前，已经不需要处理了
        return;
      }
      
      // 只处理需要统计的账户
      if (!record.accountId && !record.fromAccountId && !record.toAccountId) {
        return;
      }
      
      const amount = parseFloat(record.amount);
      
      // 普通记录
      if (record.type === 'income' && record.accountId && includedAccountIds.has(record.accountId)) {
        // 收入：倒推时减去
        accountBalances[record.accountId] -= amount;
      } else if (record.type === 'expense' && record.accountId && includedAccountIds.has(record.accountId)) {
        // 支出：倒推时加上
        accountBalances[record.accountId] += amount;
      } else if (record.type === 'transfer') {
        // 转账
        if (record.fromAccountId && includedAccountIds.has(record.fromAccountId)) {
          // 转出账户：倒推时加上
          accountBalances[record.fromAccountId] += amount;
        }
        if (record.toAccountId && includedAccountIds.has(record.toAccountId)) {
          // 转入账户：倒推时减去
          accountBalances[record.toAccountId] -= amount;
        }
      }
    });
    
    // 根据账户类型计算最终的总资产
    let totalBalance = 0;
    
    Object.entries(accountBalances).forEach(([accountId, balance]) => {
      const account = accountMap[accountId];
      const categoryInfo = accountCategories.find(cat => cat.name === account.category);
      
      if (categoryInfo) {
        // 根据账户类型处理余额
        if (categoryInfo.type === 'debt' || categoryInfo.type === 'credit') {
          // 负债和信用类账户，余额应该扣除
          totalBalance -= balance;
        } else {
          // 其他类型账户，余额累加
          totalBalance += balance;
        }
      }
    });
    
    return totalBalance;
  },

  onPointTap: function(e) {
    const index = e.currentTarget.dataset.index;
    console.log('点击数据点:', index);
    
    // 切换选中状态
    const newIndex = this.data.selectedPointIndex === index ? -1 : index;
    this.setData({ selectedPointIndex: newIndex });
    
    // 如果选中了，5秒后自动关闭
    if (newIndex >= 0) {
      setTimeout(() => {
        if (this.data.selectedPointIndex === newIndex) {
          this.setData({ selectedPointIndex: -1 });
        }
      }, 5000);
    }
  },

  zoomIn: function() {
    const newZoom = Math.min(this.data.zoomLevel + 0.25, 3);
    this.setData({ zoomLevel: newZoom, zoomLevelDisplay: newZoom.toFixed(1) });
    wx.setStorageSync('statisticsZoomLevel', newZoom);
    
    const balances = this.data.assetTrend.map(t => parseFloat(t.balance));
    const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
    const { chartPoints, chartSegments } = this.calculateChartPositions(this.data.assetTrend, maxBalance);
    
    this.setData({
      chartPoints: chartPoints,
      chartSegments: chartSegments
    });
  },

  zoomOut: function() {
    const newZoom = Math.max(this.data.zoomLevel - 0.25, 0.5);
    this.setData({ zoomLevel: newZoom, zoomLevelDisplay: newZoom.toFixed(1) });
    wx.setStorageSync('statisticsZoomLevel', newZoom);
    
    const balances = this.data.assetTrend.map(t => parseFloat(t.balance));
    const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
    const { chartPoints, chartSegments } = this.calculateChartPositions(this.data.assetTrend, maxBalance);
    
    this.setData({
      chartPoints: chartPoints,
      chartSegments: chartSegments
    });
  },

  resetZoom: function() {
    const newZoom = 1;
    this.setData({ zoomLevel: newZoom, zoomLevelDisplay: newZoom.toFixed(1) });
    wx.setStorageSync('statisticsZoomLevel', newZoom);
    
    const balances = this.data.assetTrend.map(t => parseFloat(t.balance));
    const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
    const { chartPoints, chartSegments } = this.calculateChartPositions(this.data.assetTrend, maxBalance);
    
    this.setData({
      chartPoints: chartPoints,
      chartSegments: chartSegments
    });
  },

  selectPieItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.expenseCategoryList.map((item, i) => ({
      ...item,
      selected: i === index
    }));
    
    this.setData({
      expenseCategoryList: list
    });
  },

  onPieTap: function(e) {
  }
});