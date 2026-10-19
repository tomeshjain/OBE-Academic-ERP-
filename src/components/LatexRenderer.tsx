'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content?: string;
  imageUrl?: string;
  imageCaption?: string;
  className?: string;
}

/**
 * High-performance, crash-safe renderer for academic question statements.
 * Parses inline math ($...$) and display/block math ($$...$$) using KaTeX,
 * and seamlessly handles line breaks and question figures/diagrams.
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({
  content = '',
  imageUrl,
  imageCaption,
  className = '',
}) => {
  const renderedParts = useMemo(() => {
    if (!content) return [];

    // 1. Decode common HTML entities that might have been escaped
    let decoded = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ');

    // 2. Normalize LaTeX delimiter notations: \[ ... \] -> $$ ... $$, \( ... \) -> $ ... $
    decoded = decoded.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
    decoded = decoded.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

    // 3. Regex to split by block math $$...$$ first, then inline math $...$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    const parts = decoded.split(mathRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Block math: $$ ... $$
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const mathExpr = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(mathExpr, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={index}
              className="my-2 py-1 text-center overflow-x-auto select-all"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return (
            <code key={index} className="text-amber-400 font-mono text-xs block my-1">
              {part}
            </code>
          );
        }
      }

      // Inline math: $ ... $
      if (part.startsWith('$') && part.endsWith('$')) {
        const mathExpr = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(mathExpr, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-0.5 select-all align-middle"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return (
            <code key={index} className="text-amber-400 font-mono text-xs">
              {part}
            </code>
          );
        }
      }

      // 4. Auto-detect raw LaTeX commands if not delimited by $
      // e.g. \frac{a}{b}, \sqrt{x}, \int_0^\infty, \sum_{i=1}^n
      const rawLatexRegex = /(\\(?:frac|sqrt|sum|int|iint|iiint|prod|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|phi|omega|partial|nabla|infty|times|div|pm|leq|geq|neq|approx|subset|in|notin|forall|exists|vec|hat|bar|text|mathbf|mathit)\b[^{$\s]*(?:\{[^}]*\})*)/g;
      if (rawLatexRegex.test(part)) {
        const subTokens = part.split(/(\\(?:frac|sqrt|sum|int|prod|lim|alpha|beta|gamma|delta|theta|lambda|omega|partial|infty|times|leq|geq)\b(?:\{[^}]*\})*)/g);
        return (
          <span key={index}>
            {subTokens.map((st, sidx) => {
              if (st.startsWith('\\')) {
                try {
                  const html = katex.renderToString(st, {
                    displayMode: false,
                    throwOnError: false,
                  });
                  return (
                    <span
                      key={sidx}
                      className="inline-block px-0.5 select-all align-middle"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                } catch {
                  return <span key={sidx}>{st}</span>;
                }
              }
              return <span key={sidx} className="whitespace-pre-wrap">{st}</span>;
            })}
          </span>
        );
      }

      // Check for markdown image syntax: ![alt](url)
      const imageMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (imageMatch) {
        const altText = imageMatch[1];
        const src = imageMatch[2];
        return (
          <figure key={index} className="my-3 text-center">
            <img
              src={src}
              alt={altText || 'Question Diagram'}
              className="max-h-60 mx-auto rounded-lg border border-slate-700 bg-white/5 object-contain"
            />
            {altText && (
              <figcaption className="text-[11px] text-slate-400 mt-1 italic font-sans">
                {altText}
              </figcaption>
            )}
          </figure>
        );
      }

      // Plain text with line break preservation
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  }, [content]);

  return (
    <div className={`leading-relaxed text-sm ${className}`}>
      {renderedParts}

      {/* Dedicated Image Attachment */}
      {imageUrl && (
        <figure className="mt-3 text-center">
          <img
            src={imageUrl}
            alt={imageCaption || 'Question Diagram'}
            className="max-h-64 mx-auto rounded-xl border border-slate-700/80 bg-slate-950 p-1 object-contain shadow-md"
          />
          {imageCaption && (
            <figcaption className="text-xs text-slate-400 mt-1.5 font-medium italic">
              {imageCaption}
            </figcaption>
          )}
        </figure>
      )}
    </div>
  );
};
