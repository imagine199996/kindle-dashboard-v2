const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

// 内存缓存
let cachedData = {
    news: [{ title: "System Initializing...", time: "..." }],
    finviz: [],
    weather: [],
    systemTime: "Syncing..."
};

// 后台抓取逻辑：这是你未来所有扩展功能的“工厂”
async function updateData() {
    console.log(`[${new Date().toISOString()}] Starting background sync...`);
    try {
        // 1. 这里放你的抓取逻辑
        // 建议：如果你要扩展，直接在这里添加新函数
        // 例如: cachedData.news = await fetchNews();
        
        cachedData.systemTime = new Date().toLocaleTimeString('en-US', { hour12: false });
        console.log("Background sync completed successfully.");
    } catch (error) {
        console.error("Background sync failed:", error.message);
    }
}

// 定时任务：每 60 分钟全量刷新一次数据
setInterval(updateData, 60 * 60 * 1000);
updateData(); // 启动时立即执行一次

app.use(express.static(__dirname));

app.get('/api/all-data', (req, res) => {
    res.json(cachedData);
});

app.listen(PORT, () => {
    console.log(`🚀 Engine Online on Port: ${PORT}`);
});
