// 核心更新逻辑：单点防御，互不干扰
async function updateData() {
    console.log(`[${new Date().toISOString()}] Starting background sync...`);
    
    // 1. 新闻抓取（单独捕获异常）
    let news = [];
    try {
        news = await fetchNews();
    } catch (e) {
        console.error("News error:", e.message);
        news = [{ title: "News temporarily unavailable", time: "Error" }];
    }

    // 2. 股票抓取（单独捕获异常）
    let finviz = [];
    try {
        finviz = await fetchStocks();
    } catch (e) {
        console.error("Stock error:", e.message);
        finviz = [{ ticker: "Data Unavailable", change: "N/A" }];
    }

    // 3. 天气抓取（单独捕获异常）
    let weather = [];
    try {
        weather = [{ name: "Shanghai", temp: "28°C" }]; // 保持你的天气代码
    } catch (e) {
        weather = [{ name: "Weather", temp: "N/A" }];
    }

    // 组装数据，确保每一项都有默认值
    cachedData = {
        news,
        finviz,
        weather,
        systemTime: new Date().toLocaleTimeString('en-US', { hour12: false })
    };
    
    console.log("Background sync finished.");
}
