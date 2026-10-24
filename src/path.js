// 网格寻路（A* + 视线平滑）
export class NavGrid {
  constructor(minX, minZ, maxX, maxZ, cell = 0.25) {
    this.minX = minX; this.minZ = minZ; this.cell = cell;
    this.w = Math.ceil((maxX - minX) / cell);
    this.h = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
  }
  ix(x) { return Math.floor((x - this.minX) / this.cell); }
  iz(z) { return Math.floor((z - this.minZ) / this.cell); }
  cx(i) { return this.minX + (i + 0.5) * this.cell; }
  cz(j) { return this.minZ + (j + 0.5) * this.cell; }
  inside(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h; }
  isBlocked(i, j) { return !this.inside(i, j) || this.blocked[j * this.w + i] === 1; }
  free(x, z) { return !this.isBlocked(this.ix(x), this.iz(z)); }

  fill(v) { this.blocked.fill(v); }
  setRect(x0, z0, x1, z1, v) {
    const i0 = Math.max(0, this.ix(Math.min(x0, x1))), i1 = Math.min(this.w - 1, this.ix(Math.max(x0, x1)));
    const j0 = Math.max(0, this.iz(Math.min(z0, z1))), j1 = Math.min(this.h - 1, this.iz(Math.max(z0, z1)));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.blocked[j * this.w + i] = v;
  }
  block(x0, z0, x1, z1, pad = 0.2) { this.setRect(x0 - pad, z0 - pad, x1 + pad, z1 + pad, 1); }
  open(x0, z0, x1, z1) { this.setRect(x0, z0, x1, z1, 0); }

  nearestFree(i, j) {
    if (!this.isBlocked(i, j)) return [i, j];
    for (let r = 1; r < 30; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
        if (!this.isBlocked(i + di, j + dj)) return [i + di, j + dj];
      }
    }
    return [i, j];
  }

  los(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.ceil(d / (this.cell * 0.5));
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n);
      if (!this.free(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false;
    }
    return true;
  }

  findPath(sx, sz, tx, tz) {
    const [si, sj] = this.nearestFree(this.ix(sx), this.iz(sz));
    const [ti, tj] = this.nearestFree(this.ix(tx), this.iz(tz));
    const W = this.w, N = W * this.h;
    const start = sj * W + si, goal = tj * W + ti;
    if (start === goal) return [{ x: tx, z: tz }];
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = new MinHeap();
    const h = (i, j) => { const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); };
    g[start] = 0;
    heap.push(start, h(si, sj));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let found = false, iter = 0;
    while (heap.size && iter++ < 40000) {
      const cur = heap.pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % W, cj = (cur - ci) / W;
      for (const [di, dj, c] of dirs) {
        const ni = ci + di, nj = cj + dj;
        if (this.isBlocked(ni, nj)) continue;
        if (di && dj && (this.isBlocked(ci + di, cj) || this.isBlocked(ci, cj + dj))) continue;
        const n = nj * W + ni;
        const ng = g[cur] + c;
        if (ng < g[n]) { g[n] = ng; came[n] = cur; heap.push(n, ng + h(ni, nj)); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => ({ x: this.cx(c % W), z: this.cz(Math.floor(c / W)) }));
    pts[0] = { x: sx, z: sz };
    pts[pts.length - 1] = { x: tx, z: tz };
    // 视线平滑
    const out = [pts[0]];
    let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      while (b > a + 1 && !this.los(pts[a].x, pts[a].z, pts[b].x, pts[b].z)) b--;
      out.push(pts[b]);
      a = b;
    }
    out.shift();
    return out;
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) {
    this.k.push(k); this.p.push(p);
    let i = this.k.length - 1;
    while (i > 0) {
      const pa = (i - 1) >> 1;
      if (this.p[pa] <= this.p[i]) break;
      [this.k[pa], this.k[i]] = [this.k[i], this.k[pa]];
      [this.p[pa], this.p[i]] = [this.p[i], this.p[pa]];
      i = pa;
    }
  }
  pop() {
    const top = this.k[0];
    const lk = this.k.pop(), lp = this.p.pop();
    if (this.k.length) {
      this.k[0] = lk; this.p[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.k.length && this.p[l] < this.p[m]) m = l;
        if (r < this.k.length && this.p[r] < this.p[m]) m = r;
        if (m === i) break;
        [this.k[m], this.k[i]] = [this.k[i], this.k[m]];
        [this.p[m], this.p[i]] = [this.p[i], this.p[m]];
        i = m;
      }
    }
    return top;
  }
}
