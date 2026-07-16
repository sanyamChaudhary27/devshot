import { z } from "zod";

const sourceInputSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  text: z.string().min(1).max(120_000)
}).strict();

export const sourceDossierSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string(),
  normalizedText: z.string(),
  spans: z.array(z.object({
    id: z.string(),
    label: z.string(),
    text: z.string(),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().positive()
  }).strict()).min(1)
}).strict();

export type SourceDossier = z.infer<typeof sourceDossierSchema>;

const normalize = (text: string): string => text
  .replace(/\r\n?/g, "\n")
  .replace(/[^\S\n]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const paragraphBoundaries = (text: string): readonly [number, number][] => {
  const paragraphs = text.split(/\n\s*\n/g);
  const boundaries: [number, number][] = [];
  let cursor = 0;
  for (const paragraph of paragraphs) {
    const start = text.indexOf(paragraph, cursor);
    const end = start + paragraph.length;
    if (paragraph.trim().length > 0) boundaries.push([start, end]);
    cursor = end;
  }
  return boundaries;
};

export const buildSourceDossier = (input: unknown): SourceDossier => {
  const source = sourceInputSchema.parse(input);
  const normalizedText = normalize(source.text);
  if (normalizedText.length === 0) throw new Error("Source material contains no readable text");

  const spans = paragraphBoundaries(normalizedText).flatMap(([startOffset, endOffset], index) => {
    const text = normalizedText.slice(startOffset, endOffset);
    if (text.length <= 12_000) {
      return [{
        id: `${source.sourceId}-span-${index + 1}`,
        label: `Source passage ${index + 1}`,
        text,
        startOffset,
        endOffset
      }];
    }

    const chunks = Math.ceil(text.length / 12_000);
    return Array.from({ length: chunks }, (_, chunkIndex) => {
      const chunkStart = startOffset + chunkIndex * 12_000;
      const chunkEnd = Math.min(endOffset, chunkStart + 12_000);
      return {
        id: `${source.sourceId}-span-${index + 1}-${chunkIndex + 1}`,
        label: `Source passage ${index + 1}.${chunkIndex + 1}`,
        text: normalizedText.slice(chunkStart, chunkEnd),
        startOffset: chunkStart,
        endOffset: chunkEnd
      };
    });
  });

  return sourceDossierSchema.parse({ sourceId: source.sourceId, title: source.title, normalizedText, spans });
};
