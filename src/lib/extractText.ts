import { cleanExtractedText } from "./customPassage";

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".markdown", ".pdf", ".csv"];

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function acceptedFileLabel(): string {
  return ".txt, .md, .pdf, .csv";
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".csv") ||
    file.type.startsWith("text/")
  ) {
    const text = await file.text();
    return cleanExtractedText(text);
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(file);
  }

  throw new Error("Unsupported file type. Upload a .txt, .md, .pdf, or .csv file.");
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const maxPages = Math.min(doc.numPages, 8);
  const chunks: string[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    chunks.push(pageText);
  }

  const text = cleanExtractedText(chunks.join(" "));
  if (!text) {
    throw new Error(
      "Couldn't find readable text in that PDF. Try a text-based PDF (not a scanned image).",
    );
  }
  return text;
}
