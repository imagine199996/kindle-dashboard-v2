const express = require('express');
const app = express();
const PORT = 8000;

app.use(express.static(__dirname));

// 1. 辅助函数：解析 Seeking Alpha RSS 新闻（已调至 5 条）
function parseSeekingAlphaRSS(xmlText) {
    const items = [];
    const matches = xmlText.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>[\s\S]*?<\/item>/g);
    for (const match of matches) {
        if (match[1]) {
            items.push({ title: match[1].trim(), time: "Live" });
            if (items.length >= 5) break; // 修改点：提升至 5 条
        }
    }
    return items;
}

// 2. 辅助函数：从 Yahoo Finance 获取实时资产数据
async function getYahooFinanceData(ticker) {
    try {
        let symbol = ticker;
        if (ticker === "NASDAQ") symbol = "QQQ"; 
        if (ticker === "S&P500") symbol = "SPY"; 
        if (ticker === "VIX") symbol = "^VIX";
        if (ticker === "BTC") symbol = "BTC-USD";

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const json = await res.json();
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

// 3. 辅助函数：获取国际/国内通用天气数据（全英文翻译）
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
    
    // 1. 抓取 Seeking Alpha 新闻
    let newsData = [{ title: "Seeking Alpha RSS fetch failed. Connection timed out.", time: "Error" }];
    try {
        const response = await fetch("https://seekingalpha.com/market_news.xml", {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const xmlText = await response.text();
        const parsedNews = parseSeekingAlphaRSS(xmlText);
        if (parsedNews.length > 0) newsData = parsedNews;
    } catch (e) {}

    // 2. 并发抓取 12 只硬核资产（英文标识符）
    const myAssets = ["NASDAQ", "S&P500", "VIX", "BTC", "MSFT", "AAPL", "NVDA", "TSLA", "GOOG", "MU", "SPCX", "COIN"];
    const finvizData = await Promise.all(myAssets.map(ticker => getYahooFinanceData(ticker)));

    // 3. 并发抓取 4 个城市天气（全面转为英文地名）
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Custom English Engine (5 News + Global Weather)`);
    console.log(`==================================================\n`);
});