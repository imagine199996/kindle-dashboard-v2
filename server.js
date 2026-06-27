const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000; // 确保端口与 Render 设置匹配

let cachedData = {
    news: [{ title: "System Initializing...", time: "..." }],
    finviz: [],
    weather: [],
    systemTime: "Syncing..."
};

// 具体的抓取函数（无需改动，直接放在文件底部即可）
async function fetchNews() {
    try {
        const response = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent("https://seekingalpha.com/market_news.xml"));
        const data = await response.json();
        const xml = data.contents;
        const items = [];
        const matches = xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g);
        let count = 0;
        for (const match of matches) {
            if (count > 0 && count <= 5) items.push({ title: match[1].replace(/<\/?[^>]+(>|$)/g, ""), time: "Live" });
            if (count++ >= 5) break;
        }
        return items;
    } catch (e) { return [{ title: "News Unavailable", time: "Error" }]; }
}

async function fetchStocks() {
    const symbols = ["QQQ", "SPY", "^VIX", "BTC-USD"];
    return await Promise.all(symbols.map(async (s) => {
        try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?interval=1d`)}`);
            const json = await res.json();
            const meta = JSON.parse(json.contents).chart.result[0].meta;
            const change = (((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2);
            return { ticker: s.replace('-USD', ''), change: change > 0 ? `+${change}%` : `${change}%` };
        } catch (e) { return { ticker: s, change: "N/A" }; }
    }));
}

// 核心更新逻辑：填补 image_8d31e5.png 中的 updateData 空缺
async function updateData() {
    console.log(`[${new Date().toISOString()}] Starting background sync...`);
    try {
        // 并行抓取所有数据
        const [news, finviz, weather] = await Promise.all([
            fetchNews(),
            fetchStocks(),
            Promise.resolve([{ name: "Shanghai", temp: "28°C" }]) // 天气接口示例，可在此扩展
        ]);

        cachedData = {
            news,
            finviz,
            weather,
            systemTime: new Date().toLocaleTimeString('en-US', { hour12: false })
        };
        console.log("Background sync completed successfully.");
    } catch (error) {
        console.error("Background sync failed:", error.message);
    }
}

setInterval(updateData, 60 * 60 * 1000);
updateData();

app.use(express.static(__dirname));
app.get('/api/all-data', (req, res) => res.json(cachedData));
app.listen(PORT, () => console.log(`🚀 Engine Online on Port: ${PORT}`));
