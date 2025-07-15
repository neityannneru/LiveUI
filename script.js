const ticker = document.getElementById("ticker");
const wrapper = document.querySelector(".ticker-wrapper");
const clock = document.getElementById("clock");

let weatherHTMLs = [];
let newsItems = []; // { title, description }
let combinedItems = []; // { type, content }
let currentIndex = 0;
let animationId = null;

// ✅ スクロール速度（ピクセル/秒）を個別に設定
const scrollSpeeds = {
  weather: 400,
  "news-desc": 300
};

// 時計表示
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  clock.textContent = `│${hh}:${mm}:${ss}│`;
}
setInterval(updateClock, 1000);
updateClock();

// 天気取得
async function fetchWeather() {
  try {
    const res = await fetch("https://weathernews.jp/forecast/xml/all.xml");
    const xml = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const points = Array.from(xmlDoc.getElementsByTagName("point"));

    const unique = {};
    points.forEach(point => {
      const id = point.getAttribute("id");
      if (!unique[id]) {
        const name = point.getAttribute("name");
        const weatherRaw = point.getElementsByTagName("weather")[0]?.textContent || "";
        const first = weatherRaw.split(",")[0];
        const icon = `https://weathernews.jp/s/topics/img/wxicon/${first}.png`;
        const html = `<img src="${icon}" alt="icon"><span>${name}</span>`;
        unique[id] = html;
      }
    });

    weatherHTMLs = Object.values(unique);
  } catch (e) {
    console.error("天気取得エラー", e);
    weatherHTMLs = ["<span>天気取得エラー</span>"];
  }
}

// ニュース取得（RSS）
async function fetchNews() {
  try {
    const urls = [
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat0.xml",
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat1.xml"
    ];

    let all = [];
    for (const url of urls) {
      const res = await fetch(url);
      const json = await res.json();
      if (json.items) {
        all = all.concat(json.items.map(i => ({ title: i.title, description: i.description })));
      }
    }

    newsItems = all;
  } catch (e) {
    console.error("ニュース取得エラー", e);
    newsItems = [{ title: "ニュース取得失敗", description: "" }];
  }
}

// 表示データを構成
function updateCombinedItems() {
  const weather = weatherHTMLs.join("　");
  combinedItems = [{ type: "weather", content: weather }];
  newsItems.forEach(n => {
    combinedItems.push({ type: "news-title", content: n.title });
    combinedItems.push({ type: "news-desc", content: n.description });
  });
}

// アニメーション処理
function showNext() {
  const item = combinedItems[currentIndex];
  ticker.style.transition = "none";
  ticker.style.opacity = 1;

  if (item.type === "weather" || item.type === "news-desc") {
    ticker.innerHTML = item.content;
    ticker.style.left = wrapper.offsetWidth + "px";
    let posX = wrapper.offsetWidth;
    const fps = 60;
    const speed = scrollSpeeds[item.type] || 60;

    function animate() {
      const step = speed / fps;
      posX -= step;
      ticker.style.left = `${posX}px`;

      if (posX + ticker.offsetWidth < 0) {
        currentIndex = (currentIndex + 1) % combinedItems.length;
        showNext();
      } else {
        animationId = requestAnimationFrame(animate);
      }
    }
    animationId = requestAnimationFrame(animate);
  }

  else if (item.type === "news-title") {
    ticker.textContent = item.content;
    ticker.style.left = "10px";
    ticker.style.transition = "none";
    ticker.style.opacity = 1;

    setTimeout(() => {
      ticker.style.transition = "opacity 1s";
      ticker.style.opacity = 0;
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % combinedItems.length;
        showNext();
      }, 1500);
    }, 800);
  }
}

// 初回だけstartTickerを実行
let started = false;
async function updateAll() {
  await fetchWeather();
  await fetchNews();
  updateCombinedItems();
  if (!started) {
    started = true;
    showNext();
  }
}

updateAll();
setInterval(updateAll, 5 * 60 * 1000);
