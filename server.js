// 全局错误守护，防止程序崩溃
process.on('uncaughtException', (err) => { console.error('CRITICAL ERROR:', err); });
process.on('unhandledRejection', (reason) => { console.error('UNHANDLED REJECTION:', reason); });

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

let cachedData = {
    news: [{ title: "Loading...", time: "..." }],
    finviz: [{ ticker: "Loading", change: "0%" }],
    weather: [{ name: "Loading", temp: "0°C" }],
    systemTime: "Syncing..."
};

async function updateData() {
    console.log(`[${new Date().toISOString()}] Syncing...`);
    
    // 1. 新闻 (使用 try-catch 包裹，确保单点故障不影响全局)
    try {
        const res = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent("https://seekingalpha.com/market_news.xml"));
        const data = await res.json();
        const xml = data.contents;
        const matches = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)];
        cachedData.news = matches.slice(1, 6).map(m => ({ title: m[1].replace(/<\/?[^>]+(>|$)/g, ""), time: "Live" }));
    } catch (e) {
        cachedData.news = [{ title: "News Update Failed", time: "Error" }];
    }

    // 2. 股票
    try {
        const symbols = ["QQQ", "SPY", "^VIX", "BTC-USD"];
        const results = await Promise.all(symbols.map(async (s) => {
            const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?interval=1d`)}`);
            const j = await r.json();
            const meta = JSON.parse(j.contents).chart.result[0].meta;
            const chg = (((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2);
            return { ticker: s.replace('-USD', ''), change: `${chg > 0 ? '+' : ''}${chg}%` };
        }));
        cachedData.finviz = results;
    } catch (e) {
        cachedData.finviz = [{ ticker: "Market", change: "N/A" }];
    }

    // 3. 天气
    cachedData.weather = [{ name: "Shanghai", temp: "28°C" }];
    cachedData.systemTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    console.log("Sync complete.");
}

// 定时循环
setInterval(updateData, 60 * 60 * 1000);
updateData();

app.use(express.static(__dirname));
app.get('/api/all-data', (req, res) => res.json(cachedData));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
