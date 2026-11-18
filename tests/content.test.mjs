/**
 * Issue #491 の受け入れを HTML とファイル一覧で固定する。
 * セクション1のサブタイトル、サービス名、会社概要、企業理念、
 * ロゴ画像と概念図が無いこと、トップのリンク先、コピーライト、
 * 製品ページは PRODUCTS の下の WORDSPHERE から全画面モーダルを開く。
 * モーダルの平面は LP / wordflow / search。profile はモーダルに使わない。
 * 全ページは LP の星系。背景のクリームは残し、星と線とラベルは寒色。
 * ヘッダーとフッターと本文の板が無いこと、文字が濃色の細字で、
 * 空の色の後光があること、ヘッダーとフッターも同じ後光であること、
 * タイトルのグリフ中点が字間の分だけ戻ることを見る。
 * 縦スクロールはページ境界へ引き戻さない。
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const serviceHtml = readFileSync(join(root, "products/index.html"), "utf8");
const companyHtml = readFileSync(join(root, "company/index.html"), "utf8");
const siteCss = readFileSync(join(root, "css/site.css"), "utf8");
const modalJs = readFileSync(join(root, "js/concept-modal.js"), "utf8");
const siteText = [
  indexHtml,
  serviceHtml,
  companyHtml,
  siteCss,
  modalJs,
  readFileSync(join(root, "js/starfield.js"), "utf8"),
  readFileSync(join(root, "js/landing-sky.js"), "utf8"),
].join("\n");

const PHILOSOPHY = [
  '人と文化の根源にある"ミーム"の性質を探求することにより、人と社会により効果的に働きかけ、より良い人類の未来を作ること',
  '遺伝学者リチャード・ドーキンスがその著書「利己的な遺伝子」で提唱した概念"ミーム"は、遺伝子が生物を形作っているように、人の行動や文化を形作るものであるとされています。遺伝子操作が生物のあり様を変える様に、"ミーム操作"は人や社会のあり様を変えることになるでしょう。',
  '遺伝子工学に光と闇があるように、ミームの操作（ミーム工学）にも光と闇があります。Memesphereは、最新のミーム研究の知見を取り入れたさまざまなサービスを通して「よいミーム操作」を広め、人類が自らをより深く理解し、よりよく自らを変革していくことの一助となることを目標としています。',
];

const ALLOWED_IMAGES = new Set([
  "img/screen-root.png",
  "img/screen-wordflow.png",
  "img/screen-profile.png",
  "img/screen-search.png",
]);

function textOf(html, id) {
  const match = html.match(new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`));
  assert.ok(match, `#${id} が無い`);
  return match[1].replace(/<[^>]+>/g, "").replace(/\n\s*/g, "");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

test("セクション1のサブタイトルは1行", () => {
  const text = textOf(indexHtml, "section-memesphere");
  assert.equal(text, "MEMESPHEREミーム工学で世界を変える。");
  const section = indexHtml.match(/<section id="section-memesphere"[\s\S]*?<\/section>/)[0];
  assert.equal(section.match(/<p class="subtitle">/g).length, 1);
});

test("サービス名は WORDSPHERE で WORDWPHERE が無い", () => {
  assert.match(serviceHtml, /<h1>\s*PRODUCTS\s*<\/h1>/);
  assert.match(serviceHtml, /<button[^>]*id="open-concept"[^>]*>\s*WORDSPHERE\s*<\/button>/);
  assert.equal(/<h1>\s*WORDSPHERE\s*<\/h1>/.test(serviceHtml), false);
  assert.equal(serviceHtml.includes("WORDWPHERE"), false);
  assert.equal(siteText.includes("WORDWPHERE"), false);
  assert.equal(
    serviceHtml.match(/<p id="concept"[^>]*>([\s\S]*?)<\/p>/)[1].trim(),
    '多様な言葉の定義から"人間"を浮かび上がらせるサービスです。',
  );
});

test("製品モーダルは CONCEPT と指定の一文だけで、x と ESC で閉じる", () => {
  assert.match(serviceHtml, /id="concept-modal"[^>]*hidden/);
  assert.match(serviceHtml, /class="concept-close"[^>]*>\s*x\s*<\/button>/);
  assert.match(serviceHtml, /id="concept-heading"[^>]*>\s*CONCEPT\s*</);
  const copy = serviceHtml.match(/<div class="concept-copy">([\s\S]*?)<\/div>/)[1];
  assert.equal(copy.replace(/<[^>]+>/g, "").replace(/\s+/g, ""), 'CONCEPT多様な言葉の定義から"人間"を浮かび上がらせるサービスです。');
  assert.equal(serviceHtml.includes("screen-profile"), false);
  assert.equal(/three/i.test(serviceHtml + modalJs), false);
  const scripts = [...serviceHtml.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, ["../js/landing-sky.js", "../js/concept-modal.js"]);
  assert.equal((modalJs.match(/addEventListener\(\s*"click"/g) || []).length, 2);
  assert.match(modalJs, /openButton\.addEventListener\(\s*"click"/);
  assert.match(modalJs, /closeButton\.addEventListener\(\s*"click"/);
  assert.match(modalJs, /event\.key !== "Escape"/);
  assert.match(modalJs, /modal-open/);
  assert.match(modalJs, /position = "fixed"/);
  assert.match(modalJs, /lockedScrollY/);
  assert.match(modalJs, /prefers-reduced-motion/);
  assert.match(siteCss, /@keyframes concept-rise\s*\{[^}]*scale\(0\.96\)/);
  assert.match(siteCss, /@keyframes concept-veil-out/);
  assert.match(siteCss, /@keyframes concept-spin/);
  assert.match(siteCss, /@keyframes concept-revolve/);
  assert.match(siteCss, /translateZ\(var\(--orbit-radius\)\)/);
  assert.match(siteCss, /rotateY\(120deg\) translateZ\(var\(--orbit-radius\)\)/);
  assert.match(siteCss, /rotateY\(240deg\) translateZ\(var\(--orbit-radius\)\)/);
  assert.match(siteCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(
    siteCss,
    /html\.modal-open,\s*html\.modal-open body\s*\{[^}]*overflow:\s*hidden/,
  );
  assert.match(siteCss, /\.products-lead\s*\{[^}]*justify-content:\s*flex-start/);
  assert.match(siteCss, /\.products-lead\s*\{[^}]*padding-top:\s*5\.5rem/);
});

test("会社概要は社名と設立日と代表者で、住所と資本金が無い", () => {
  assert.equal(
    textOf(companyHtml, "overview"),
    "会社概要社名合同会社ミームスフィア（Memesphere G.K.）設立2020年5月1日代表者守本 憲市",
  );
  assert.match(companyHtml, /<dt>設立<\/dt>\s*<dd>2020年5月1日<\/dd>/);
  assert.match(companyHtml, /<dt>代表者<\/dt>\s*<dd>守本 憲市<\/dd>/);
  assert.equal(companyHtml.includes("住所"), false);
  assert.equal(companyHtml.includes("資本金"), false);
});

test("企業理念の本文が入っている", () => {
  const text = textOf(companyHtml, "philosophy");
  assert.equal(text, `企業理念${PHILOSOPHY.join("")}`);
});

test("ロゴ画像ファイルと概念図ファイルが無い", () => {
  const files = walk(root);
  const images = files.filter((path) => /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(path));
  const rels = images.map((path) => relative(root, path));
  assert.deepEqual(rels.sort(), [...ALLOWED_IMAGES].sort());
  for (const rel of rels) {
    assert.equal(/logo|wordgraph|concept|概念/i.test(rel), false);
    const bytes = readFileSync(join(root, rel));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(bytes.length > 10000, `${rel} が画面写真として小さすぎる`);
  }
  assert.equal(/<img\b/i.test(indexHtml), false);
  assert.equal(/<img\b/i.test(companyHtml), false);
  const srcs = [...serviceHtml.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(srcs, [
    "../img/screen-root.png",
    "../img/screen-wordflow.png",
    "../img/screen-search.png",
  ]);
  assert.equal(serviceHtml.includes("screen-profile"), false);
  assert.equal(indexHtml.includes("screen-profile"), false);
  assert.equal(companyHtml.includes("screen-profile"), false);
});

test("トップのセクション2は PRODUCTS の下に WORDSPHERE と説明とリンク", () => {
  const section = indexHtml.match(/<section id="section-wordsphere"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.match(section, /<h2>\s*PRODUCTS\s*<\/h2>/);
  assert.equal(/<h2>\s*WORDSPHERE\s*<\/h2>/.test(section), false);
  assert.match(section, /<p class="subtitle">WORDSPHERE<\/p>/);
  assert.match(
    section,
    /<p class="subtitle">言葉の定義の違いから"人間"を浮かび上がらせるサービス<\/p>/,
  );
  assert.equal(section.includes("浮かび上がらせるサービスです"), false);
  assert.match(section, /<a href="\/products\/">Wordsphereのページへ<\/a>/);
  assert.equal(section.includes("/wordsphere/"), false);
  assert.equal(section.includes("wordsphere-beta.vercel.app"), false);
  assert.equal(siteText.includes("wordsphere-beta.vercel.app"), false);
  assert.equal(siteText.includes("wordsphere.net"), false);
  assert.equal(siteText.includes("wordsphere.com"), false);
});

test("セクション3のサブタイトルは Issue の一文", () => {
  assert.equal(
    textOf(indexHtml, "section-future"),
    "FUTUREミーム（心の遺伝子）の理解を資本として社会にインパクトを与えていく",
  );
});

test("ヘッダーは社名の右に TOP、PRODUCTS、COMPANY で、メニューは無い", () => {
  for (const html of [indexHtml, serviceHtml, companyHtml]) {
    assert.equal(/<details\b/i.test(html), false);
    assert.equal(html.includes("メニュー"), false);
    assert.equal(html.includes("SERVICE"), false);
    const header = html.match(/<header>([\s\S]*?)<\/header>/)[1];
    assert.match(header, /class="brand">合同会社ミームスフィア</);
    const links = [...header.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(
      (match) => `${match[2]} ${match[1]}`,
    );
    assert.deepEqual(links, ["TOP /", "PRODUCTS /products/", "COMPANY /company/"]);
  }
  assert.equal(/\.menu\b/.test(siteCss), false);
});

test("フッターの製品導線は PRODUCTS で /products/ へ進む", () => {
  for (const html of [indexHtml, serviceHtml, companyHtml]) {
    const footer = html.match(/<footer>([\s\S]*?)<\/footer>/)[1];
    const links = [...footer.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(
      (match) => `${match[2]} ${match[1]}`,
    );
    assert.deepEqual(links, ["TOP /", "PRODUCTS /products/", "COMPANY /company/"]);
    assert.equal(footer.includes("/wordsphere/"), false);
  }
});

test("コピーライトはフッターの一番下に Issue の表記で、年が無い", () => {
  const lineText = "\u00A9\uFE0EMemesphere G.K.";
  const mark = `<p class="copyright">${lineText}</p>`;
  for (const html of [indexHtml, serviceHtml, companyHtml]) {
    assert.match(html, new RegExp(`${mark}\\s*</footer>`));
    const line = html.match(/<p class="copyright">([^<]*)<\/p>/)[1];
    assert.equal(line, lineText);
    assert.equal(line.codePointAt(0), 0x00a9);
    assert.equal(line.charCodeAt(1), 0xfe0e);
    assert.equal(/\d{4}/.test(line), false);
    assert.equal(line.includes("合同会社"), false);
  }
});

test("全ページの星空は LP の星系のまま、星と線とラベルは寒色", () => {
  const landing = readFileSync(join(root, "js/landing-sky.js"), "utf8");
  assert.match(indexHtml, /<html lang="ja" class="home">/);
  for (const html of [indexHtml, serviceHtml, companyHtml]) {
    assert.match(html, /<canvas id="starfield"/);
    assert.match(html, /landing-sky\.js/);
    assert.equal(html.includes("starfield.js"), false);
  }
  assert.equal(/<html[^>]*class="home"/.test(serviceHtml), false);
  assert.equal(/<html[^>]*class="home"/.test(companyHtml), false);
  assert.match(siteCss, /^html \{[^}]*background:\s*#fbfbf5/m);
  assert.match(siteCss, /^body \{[^}]*background:\s*#fbfbf5/m);
  assert.match(landing, /type: "Definition"/);
  assert.match(landing, /自由/);
  assert.match(landing, /TARGET_DEFS = 100/);
  assert.match(landing, /TARGET_WORDS = 70/);
  assert.match(landing, /TARGET_USERS = 25/);
  assert.match(landing, /LANDING_ORBIT_RADIUS = 22/);
  assert.match(landing, /BG_STAR_COUNT = 2500/);
  assert.match(landing, /#04040a/);
  assert.match(landing, /function invertAdditive/);
  assert.match(landing, /invertAdditive\(hexToRgb01\(LP_BG\), 0\)/);
  assert.equal((landing.match(/invertAdditive\(/g) || []).length, 2);
  assert.match(landing, /function coolOnCream/);
  assert.match(landing, /coolOnCream\(mixed\)/);
  assert.match(landing, /coolOnCream\(hexToRgb01\(LP_NODE_COLOR/);
  assert.equal(landing.includes("115,115,55"), false);
  assert.equal(landing.includes("145,135,45"), false);
  assert.match(landing, /#6673cc/);
});

test("縦スクロールはページ境界へ引き戻さない", () => {
  assert.equal(/scroll-snap-type/.test(siteCss), false);
  assert.equal(/scroll-snap-align/.test(siteCss), false);
  assert.match(siteCss, /main section\s*\{[^}]*min-height:\s*100vh/);
  assert.match(siteCss, /html\.home #section-memesphere\s*\{[^}]*height:\s*100vh/);
  const ids = [...indexHtml.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ["section-memesphere", "section-wordsphere", "section-future"]);
});

test("トップのタイトルはセクション中央", () => {
  assert.equal(indexHtml.includes("section-upper"), false);
  assert.equal(indexHtml.includes("section-lower"), false);
  assert.match(indexHtml, /id="section-memesphere" class="home-story"/);
  assert.match(indexHtml, /id="section-wordsphere" class="home-story"/);
  assert.match(indexHtml, /id="section-future" class="home-story"/);
  assert.match(siteCss, /html\.home #section-memesphere\s*\{[^}]*height:\s*100vh/);
  assert.match(siteCss, /html\.home \.home-story\s*\{[^}]*align-items:\s*center/);
  assert.match(siteCss, /html\.home \.home-story\s*\{[^}]*justify-content:\s*center/);
  assert.match(siteCss, /html\.home \.home-copy\s*\{[^}]*max-width:\s*48rem/);
  assert.match(siteCss, /html\.home \.home-copy\s*\{[^}]*margin-inline:\s*auto/);
  assert.equal(serviceHtml.includes("section-upper"), false);
  assert.equal(companyHtml.includes("section-upper"), false);
  assert.equal(/\.section-upper/.test(siteCss), false);
});

test("カンパニーは中央の狭い列に概要と理念をまとめる", () => {
  assert.equal(companyHtml.includes("section-upper"), false);
  assert.equal(companyHtml.includes("section-lower"), false);
  assert.equal(companyHtml.includes("band"), false);
  const philosophySection = companyHtml.match(/<section id="philosophy"[\s\S]*?<\/section>/)[0];
  assert.equal(/<ul\b/.test(philosophySection), false);
  assert.equal(/<li\b/.test(philosophySection), false);
  assert.equal((philosophySection.match(/<p>/g) || []).length, 3);
  assert.match(companyHtml, /class="company-sheet"/);
  assert.match(companyHtml, /class="company-column"/);
  assert.match(companyHtml, /<h1 class="sheet-label">会社概要<\/h1>/);
  assert.match(companyHtml, /<h2 class="sheet-label">企業理念<\/h2>/);
  assert.match(siteCss, /\.company-column\s*\{[^}]*width:\s*min\(100%,\s*40rem\)/);
  assert.match(siteCss, /\.company-column\s*\{[^}]*margin-inline:\s*auto/);
  assert.match(siteCss, /\.company-column\s*\{[^}]*padding:\s*7\.5rem/);
  assert.match(siteCss, /\.company-column\s*\{[^}]*text-align:\s*left/);
  assert.equal(/\.company-column\s*\{[^}]*background/.test(siteCss), false);
  assert.match(siteCss, /\.company-sheet section\s*\{[^}]*min-height:\s*0/);
  assert.match(siteCss, /\.sheet-label\s*\{[^}]*font-size:\s*0\.72rem/);
  assert.match(siteCss, /\.sheet-label\s*\{[^}]*text-align:\s*left/);
  assert.match(siteCss, /#overview dl\s*\{[^}]*flex-direction:\s*column/);
  assert.match(
    siteCss,
    /@media \(min-width: 48rem\)\s*\{[\s\S]*?#overview dl\s*\{[^}]*flex-direction:\s*row/,
  );
  assert.match(siteCss, /border-left:\s*1px solid rgba\(4,\s*4,\s*10,\s*0\.28\)/);
  assert.match(siteCss, /#overview dt,\s*#overview dd\s*\{[^}]*font-size:\s*1rem/);
  assert.match(siteCss, /#overview dt,\s*#overview dd\s*\{[^}]*text-align:\s*left/);
  assert.equal(/#overview dt,\s*#overview dd\s*\{[^}]*clamp\(/.test(siteCss), false);
  assert.match(siteCss, /#philosophy p\s*\{[^}]*line-height:\s*1\.95/);
  assert.match(siteCss, /#philosophy p\s*\{[^}]*text-align:\s*left/);
  assert.match(siteCss, /#philosophy p\s*\{[^}]*font-size:\s*1rem/);
});

test("全ページのヘッダーとフッターと本文の板が無く、画面写真のガラス枠も無い", () => {
  const plate = siteCss.match(/header,\s*footer,\s*\.text-area\s*\{[^}]*\}/);
  assert.ok(plate, "板を外す指定が無い");
  assert.match(plate[0], /background:\s*none/);
  assert.match(plate[0], /backdrop-filter:\s*none/);
  assert.match(plate[0], /-webkit-backdrop-filter:\s*none/);
  assert.match(plate[0], /border:\s*none/);
  assert.equal(/\.shot-grid/.test(siteCss), false);
  assert.equal(serviceHtml.includes("shot-grid"), false);
  assert.equal(serviceHtml.includes("gallery"), false);
  assert.equal(/backdrop-filter:\s*blur/.test(siteCss), false);
  assert.equal(/border-bottom:\s*1px solid var\(--glass-edge\)/.test(siteCss), false);
  assert.equal(/border-top:\s*1px solid var\(--glass-edge\)/.test(siteCss), false);
  assert.equal(/\.text-area \{[^}]*border:\s*1px solid/.test(siteCss), false);
});

test("全ページのタイトルと本文は濃色の細字で、クリームの後光がある", () => {
  const title =
    /html\.home \.home-copy h1,\s*html\.home \.home-copy h2\s*\{[^}]*\}/;
  const titleRule = siteCss.match(title);
  assert.ok(titleRule, "トップのタイトル指定が無い");
  assert.match(titleRule[0], /color:\s*#04040a/);
  assert.match(titleRule[0], /font-weight:\s*200/);
  assert.match(titleRule[0], /letter-spacing:\s*0\.25em/);
  assert.match(titleRule[0], /translateX\(calc\(-50% \+ 0\.25em \/ 2\)\)/);
  assert.equal(/padding-left/.test(titleRule[0]), false);
  assert.match(titleRule[0], /text-shadow:[^;]*#fbfbf5/);
  assert.equal(/text-shadow:\s*var\(--outline\)/.test(titleRule[0]), false);
  assert.equal(/#000/.test(titleRule[0]), false);
  const subtitle = /html\.home \.subtitle,\s*html\.home \.subtitle a\s*\{[^}]*\}/;
  const subtitleRule = siteCss.match(subtitle);
  assert.ok(subtitleRule, "トップのサブタイトル指定が無い");
  assert.match(subtitleRule[0], /color:\s*#04040a/);
  assert.match(subtitleRule[0], /font-weight:\s*200/);
  assert.match(subtitleRule[0], /text-shadow:[^;]*#fbfbf5/);
  assert.equal(/text-shadow:\s*var\(--outline\)/.test(subtitleRule[0]), false);
  assert.equal(/#000/.test(subtitleRule[0]), false);
  assert.equal(/letter-spacing/.test(subtitleRule[0]), false);
  assert.equal(/translateX/.test(subtitleRule[0]), false);
  const chrome =
    /header,\s*footer,\s*header a,\s*footer a\s*\{[^}]*\}/;
  const chromeRule = siteCss.match(chrome);
  assert.ok(chromeRule, "ヘッダーとフッターの文字色が無い");
  assert.match(chromeRule[0], /color:\s*#04040a/);
  assert.equal(/text-shadow/.test(chromeRule[0]), false);
  const halo = siteCss.match(/^header,\s*footer \{\s*text-shadow:([^}]+)\}/m);
  assert.ok(halo, "ヘッダーとフッターの後光が無い");
  assert.match(halo[1], /#fbfbf5/);
  assert.equal(/#000/.test(halo[1]), false);
  assert.equal(/var\(--outline\)/.test(halo[1]), false);
  assert.match(siteCss, /\.sheet-label\s*\{[^}]*color:\s*#04040a/);
  assert.match(siteCss, /\.sheet-label\s*\{[^}]*font-weight:\s*200/);
  assert.match(siteCss, /\.sheet-label\s*\{[^}]*text-shadow:[^;]*#fbfbf5/);
  const sheetLabel = siteCss.match(/\.sheet-label\s*\{[^}]*\}/)[0];
  assert.equal(/text-shadow:\s*var\(--outline\)/.test(sheetLabel), false);
  assert.equal(/#000/.test(sheetLabel), false);
  assert.match(siteCss, /#philosophy p\s*\{[^}]*color:\s*#04040a/);
  assert.match(siteCss, /#philosophy p\s*\{[^}]*font-weight:\s*200/);
  assert.match(siteCss, /#philosophy p\s*\{[^}]*text-shadow:[^;]*#fbfbf5/);
  const philosophy = siteCss.match(/#philosophy p\s*\{[^}]*\}/)[0];
  assert.equal(/#000/.test(philosophy), false);
  assert.match(siteCss, /\.subtitle\s*\{[^}]*color:\s*#04040a/);
  assert.match(siteCss, /\.subtitle\s*\{[^}]*font-weight:\s*200/);
  assert.match(siteCss, /\.subtitle\s*\{[^}]*text-shadow:[^;]*#fbfbf5/);
  const subtitleBase = siteCss.match(/\.subtitle\s*\{[^}]*\}/)[0];
  assert.equal(/text-shadow:\s*var\(--outline\)/.test(subtitleBase), false);
  assert.equal(/#000/.test(subtitleBase), false);
  const bodyCopy = siteCss.match(/^\.text-area \{\s*width:[^}]*\}/m)[0];
  assert.match(bodyCopy, /color:\s*#04040a/);
  assert.match(bodyCopy, /font-weight:\s*200/);
  assert.match(bodyCopy, /text-shadow:[^;]*#fbfbf5/);
  assert.equal(/#000/.test(bodyCopy), false);
  assert.match(siteCss, /^body \{[^}]*color:\s*#04040a/m);
  assert.match(siteCss, /^body \{[^}]*font-weight:\s*200/m);
  assert.match(siteCss, /\.products-lead h1\s*\{[^}]*color:\s*#04040a/);
  assert.match(siteCss, /\.products-lead h1\s*\{[^}]*font-weight:\s*200/);
  assert.match(siteCss, /\.products-lead h1\s*\{[^}]*font-size:\s*clamp\(2rem,\s*10vw,\s*6rem\)/);
  assert.match(siteCss, /\.products-lead h1\s*\{[^}]*text-shadow:[^;]*#fbfbf5/);
  const productsTitle = siteCss.match(/\.products-lead h1\s*\{[^}]*\}/)[0];
  assert.equal(/#000/.test(productsTitle), false);
  assert.match(siteCss, /\.product-name\s*\{[^}]*font-size:\s*0\.95rem/);
  assert.match(siteCss, /\.product-name\s*\{[^}]*font-weight:\s*200/);
  assert.match(siteCss, /\.product-name\s*\{[^}]*color:\s*#04040a/);
  assert.equal(siteCss.includes("@font-face"), false);
  assert.equal(indexHtml.includes("fonts.googleapis"), false);
  assert.equal(indexHtml.includes("@font-face"), false);
});
