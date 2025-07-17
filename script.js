//script.js
const ticker = document.getElementById("ticker");
const wrapper = document.querySelector(".ticker-wrapper");
const clock = document.getElementById("clock");

let weatherHTMLs = [];
let newsItems = []; // { title, description }
let combinedItems = []; // { type, content }
let currentIndex = 0;
let animationId = null;
let earthquakeItems = []; // { title, description }

// ✅ スクロール速度（ピクセル/秒）を個別に設定
const scrollSpeeds = {
  weather: 180,
  "news-desc": 120
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

async function fetchEarthquake() {
  try {
    const res = await fetch("https://api.p2pquake.net/v2/history?codes=551&limit=1");
    const json = await res.json();
    if (!json.length) return;

    const eq = json[0];
    const dt = new Date(eq.time);
    const day = dt.getDate();
    const hour = dt.getHours();
    const minute = dt.getMinutes();

    const scaleMap = {
      10: "1",
      20: "2",
      30: "3",
      40: "4",
      45: "5弱",
      50: "5強",
      55: "6弱",
      60: "6強",
      70: "7"
    };

    const maxScaleRaw = eq.earthquake.maxScale;
    const maxScale = scaleMap[maxScaleRaw] || "不明";
    const hypocenterName = eq.earthquake.hypocenter.name || "震源地不明";
    const depth = eq.earthquake.hypocenter.depth >= 0 ? eq.earthquake.hypocenter.depth : "不明";
    const magnitude = eq.earthquake.hypocenter.magnitude >= 0 ? eq.earthquake.hypocenter.magnitude.toFixed(1) : "不明";

    let matchedPoints = [];
    if (eq.points && eq.points.length && maxScaleRaw !== -1) {
      matchedPoints = eq.points.filter(p => p.scale === maxScaleRaw);
    }

    let areasStr = "不明な地域";
    if (matchedPoints.length > 0) {
      const names = matchedPoints.map(p =>  p.addr || "不明な地域");
      const uniqueNames = [...new Set(names)];
      areasStr = uniqueNames.join("、");
    }

    let title = `【地震情報】${hypocenterName}で最大震度${maxScale}を観測`;

    let detailText = `${day}日${hour}時${minute}分頃、${hypocenterName}で最大震度${maxScale}を観測する地震がありました。` +
                     `震源地は${hypocenterName}で震源の深さは${depth}km、地震の規模を示すマグニチュードはM${magnitude}と推定されています。` +
                     `震度${maxScale}を${areasStr}で観測しました。　-　 情報:P2P地震情報API`;

    earthquakeItems = [
      { type: "earthquake-title", content: title },
      { type: "earthquake-desc", content: detailText }
    ];

  } catch (e) {
    console.error("地震情報取得エラー", e);
    earthquakeItems = [];
  }
}




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
  combinedItems = [];

  // 地震があれば最優先表示
  if (earthquakeItems.length) {
    combinedItems.push(...earthquakeItems);
  }

  // 通常の天気・ニュース
  combinedItems.push({ type: "weather", content: weather });
  newsItems.forEach(n => {
    combinedItems.push({ type: "news-title", content: n.title });
    combinedItems.push({ type: "news-desc", content: n.description });
  });
}

const quakeAlert = document.getElementById("quake-alert");

function showNext() {
  const item = combinedItems[currentIndex];
  // 地震情報の時だけ点滅表示、他は非表示
  if (item.type === "earthquake-title" || item.type === "earthquake-desc") {
    quakeAlert.style.visibility = "visible";
  } else {
    quakeAlert.style.visibility = "hidden";
  }

  // --- 既存のshowNext処理続く ---
  // ...
}

// アニメーション処理
function showNext() {
  const item = combinedItems[currentIndex];
  ticker.style.transition = "none";
  ticker.style.opacity = 1;

  if (item.type === "weather" || item.type === "news-desc" || item.type === "earthquake-desc" || item.type === "earthquake-details") {
    ticker.innerHTML = item.content;
    ticker.style.left = wrapper.offsetWidth + "px";
    let posX = wrapper.offsetWidth;
    const fps = 60;
    const speed = scrollSpeeds[item.type] || 180;

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

  else if (item.type === "news-title" || item.type === "earthquake-title") {
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
  await fetchEarthquake();
  updateCombinedItems();
  if (!started) {
    started = true;
    showNext();
  }
}


updateAll();
setInterval(updateAll, 5 * 60 * 1000);
