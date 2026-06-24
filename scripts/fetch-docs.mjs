import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildExportUrl,
	buildHeader,
	convertHtmlToMarkdown,
	splitMarkdownByPages,
	stripHeader,
} from "./html-to-markdown.mjs";

const DOCUMENT_ID = "1b0GAEADYCefXw4GZNTO6mktZDhZ-hno7QIziqh54W4I";
const API_KEY = process.env.GOOGLE_API_KEY;

const __dirname = dirname(fileURLToPath(import.meta.url));
const referencesDir = join(
	__dirname,
	"..",
	"skills",
	"conference-organizing-knowledge-skill",
	"references",
);

const exportUrl = buildExportUrl(DOCUMENT_ID, API_KEY);

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

const html = await response.text();
console.log(`Fetched HTML: ${html.length} chars`);

const markdown = convertHtmlToMarkdown(html);
const pages = splitMarkdownByPages(markdown);
console.log(`Split into ${pages.length} pages`);

if (!existsSync(referencesDir)) {
	mkdirSync(referencesDir, { recursive: true });
}

const header = buildHeader(DOCUMENT_ID);
const generatedFiles = new Set();
let changedCount = 0;

for (const page of pages) {
	const filename = `${page.slug}.md`;
	const filePath = join(referencesDir, filename);
	const output = header + page.content;

	generatedFiles.add(filename);

	let existing = "";
	try {
		existing = readFileSync(filePath, "utf-8");
	} catch {}

	if (stripHeader(existing) === stripHeader(output)) {
		continue;
	}

	writeFileSync(filePath, output, "utf-8");
	console.log(`Written: ${filename} (${output.length} chars)`);
	changedCount++;
}

const existingFiles = readdirSync(referencesDir).filter((f) =>
	f.endsWith(".md"),
);
for (const file of existingFiles) {
	if (!generatedFiles.has(file)) {
		rmSync(join(referencesDir, file));
		console.log(`Removed: ${file}`);
		changedCount++;
	}
}

if (changedCount === 0) {
	console.log("No content changes detected.");
}
