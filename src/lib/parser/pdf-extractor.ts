export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageContent {
  pageNumber: number;
  items: TextItem[];
  width: number;
  height: number;
}

export interface ExtractedPDF {
  pages: PageContent[];
  fullText: string;
}

/**
 * Extracts text content from a PDF file with position information
 * Uses dynamic import to avoid SSR issues with pdfjs-dist
 */
export async function extractPDFContent(
  file: ArrayBuffer
): Promise<ExtractedPDF> {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");

  // Set up the worker using unpkg CDN which mirrors npm packages
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: file }).promise;
  const pages: PageContent[] = [];
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];

    for (const item of textContent.items) {
      if ("str" in item && item.str.trim()) {
        const transform = item.transform;
        items.push({
          text: item.str,
          x: transform[4],
          y: viewport.height - transform[5], // Flip Y coordinate
          width: item.width,
          height: item.height,
        });
        fullText += item.str + " ";
      }
    }

    // Sort items by Y position (top to bottom), then X position (left to right)
    items.sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) < 5) {
        // Same line (within 5 units)
        return a.x - b.x;
      }
      return yDiff;
    });

    pages.push({
      pageNumber: i,
      items,
      width: viewport.width,
      height: viewport.height,
    });

    fullText += "\n--- PAGE BREAK ---\n";
  }

  return { pages, fullText };
}

/**
 * Groups text items into lines based on Y position
 */
export function groupIntoLines(
  items: TextItem[],
  tolerance: number = 5
): TextItem[][] {
  if (items.length === 0) return [];

  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [items[0]];
  let currentY = items[0].y;

  for (let i = 1; i < items.length; i++) {
    const item = items[i];

    if (Math.abs(item.y - currentY) <= tolerance) {
      // Same line
      currentLine.push(item);
    } else {
      // New line
      // Sort current line by X position
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = [item];
      currentY = item.y;
    }
  }

  // Don't forget the last line
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Converts a line of text items to a single string
 */
export function lineToString(items: TextItem[]): string {
  return items.map((item) => item.text).join(" ");
}

/**
 * Extracts text within a specific X-coordinate range (column)
 */
export function extractColumn(
  items: TextItem[],
  minX: number,
  maxX: number
): TextItem[] {
  return items.filter(
    (item) => item.x >= minX && item.x + item.width <= maxX + 50
  );
}
