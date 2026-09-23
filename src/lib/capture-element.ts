// Renders a DOM node to a PNG and downloads it — shared by the Broadcast
// and Rich Menu preview panels. Uses modern-screenshot (SVG
// foreignObject-based) rather than html2canvas, which re-implements CSS
// color parsing itself and hard-fails on this Tailwind v4 theme's
// oklch()/lab() custom properties instead of rendering through the
// browser's own engine.
export async function captureElementAsPng(element: HTMLElement, filename: string, scale = 2): Promise<void> {
  const { domToPng } = await import("modern-screenshot");
  const dataUrl = await domToPng(element, { scale });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  // Some browsers only reliably trigger the download when the anchor is
  // actually attached to the document at click time.
  document.body.appendChild(a);
  a.click();
  a.remove();
}
