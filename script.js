document.addEventListener("DOMContentLoaded", () => {
  const ticker = document.getElementById("ticker");
  const wrapper = document.querySelector(".ticker-wrapper");
  const clock = document.getElementById("clock");
  const weatherSlider = document.getElementById("weatherSlider");
  const newsSlider = document.getElementById("newsSlider");

  let weatherItems = [];
  let newsItems = [];
  let combined = [];
  let idx = 0;
  let anim = null;

  const speeds = {
    weather: Number(weatherSlider.value),
    "news-desc": Number(newsSlider.value)
  };

  weatherSlider.addEventListener("input", () => speeds.weather = Number(weatherSlider.value));
  newsSlider.addEventListener("input", () => speeds["news-desc"] = Number(newsSlider.value));

  function updateClock() {
    const now = new Date();
    clock.textContent = `│${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}│`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  async function fetchWeather() {
    try {
      const res = await fetch("https://weathernews.jp/forecast/xml/all.xml");
      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      const pts = Array.from(doc.getElementsByTagName("point"));
      const uniq = {};
      pts.forEach(p => {
        const id = p.getAttribute("id");
        if (!uniq[id]) {
          const n = p.getAttribute("name");
          const w = p.getElementsByTagName("weather")[0]?.textContent.split(",")[0] || "";
          const u = `https://weathernews.jp/s/topics/img/wxicon/${w}.png`;
          uniq[id] = `<img src="${u}"/><span>${n}</span>`;
        }
      });
      weatherItems = Object.values(uniq);
    } catch {
      weatherItems = ['<span style="color:red;">天気取得エラー</span>'];
    }
  }

  async function fetchNews() {
    try {
      const urls = [
        "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat0.xml",
        "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat1.xml"
      ];
      const arr = [];
      for (const u of urls) {
        const j = await (await fetch(u)).json();
        if (j.items) arr.push(...j.items.map(i => ({ title: i.title, description: i.description })));
      }
      newsItems = arr;
    } catch {
      newsItems = [{ title: "ニュース取得エラー", description: "" }];
    }
  }

  function build() {
    combined = [{ type: "weather", content: weatherItems.join("　") }];
    newsItems.forEach(n => {
      combined.push({ type: "news-desc", title: n.title, description: n.description });
    });
  }

  function next() {
    if (anim) cancelAnimationFrame(anim);
    if (idx >= combined.length) idx = 0;

    const it = combined[idx];
    ticker.style.transition = "none";
    ticker.style.opacity = 1;

    if (it.type === "weather") {
      ticker.innerHTML = it.content;
      scroll("weather", () => {
        idx++;
        next();
      });
    } else if (it.type === "news-desc") {
      ticker.innerHTML = `<span style="font-weight:bold; color:#FFD700;">${it.title}</span>　<span>${it.description}</span>`;
      scroll("news-desc", () => {
        idx++;
        next();
      });
    }
  }

  function scroll(type, done) {
    ticker.style.left = wrapper.offsetWidth + "px";
    let x = wrapper.offsetWidth;
    const fps = 60;

    function frame() {
      const currentSpeed = speeds[type];
      x -= currentSpeed / fps;
      ticker.style.left = `${x}px`;
      if (x + ticker.offsetWidth < 0) {
        done();
      } else {
        anim = requestAnimationFrame(frame);
      }
    }
    anim = requestAnimationFrame(frame);
  }

  async function startAll() {
    await fetchWeather();
    await fetchNews();
    build();
    next();
    setInterval(async () => {
      await fetchWeather();
      await fetchNews();
      build();
    }, 300000); // 5分更新
  }

  startAll();
});
