import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { archiveName, buildArchive, downloadName } from './zip-export';

describe('downloadName', () => {
  it('keeps the scroll name as it is written, and only drops what a file name cannot hold', () => {
    expect(downloadName('Trabajo_Asincrónico_V', 'pdf')).toBe('Trabajo_Asincrónico_V.pdf');
    expect(downloadName('Thesis – Chapter 4', 'zip')).toBe('Thesis – Chapter 4.zip');
    expect(downloadName('  Café   déjà vu  ', 'pdf')).toBe('Café déjà vu.pdf');
    expect(downloadName('a/b\\c:d*e?"f<g>h|i', 'pdf')).toBe('a b c d e f g h i.pdf');
  });
  it('never makes a hidden or Windows-hostile name, and always has something', () => {
    expect(downloadName('.hidden', 'pdf')).toBe('hidden.pdf');
    expect(downloadName('ends with dots...', 'pdf')).toBe('ends with dots.pdf');
    expect(downloadName('', 'pdf')).toBe('scroll.pdf');
    expect(downloadName(null, 'zip')).toBe('scroll.zip');
    expect(downloadName('x'.repeat(200), 'pdf').length).toBe(124);
  });
  it('names the archive after the scroll', () => {
    expect(archiveName('Mi Tesis')).toBe('Mi Tesis.zip');
  });
});

describe('buildArchive', () => {
  const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

  it('holds every text file and picture at its own path, byte for byte', () => {
    const zip = unzipSync(
      buildArchive(
        [
          { path: 'main.tex', text: 'Hola ¿qué tal? ✓\n' },
          { path: 'chapters/intro.tex', text: 'x' },
        ],
        [{ path: 'figures/orbit.png', bytes: png }],
      ),
    );
    expect(Object.keys(zip).sort()).toEqual(['chapters/intro.tex', 'figures/orbit.png', 'main.tex']);
    expect(strFromU8(zip['main.tex'])).toBe('Hola ¿qué tal? ✓\n');
    expect(Array.from(zip['figures/orbit.png'])).toEqual(Array.from(png));
  });

  it('keeps tables that hold nothing as empty folders, but not the ones that hold files', () => {
    const zip = unzipSync(buildArchive([{ path: 'chapters/a.tex', text: 'x' }], [], ['drafts', 'chapters']));
    expect(Object.keys(zip).sort()).toEqual(['chapters/a.tex', 'drafts/']);
    expect(zip['drafts/'].length).toBe(0);
  });

  it('is a valid, empty archive for an empty scroll', () => {
    expect(Object.keys(unzipSync(buildArchive([], [])))).toEqual([]);
  });
});
