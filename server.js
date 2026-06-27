const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static(__dirname));

// 1. 辅助函数：解析 Seeking Alpha RSS 新闻
function parseSeekingAlphaRSS(xmlText) {
    const items = [];
    const matches = xmlText.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<\/item>/g);
    for (const match of matches) {
        if (match[1]) {
            const cleanTitle = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
            items.push({ title: cleanTitle, time: "Live" });
            if (items.length >= 5) break;
        }
    }
    return items;
}

// 2. 辅助函数：从 Yahoo Finance 获取实时资产数据（加入免费中转防封锁）
async function getYahooFinanceData(ticker) {
    try {
        let symbol = ticker;
        if (ticker === "NASDAQ") symbol = "QQQ"; 
        if (ticker === "S&P500") symbol = "SPY"; 
        if (ticker === "VIX") symbol = "^VIX";
        if (ticker === "BTC") symbol = "BTC-USD";

        // 使用免费的公用解封中转站（CORS Proxy）来洗白 Render 的脏 IP
        const url = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`)}`;
        
        const res = await fetch(url);
        const wrapperJson = await res.json();
        // 解析中转站返回的内容
        const json = JSON.parse(wrapperJson.contents);
        const meta = json.chart.result[0].meta;
        
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose;
        const changePercent = ((price - prevClose) / prevClose * 100).toFixed(2);
        
        return {
            ticker: ticker,
            change: changePercent >= 0 ? `+${changePercent}` : `${changePercent}`
        };
    } catch (e) {
        return { ticker: ticker, change: "0.00" };
    }
}

// 3. 辅助函数：获取地理天气
async function getWeatherData(cityName, lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`;
        const res = await fetch(url);
        const json = await res.json();
        const temp = Math.round(json.current.temperature_2m);
        return { name: cityName, temp: `${temp}°C` };
    } catch (e) {
        return { name: cityName, temp: "--°C" };
    }
}

// 核心数据接口
app.get('/api/all-data', async (req, res) => {
    
    // 1. 抓取 Seeking Alpha 新闻（同样使用中转，破除 IP 拦截）
    let newsData = [{ title: "Seeking Alpha RSS fetch initial failed. Re-routing via Cloud Proxy.", time: "Status" }];
    try {
        const targetUrl = "https://seekingalpha.com/market_news.xml";
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        const wrapperJson = await response.json();
        const parsedNews = parseSeekingAlphaRSS(wrapperJson.contents);
        if (parsedNews.length > 0) newsData = parsedNews;
    } catch (e) {}

    // 2. 并发抓取 12 只资产
    const myAssets = ["NASDAQ", "S&P500", "VIX", "BTC", "MSFT", "AAPL", "NVDA", "TSLA", "GOOG", "MU", "SPCX", "COIN"];
    const finvizData = await Promise.all(myAssets.map(ticker => getYahooFinanceData(ticker)));

    // 3. 并发抓取 4 个城市天气
    const weatherData = await Promise.all([
        getWeatherData("Shanghai", 31.23, 121.47),
        getWeatherData("Tongcheng", 30.75, 116.95),
        getWeatherData("Stuttgart", 48.78, 9.18),
        getWeatherData("Vienna", 48.20, 16.37)
    ]);

    res.json({
        news: newsData,
        finviz: finvizData,
        weather: weatherData,
        systemTime: new Date().toLocaleTimeString('en-US', { hour12: false })
    });
});

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Custom English Engine (5 News + Global Weather)`);
    console.log(`🌐 Live on Port: ${PORT}`);
    console.log(`==================================================\n`);
});
