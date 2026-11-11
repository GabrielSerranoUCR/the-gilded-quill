import { type Zippable, strToU8, zipSync } from 'fflate';

/**
 * A download's file name from the scroll's title, as the scroll is called: spaces, accents and capitals stay,
 * only what no file name may hold (\ / : * ? " < > | and control characters) goes.
 * "Trabajo_Asincrónico_V" gives "Trabajo_Asincrónico_V.pdf".
 */
export function downloadName(title: string | null | undefined, ext: string): string {
  const base = (title ?? '')
    .replace(/[\u0000-\u001f\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/^\.+|[. ]+$/g, ''); // no leading dots (hidden file), no trailing dots or spaces (Windows drops them)
  return `${base || 'scroll'}.${ext}`;
}

/** The archive of a scroll: its title plus ".zip". */
export const archiveName = (title: string): string => downloadName(title, 'zip');

/**
 * Every file of a scroll as a .zip, folders and all: text files as written, pictures and PDFs as bytes, and
 * tables (folders) that hold nothing as empty folders, so importing it again gives the same scroll back.
 */
export function buildArchive(texts: ReadonlyArray<{ path: string; text: string }>, assets: ReadonlyArray<{ path: string; bytes: Uint8Array }>, emptyFolders: readonly string[] = []): Uint8Array {
  const entries: Zippable = {};
  for (const f of texts) entries[f.path] = strToU8(f.text);
  // pictures and PDFs are already compressed: stored as they are
  for (const a of assets) entries[a.path] = [a.bytes, { level: 0 }];
  const hasFiles = new Set(Object.keys(entries).flatMap((p) => p.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))));
  for (const dir of emptyFolders) if (!hasFiles.has(dir)) entries[`${dir}/`] = new Uint8Array();
  return zipSync(entries, { level: 6 });
}
