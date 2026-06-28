// 直接连接 MySQL 执行菜单拆分迁移
// 运行: node scripts/migrate-menu.mjs
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'ruoyi', password: '123456', database: 'ruoyi'
  });

  try {
    // 查当前菜单
    const [rows] = await conn.execute(
      "SELECT menu_id, menu_name FROM sys_menu WHERE parent_id = (SELECT menu_id FROM sys_menu WHERE menu_name = '流程管理') ORDER BY order_num"
    );
    console.log('迁移前菜单:', JSON.stringify(rows, null, 2));

    // 检查是否已迁移
    const [done] = await conn.execute("SELECT menu_id FROM sys_menu WHERE menu_name = '已办任务'");
    if (done.length > 0) {
      console.log('已办任务已存在，跳过迁移');
      return;
    }

    // 执行迁移 - 步骤1: 原"我的任务"改为"待办任务"
    await conn.execute(
      "UPDATE sys_menu SET menu_name = '待办任务', `path` = 'task/todo', `query` = 'tab=todo', icon = 'todo-list', order_num = 4 WHERE menu_name = '我的任务' AND parent_id = (SELECT menu_id FROM sys_menu WHERE menu_name = '流程管理')"
    );
    console.log('✅ 我的任务 → 待办任务');

    // 步骤2: 新增"已办任务"菜单
    await conn.execute(
      "INSERT INTO sys_menu(menu_id, menu_name, parent_id, order_num, `path`, component, `query`, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time) " +
      "SELECT (SELECT MAX(menu_id) + 1 FROM sys_menu), '已办任务', parent_id, 5, 'task/done', 'workflow/task/index', 'tab=done', is_frame, is_cache, menu_type, visible, status, 'workflow:task:list', 'done', create_by, NOW() " +
      "FROM sys_menu WHERE menu_name = '待办任务' AND parent_id = (SELECT menu_id FROM sys_menu WHERE menu_name = '流程管理')"
    );
    console.log('✅ 已办任务 已创建');

    // 查结果
    const [rows2] = await conn.execute(
      "SELECT menu_id, menu_name, `path`, `query` FROM sys_menu WHERE parent_id = (SELECT menu_id FROM sys_menu WHERE menu_name = '流程管理') ORDER BY order_num"
    );
    console.log('\n迁移后菜单:');
    rows2.forEach(r => console.log(`  ${r.menu_id} ${r.menu_name} (${r.path})`));

    // 需清除 Redis 缓存
    console.log('\n⚠️  请重启后端以清除 Redis 路由缓存，然后重新登录前端');
  } catch (e) {
    console.error('错误:', e.message);
  } finally {
    await conn.end();
  }
}

main();
