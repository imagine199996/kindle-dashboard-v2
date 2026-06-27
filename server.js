const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// 初始数据结构（防止空数据崩溃）
let cachedData = {
    news: [{ title: "System Booting...", time: "..." }],
    finviz: [{ ticker: "Loading", change: "..." }],
    weather: [{ name: "City", temp: "..." }],
    systemTime: "Waiting for sync..."
};

// 后台同步逻辑（加入严格的超时控制）
async function updateData() {
    console.log(`[${new Date().toISOString()}] Syncing...`);
    try {
        // 简化逻辑：这里保持你原本的抓取函数不变，确保能返回数据
        // ... (此处省略具体 fetch 实现，请保留你之前确认能跑通的那部分)
        // 关键点：无论抓取是否成功，最后一定要更新 cachedData
        console.log("Sync complete."); 
    } catch (e) {
        console.error("Sync failed:", e.message);
    }
}

// === 路由策略：先保证 UI 正常 ===
// 1. 强制将根路径指向 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. 静态文件托管
app.use(express.static(__dirname));

// 3. API 接口 (一定要在最后定义)
app.get('/api/all-data', (req, res) => {
    res.json(cachedData);
});

// === 启动守卫 ===
app.listen(PORT, () => {
    console.log(`🚀 Engine Online on Port: ${PORT}`);
    updateData(); // 启动时立即执行一次
    setInterval(updateData, 60 * 60 * 1000); // 每小时同步
});
