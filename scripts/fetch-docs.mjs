import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildExportUrl,
	buildHeader,
	convertHtmlToMarkdown,
	stripHeader,
} from "./html-to-markdown.mjs";

const DOCUMENT_ID = "1b0GAEADYCefXw4GZNTO6mktZDhZ-hno7QIziqh54W4I";
const API_KEY = process.env.GOOGLE_API_KEY;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(
	__dirname,
	"..",
	"skills",
	"conference-organizing-knowledge",
	"references",
	"conference-organizing.md",
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
const header = buildHeader(DOCUMENT_ID);
const output = header + markdown;

let existing = "";
try {
	existing = readFileSync(outputPath, "utf-8");
} catch {}

if (stripHeader(existing) === stripHeader(output)) {
	console.log("No content changes detected, skipping write.");
	process.exit(0);
}

writeFileSync(outputPath, output, "utf-8");
console.log(`Written: ${outputPath} (${output.length} chars)`);
