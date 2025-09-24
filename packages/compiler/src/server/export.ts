import { createHash } from 'node:crypto';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { DocumentModel, ExportRecipe } from '@moduprompt/types';
import type { CompileResult, ProvenanceEntry } from '../types.js';

export interface HtmlRenderOptions {
  document: DocumentModel;
  result: CompileResult;
  themeHref?: string;
}

export interface HtmlRenderContext {
  html: string;
  contentHash: string;
}

export const renderHtml = (options: HtmlRenderOptions): HtmlRenderContext => {
  const sanitized = sanitizeHtml(marked.parse(options.result.markdown, { gfm: true }) as string, {
    allowedTags: [
      'p',
      'a',
      'span',
      'div',
      'strong',
      'em',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img',
      'hr',
      'br',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      pre: ['class'],
      span: ['class'],
      div: ['class'],
      th: ['scope'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    transformTags: {
      a(tagName, attribs) {
        const attrs = { ...attribs };
        if ('target' in attrs && attrs.target === '_blank') {
          attrs.rel = 'noopener noreferrer';
        }
        return { tagName, attribs: attrs };
      },
    },
  });

  const escape = (value: string): string => value.replace(/[&<>\"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return char;
    }
  });

  const styles = `:root { color-scheme: light dark; }
body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; margin: 0; padding: 2.5rem; background: #ffffff; color: #111827; }
@media (prefers-color-scheme: dark) { body { background: #0f172a; color: #f8fafc; } }
article.moduprompt-export { max-width: 80ch; margin: 0 auto; }
pre { overflow: auto; padding: 1rem; background: rgba(15, 23, 42, 0.04); border-radius: 0.5rem; }
code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
blockquote { border-left: 4px solid rgba(59, 130, 246, 0.4); margin: 1.5rem 0; padding-left: 1rem; color: inherit; }
table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
th, td { border: 1px solid rgba(148, 163, 184, 0.4); padding: 0.75rem; text-align: left; }
img { max-width: 100%; height: auto; }
`;

  const provenancePayload = Buffer.from(JSON.stringify(options.result.provenance ?? []), 'utf8').toString('base64');
  const csp = "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escape(options.document.title)}</title>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="moduprompt:document-id" content="${escape(options.document.id)}" />
<meta name="moduprompt:export-hash" content="${options.result.hash}" />
<meta name="moduprompt:provenance" content="${provenancePayload}" />
${options.themeHref ? `<link rel="stylesheet" href="${escape(options.themeHref)}" />` : ''}
<style>${styles}</style>
</head>
<body>
<article class="moduprompt-export">
${sanitized}
</article>
</body>
</html>`;

  const contentHash = createHash('sha256').update(html).digest('hex');
  return {
    html,
    contentHash,
  } satisfies HtmlRenderContext;
};

export interface ExportArtifact {
  body: Buffer;
  contentType: string;
  extension: string;
  metadata: Record<string, string>;
}

export interface PdfRendererOptions {
  signal?: AbortSignal;
  timeoutMs: number;
  pdf?: ExportRecipe['pdf'];
}

export interface PdfRenderer {
  render(html: string, options: PdfRendererOptions): Promise<Buffer>;
}

export interface BuildArtifactOptions {
  document: DocumentModel;
  recipe: ExportRecipe;
  result: CompileResult;
  pdfRenderer?: PdfRenderer;
  pdfOptions?: PdfRendererOptions;
}

const hashBuffer = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex');

const baseMetadata = (
  result: CompileResult,
  provenance: ProvenanceEntry[],
): Record<string, string> => ({
  documentId: result.documentId,
  provenanceCount: String(provenance.length),
  compileHash: result.hash,
});

export const buildArtifact = async (options: BuildArtifactOptions): Promise<ExportArtifact> => {
  const provenance = options.result.provenance ?? [];
  switch (options.recipe.type) {
    case 'markdown': {
      const body = Buffer.from(options.result.markdown, 'utf8');
      return {
        body,
        contentType: 'text/markdown; charset=utf-8',
        extension: 'md',
        metadata: {
          ...baseMetadata(options.result, provenance),
          artifactHash: hashBuffer(body),
        },
      } satisfies ExportArtifact;
    }
    case 'text': {
      const body = Buffer.from(options.result.text, 'utf8');
      return {
        body,
        contentType: 'text/plain; charset=utf-8',
        extension: 'txt',
        metadata: {
          ...baseMetadata(options.result, provenance),
          artifactHash: hashBuffer(body),
        },
      } satisfies ExportArtifact;
    }
    case 'html': {
      const rendered = renderHtml({
        document: options.document,
        result: options.result,
        themeHref: options.recipe.theme,
      });
      const body = Buffer.from(rendered.html, 'utf8');
      return {
        body,
        contentType: 'text/html; charset=utf-8',
        extension: 'html',
        metadata: {
          ...baseMetadata(options.result, provenance),
          artifactHash: hashBuffer(body),
          htmlHash: rendered.contentHash,
        },
      } satisfies ExportArtifact;
    }
    case 'pdf': {
      if (!options.pdfRenderer) {
        throw new Error('PDF renderer is not configured.');
      }
      const rendered = renderHtml({
        document: options.document,
        result: options.result,
        themeHref: options.recipe.theme,
      });
      const pdfBuffer = await options.pdfRenderer.render(rendered.html, options.pdfOptions ?? { timeoutMs: 120000 });
      return {
        body: pdfBuffer,
        contentType: 'application/pdf',
        extension: 'pdf',
        metadata: {
          ...baseMetadata(options.result, provenance),
          artifactHash: hashBuffer(pdfBuffer),
          htmlHash: rendered.contentHash,
        },
      } satisfies ExportArtifact;
    }
    default: {
      const exhaustive: never = options.recipe.type;
      throw new Error(`Unsupported export recipe type: ${exhaustive}`);
    }
  }
};
