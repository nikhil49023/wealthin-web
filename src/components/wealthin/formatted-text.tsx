
'use client';

import React from 'react';

type FormattedTextProps = {
  text: string;
};

export function FormattedText({ text }: FormattedTextProps) {
  if (typeof text !== 'string') {
    if (text) {
      console.warn('FormattedText component received a non-string prop:', text);
    }
    return null;
  }

  // Use dangerouslySetInnerHTML to render HTML content from the AI
  if (text.includes('<p>') || text.includes('<h3>') || text.includes('<ul>')) {
      return (
          <div
              className="text-muted-foreground whitespace-pre-line leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: text }}
           />
      );
  }

  // Fallback for plain text with special formatting
  const urlRegex = /(https?:\/\/[^\s)]+[^\s.,!?)\]])/g;
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]|https?:\/\/[^\s]+)/g).filter(Boolean);

  const formattedParts = parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (urlRegex.test(part)) {
       const urls = part.match(urlRegex) || [];
        if (urls.length > 0) {
             const url = urls[0];
             const [before, ...after] = part.split(url);
             return (
                <React.Fragment key={index}>
                    {before}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-primary/80 break-words"
                    >
                        {url}
                    </a>
                    {after.join(url)}
                </React.Fragment>
             );
        }
    }

    const lines = part.split('\n').map((line, lineIndex) => (
      <React.Fragment key={lineIndex}>
        {line}
        {lineIndex < part.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));

    return <React.Fragment key={index}>{lines}</React.Fragment>;
  });

  return (
    <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
      {formattedParts}
    </div>
  );
}
