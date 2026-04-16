const express = require('express');
const router = express.Router();
const db = require('../db');

const EMPTY_DASHBOARD_STATS = {
  totalProducts: 0,
  totalInventoryValue: 0,
  averagePrice: 0,
  totalUnits: 0,
  outOfStockCount: 0,
  lowStockCount: 0,
  inStockCount: 0,
};

// Timeout wrapper for database queries to handle network timeouts gracefully
const executeWithTimeout = async (sqlFn, timeoutMs = 15000) => {
  try {
    return await Promise.race([
      sqlFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      ),
    ]);
  } catch (err) {
    console.warn(`Query timeout or error (${timeoutMs}ms):`, err.message);
    return null; // Return null on timeout, allowing graceful fallback
  }
};

router.get('/stats', async (req, res) => {
try {
  // Execute core stats query with timeout
  const statsResult = await executeWithTimeout(
    () => db.execute(`
      SELECT COUNT(*) as totalProducts,
      COALESCE(SUM(price*quantity),0) as totalInventoryValue,
      COALESCE(AVG(price),0) as averagePrice,
      COALESCE(SUM(quantity),0) as totalUnits,
      COUNT(CASE WHEN quantity=0 THEN 1 END) as outOfStockCount,
      COUNT(CASE WHEN quantity>0 AND quantity<=low_stock_threshold THEN 1 END) as lowStockCount,
      COUNT(CASE WHEN quantity>low_stock_threshold THEN 1 END) as inStockCount
      FROM products WHERE COALESCE(is_active,1)=1
    `),
    5000
  );

  // If core stats fail, return 503 Service Unavailable
  if (!statsResult) {
    console.warn('Core stats query timed out, returning fallback dashboard payload');
    return res.json({
      stats: { ...EMPTY_DASHBOARD_STATS, totalCategories: 0 },
      categoryBreakdown: [],
      categoryTimeSeries: [],
      priceDistribution: [],
      stockDistribution: [],
      recentProducts: [],
      lowStockAlerts: [],
      warning: 'Dashboard data is temporarily delayed',
    });
  }

  // Execute secondary queries in parallel with timeout (these can fail gracefully)
  const [catCount, categoryBreakdown, categoryTimeSeries, priceDistribution, stockDistribution, recentProducts, lowStockAlerts] = await Promise.all([
    executeWithTimeout(
      () => db.execute('SELECT COUNT(*) as totalCategories FROM categories WHERE COALESCE(is_deleted,0)=0'),
      5000
    ),
    executeWithTimeout(
      () => db.execute(`
        SELECT c.id as categoryId,c.name as category,c.color,COUNT(p.id) as productCount,
        COALESCE(SUM(p.quantity),0) as totalStock,COALESCE(SUM(p.price*p.quantity),0) as categoryValue
        FROM categories c
        LEFT JOIN products p ON p.category_id=c.id AND COALESCE(p.is_active,1)=1
        WHERE COALESCE(c.is_deleted,0)=0
        GROUP BY c.id ORDER BY productCount DESC,c.name ASC
      `),
      5000
    ),
    executeWithTimeout(
      () => db.execute(`
        SELECT CAST(strftime('%Y', p.created_at) AS INTEGER) as year,
        CAST(strftime('%m', p.created_at) AS INTEGER) as month,
        strftime('%Y-%m', p.created_at) as monthLabel,
        c.id as categoryId,
        c.name as category,
        c.color,
        COUNT(p.id) as productCount,
        COALESCE(SUM(p.quantity),0) as totalStock,
        COALESCE(SUM(p.price*p.quantity),0) as categoryValue
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        WHERE COALESCE(p.is_active,1)=1
          AND COALESCE(c.is_deleted,0)=0
          AND p.created_at IS NOT NULL
        GROUP BY year, month, monthLabel, c.id
        ORDER BY year DESC, month DESC, productCount DESC, c.name ASC
      `),
      5000
    ),
    executeWithTimeout(
      () => db.execute(`
        SELECT CASE
        WHEN price<10 THEN '$0-$10'
        WHEN price<50 THEN '$10-$50'
        WHEN price<100 THEN '$50-$100'
        WHEN price<500 THEN '$100-$500'
        ELSE '$500+' END as priceRange,
        COUNT(*) as count,MIN(price) as sortPrice
        FROM products WHERE COALESCE(is_active,1)=1 GROUP BY priceRange ORDER BY sortPrice ASC
      `),
      5000
    ),
    executeWithTimeout(
      () => db.execute(`
        SELECT CASE
        WHEN quantity=0 THEN 'out_of_stock'
        WHEN quantity<=low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock' END as status,
        COUNT(*) as count
        FROM products WHERE COALESCE(is_active,1)=1 GROUP BY status
      `),
      5000
    ),
    executeWithTimeout(
      () => db.execute(`
        SELECT id,name,price,quantity,low_stock_threshold,stock_status,created_at
        FROM products WHERE COALESCE(is_active,1)=1
        ORDER BY datetime(created_at) DESC,id DESC LIMIT 5
      `),
      5000
    ),
    executeWithTimeout(
      () => db.execute(`
        SELECT p.id,p.name,p.quantity,p.low_stock_threshold,p.stock_status,c.name as category_name,c.color as category_color
        FROM products p LEFT JOIN categories c ON c.id=p.category_id
        WHERE COALESCE(p.is_active,1)=1 AND COALESCE(p.quantity,0)<=COALESCE(p.low_stock_threshold,5)
        ORDER BY p.quantity ASC,p.name ASC
      `),
      5000
    ),
  ]);

  const stats = statsResult.rows?.[0] || { ...EMPTY_DASHBOARD_STATS };
  stats.totalCategories = Number(catCount?.rows?.[0]?.totalCategories || 0);

  res.json({
    stats,
    categoryBreakdown: categoryBreakdown?.rows || [],
    categoryTimeSeries: categoryTimeSeries?.rows || [],
    priceDistribution: (priceDistribution?.rows || []).map(({ sortPrice, ...rest }) => rest),
    stockDistribution: stockDistribution?.rows || [],
    recentProducts: recentProducts?.rows || [],
    lowStockAlerts: lowStockAlerts?.rows || [],
  });
} catch (error) {
  console.error('Dashboard stats error:', error.message);
  res.status(500).json({ error: 'Failed to fetch dashboard stats' });
}
});

module.exports = router;