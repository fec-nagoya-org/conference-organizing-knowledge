import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import TurndownService from "turndown";

const DOCUMENT_ID = "1b0GAEADYCefXw4GZNTO6mktZDhZ-hno7QIziqh54W4I";
const API_KEY = process.env.GOOGLE_API_KEY;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(
  __dirname,
  "..",
  "references",
  "conference-organizing.md",
);

const exportUrl = API_KEY
  ? `https://www.googleapis.com/drive/v3/files/${DOCUMENT_ID}/export?mimeType=text/html&key=${API_KEY}`
  : `https://docs.google.com/document/d/${DOCUMENT_ID}/export?format=html`;

console.log(
  `Fetching document ${API_KEY ? "via Drive API" : "via public export URL"}...`,
);

const response = await fetch(exportUrl);

if (!response.ok) {
  const errorText = await response.text();
  console.error(
    `Failed to fetch document: ${response.status} ${response.statusText}`,
  );
  console.error(errorText);
  process.exit(1);
}

let html = await response.text();
console.log(`Fetched HTML: ${html.length} chars`);

html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
html = html.replace(/<img[^>]*>/gi, "");
html = html.replace(/\s+(class|style|id)="[^"]*"/gi, "");
html = html.replace(/\s+(class|style|id)='[^']*'/gi, "");

const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (bodyMatch) {
  html = bodyMatch[1];
}

console.log(`Cleaned HTML: ${html.length} chars`);

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.addRule("removeEmptyLinks", {
  filter: (node) => node.nodeName === "A" && !node.getAttribute("href"),
  replacement: () => "",
});

turndown.addRule("skipImages", {
  filter: "img",
  replacement: () => "",
});

let markdown = turndown.turndown(html);

markdown = markdown.replace(/!\[[^\]]*\]\(data:image[^)]*\)/g, "");
markdown = markdown.replace(/\n{3,}/g, "\n\n");
markdown = markdown.replace(/\[\s*\]\(\)/g, "");
markdown = markdown.replace(/^[\s​]+$/gm, "");

const header = `<!-- このファイルはGoogle Docsから自動生成されています。直接編集しないでください。 -->
<!-- 出典: https://docs.google.com/document/d/${DOCUMENT_ID} -->
<!-- 最終更新: ${new Date().toISOString()} -->

`;

writeFileSync(outputPath, header + markdown, "utf-8");
console.log(`Written: ${outputPath} (${(header + markdown).length} chars)`);
