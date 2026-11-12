const RE = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/;

function parse(v: string) {
  const m = RE.exec(v.trim());
  if (!m) return null;
  return {
    nums: [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)],
    pre: m[4]?.split(".") ?? [],
  };
}

function comparePre(a: string[], b: string[]): number {
  if (!a.length || !b.length) return Math.sign(b.length - a.length); // release > prerelease
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      if (Number(x) !== Number(y)) return Math.sign(Number(x) - Number(y));
    } else if (xn !== yn) return xn ? -1 : 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Semver precedence: -1, 0 or 1; null when either side is not a version. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    const x = pa.nums[i] ?? 0;
    const y = pb.nums[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return comparePre(pa.pre, pb.pre) as -1 | 0 | 1;
}

/** True only when `version` is strictly older than `reference`; unparseable is not older. */
export const isOlder = (version: string, reference: string): boolean =>
  compareVersions(version, reference) === -1;
