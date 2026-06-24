import TurndownService from "turndown";

export function cleanHtml(html) {
	html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
	html = html.replace(/<img[^>]*>/gi, "");
	html = html.replace(/\s+(class|style|id)="[^"]*"/gi, "");
	html = html.replace(/\s+(class|style|id)='[^']*'/gi, "");

	html = html.replace(
		/https:\/\/www\.google\.com\/url\?q=(.*?)&(?:amp;)?sa=D[^"']*/gi,
		(_, encodedUrl) => decodeURIComponent(encodedUrl),
	);

	const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
	if (bodyMatch) {
		html = bodyMatch[1];
	}

	return html;
}

export function createTurndownService() {
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

	return turndown;
}

export function cleanMarkdown(markdown) {
	markdown = markdown.replace(/!\[[^\]]*\]\(data:image[^)]*\)/g, "");
	markdown = markdown.replace(/\n{3,}/g, "\n\n");
	markdown = markdown.replace(/\[\s*\]\(\)/g, "");
	markdown = markdown.replace(/^[\s​]+$/gm, "");
	return markdown;
}

export function convertHtmlToMarkdown(html) {
	const cleaned = cleanHtml(html);
	const turndown = createTurndownService();
	const raw = turndown.turndown(cleaned);
	return cleanMarkdown(raw);
}

export function buildHeader(documentId) {
	return `<!-- このファイルはGoogle Docsから自動生成されています。直接編集しないでください。 -->
<!-- 出典: https://docs.google.com/document/d/${documentId} -->
<!-- 最終更新: ${new Date().toISOString()} -->

`;
}

export function stripHeader(s) {
	return s.replace(/^<!--[\s\S]*?-->\n\n/m, "");
}

export function buildExportUrl(documentId, apiKey) {
	return apiKey
		? `https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=text/html&key=${apiKey}`
		: `https://docs.google.com/document/d/${documentId}/export?format=html`;
}
