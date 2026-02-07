const NOTE_DIR = "./note/";
const INDEX_URL = NOTE_DIR + "index.json";
const ASSETS_DIR = NOTE_DIR + "assets/";

const listEl = document.getElementById("list");
const contentEl = document.getElementById("content");

let files = [];
let current = null;

function titleFrom(name) {
  return name.replace(/\.md$/i, "");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isAbsoluteUrl(src) {
  return (
    /^([a-z]+:)?\/\//i.test(src) ||
    /^data:/i.test(src) ||
    src.startsWith("/") ||
    src.startsWith("blob:")
  );
}

// 解析图片路径到 note/assets
function resolveImageSrc(raw) {
  let src = raw ?? "";
  if (typeof src !== "string") src = String(src);
  src = src.trim();
  if (!src) return src;

  if (isAbsoluteUrl(src)) return src;

  src = src.replace(/^\.\/+/, "");

  if (src.startsWith("assets/")) {
    return NOTE_DIR + src;
  }

  return ASSETS_DIR + src;
}

// marked 渲染器
const renderer = new marked.Renderer();

renderer.image = (href, title, text) => {
  let rawSrc = href;
  let rawTitle = title;
  let rawText = text;

  if (href && typeof href === "object") {
    rawSrc = href.href ?? href.url ?? href.src ?? "";
    rawTitle = href.title ?? "";
    rawText = href.text ?? href.alt ?? "";
  }

  const src = resolveImageSrc(rawSrc);
  const t = rawTitle ? ` title="${escapeHtml(rawTitle)}"` : "";
  const alt = escapeHtml(rawText || "");

  return `<img src="${src}" alt="${alt}"${t} />`;
};

marked.setOptions({ renderer });

// 渲染左侧文件列表
function renderList() {
  listEl.innerHTML = "";

  files.forEach((f) => {
    const item = document.createElement("div");
    item.textContent = titleFrom(f);

    // 当前选中项加 class
    if (f === current) {
      item.classList.add("active");
    }

    item.onclick = () => openFile(f);
    listEl.appendChild(item);
  });
}

// 打开并渲染 Markdown
async function openFile(name) {
  current = name;

  renderList();

  const res = await fetch(NOTE_DIR + encodeURIComponent(name), {
    cache: "no-store",
  });

  if (!res.ok) {
    contentEl.innerHTML = `<p>无法读取：${name}</p>`;
    return;
  }

  const md = await res.text();
  contentEl.innerHTML = marked.parse(md);
}

// 初始化加载 index.json
async function init() {
  const res = await fetch(INDEX_URL, { cache: "no-store" });

  if (!res.ok) {
    contentEl.innerHTML = `<p>找不到 <code>note/index.json</code></p>`;
    return;
  }

  const data = await res.json();

  files = Array.isArray(data)
    ? data.filter(
        (x) => typeof x === "string" && x.toLowerCase().endsWith(".md")
      )
    : [];

  files.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  renderList();

  if (files.length) {
    openFile(files[0]);
  } else {
    contentEl.innerHTML =
      "<p><code>note/index.json</code> 里没有任何 Markdown 文件</p>";
  }
}

init();
