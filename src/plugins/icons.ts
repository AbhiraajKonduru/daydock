// One icon family for every plugin widget. The Markdown source keeps its plain
// glyphs so a page still reads outside Daydock; these are what the rendered card
// shows, so the app never mixes colour emoji into a monochrome interface.

export type PluginIconName = "timer" | "clock" | "gauge" | "file" | "file-plus" | "command";

const SVG_NS = "http://www.w3.org/2000/svg";

const ICON_PATHS: Record<PluginIconName, string[]> = {
  // Stopwatch: crown, body, and a hand resting at the twelve-to-three sweep.
  timer: ["M4.8 1.3h2.4", "M6 3.3a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4", "M6 5.3v2.2h1.8"],
  // Plain clock face for time that is committed but not counted down.
  clock: ["M6 1.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8", "M6 3.5v2.5h2"],
  // Dial with a needle, for a page-level reading rather than a single duration.
  gauge: ["M1.7 8.7a4.7 4.7 0 0 1 8.6 0", "M6 8.7 8.3 5.7"],
  // A page with ruled lines, for linking to another document.
  file: ["M3.2 1.4h3.9l2.2 2.2v6.4a.6.6 0 0 1-.6.6H3.2a.6.6 0 0 1-.6-.6V2a.6.6 0 0 1 .6-.6", "M7 1.4v2.3h2.3", "M4.3 6.2h3.4", "M4.3 8.2h3.4"],
  // The same page with a plus, for a document that does not exist yet.
  "file-plus": ["M3.2 1.4h3.9l2.2 2.2v6.4a.6.6 0 0 1-.6.6H3.2a.6.6 0 0 1-.6-.6V2a.6.6 0 0 1 .6-.6", "M7 1.4v2.3h2.3", "M6 5.4v3.4", "M4.3 7.1h3.4"],
  // A slash in a rounded square, for a command with no icon of its own.
  command: ["M2.6 1.5h6.8a1.1 1.1 0 0 1 1.1 1.1v6.8a1.1 1.1 0 0 1-1.1 1.1H2.6a1.1 1.1 0 0 1-1.1-1.1V2.6a1.1 1.1 0 0 1 1.1-1.1", "M7.2 3.9 4.8 8.1"],
};

export function pluginIcon(name: PluginIconName): SVGSVGElement {
  const svg = globalThis.document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "card-icon");
  svg.setAttribute("viewBox", "0 0 12 12");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.1");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const definition of ICON_PATHS[name]) {
    const path = globalThis.document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", definition);
    svg.append(path);
  }
  return svg;
}
