const appChromePattern = /^(?:(?:document|dok(?:ument)?)[\w.-]*\s*[-–—]\s*)?(?:microsoft\s+word(?:\.exe)?|word\.exe|libreoffice(?:\s+writer)?|openoffice(?:\s+writer)?|wps(?:\s+office)?|google\s+docs)(?:\s*[-–—]\s*(?:document\d*|dok(?:ument)?\d*|untitled|bez\s+tytułu))?$/i;

export function cleanOcrPage(page, imageHeight) {
  const lines = page.blocks?.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines)) ?? [];
  if (lines.length === 0) return { text: page.text.trim(), ignoredChrome: [] };

  const ignoredChrome = [];
  const text = lines.filter((line) => {
    const lineText = line.text.trim();
    const atTopEdge = imageHeight > 0 && line.bbox.y0 <= imageHeight * 0.14;
    if (atTopEdge && appChromePattern.test(lineText)) {
      ignoredChrome.push(lineText);
      return false;
    }
    return true;
  }).map((line) => line.text).join('\n').trim();

  return { text, ignoredChrome };
}
