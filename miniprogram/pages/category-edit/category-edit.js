const app = getApp();

const icons = [
  '💰', '💵', '💴', '💶', '💷', '💳', '🏦', '💹', '📈', '📊',
  '💼', '💎', '🏛️', '📱', '💬', '🍜', '🍔', '🍕', '🍣', '🍰',
  '🎮', '🎬', '🎵', '📚', '🎓', '✈️', '🚗', '🚌', '🚕', '🏠',
  '🏡', '⚡', '🔥', '❄️', '☀️', '🌧️', '💊', '🏥', '💪', '🏋️',
  '🎁', '🎉', '🎊', '💝', '🎂', '🍺', '🍷', '☕', '🍵', '🍸',
  '👗', '👕', '👔', '👠', '👟', '🎽', '👜', '💄', '💍', '⌚',
  '🛒', '📦', '📋', '🗃️', '🗄️', '🎯', '🎪', '🎭', '🎨', '🎤',
  '🎧', '🎹', '🎺', '🎸', '🎻', '🎬', '🎮', '🕹️', '📷', '📹',
  '🎥', '📺', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾'
];

const colors = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FFB6C1', '#DDA0DD',
  '#87CEEB', '#C0C0C0', '#F08080', '#87CEFA', '#B0C4DE', '#FFD700',
  '#32CD32', '#FF6347', '#4169E1', '#9932CC', '#20B2AA', '#FF7F50'
];

Page({
  data: {
    type: 'expense',
    groupId: '',
    categoryId: '',
    isGroup: false,
    isNew: true,
    name: '',
    icon: '',
    color: '#FF6B6B',
    icons: icons,
    colors: colors,
    showIconPicker: false,
    showColorPicker: false
  },

  onLoad: function(options) {
    const { type, groupId, categoryId, isGroup, isNew } = options;
    
    this.setData({
      type,
      groupId,
      categoryId,
      isGroup: isGroup === 'true',
      isNew: isNew === 'true'
    });

    if (!this.data.isNew) {
      this.loadData();
    }
  },

  loadData: function() {
    const categories = app.globalData.categories[this.data.type];
    const group = categories.groups.find(g => g.id === this.data.groupId);
    
    if (group) {
      if (this.data.isGroup) {
        this.setData({
          name: group.name,
          icon: group.icon,
          color: group.color
        });
      } else {
        const category = group.children.find(c => c.id === this.data.categoryId);
        if (category) {
          this.setData({
            name: category.name,
            icon: category.icon,
            color: category.color
          });
        }
      }
    }
  },

  onNameInput: function(e) {
    this.setData({ name: e.detail.value });
  },

  selectIcon: function(e) {
    const icon = e.currentTarget.dataset.icon;
    this.setData({
      icon,
      showIconPicker: false
    });
  },

  selectColor: function(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      color,
      showColorPicker: false
    });
  },

  toggleIconPicker: function() {
    this.setData({ showIconPicker: !this.data.showIconPicker });
  },

  toggleColorPicker: function() {
    this.setData({ showColorPicker: !this.data.showColorPicker });
  },

  save: function() {
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }

    const data = {
      name: this.data.name,
      icon: this.data.icon || '📝',
      color: this.data.color
    };

    if (this.data.isGroup) {
      if (this.data.isNew) {
        app.addCategoryGroup(this.data.type, data, () => {
          wx.navigateBack();
        });
      } else {
        app.updateCategoryGroup(this.data.type, this.data.groupId, data, () => {
          wx.navigateBack();
        });
      }
    } else {
      if (this.data.isNew) {
        app.addCategory(this.data.type, this.data.groupId, data, () => {
          wx.navigateBack();
        });
      } else {
        app.updateCategory(this.data.type, this.data.groupId, this.data.categoryId, data, () => {
          wx.navigateBack();
        });
      }
    }
  }
});
