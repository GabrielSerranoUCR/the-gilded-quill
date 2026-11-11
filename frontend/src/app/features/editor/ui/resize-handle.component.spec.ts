import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResizeHandleComponent } from './resize-handle.component';

// frames are driven by hand: the handle applies at most one resize per frame
let frames: FrameRequestCallback[] = [];
const flush = () => {
  const run = frames;
  frames = [];
  run.forEach((f) => f(0));
};

function setup(over: { orientation?: 'col' | 'row'; sign?: 1 | -1; value?: number } = {}) {
  const fixture = TestBed.createComponent(ResizeHandleComponent);
  fixture.componentRef.setInput('orientation', over.orientation ?? 'col');
  fixture.componentRef.setInput('sign', over.sign ?? 1);
  fixture.componentRef.setInput('value', over.value ?? 300);
  fixture.componentRef.setInput('min', 160);
  fixture.componentRef.setInput('max', 480);
  fixture.componentRef.setInput('label', 'Resize the thing');
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const grip = host.querySelector('.grip') as HTMLElement;
  const sizes: number[] = [];
  const resets: number[] = [];
  fixture.componentInstance.resize.subscribe((v) => sizes.push(v));
  fixture.componentInstance.reset.subscribe(() => resets.push(1));
  const key = (k: string, shiftKey = false) => grip.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true }));
  const pointer = (type: string, x: number, y: number, id = 1) => {
    const e = new Event(type, { bubbles: true, cancelable: true }) as any;
    Object.assign(e, { pointerId: id, clientX: x, clientY: y, button: 0 });
    grip.dispatchEvent(e);
  };
  grip.setPointerCapture = () => undefined;
  grip.releasePointerCapture = () => undefined;
  return { fixture, host, grip, sizes, resets, key, pointer };
}

describe('ResizeHandleComponent', () => {
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is an accessible separator with its value and limits', () => {
    const { grip } = setup();
    expect(grip.getAttribute('role')).toBe('separator');
    expect(grip.getAttribute('aria-orientation')).toBe('vertical');
    expect(grip.getAttribute('aria-label')).toBe('Resize the thing');
    expect([grip.getAttribute('aria-valuenow'), grip.getAttribute('aria-valuemin'), grip.getAttribute('aria-valuemax')]).toEqual(['300', '160', '480']);
    expect(grip.tabIndex).toBe(0);
    expect(setup({ orientation: 'row' }).grip.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('dragging towards the end grows a panel before the handle and shrinks one after it', () => {
    const before = setup({ sign: 1 });
    before.pointer('pointerdown', 100, 0);
    before.pointer('pointermove', 140, 0);
    flush();
    before.pointer('pointermove', 90, 0);
    flush();
    expect(before.sizes).toEqual([340, 290]);

    const after = setup({ sign: -1 });
    after.pointer('pointerdown', 500, 0);
    after.pointer('pointermove', 460, 0);
    flush();
    expect(after.sizes).toEqual([340]);
  });

  it('applies only the latest of many moves within one frame, and the last one on release', () => {
    const { pointer, sizes } = setup();
    pointer('pointerdown', 100, 0);
    for (const x of [110, 120, 130, 140]) pointer('pointermove', x, 0);
    expect(sizes).toEqual([]);
    flush();
    expect(sizes).toEqual([340]);
    pointer('pointermove', 150, 0);
    pointer('pointerup', 150, 0); // released before the frame came: nothing is lost
    expect(sizes).toEqual([340, 350]);
    flush();
    expect(sizes).toEqual([340, 350]);
  });

  it('measures a row handle on the vertical axis and ignores other pointers and moves after release', () => {
    const { pointer, sizes } = setup({ orientation: 'row', sign: -1, value: 170 });
    pointer('pointerdown', 0, 500);
    pointer('pointermove', 999, 450); // x is irrelevant
    pointer('pointermove', 0, 400, 2); // another finger
    pointer('pointerup', 0, 450);
    pointer('pointermove', 0, 300);
    expect(sizes).toEqual([220]);
  });

  it('shows the size while dragging', () => {
    const { fixture, host, pointer } = setup();
    expect(host.querySelector('.tip')).toBeNull();
    pointer('pointerdown', 10, 0);
    fixture.detectChanges();
    expect(host.querySelector('.tip')!.textContent).toContain('Drag to resize · 300 px');
    pointer('pointerup', 10, 0);
    fixture.detectChanges();
    expect(host.querySelector('.tip')).toBeNull();
  });

  it('steps with the arrow keys (shift for more), following the screen direction', () => {
    const a = setup({ sign: 1 });
    a.key('ArrowRight');
    a.key('ArrowLeft', true);
    expect(a.sizes).toEqual([316, 236]);
    const b = setup({ sign: -1 });
    b.key('ArrowLeft'); // moving the handle left makes a panel on its right bigger
    expect(b.sizes).toEqual([316]);
    const row = setup({ orientation: 'row', sign: -1 });
    row.key('ArrowUp');
    row.key('ArrowLeft'); // wrong axis: ignored
    expect(row.sizes).toEqual([316]);
  });

  it('jumps to the limits with Home and End, and resets with Enter or a double click', () => {
    const { grip, key, sizes, resets } = setup();
    key('Home');
    key('End');
    expect(sizes).toEqual([160, 480]);
    key('Enter');
    grip.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(resets).toHaveLength(2);
    key('a');
    expect(sizes).toHaveLength(2);
  });
});
