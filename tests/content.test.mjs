/**
 * Issue #491 の受け入れを HTML とファイル一覧で固定する。
 * セクション1のサブタイトル2つ、サービス名、会社概要、企業理念、
 * ロゴ画像と概念図が無いことを見る。
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
const siteText = [indexHtml, serviceHtml, companyHtml, readFileSync(join(root, "css/site.css"), "utf8"), readFileSync(join(root, "js/starfield.js"), "utf8")].join("\n");

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
  const match = html.match(new RegExp(`<section id="${id}">([\\s\\S]*?)</section>`));
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
    serviceHtml.match(/<p id="concept">([\s\S]*?)<\/p>/)[1].trim(),
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

test("Wordsphere へのリンクは公開中のホストだけ", () => {
  assert.match(indexHtml, /href="https:\/\/wordsphere-beta\.vercel\.app\/"/);
  assert.equal(siteText.includes("wordsphere.net"), false);
  assert.equal(siteText.includes("wordsphere.com"), false);
});
