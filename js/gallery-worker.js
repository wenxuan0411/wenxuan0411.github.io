/**
 * 相册布局计算Web Worker
 * 用于在后台线程计算相册的最佳布局
 */

// 接收来自主线程的消息
self.onmessage = function(e) {
  const data = e.data;
  
  if (!data || !data.items || !data.containerWidth) {
    self.postMessage({
      type: 'error',
      message: '无效的数据格式'
    });
    return;
  }
  
  // 使用动态规划算法计算最佳布局
  const result = calculateOptimalLayout(
    data.items,
    data.containerWidth,
    data.columns,
    data.config
  );
  
  // 将结果发送回主线程
  self.postMessage({
    type: 'layout',
    rows: result.rows,
    stats: result.stats
  });
};

/**
 * 计算最佳布局
 * @param {Array} items - 图片项目数据
 * @param {number} containerWidth - 容器宽度
 * @param {number} columns - 列数
 * @param {Object} config - 配置选项
 * @returns {Object} 计算结果
 */
function calculateOptimalLayout(items, containerWidth, columns, config) {
  if (!items.length) return { rows: [], stats: {} };
  
  const rowHeight = config?.rowHeight || 250;
  const rowHeightTolerance = config?.rowHeightTolerance || 50;
  const preferHorizontal = config?.preferHorizontal || true;
  
  // 计算每列的宽度
  const columnWidth = containerWidth / columns;
  
  // 初始化结果
  const result = {
    rows: [],
    stats: {
      totalRows: 0,
      avgRowHeight: 0,
      maxRowHeight: 0,
      minRowHeight: Infinity,
      processingTime: 0
    }
  };
  
  // 记录开始时间
  const startTime = performance.now();
  
  // 初始化行
  let currentRow = [];
  let currentRowHeight = 0;
  let totalRowHeight = 0;
  
  // 遍历所有项目
  items.forEach((item, index) => {
    const itemHeight = item.ratio * columnWidth;
    
    // 如果是第一个项目或者添加后行高仍在容忍范围内，则添加到当前行
    if (currentRow.length === 0 || 
        Math.abs(currentRowHeight - itemHeight) <= rowHeightTolerance) {
      
      currentRow.push({
        index,
        ratio: item.ratio,
        height: itemHeight,
        width: columnWidth
      });
      
      // 更新当前行的平均高度
      currentRowHeight = calculateAverageHeight(currentRow);
      
    } else {
      // 完成当前行，开始新行
      result.rows.push({
        items: currentRow,
        height: currentRowHeight
      });
      
      // 更新统计信息
      totalRowHeight += currentRowHeight;
      result.stats.maxRowHeight = Math.max(result.stats.maxRowHeight, currentRowHeight);
      result.stats.minRowHeight = Math.min(result.stats.minRowHeight, currentRowHeight);
      
      // 开始新行
      currentRow = [{
        index,
        ratio: item.ratio,
        height: itemHeight,
        width: columnWidth
      }];
      currentRowHeight = itemHeight;
    }
    
    // 如果是最后一个项目，添加最后一行
    if (index === items.length - 1 && currentRow.length > 0) {
      result.rows.push({
        items: currentRow,
        height: currentRowHeight
      });
      
      totalRowHeight += currentRowHeight;
      result.stats.maxRowHeight = Math.max(result.stats.maxRowHeight, currentRowHeight);
      result.stats.minRowHeight = Math.min(result.stats.minRowHeight, currentRowHeight);
    }
  });
  
  // 更新统计信息
  result.stats.totalRows = result.rows.length;
  result.stats.avgRowHeight = totalRowHeight / result.rows.length;
  result.stats.processingTime = performance.now() - startTime;
  
  // 进行布局优化（可选）
  optimizeLayout(result.rows, rowHeight, rowHeightTolerance);
  
  return result;
}

/**
 * 计算行的平均高度
 * @param {Array} rowItems - 行中的项目
 * @returns {number} 平均高度
 */
function calculateAverageHeight(rowItems) {
  if (!rowItems.length) return 0;
  
  const sum = rowItems.reduce((total, item) => total + item.height, 0);
  return sum / rowItems.length;
}

/**
 * 优化布局
 * @param {Array} rows - 行数据
 * @param {number} targetHeight - 目标行高
 * @param {number} tolerance - 高度容忍度
 */
function optimizeLayout(rows, targetHeight, tolerance) {
  // 找到高度差异过大的相邻行
  for (let i = 0; i < rows.length - 1; i++) {
    const currentRow = rows[i];
    const nextRow = rows[i + 1];
    
    // 如果高度差超过容忍度，尝试移动项目
    if (Math.abs(currentRow.height - nextRow.height) > tolerance) {
      // 如果当前行比下一行高，尝试将当前行的最后一个项目移到下一行
      if (currentRow.height > nextRow.height && currentRow.items.length > 1) {
        const lastItem = currentRow.items[currentRow.items.length - 1];
        currentRow.items.pop();
        nextRow.items.unshift(lastItem);
        
        // 重新计算行高
        currentRow.height = calculateAverageHeight(currentRow.items);
        nextRow.height = calculateAverageHeight(nextRow.items);
      }
      // 如果下一行比当前行高，尝试将下一行的第一个项目移到当前行
      else if (nextRow.height > currentRow.height && nextRow.items.length > 1) {
        const firstItem = nextRow.items[0];
        nextRow.items.shift();
        currentRow.items.push(firstItem);
        
        // 重新计算行高
        currentRow.height = calculateAverageHeight(currentRow.items);
        nextRow.height = calculateAverageHeight(nextRow.items);
      }
    }
  }
} 