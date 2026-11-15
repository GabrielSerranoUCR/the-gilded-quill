import { pageScale, pointOnPage, restoredScrollTop } from './geometry';

describe('pdf geometry', () => {
  it('fits the whole page to the panel, by its tighter side, then applies the zoom', () => {
    const portrait = { width: 600, height: 800 };
    expect(pageScale({ width: 2000, height: 840 }, portrait, 1)).toBeCloseTo(1, 5); // height decides: 840 - 2*20 = 800
    expect(pageScale({ width: 2000, height: 840 }, portrait, 2)).toBeCloseTo(2, 5);
    expect(pageScale({ width: 2000, height: 840 }, portrait, 100)).toBeCloseTo(4, 5); // zoom is capped
    const slide = { width: 800, height: 450 }; // a beamer slide in a tall, narrow panel: width decides
    expect(pageScale({ width: 440, height: 1000 }, slide, 1)).toBeCloseTo(0.5, 5); // (440 - 40) / 800
    expect(pageScale({ width: 1400, height: 490 }, slide, 1)).toBeCloseTo(1, 5); // height decides again: (490 - 40) / 450
  });

  it('turns a click into points from the page corner, and ignores clicks outside it', () => {
    const rect = { left: 100, top: 50, width: 600, height: 800 };
    expect(pointOnPage(250, 150, rect, 2)).toEqual({ x: 75, y: 50 });
    expect(pointOnPage(99, 150, rect, 2)).toBeNull();
    expect(pointOnPage(250, 851, rect, 2)).toBeNull();
    expect(pointOnPage(250, 150, rect, 0)).toBeNull();
  });

  it('keeps the same relative place when the pages change height', () => {
    expect(restoredScrollTop(500, 2000, 4000)).toBe(1000);
    expect(restoredScrollTop(500, 0, 4000)).toBe(0);
  });
});
