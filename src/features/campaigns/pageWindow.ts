/**
 * Windowed page-button list: always first, last, and a band around the
 * current page. Kept out of the component so it can be reasoned about (and
 * tested) on its own.
 */
export function pageWindow(page: number, totalPages: number): number[] {
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - 1; p <= page + 1; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}
