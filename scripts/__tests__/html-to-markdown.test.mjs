import { describe, expect, it } from "vitest";
import {
	buildExportUrl,
	cleanHtml,
	cleanMarkdown,
	convertHtmlToMarkdown,
	stripHeader,
} from "../html-to-markdown.mjs";

describe("cleanHtml", () => {
	it("styleタグを除去する", () => {
		const html = '<style type="text/css">.c1{color:red}</style><p>hello</p>';
		expect(cleanHtml(html)).toBe("<p>hello</p>");
	});

	it("複数のstyleタグを除去する", () => {
		const html = "<style>.a{}</style><p>text</p><style>.b{}</style><p>more</p>";
		expect(cleanHtml(html)).toBe("<p>text</p><p>more</p>");
	});

	it("imgタグを除去する", () => {
		const html =
			'<p>before</p><img src="data:image/png;base64,abc"/><p>after</p>';
		expect(cleanHtml(html)).toBe("<p>before</p><p>after</p>");
	});

	it("class/style/id属性を除去する", () => {
		const html = '<p class="c1" style="color:red" id="p1">text</p>';
		expect(cleanHtml(html)).toBe("<p>text</p>");
	});

	it("シングルクォートの属性も除去する", () => {
		const html = "<p class='c1' style='color:red'>text</p>";
		expect(cleanHtml(html)).toBe("<p>text</p>");
	});

	it("Google redirect URLを実際のURLに変換する", () => {
		const html =
			'<a href="https://www.google.com/url?q=https://example.com/page&amp;sa=D&amp;source=editors&amp;ust=123&amp;usg=abc">link</a>';
		expect(cleanHtml(html)).toBe('<a href="https://example.com/page">link</a>');
	});

	it("エンコードされたURLパラメータをデコードする", () => {
		const html =
			'<a href="https://www.google.com/url?q=https://example.com/path%3Fparam%3Dvalue&amp;sa=D&amp;source=editors&amp;ust=999&amp;usg=xyz">link</a>';
		expect(cleanHtml(html)).toBe(
			'<a href="https://example.com/path?param=value">link</a>',
		);
	});

	it("複数のGoogle redirect URLを全て変換する", () => {
		const html = [
			'<a href="https://www.google.com/url?q=https://a.com&amp;sa=D&amp;ust=1&amp;usg=x">a</a>',
			'<a href="https://www.google.com/url?q=https://b.com&amp;sa=D&amp;ust=2&amp;usg=y">b</a>',
		].join("");
		const result = cleanHtml(html);
		expect(result).toContain('href="https://a.com"');
		expect(result).toContain('href="https://b.com"');
		expect(result).not.toContain("google.com/url");
	});

	it("bodyタグの中身だけを抽出する", () => {
		const html =
			"<html><head><title>doc</title></head><body><p>content</p></body></html>";
		expect(cleanHtml(html)).toBe("<p>content</p>");
	});

	it("bodyタグがない場合はそのまま返す", () => {
		const html = "<p>no body tag</p>";
		expect(cleanHtml(html)).toBe("<p>no body tag</p>");
	});
});

describe("cleanMarkdown", () => {
	it("data:image形式の画像参照を除去する", () => {
		const md = "text\n![alt](data:image/png;base64,abc123)\nmore";
		expect(cleanMarkdown(md)).toBe("text\n\nmore");
	});

	it("3行以上の連続空行を2行に正規化する", () => {
		const md = "a\n\n\n\nb";
		expect(cleanMarkdown(md)).toBe("a\n\nb");
	});

	it("空のリンク []() を除去する", () => {
		const md = "before[]()after";
		expect(cleanMarkdown(md)).toBe("beforeafter");
	});

	it("空白のみの行をトリムする", () => {
		const md = "line1\n   \nline2";
		expect(cleanMarkdown(md)).toBe("line1\n\nline2");
	});
});

describe("convertHtmlToMarkdown", () => {
	it("HTMLをMarkdownに変換する", () => {
		const html = "<body><h1>Title</h1><p>paragraph</p></body>";
		const result = convertHtmlToMarkdown(html);
		expect(result).toContain("# Title");
		expect(result).toContain("paragraph");
	});

	it("リンクを保持する", () => {
		const html = '<body><a href="https://example.com">Example</a></body>';
		const result = convertHtmlToMarkdown(html);
		expect(result).toContain("[Example](https://example.com)");
	});

	it("リストをMarkdown形式に変換する", () => {
		const html = "<body><ul><li>item1</li><li>item2</li></ul></body>";
		const result = convertHtmlToMarkdown(html);
		expect(result).toMatch(/-\s+item1/);
		expect(result).toMatch(/-\s+item2/);
	});

	it("hrefなしのaタグを除去する", () => {
		const html = "<body><a>empty link</a><p>text</p></body>";
		const result = convertHtmlToMarkdown(html);
		expect(result).not.toContain("empty link");
		expect(result).toContain("text");
	});

	it("Google Docs形式のHTMLを正しく処理する", () => {
		const html = [
			"<html><head><style>.c1{font-weight:bold}</style></head>",
			'<body class="doc-content">',
			'<h1 class="c1" id="h.abc">タイトル</h1>',
			'<p class="c2" style="margin:0">本文テキスト</p>',
			'<a href="https://www.google.com/url?q=https://example.com&amp;sa=D&amp;source=editors&amp;ust=12345&amp;usg=abcdef">リンク</a>',
			'<img src="data:image/png;base64,iVBOR..." />',
			"</body></html>",
		].join("");
		const result = convertHtmlToMarkdown(html);

		expect(result).toContain("# タイトル");
		expect(result).toContain("本文テキスト");
		expect(result).toContain("[リンク](https://example.com)");
		expect(result).not.toContain("google.com/url");
		expect(result).not.toContain("data:image");
		expect(result).not.toContain("c1");
		expect(result).not.toContain("font-weight");
	});
});

describe("stripHeader", () => {
	it("自動生成ヘッダーを除去する", () => {
		const content =
			"<!-- このファイルは自動生成 -->\n<!-- 出典: ... -->\n<!-- 最終更新: 2024-01-01 -->\n\n# Content";
		expect(stripHeader(content)).toBe("# Content");
	});

	it("ヘッダーがない場合はそのまま返す", () => {
		expect(stripHeader("# Content")).toBe("# Content");
	});
});

describe("buildExportUrl", () => {
	it("APIキーなしの場合はpublic export URLを返す", () => {
		const url = buildExportUrl("DOC_ID", undefined);
		expect(url).toBe(
			"https://docs.google.com/document/d/DOC_ID/export?format=html",
		);
	});

	it("APIキーありの場合はDrive API URLを返す", () => {
		const url = buildExportUrl("DOC_ID", "KEY123");
		expect(url).toBe(
			"https://www.googleapis.com/drive/v3/files/DOC_ID/export?mimeType=text/html&key=KEY123",
		);
	});
});
