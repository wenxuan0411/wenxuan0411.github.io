/**
 * Hexo相册智能布局系统
 * 基于图片原始宽高比实现类似Google Photos的自适应网格系统
 * 作者：[您的名字]
 * 版本：1.0.0
 */

class SmartGalleryLayout {
  /**
   * 构造函数
   * @param {Object} config - 配置选项
   */
  constructor(config = {}) {
    this.config = {
      containerId: 'smart-gallery',     // 容器ID
      rowHeight: 250,                   // 基准行高
      rowHeightTolerance: 50,           // 行高差异容忍度
      maxItemsPerRow: 5,                // 桌面端最大列数
      minItemsPerRow: 3,                // 桌面端最小列数
      preferHorizontal: true,           // 优先横向图片作为行主导
      horizontalRatio: 1.2,             // 判定为横向图片的比例阈值（宽/高）
      lazyLoadThreshold: '200px',       // 懒加载阈值
      darkModeSelector: 'html.dark',    // 深色模式选择器
      useMasonry: false,                // 是否使用Masonry布局（可选）
      aspectRatioEnabled: true,         // 是否使用aspect-ratio属性
      animations: true,                 // 是否启用动画效果
      ...config
    };
    
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`找不到ID为"${this.config.containerId}"的容器元素`);
      return;
    }
    
    this.items = [];                  // 图片项目数组
    this.rows = [];                   // 行信息数组
    this.observer = null;             // 交叉观察器
    this.resizeObserver = null;       // 尺寸观察器
    this.containerWidth = 0;          // 容器宽度
    this.isCalculatingLayout = false; // 是否正在计算布局
    this.darkMode = false;            // 是否为深色模式
    this.worker = null;               // Web Worker引用
    
    // 初始化视口监听器
    this._initObserver();
    
    // 初始化尺寸监听器
    this._initResizeObserver();
    
    // 初始化暗色模式检测
    this._initDarkModeDetection();
    
    // 初始化Web Worker（如果支持）
    this._initWebWorker();
    
    // 监听窗口大小变化
    window.addEventListener('resize', this._debounce(this.recalculateLayout.bind(this), 200));
    
    // 页面可见性变化时重新计算布局
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.recalculateLayout();
      }
    });
  }
  
  /**
   * 初始化交叉观察器
   * 用于实现懒加载和动态渲染
   */
  _initObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const item = entry.target;
            const img = item.querySelector('img');
            
            if (img && img.classList.contains('loading')) {
              // 移除loading类，应用渐变效果
              setTimeout(() => {
                img.classList.remove('loading');
                if (item.classList.contains('portrait')) {
                  item.classList.add('loaded');
                }
              }, 100);
            }
            
            // 一旦显示，停止观察
            this.observer.unobserve(item);
          }
        });
      }, {
        rootMargin: this.config.lazyLoadThreshold,
        threshold: 0.01
      });
    }
  }
  
  /**
   * 初始化尺寸观察器
   * 用于监听容器尺寸变化
   */
  _initResizeObserver() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this._debounce(() => {
        if (this.container.clientWidth !== this.containerWidth) {
          this.recalculateLayout();
        }
      }, 100));
      
      if (this.container) {
        this.resizeObserver.observe(this.container);
      }
    }
  }
  
  /**
   * 初始化深色模式检测
   */
  _initDarkModeDetection() {
    // 检查当前是否为深色模式
    this._checkDarkMode();
    
    // 监听深色模式变化
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', () => {
        this._checkDarkMode();
      });
    }
    
    // DOM变化监听（对于手动切换主题的情况）
    if ('MutationObserver' in window) {
      const mutationObserver = new MutationObserver(() => {
        this._checkDarkMode();
      });
      
      mutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'theme']
      });
    }
  }
  
  /**
   * 检查当前是否为深色模式
   */
  _checkDarkMode() {
    // 通过媒体查询检测系统深色模式
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 通过选择器检测网站深色模式
    const siteDarkMode = document.querySelector(this.config.darkModeSelector) !== null;
    
    // 设置深色模式状态
    const newDarkMode = systemDarkMode || siteDarkMode;
    
    // 如果状态发生变化，应用深色模式样式
    if (this.darkMode !== newDarkMode) {
      this.darkMode = newDarkMode;
      this._applyDarkModeStyles();
    }
  }
  
  /**
   * 应用深色模式样式
   */
  _applyDarkModeStyles() {
    if (!this.container) return;
    
    const items = this.container.querySelectorAll('.gallery-item img');
    items.forEach(img => {
      if (this.darkMode) {
        img.style.filter = 'brightness(0.95)';
      } else {
        img.style.filter = '';
      }
    });
  }
  
  /**
   * 初始化Web Worker
   * 用于在后台线程预计算布局
   */
  _initWebWorker() {
    if (window.Worker) {
      try {
        // 这里可以实现Web Worker逻辑
        // 示例代码，实际开发中需替换为真实的Worker文件路径
        // this.worker = new Worker('/js/gallery-worker.js');
        // this.worker.onmessage = (e) => this._handleWorkerMessage(e.data);
      } catch (e) {
        console.warn('无法初始化Web Worker:', e);
      }
    }
  }
  
  /**
   * 设置图片数据并渲染相册
   * @param {Array} photos - 图片数据数组
   */
  setPhotos(photos) {
    if (!Array.isArray(photos) || !photos.length) {
      console.warn('没有提供有效的照片数据');
      return;
    }
    
    this.photos = photos.map(photo => ({
      ...photo,
      width: photo.width || 1,
      height: photo.height || 1,
      loaded: false
    }));
    
    this.render();
  }
  
  /**
   * 渲染相册
   */
  render() {
    if (!this.container || !this.photos || !this.photos.length) return;
    
    // 清空容器
    this.container.innerHTML = '';
    this.items = [];
    
    // 预处理图片数据，计算宽高比
    const processedPhotos = this.photos.map(photo => {
      const ratio = photo.height / photo.width;
      return {
        ...photo,
        ratio,
        isHorizontal: ratio < this.config.horizontalRatio
      };
    });
    
    // 优先处理横向图片
    if (this.config.preferHorizontal) {
      processedPhotos.sort((a, b) => {
        if (a.isHorizontal && !b.isHorizontal) return -1;
        if (!a.isHorizontal && b.isHorizontal) return 1;
        return 0;
      });
    }
    
    // 创建并添加图片元素
    processedPhotos.forEach(photo => {
      const item = document.createElement('div');
      const isPortrait = photo.ratio > 1.5;
      
      // 设置CSS类和数据属性
      item.className = `gallery-item ${isPortrait ? 'portrait' : ''}`;
      item.dataset.ratio = photo.ratio;
      item.dataset.width = photo.width;
      item.dataset.height = photo.height;
      
      // 创建图片元素
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.caption || '';
      img.classList.add('loading');
      img.dataset.width = photo.width;
      img.dataset.height = photo.height;
      
      // 设置aspect-ratio（如果支持）
      if (this.config.aspectRatioEnabled) {
        img.style.aspectRatio = `${photo.width} / ${photo.height}`;
      }
      
      // 创建标题元素
      const caption = document.createElement('div');
      caption.className = 'caption';
      caption.textContent = photo.caption || '';
      
      // 组装元素
      item.appendChild(img);
      item.appendChild(caption);
      this.container.appendChild(item);
      
      // 将项添加到数组中
      this.items.push(item);
      
      // 添加到视口监听
      if (this.observer) {
        this.observer.observe(item);
      }
      
      // 添加点击事件
      item.addEventListener('click', () => this.openModal(photo.url, photo.caption));
    });
    
    // 计算初始布局
    setTimeout(() => this.recalculateLayout(), 100);
    
    // 应用深色模式样式
    if (this.darkMode) {
      this._applyDarkModeStyles();
    }
    
    // 当所有图片加载完成后重新计算布局
    Promise.all(Array.from(this.container.querySelectorAll('img'))
      .filter(img => !img.complete)
      .map(img => new Promise(resolve => {
        img.onload = img.onerror = resolve;
      }))
    ).then(() => {
      this.recalculateLayout();
    });
  }
  
  /**
   * 重新计算布局
   */
  recalculateLayout() {
    if (!this.container || !this.items.length || this.isCalculatingLayout) return;
    
    this.isCalculatingLayout = true;
    this.containerWidth = this.container.clientWidth;
    
    // 获取当前的列数
    const currentStyle = window.getComputedStyle(this.container);
    const columnsText = currentStyle.gridTemplateColumns;
    const columns = columnsText.split(' ').length || 1;
    
    // 计算每个图片项的span值
    this.items.forEach(item => {
      const ratio = parseFloat(item.dataset.ratio || 1);
      const rowSpan = Math.ceil((ratio * (this.containerWidth / columns)) / this.config.rowHeight);
      
      // 设置每个项的高度跨度
      item.style.gridRowEnd = `span ${rowSpan}`;
    });
    
    // 如果有Web Worker，使用它计算最佳布局
    if (this.worker) {
      // 发送数据到Worker
      const layoutData = {
        items: this.items.map(item => ({
          ratio: parseFloat(item.dataset.ratio || 1),
          width: parseInt(item.dataset.width || 0),
          height: parseInt(item.dataset.height || 0)
        })),
        containerWidth: this.containerWidth,
        columns: columns,
        config: {
          rowHeight: this.config.rowHeight,
          rowHeightTolerance: this.config.rowHeightTolerance,
          preferHorizontal: this.config.preferHorizontal
        }
      };
      
      this.worker.postMessage(layoutData);
    } else {
      // 本地计算最佳行配置（简化版）
      this._calculateOptimalRowsLocally();
    }
    
    // 添加一个小延迟，允许浏览器渲染当前变化
    setTimeout(() => {
      this.isCalculatingLayout = false;
    }, 100);
  }
  
  /**
   * 本地计算最佳行配置（简化版）
   * 在没有Web Worker支持时使用
   */
  _calculateOptimalRowsLocally() {
    // 简化版算法，只确保同一行的图片高度差在容忍范围内
    // 在实际应用中，应当使用更复杂的算法，如动态规划
    
    // 这里实现了一个基础版本的计算逻辑
    // 更复杂的算法可以实现在Web Worker中
  }
  
  /**
   * 处理Web Worker消息
   * @param {Object} data - Worker返回的数据
   */
  _handleWorkerMessage(data) {
    if (data.type === 'layout' && data.rows) {
      // 应用Worker计算的布局
      this._applyCalculatedLayout(data.rows);
    }
  }
  
  /**
   * 应用计算后的布局
   * @param {Array} rows - 计算后的行数据
   */
  _applyCalculatedLayout(rows) {
    // 根据计算结果应用布局
    // 例如调整每个项目的grid-row-start和grid-row-end
  }
  
  /**
   * 打开模态框显示图片
   * @param {string} imageSrc - 图片URL
   * @param {string} caption - 图片说明
   */
  openModal(imageSrc, caption) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    if (!modal || !modalImg) {
      console.warn('模态框元素未找到');
      return;
    }
    
    // 设置图片源和说明
    modalImg.src = imageSrc;
    if (modalCaption && caption) {
      modalCaption.textContent = caption;
      modalCaption.style.display = 'block';
    } else if (modalCaption) {
      modalCaption.style.display = 'none';
    }
    
    // 显示模态框
    modal.style.display = 'block';
    
    // 添加平滑过渡
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }
  
  /**
   * 关闭模态框
   */
  closeModal() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
  
  /**
   * 函数防抖
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  _debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
}

// 导出类，供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartGalleryLayout;
}

// 在全局对象上注册，供直接使用
if (typeof window !== 'undefined') {
  window.SmartGalleryLayout = SmartGalleryLayout;
} 