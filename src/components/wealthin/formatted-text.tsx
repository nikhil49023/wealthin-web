
'use client';

import React from 'react';

type FormattedTextProps = {
  html: string;
};

export function FormattedText({ html }: FormattedTextProps) {
  if (typeof html !== 'string') {
    if (html) {
      console.warn('FormattedText component received a non-string prop:', html);
    }
    return null;
  }
  return (
      <div
          className="text-muted-foreground whitespace-pre-line leading-relaxed prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
       />
  );
}
