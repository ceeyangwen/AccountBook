const app = getApp();

const getAccountCategoryInfo = function(account) {
  if (!account) return null;
  const accountCategories = app.globalData.accountCategories || [];
  return accountCategories.find(cat => cat.name === account.category) || null;
};

const isDebtOrCreditAccount = function(account) {
  const categoryInfo = getAccountCategoryInfo(account);
  return !!categoryInfo && (categoryInfo.type === 'debt' || categoryInfo.type === 'credit');
};

const calculateTotalBalanceFromAccountBalances = function(accountBalances, accountMap) {
  let totalBalance = 0;

  Object.entries(accountBalances).forEach(([accountId, balance]) => {
    const account = accountMap[accountId];
    const categoryInfo = getAccountCategoryInfo(account);

    if (!categoryInfo) return;

    if (categoryInfo.type === 'debt' || categoryInfo.type === 'credit') {
      totalBalance -= balance;
    } else {
      totalBalance += balance;
    }
  });

  return totalBalance;
};

const reverseNormalRecordBalance = function(accountBalances, account, recordType, amount) {
  if (!account || accountBalances[account.id] === undefined) return;

  const isDebtOrCredit = isDebtOrCreditAccount(account);

  if (recordType === 'income') {
    accountBalances[account.id] += isDebtOrCredit ? amount : -amount;
  } else if (recordType === 'expense') {
    accountBalances[account.id] += isDebtOrCredit ? -amount : amount;
  }
};

const reverseTransferRecordBalance = function(accountBalances, fromAccount, toAccount, amount) {
  if (fromAccount && accountBalances[fromAccount.id] !== undefined) {
    accountBalances[fromAccount.id] += isDebtOrCreditAccount(fromAccount) ? -amount : amount;
  }

  if (toAccount && accountBalances[toAccount.id] !== undefined) {
    accountBalances[toAccount.id] += isDebtOrCreditAccount(toAccount) ? amount : -amount;
  }
};

const reverseRecordBalances = function(accountBalances, record, accountMap, includedAccountIds) {
  const amount = parseFloat(record.amount) || 0;

  if (record.type === 'income' || record.type === 'expense') {
    if (record.accountId && includedAccountIds.has(record.accountId)) {
      reverseNormalRecordBalance(accountBalances, accountMap[record.accountId], record.type, amount);
    }
    return;
  }

  if (record.type === 'transfer') {
    const fromAccount = record.fromAccountId && includedAccountIds.has(record.fromAccountId)
      ? accountMap[record.fromAccountId]
      : null;
    const toAccount = record.toAccountId && includedAccountIds.has(record.toAccountId)
      ? accountMap[record.toAccountId]
      : null;
    reverseTransferRecordBalance(accountBalances, fromAccount, toAccount, amount);
  }
};

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
    selectedTrendIndex: -1,
    selectedTrend: null,
    assetTrendLatest: '0.00',
    assetTrendDelta: '+¥0.00',
    assetTrendDeltaClass: 'income',
    loading: true
  },

  onLoad: function () {
    this.loadStatistics();
  },

  onShow: function () {
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
    
    const expenseCategoryGroupMap = {};
    const expenseCategoryById = {};
    let fallbackExpenseCategory = null;
    
    const expenseCategories = app.globalData.categories.expense;
    
    if (expenseCategories && expenseCategories.groups) {
      expenseCategories.groups.forEach(group => {
        const childMap = {};
        (group.children || []).forEach(cat => {
          childMap[cat.id] = {
            ...cat,
            amount: 0
          };
          expenseCategoryById[cat.id] = {
            groupId: group.id,
            categoryId: cat.id
          };
          if (cat.id === 'expense-11-2') {
            fallbackExpenseCategory = {
              groupId: group.id,
              categoryId: cat.id
            };
          }
        });
        expenseCategoryGroupMap[group.id] = {
          ...group,
          amount: 0,
          childMap
        };
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
        const categoryRef = expenseCategoryById[categoryId] || fallbackExpenseCategory;
        
        if (categoryRef) {
          const group = expenseCategoryGroupMap[categoryRef.groupId];
          const child = group && group.childMap[categoryRef.categoryId];
          if (group && child) {
            const amount = parseFloat(record.amount);
            group.amount += amount;
            child.amount += amount;
          }
        }
      }
    });
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B195', '#C06C84'
    ];
    
    let expenseCategoryList = Object.values(expenseCategoryGroupMap)
      .filter(group => group.amount > 0)
      .map(group => ({
        ...group,
        children: Object.values(group.childMap)
          .filter(child => child.amount > 0)
          .sort((a, b) => b.amount - a.amount)
      }));
    expenseCategoryList.sort((a, b) => b.amount - a.amount);
    
    expenseCategoryList = expenseCategoryList.map((group, index) => ({
      ...group,
      color: colors[index % colors.length],
      amount: group.amount.toFixed(2),
      percent: totalExpense > 0 ? ((group.amount / totalExpense) * 100).toFixed(1) : '0.0',
      children: group.children.map(child => ({
        ...child,
        amount: child.amount.toFixed(2),
        percent: group.amount > 0 ? ((child.amount / group.amount) * 100).toFixed(1) : '0.0'
      }))
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
    const selectedTrendIndex = assetTrend.length > 0 ? assetTrend.length - 1 : -1;
    const trendSelection = this.createSelectedTrend(assetTrend, selectedTrendIndex);
    const trendDelta = this.createAssetTrendDelta(assetTrend);
    
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
      selectedTrendIndex,
      selectedTrend: trendSelection,
      assetTrendLatest: assetTrend.length > 0 ? assetTrend[assetTrend.length - 1].balance : '0.00',
      assetTrendDelta: trendDelta.text,
      assetTrendDeltaClass: trendDelta.className,
      loading: false
    }, () => {
      this.drawAssetTrendChart();
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

  formatSignedAmount: function(value) {
    const amount = parseFloat(value) || 0;
    const prefix = amount >= 0 ? '+¥' : '-¥';
    return prefix + Math.abs(amount).toFixed(2);
  },

  createAssetTrendDelta: function(trend) {
    if (!trend || trend.length < 2) {
      return {
        text: '+¥0.00',
        className: 'income'
      };
    }

    const firstBalance = parseFloat(trend[0].balance) || 0;
    const lastBalance = parseFloat(trend[trend.length - 1].balance) || 0;
    const delta = lastBalance - firstBalance;

    return {
      text: this.formatSignedAmount(delta),
      className: delta >= 0 ? 'income' : 'expense'
    };
  },

  createSelectedTrend: function(trend, index) {
    if (!trend || trend.length === 0 || index < 0) {
      return null;
    }

    const safeIndex = Math.min(index, trend.length - 1);
    const item = trend[safeIndex];
    const currentBalance = parseFloat(item.balance) || 0;
    const previousBalance = safeIndex > 0 ? (parseFloat(trend[safeIndex - 1].balance) || 0) : currentBalance;
    const change = currentBalance - previousBalance;

    return {
      ...item,
      changeText: this.formatSignedAmount(change),
      changeClass: change >= 0 ? 'income' : 'expense'
    };
  },

  getTrendScale: function(trend) {
    const balances = (trend || []).map(item => parseFloat(item.balance)).filter(value => !isNaN(value));
    if (balances.length === 0) {
      return { min: -1, max: 1 };
    }

    let min = Math.min(...balances);
    let max = Math.max(...balances);

    if (min === max) {
      const offset = Math.max(Math.abs(max) * 0.05, 1);
      min -= offset;
      max += offset;
    } else {
      const padding = (max - min) * 0.16;
      min -= padding;
      max += padding;
    }

    return { min, max };
  },

  getTrendPoints: function(trend, width, height, padding, scale) {
    const plotLeft = padding.left;
    const plotRight = width - padding.right;
    const plotTop = padding.top;
    const plotBottom = height - padding.bottom;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;
    const range = scale.max - scale.min || 1;

    return trend.map((item, index) => {
      const balance = parseFloat(item.balance) || 0;
      const x = trend.length === 1
        ? plotLeft + plotWidth / 2
        : plotLeft + (index / (trend.length - 1)) * plotWidth;
      const y = plotBottom - ((balance - scale.min) / range) * plotHeight;

      return {
        x,
        y,
        index,
        data: item
      };
    });
  },

  drawSmoothPath: function(ctx, points) {
    if (!points || points.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      return;
    }

    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];
      const midX = (previous.x + current.x) / 2;
      const midY = (previous.y + current.y) / 2;
      ctx.quadraticCurveTo(previous.x, previous.y, midX, midY);
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  },

  drawAssetTrendChart: function() {
    const trend = this.data.assetTrend || [];
    if (trend.length === 0) return;

    const query = wx.createSelectorQuery().in(this);
    query.select('.asset-trend-canvas').boundingClientRect(rect => {
      if (!rect || !rect.width || !rect.height) return;

      const width = rect.width;
      const height = rect.height;
      const padding = { left: 48, right: 18, top: 28, bottom: 34 };
      const scale = this.getTrendScale(trend);
      const points = this.getTrendPoints(trend, width, height, padding, scale);
      const ctx = wx.createCanvasContext('assetTrendCanvas', this);
      const plotLeft = padding.left;
      const plotRight = width - padding.right;
      const plotTop = padding.top;
      const plotBottom = height - padding.bottom;
      const selectedIndex = this.data.selectedTrendIndex >= 0 ? this.data.selectedTrendIndex : trend.length - 1;
      const selectedPoint = points[selectedIndex] || points[points.length - 1];

      ctx.clearRect(0, 0, width, height);
      ctx.setFillStyle('#FFFFFF');
      ctx.fillRect(0, 0, width, height);

      ctx.setFontSize(10);
      ctx.setTextAlign('right');
      ctx.setFillStyle('#A0A7B5');
      ctx.setStrokeStyle('#EEF1F6');
      ctx.setLineWidth(1);

      const gridCount = 4;
      for (let i = 0; i <= gridCount; i++) {
        const y = plotTop + (i / gridCount) * (plotBottom - plotTop);
        const value = scale.max - (i / gridCount) * (scale.max - scale.min);
        ctx.beginPath();
        ctx.moveTo(plotLeft, y);
        ctx.lineTo(plotRight, y);
        ctx.stroke();
        ctx.fillText(value.toFixed(0), plotLeft - 8, y + 3);
      }

      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, plotBottom);
        this.drawSmoothPath(ctx, points);
        ctx.lineTo(points[points.length - 1].x, plotBottom);
        ctx.closePath();
        ctx.setFillStyle('rgba(37, 99, 235, 0.10)');
        ctx.fill();
      }

      this.drawSmoothPath(ctx, points);
      ctx.setStrokeStyle('#2563EB');
      ctx.setLineWidth(3);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      ctx.stroke();

      ctx.setStrokeStyle('rgba(37, 99, 235, 0.28)');
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(selectedPoint.x, plotTop);
      ctx.lineTo(selectedPoint.x, plotBottom);
      ctx.stroke();

      ctx.setFillStyle('#2563EB');
      ctx.beginPath();
      ctx.arc(selectedPoint.x, selectedPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.setStrokeStyle('#FFFFFF');
      ctx.setLineWidth(3);
      ctx.stroke();

      ctx.setFontSize(10);
      ctx.setTextAlign('center');
      ctx.setFillStyle('#8A93A3');
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      ctx.fillText(firstPoint.data.label, firstPoint.x, height - 8);
      if (lastPoint.index !== firstPoint.index) {
        ctx.fillText(lastPoint.data.label, lastPoint.x, height - 8);
      }

      this.assetTrendChartMetrics = {
        points,
        plotLeft,
        plotRight,
        width,
        height
      };

      ctx.draw();
    }).exec();
  },

  calculateAssetTrend: function(records, accounts, year, month) {
    const trend = [];
    const now = new Date();
    const isMonthView = this.data.period === 'month';
    
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
        const totalBalance = calculateTotalBalanceFromAccountBalances(accountBalances, accountMap);
        
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
            const amount = parseFloat(record.amount) || 0;
            
            if (record.type === 'income' && record.accountId && includedAccountIds.has(record.accountId)) {
              dailyData[day].income += amount;
            } else if (record.type === 'expense' && record.accountId && includedAccountIds.has(record.accountId)) {
              dailyData[day].expense += amount;
            }

            reverseRecordBalances(accountBalances, record, accountMap, includedAccountIds);
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
      
      reverseRecordBalances(accountBalances, record, accountMap, includedAccountIds);
    });
    
    return calculateTotalBalanceFromAccountBalances(accountBalances, accountMap);
  },

  onTrendTouch: function(e) {
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
    const x = e.detail && typeof e.detail.x === 'number'
      ? e.detail.x
      : (touch && typeof touch.x === 'number' ? touch.x : null);

    if (x === null) return;
    this.selectTrendPointByX(x);
  },

  selectTrendPointByX: function(x) {
    const metrics = this.assetTrendChartMetrics;
    if (!metrics || !metrics.points || metrics.points.length === 0) {
      return;
    }

    let nearest = metrics.points[0];
    let nearestDistance = Math.abs(x - nearest.x);

    metrics.points.forEach(point => {
      const distance = Math.abs(x - point.x);
      if (distance < nearestDistance) {
        nearest = point;
        nearestDistance = distance;
      }
    });

    this.updateSelectedTrend(nearest.index);
  },

  updateSelectedTrend: function(index) {
    if (index === this.data.selectedTrendIndex) {
      return;
    }

    this.setData({
      selectedTrendIndex: index,
      selectedTrend: this.createSelectedTrend(this.data.assetTrend, index)
    }, () => {
      this.drawAssetTrendChart();
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
