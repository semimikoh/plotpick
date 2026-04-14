export interface FontDescriptor {
  family: string;
  size: number;
  weight: number;
  style: "normal" | "italic";
}

export function fontToKey(font: FontDescriptor): string {
  return `${font.style} ${font.weight} ${font.size}px ${font.family}`;
}

export interface MeasureCache {
  get(font: FontDescriptor, text: string): number | undefined;
  set(font: FontDescriptor, text: string, width: number): void;
  clear(): void;
  readonly size: number;
}

const MAX_ENTRIES = 2000;

export function createCache(): MeasureCache {
  const map = new Map<string, number>();

  function makeKey(font: FontDescriptor, text: string): string {
    return `${fontToKey(font)}\x00${text}`;
  }

  return {
    get(font, text) {
      return map.get(makeKey(font, text));
    },

    set(font, text, width) {
      const key = makeKey(font, text);
      // LRU: 삭제 후 재삽입으로 순서 유지
      if (map.has(key)) {
        map.delete(key);
      } else if (map.size >= MAX_ENTRIES) {
        // 가장 오래된 항목 제거
        const first = map.keys().next().value;
        if (first !== undefined) map.delete(first);
      }
      map.set(key, width);
    },

    clear() {
      map.clear();
    },

    get size() {
      return map.size;
    },
  };
}

export const defaultCache: MeasureCache = createCache();
