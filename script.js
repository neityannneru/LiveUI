const ticker = document.getElementById("ticker");
const wrapper = document.querySelector(".ticker-wrapper");
const clock = document.getElementById("clock");

let weatherHTMLs = [];
let newsTexts = [];
let combinedItems = [];
let currentIndex = 0;
let animationId = null;

// 速度設定（px/sec）
const speedWeather = 180; // 天気
const speedNews = 120;   // ニュース

// 時計更新
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  clock.textContent = `│${hh}:${mm}:${ss}│`;
}
setInterval(updateClock, 1000);
updateClock();

// 天気情報取得＆HTML生成
async function fetchWeather() {
  try {
    const res = await fetch("https://weathernews.jp/forecast/xml/all.xml");
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const points = Array.from(xmlDoc.getElementsByTagName("point"));

    const uniquePoints = {};
    points.forEach(point => {
      const id = point.getAttribute("id");
      if (!uniquePoints[id]) {
        const name = point.getAttribute("name");
        const weatherRaw = point.getElementsByTagName("weather")[0]?.textContent || "";
        const firstWeatherValue = weatherRaw.split(",")[0];
        const iconUrl = `https://weathernews.jp/s/topics/img/wxicon/${firstWeatherValue}.png`;
        const html = `<img src="${iconUrl}" alt="weather icon"> <span>${name}</span>`;
        uniquePoints[id] = html;
      }
    });

    weatherHTMLs = Object.values(uniquePoints);
  } catch (e) {
    console.error("天気取得失敗:", e);
    weatherHTMLs = [`<span>天気情報を取得できませんでした。</span>`];
  }
}

// ニュース取得（RSS→テキスト配列）
async function fetchNews() {
  try {
    const rssUrls = [
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat0.xml",
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat1.xml"
    ];

    let allItems = [];
    for (const url of rssUrls) {
      const res = await fetch(url);
      const json = await res.json();
      if (json.items) {
        allItems = allItems.concat(json.items.map(i => `＜${i.title}＞　  ${i.description}`));
      }
    }
    newsTexts = allItems.length > 0 ? allItems : ["ニュース情報を取得できませんでした。"];
  } catch (e) {
    console.error("ニュース取得失敗:", e);
    newsTexts = ["ニュース情報を取得できませんでした。"];
  }
}

// 天気テキストを連結HTMLに変換
function getCombinedWeatherHTML() {
  return weatherHTMLs.join('　'); // 全角スペースでつなぐ（棒なし）
}

// テロップ配列作成（天気→ニュース→ニュース…）
function updateCombinedItems() {
  const combinedWeather = getCombinedWeatherHTML();
  combinedItems = [combinedWeather, ...newsTexts];
}

// テロップ流し込み
function startTicker() {
  if (combinedItems.length === 0) return;
  if (animationId) cancelAnimationFrame(animationId);

  // 表示セット（天気はHTML、ニュースはテキスト）
  if (currentIndex === 0) {
    ticker.innerHTML = combinedItems[currentIndex];
  } else {
    ticker.textContent = combinedItems[currentIndex];
  }

  ticker.style.left = wrapper.offsetWidth + "px";
  let posX = wrapper.offsetWidth;
  const fps = 60;

  function animate() {
    const speed = (currentIndex === 0) ? speedWeather : speedNews;
    const step = speed / fps;

    posX -= step;
    ticker.style.left = posX + "px";

    if (posX + ticker.offsetWidth < 0) {
      currentIndex = (currentIndex + 1) % combinedItems.length;

      if (currentIndex === 0) {
        ticker.innerHTML = combinedItems[currentIndex];
      } else {
        ticker.textContent = combinedItems[currentIndex];
      }

      posX = wrapper.offsetWidth;
    }

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}

// 全更新処理
let hasStartedTicker = false; // 初回起動フラグ

async function updateAll() {
  await fetchWeather();
  await fetchNews();
  updateCombinedItems();

  // 初回のみ ticker 開始（2回目以降は放置）
  if (!hasStartedTicker) {
    startTicker();
    hasStartedTicker = true;
  }

  // 表示中はそのまま流させておき、次回切り替え時に新しい内容へ
}



// 実行
updateAll();
setInterval(updateAll, 5 * 60 * 1000); // 5分毎に更新
