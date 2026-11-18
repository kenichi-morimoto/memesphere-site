/**
 * Issue #491 の受け入れを HTML とファイル一覧で固定する。
 * セクション1のサブタイトル2つ、サービス名、会社概要、企業理念、
 * ロゴ画像と概念図が無いこと、トップのリンク先、コピーライト、
 * 全ページは LP の星系。背景のクリームは残し、星と線とラベルは寒色。
 * ヘッダーとフッターと本文の板が無いこと、文字が濃色の細字で、
 * 空の色の後光があること、タイトルのグリフ中点が字間の分だけ戻ることを見る。
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const serviceHtml = readFileSync(join(root, "wordsphere/index.html"), "utf8");
const companyHtml = readFileSync(join(root, "company/index.html"), "utf8");
const siteCss = readFileSync(join(root, "css/site.css"), "utf8");
const siteText = [
  indexHtml,
  serviceHtml,
  companyHtml,
  siteCss,
  readFileSync(join(root, "js/starfield.js"), "utf8"),
  readFileSync(join(root, "js/landing-sky.js"), "utf8"),
].join("\n");

const PHILOSOPHY = [
  '人と文化の根源にある"ミーム"の性質を探求することにより、人と社会により効果的に働きかけ、より良い人類の未来を作ること',
  'リチャード・ドーキンスが「利己的な遺伝子」で提唱した概念"ミーム"は、遺伝子が生物を形作っているように、人の行動や文化を形作るとされています。そして遺伝子操作が生物のあり様を変える様に、"ミーム操作"は人や社会のあり様を変えることになるでしょう。',
  '遺伝子工学に光と闇があるように、ミームの操作（ミーム工学）にも光と闇があります。Memesphereは、さまざまなサービスを通して「よいミーム操作」を広め、人類が自らをより深く理解し、その理解を持ってよりよく自らを変革していくことの一助となることを目標としています。',
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

test("セクション1のサブタイトルが2つとも出る", () => {
  const text = textOf(indexHtml, "section-memesphere");
  assert.equal(
    text,
    "MEMESPHERE人と人との繋がりを考える会社です。人と人々の振る舞いについて科学する会社です。",
  );
});

test("サービス名は WORDSPHERE で WORDWPHERE が無い", () => {
  assert.match(serviceHtml, /<h1>\s*WORDSPHERE\s*<\/h1>/);
  assert.equal(textOf(serviceHtml, "overview").includes("WORDWPHERE"), false);
  assert.equal(siteText.includes("WORDWPHERE"), false);
  assert.equal(
    serviceHtml.match(/<p id="concept"[^>]*>([\s\S]*?)<\/p>/)[1].trim(),
    '言葉の定義の違いから"人間"を浮かび上がらせるサービスです。',
  );
});

test("会社概要は社名と設立日だけで、住所・代表・資本金が無い", () => {
  assert.equal(
    textOf(companyHtml, "overview"),
    "会社概要社名合同会社ミームスフィア（Memesphere G.K.）設立2020年5月1日",
  );
  assert.equal(companyHtml.includes("住所"), false);
  assert.equal(companyHtml.includes("代表"), false);
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
    "../img/screen-profile.png",
    "../img/screen-search.png",
  ]);
});

test("トップの WORDSPHERE はサービスページへ進み、本体ホストへは飛ばない", () => {
  const section = indexHtml.match(/<section id="section-wordsphere"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.match(section, /<a href="\/wordsphere\/">Wordsphereのページへ<\/a>/);
  assert.equal(section.includes("wordsphere-beta.vercel.app"), false);
  assert.equal(siteText.includes("wordsphere-beta.vercel.app"), false);
  assert.equal(siteText.includes("wordsphere.net"), false);
  assert.equal(siteText.includes("wordsphere.com"), false);
});

test("コピーライトはフッターの一番下に社名だけで、年が無い", () => {
  const mark = '<p class="copyright">© 合同会社ミームスフィア</p>';
  for (const html of [indexHtml, serviceHtml, companyHtml]) {
    assert.match(html, new RegExp(`${mark}\\s*</footer>`));
    const line = html.match(/<p class="copyright">([^<]*)<\/p>/)[1];
    assert.equal(line, "© 合同会社ミームスフィア");
    assert.equal(/\d{4}/.test(line), false);
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

test("トップのタイトルはセクション中央で、他ページの上下分割は残す", () => {
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
  assert.match(companyHtml, /section-upper/);
  assert.match(serviceHtml, /section-upper/);
  assert.match(siteCss, /\.section-upper\s*\{[^}]*50vh/);
});

test("全ページのヘッダーとフッターと本文の板が無く、画面写真の枠は残す", () => {
  const plate = siteCss.match(/header,\s*footer,\s*\.text-area\s*\{[^}]*\}/);
  assert.ok(plate, "板を外す指定が無い");
  assert.match(plate[0], /background:\s*none/);
  assert.match(plate[0], /backdrop-filter:\s*none/);
  assert.match(plate[0], /-webkit-backdrop-filter:\s*none/);
  assert.match(plate[0], /border:\s*none/);
  assert.match(siteCss, /\.shot-grid figure\s*\{[^}]*background:\s*var\(--glass\)/);
  assert.match(siteCss, /\.shot-grid figure\s*\{[^}]*backdrop-filter:\s*blur\(12px\)/);
  assert.match(siteCss, /\.shot-grid figure\s*\{[^}]*border:\s*1px solid var\(--glass-edge\)/);
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
    /header,\s*footer,\s*header a,\s*footer a,\s*\.menu > summary\s*\{[^}]*\}/;
  const chromeRule = siteCss.match(chrome);
  assert.ok(chromeRule, "ヘッダーとフッターの文字色が無い");
  assert.match(chromeRule[0], /color:\s*#04040a/);
  assert.equal(/text-shadow/.test(chromeRule[0]), false);
  assert.match(
    siteCss,
    /\.section-upper h1,\s*\.section-upper h2\s*\{[^}]*color:\s*#04040a/,
  );
  assert.match(
    siteCss,
    /\.section-upper h1,\s*\.section-upper h2\s*\{[^}]*font-weight:\s*200/,
  );
  assert.match(
    siteCss,
    /\.section-upper h1,\s*\.section-upper h2\s*\{[^}]*text-shadow:[^;]*#fbfbf5/,
  );
  const sectionTitle = siteCss.match(/\.section-upper h1,\s*\.section-upper h2\s*\{[^}]*\}/)[0];
  assert.equal(/text-shadow:\s*var\(--outline\)/.test(sectionTitle), false);
  assert.equal(/#000/.test(sectionTitle), false);
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
  assert.equal(siteCss.includes("@font-face"), false);
  assert.equal(indexHtml.includes("fonts.googleapis"), false);
  assert.equal(indexHtml.includes("@font-face"), false);
});
