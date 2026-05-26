const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const mdPath = path.join(root, "ebook-carro-eletrico-sem-misterio.md");
const htmlPath = path.join(root, "ebook-carro-eletrico-sem-misterio.html");
const title = "Carro Elétrico Sem Mistério";
const subtitle =
  "O guia prático para entender, comprar e usar seu primeiro BYD ou carro eletrificado sem medo de errar.";

const raw = fs.readFileSync(mdPath, "utf8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inlineFormat(text) {
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>");
  formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>',
  );
  return formatted;
}

function parseTable(startIndex) {
  const header = lines[startIndex];
  const divider = lines[startIndex + 1];
  if (!header.includes("|") || !divider || !/^(\|\s*[-:]+[-|\s:]*)$/.test(divider.trim())) {
    return null;
  }

  const rows = [];
  let i = startIndex;
  while (i < lines.length && lines[i].includes("|")) {
    rows.push(lines[i]);
    i += 1;
  }

  const parseCells = (row) =>
    row
      .split("|")
      .slice(1, -1)
      .map((cell) => inlineFormat(cell.trim()));

  const headerCells = parseCells(rows[0]);
  const bodyRows = rows.slice(2).map(parseCells);

  let html = '<div class="table-wrap"><table><thead><tr>';
  html += headerCells.map((cell) => `<th>${cell}</th>`).join("");
  html += "</tr></thead><tbody>";
  html += bodyRows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  html += "</tbody></table></div>";

  return { html, nextIndex: i };
}

function buildCover() {
  return `
    <section class="cover-page">
      <div class="cover-photo"></div>
      <div class="cover-overlay"></div>
      <div class="cover-content">
        <div class="eyebrow">Guia independente</div>
        <h1>${title}</h1>
        <p class="cover-subtitle">${subtitle}</p>
        <p class="cover-summary">Tudo o que você precisa saber sobre autonomia, bateria, carregamento, manutenção, economia e escolha do modelo ideal antes de comprar um carro elétrico ou híbrido.</p>
      </div>
      <div class="cover-footer">
        <span>Material educativo</span>
        <span>Brasil • 2026</span>
      </div>
    </section>
  `;
}

const tocEntries = [];
const body = [];
let i = 0;
let paragraphBuffer = [];
let listBuffer = [];
let blockquoteBuffer = [];
let firstH1Skipped = false;

function flushParagraph() {
  if (!paragraphBuffer.length) return;
  body.push(`<p>${inlineFormat(paragraphBuffer.join(" "))}</p>`);
  paragraphBuffer = [];
}

function flushList() {
  if (!listBuffer.length) return;
  body.push(`<ul>${listBuffer.map((item) => `<li>${inlineFormat(item)}</li>`).join("")}</ul>`);
  listBuffer = [];
}

function flushBlockquote() {
  if (!blockquoteBuffer.length) return;
  body.push(`<blockquote>${blockquoteBuffer.map((item) => `<p>${inlineFormat(item)}</p>`).join("")}</blockquote>`);
  blockquoteBuffer = [];
}

function flushAll() {
  flushParagraph();
  flushList();
  flushBlockquote();
}

while (i < lines.length) {
  const line = lines[i];
  const trimmed = line.trim();

  const table = parseTable(i);
  if (table) {
    flushAll();
    body.push(table.html);
    i = table.nextIndex;
    continue;
  }

  if (!trimmed) {
    flushAll();
    i += 1;
    continue;
  }

  if (trimmed === "---") {
    flushAll();
    body.push('<hr class="section-break">');
    i += 1;
    continue;
  }

  if (trimmed.startsWith(">")) {
    flushParagraph();
    flushList();
    blockquoteBuffer.push(trimmed.replace(/^>\s?/, ""));
    i += 1;
    continue;
  }

  if (trimmed.startsWith("- ")) {
    flushParagraph();
    flushBlockquote();
    listBuffer.push(trimmed.slice(2));
    i += 1;
    continue;
  }

  if (trimmed.startsWith("[ ] ")) {
    flushParagraph();
    flushBlockquote();
    listBuffer.push(trimmed);
    i += 1;
    continue;
  }

  const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
  if (headingMatch) {
    flushAll();
    const level = headingMatch[1].length;
    const text = headingMatch[2].trim();

    if (level === 1 && text === "Capa" && !firstH1Skipped) {
      firstH1Skipped = true;
      i += 1;
      continue;
    }

    const id = slugify(text);
    if (level <= 2 && !text.startsWith("Referências consultadas") && !text.startsWith("Sugestão de identidade")) {
      tocEntries.push({ level, text, id });
    }
    body.push(`<h${level} id="${id}">${inlineFormat(text)}</h${level}>`);
    i += 1;
    continue;
  }

  paragraphBuffer.push(trimmed);
  i += 1;
}

flushAll();

const tocHtml = tocEntries
  .map(
    (entry) =>
      `<li class="toc-level-${entry.level}"><a href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`,
  )
  .join("");

const css = `
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
  }

  :root {
    --ink: #132235;
    --muted: #59697d;
    --line: #dbe4ea;
    --navy: #0c2340;
    --navy-soft: #12365a;
    --green: #26e57c;
    --green-soft: #dafbea;
    --paper: #ffffff;
    --mist: #f4f8fb;
    --shadow: rgba(8, 25, 43, 0.14);
  }

  * {
    box-sizing: border-box;
  }

  html {
    background: #e8edf2;
  }

  body {
    margin: 0;
    color: var(--ink);
    background: var(--paper);
    font-family: "Segoe UI", "Aptos", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.62;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cover-page {
    position: relative;
    min-height: 277mm;
    margin: -18mm -16mm 12mm -16mm;
    overflow: hidden;
    page-break-after: always;
    background:
      linear-gradient(180deg, rgba(8, 22, 40, 0.08), rgba(8, 22, 40, 0.88)),
      linear-gradient(130deg, rgba(14, 35, 62, 0.85), rgba(7, 17, 32, 0.94));
  }

  .cover-photo,
  .cover-overlay {
    position: absolute;
    inset: 0;
  }

  .cover-photo {
    background-image: url("cover-background.png");
    background-size: cover;
    background-position: center center;
    transform: scale(1.03);
    filter: saturate(1.05) contrast(1.05);
  }

  .cover-overlay {
    background:
      radial-gradient(circle at 14% 22%, rgba(38, 229, 124, 0.28), transparent 28%),
      radial-gradient(circle at 82% 20%, rgba(255, 255, 255, 0.12), transparent 24%),
      linear-gradient(180deg, rgba(6, 15, 28, 0.18), rgba(6, 15, 28, 0.88));
  }

  .cover-content {
    position: absolute;
    left: 18mm;
    right: 18mm;
    top: 26mm;
    max-width: 132mm;
    color: white;
  }

  .eyebrow {
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    font-size: 10pt;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .cover-page h1 {
    margin: 18px 0 10px;
    color: white;
    font-size: 31pt;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  .cover-subtitle {
    margin: 0 0 16px;
    max-width: 110mm;
    color: rgba(255, 255, 255, 0.92);
    font-size: 14pt;
    line-height: 1.42;
  }

  .cover-summary {
    max-width: 102mm;
    margin: 0;
    padding: 14px 16px;
    border-left: 3px solid var(--green);
    background: rgba(8, 20, 36, 0.42);
    color: rgba(255, 255, 255, 0.9);
    font-size: 10.5pt;
  }

  .cover-footer {
    position: absolute;
    left: 18mm;
    right: 18mm;
    bottom: 16mm;
    display: flex;
    justify-content: space-between;
    color: rgba(255, 255, 255, 0.82);
    font-size: 9.5pt;
    letter-spacing: 0.03em;
  }

  .toc {
    page-break-after: always;
    margin: 0 0 12mm;
    padding: 10mm 10mm 8mm;
    border-radius: 18px;
    background: linear-gradient(180deg, #f8fbfd, #eef5f9);
    box-shadow: 0 12px 30px var(--shadow);
  }

  .toc-title {
    margin: 0 0 8mm;
    color: var(--navy);
    font-size: 22pt;
    letter-spacing: -0.02em;
  }

  .toc ul {
    margin: 0;
    padding: 0;
    list-style: none;
    columns: 2;
    column-gap: 14mm;
  }

  .toc li {
    margin: 0 0 8px;
    break-inside: avoid;
  }

  .toc a {
    color: var(--ink);
    text-decoration: none;
  }

  .toc-level-1 a {
    font-weight: 700;
  }

  .toc-level-2 {
    padding-left: 10px;
  }

  .content {
    counter-reset: chapter;
  }

  h1, h2, h3 {
    page-break-after: avoid;
    break-after: avoid-page;
    color: var(--navy);
  }

  h1 {
    margin: 16mm 0 6mm;
    padding-top: 4mm;
    border-top: 2px solid var(--line);
    font-size: 22pt;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  h2 {
    margin: 10mm 0 4mm;
    font-size: 15pt;
    line-height: 1.28;
  }

  h1[id^="capitulo-"],
  h1[id^="bonus-"],
  h1[id="conclusao"],
  h1[id="checklist-final-antes-de-comprar"],
  h1[id="referencias-consultadas"] {
    break-before: page;
    page-break-before: always;
  }

  h3 {
    margin: 7mm 0 3mm;
    font-size: 12pt;
    line-height: 1.34;
  }

  p {
    margin: 0 0 4mm;
    orphans: 3;
    widows: 3;
  }

  ul {
    margin: 0 0 4mm 0;
    padding-left: 5mm;
  }

  li {
    margin: 0 0 2.2mm;
  }

  blockquote {
    margin: 6mm 0;
    padding: 5mm 6mm;
    border-left: 4px solid var(--green);
    border-radius: 0 14px 14px 0;
    background: linear-gradient(180deg, #f1fff6, #ebfbf3);
    color: #113526;
    font-weight: 600;
  }

  blockquote p:last-child {
    margin-bottom: 0;
  }

  .table-wrap {
    margin: 5mm 0 7mm;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: 0 10px 22px rgba(7, 21, 35, 0.05);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }

  thead th {
    padding: 10px 12px;
    text-align: left;
    background: linear-gradient(180deg, var(--navy-soft), var(--navy));
    color: white;
    vertical-align: top;
  }

  tbody td {
    padding: 10px 12px;
    border-top: 1px solid var(--line);
    vertical-align: top;
  }

  tbody tr:nth-child(even) td {
    background: var(--mist);
  }

  code {
    padding: 1px 6px;
    border-radius: 999px;
    background: #eff5f8;
    color: var(--navy);
    font-family: "Consolas", "Cascadia Mono", monospace;
    font-size: 0.92em;
  }

  a {
    color: var(--navy-soft);
    text-decoration: none;
  }

  .section-break {
    border: 0;
    height: 1px;
    margin: 7mm 0;
    background: linear-gradient(90deg, transparent, #d6e0e8, transparent);
  }

  .fine-print {
    margin-top: 10mm;
    padding: 5mm 6mm;
    border-radius: 14px;
    background: #f5f8fa;
    color: var(--muted);
    font-size: 9pt;
  }
`;

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>${css}</style>
  </head>
  <body>
    ${buildCover()}
    <section class="toc">
      <h1 class="toc-title">Sumário</h1>
      <ul>${tocHtml}</ul>
    </section>
    <main class="content">
      ${body.join("\n")}
    </main>
    <aside class="fine-print">
      Este PDF foi diagramado a partir de um guia independente, com finalidade educativa. Versões, preços, autonomia, garantia, equipamentos, disponibilidade e regras de mercado podem mudar ao longo do tempo e devem ser confirmados nos canais oficiais antes da compra.
    </aside>
  </body>
</html>`;

fs.writeFileSync(htmlPath, html, "utf8");
console.log(`HTML gerado em: ${htmlPath}`);
