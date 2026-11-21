/* МедВектор, главная. Один файл из четырёх частей:
   1. Зуб: трёхмерная модель на WebGL без сторонних библиотек.
   2. Общее: шапка, меню, появление блоков, счётчики, курсор, вкладки, форма.
   3. Линия-вектор: одна линия через всю страницу по меткам [data-vp].
   4. Секции: указатель кейсов, макеты сайтов, колесо вопросов.
   Плавная прокрутка: assets/js/vendor/lenis.min.js (подключается раньше). */

/* МедВектор: объёмный зуб. Форма задана формулой (поле расстояний), сетка строится в браузере,
   рисуется своим небольшим WebGL-кодом без библиотек. Режимы: porcelain (фарфор), glass (стекло на тёмном),
   points (точки), wire (сетка линий). */
(function (global) {
  'use strict';

  /* ---------- форма зуба ---------- */
  var smin = function (a, b, k) { var h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  var smax = function (a, b, k) { return -smin(-a, -b, k); };
  function rbox(x, y, z, bx, by, bz, r) {
    var qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
    var ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
  }
  function ell(x, y, z, rx, ry, rz) {
    var k0 = Math.sqrt(x * x / (rx * rx) + y * y / (ry * ry) + z * z / (rz * rz));
    var k1 = Math.sqrt(x * x / (rx * rx * rx * rx) + y * y / (ry * ry * ry * ry) + z * z / (rz * rz * rz * rz));
    return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, Math.min(ry, rz));
  }
  function cap(x, y, z, ax, ay, az, bx, by, bz, r) {
    var pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
    var h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
    var dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  }
  function rcone(x, y, z, ax, ay, az, bx, by, bz, r1, r2) {
    var bax = bx - ax, bay = by - ay, baz = bz - az;
    var l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
    var pax = x - ax, pay = y - ay, paz = z - az;
    var yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
    var vx = pax * l2 - bax * yy, vy = pay * l2 - bay * yy, vz = paz * l2 - baz * yy;
    var x2 = vx * vx + vy * vy + vz * vz, y2 = yy * yy * l2, z2 = zz * zz * l2;
    var k = (rr > 0 ? 1 : rr < 0 ? -1 : 0) * rr * rr * x2;
    if ((zz > 0 ? 1 : zz < 0 ? -1 : 0) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if ((yy > 0 ? 1 : yy < 0 ? -1 : 0) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  }
  // моляр: коронка с четырьмя буграми и бороздой, два корня
  function sdf(x, y, z) {
    y += 0.15;
    var t = Math.max(0, Math.min(1, (y - 0.02) / 0.6)); t = t * t * (3 - 2 * t);
    var s = 0.8 + 0.2 * t;
    var d = rbox(x / s, y - 0.56, z / s, 0.64, 0.47, 0.52, 0.36) * s;
    var c = Math.min(
      Math.min(ell(x - 0.29, y - 0.93, z - 0.235, 0.3, 0.19, 0.255), ell(x + 0.29, y - 0.93, z - 0.235, 0.3, 0.19, 0.255)),
      Math.min(ell(x - 0.29, y - 0.93, z + 0.235, 0.3, 0.19, 0.255), ell(x + 0.29, y - 0.93, z + 0.235, 0.3, 0.19, 0.255)));
    d = smin(d, c, 0.14);
    var f = Math.min(cap(x, y, z, -0.5, 1.115, 0, 0.5, 1.115, 0, 0.05), cap(x, y, z, 0, 1.115, -0.45, 0, 1.115, 0.45, 0.05));
    f = Math.min(f, ell(x, y - 1.12, z, 0.2, 0.1, 0.18));
    d = smax(d, -f, 0.11);
    var r1 = rcone(x, y, z * 0.8, -0.25, 0.28, 0, -0.46, -0.7, 0, 0.25, 0.105);
    var r2 = rcone(x, y, z * 0.8, 0.25, 0.28, 0, 0.44, -0.63, 0, 0.25, 0.115);
    d = smin(d, r1, 0.14); d = smin(d, r2, 0.14);
    return d;
  }
  // градиент по разностям вперёд: f0 уже посчитано в точке
  function grad(x, y, z, out, f0) {
    var e = 0.002;
    if (f0 === undefined) f0 = sdf(x, y, z);
    var gx = sdf(x + e, y, z) - f0, gy = sdf(x, y + e, z) - f0, gz = sdf(x, y, z + e) - f0;
    var l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    out[0] = gx / l; out[1] = gy / l; out[2] = gz / l;
    return l / e;
  }
  function snap(p, n) { // подтянуть точку на поверхность, записать нормаль
    var f0 = sdf(p[0], p[1], p[2]), gl = grad(p[0], p[1], p[2], n, f0), dd = f0 / (gl || 1);
    p[0] -= n[0] * dd; p[1] -= n[1] * dd; p[2] -= n[2] * dd;
    grad(p[0], p[1], p[2], n);
  }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- сетка: «поверхностные сети» по полю расстояний ---------- */
  function buildMesh(h) {
    var x0 = -0.8, y0 = -1.12, z0 = -0.7;
    var nx = Math.round(1.6 / h) + 1, ny = Math.round(2.3 / h) + 1, nz = Math.round(1.4 / h) + 1;
    var d = new Float32Array(nx * ny * nz), C = 4, far = h * C * 1.6;
    var i, j, k, a, b, c;
    for (k = 0; k < nz; k += C) for (j = 0; j < ny; j += C) for (i = 0; i < nx; i += C) {
      var cv = sdf(x0 + (i + (C - 1) / 2) * h, y0 + (j + (C - 1) / 2) * h, z0 + (k + (C - 1) / 2) * h), skip = Math.abs(cv) > far;
      for (c = k; c < Math.min(k + C, nz); c++) for (b = j; b < Math.min(j + C, ny); b++) for (a = i; a < Math.min(i + C, nx); a++)
        d[a + b * nx + c * nx * ny] = skip ? cv : sdf(x0 + a * h, y0 + b * h, z0 + c * h);
    }
    var cx = nx - 1, cy = ny - 1, cz = nz - 1, cell = new Int32Array(cx * cy * cz).fill(-1);
    var pos = [], g = new Float32Array(8), off = [0, 1, nx, nx + 1, nx * ny, nx * ny + 1, nx * ny + nx, nx * ny + nx + 1];
    for (k = 0; k < cz; k++) for (j = 0; j < cy; j++) for (i = 0; i < cx; i++) {
      var base = i + j * nx + k * nx * ny, mask = 0;
      for (a = 0; a < 8; a++) { g[a] = d[base + off[a]]; if (g[a] < 0) mask |= 1 << a; }
      if (mask === 0 || mask === 255) continue;
      var sx = 0, sy = 0, sz = 0, cnt = 0;
      for (a = 0; a < 8; a++) for (b = 1; b <= 4; b <<= 1) {
        if (a & b) continue;
        var e1 = a | b;
        if ((g[a] < 0) === (g[e1] < 0)) continue;
        var tt = g[a] / (g[a] - g[e1]);
        sx += (a & 1) + (b === 1 ? tt : 0); sy += ((a >> 1) & 1) + (b === 2 ? tt : 0); sz += ((a >> 2) & 1) + (b === 4 ? tt : 0); cnt++;
      }
      cell[i + j * cx + k * cx * cy] = pos.length / 3;
      pos.push(x0 + (i + sx / cnt) * h, y0 + (j + sy / cnt) * h, z0 + (k + sz / cnt) * h);
    }
    var idx = [];
    var quad = function (q0, q1, q2, q3) { if (q0 < 0 || q1 < 0 || q2 < 0 || q3 < 0) return; idx.push(q0, q1, q2, q0, q2, q3); };
    var ci = function (i, j, k) { return cell[i + j * cx + k * cx * cy]; };
    for (k = 1; k < cz; k++) for (j = 1; j < cy; j++) for (i = 1; i < cx; i++) {
      var p0 = d[i + j * nx + k * nx * ny] < 0;
      if (p0 !== (d[i + 1 + j * nx + k * nx * ny] < 0)) quad(ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k));
      if (p0 !== (d[i + (j + 1) * nx + k * nx * ny] < 0)) quad(ci(i - 1, j, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i - 1, j, k));
      if (p0 !== (d[i + j * nx + (k + 1) * nx * ny] < 0)) quad(ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k));
    }
    var n = pos.length / 3, P = new Float32Array(pos), N = new Float32Array(n * 3), AO = new Float32Array(n), p = [0, 0, 0], nn = [0, 0, 0];
    for (i = 0; i < n; i++) {
      p[0] = P[i * 3]; p[1] = P[i * 3 + 1]; p[2] = P[i * 3 + 2];
      snap(p, nn);
      P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; N[i * 3] = nn[0]; N[i * 3 + 1] = nn[1]; N[i * 3 + 2] = nn[2];
      var o1 = sdf(p[0] + nn[0] * 0.07, p[1] + nn[1] * 0.07, p[2] + nn[2] * 0.07) / 0.07, o2 = sdf(p[0] + nn[0] * 0.24, p[1] + nn[1] * 0.24, p[2] + nn[2] * 0.24) / 0.24;
      AO[i] = Math.max(0, Math.min(1, 0.5 * o1 + 0.5 * o2));
    }
    var I = n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
    for (i = 0; i < I.length; i += 3) { // обход треугольников наружу
      var A = I[i] * 3, B = I[i + 1] * 3, Cc = I[i + 2] * 3;
      var ux = P[B] - P[A], uy = P[B + 1] - P[A + 1], uz = P[B + 2] - P[A + 2], vx = P[Cc] - P[A], vy = P[Cc + 1] - P[A + 1], vz = P[Cc + 2] - P[A + 2];
      var fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      if (fx * (N[A] + N[B] + N[Cc]) + fy * (N[A + 1] + N[B + 1] + N[Cc + 1]) + fz * (N[A + 2] + N[B + 2] + N[Cc + 2]) < 0) { var sw = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = sw; }
    }
    return { pos: P, nor: N, ao: AO, idx: I, count: I.length, verts: n };
  }

  /* ---------- точки на поверхности с ровным шагом ---------- */
  function buildPoints(mesh, r, max) {
    var P = mesh.pos, I = mesh.idx, rnd = rng(7), tri = I.length / 3, cum = new Float32Array(tri), total = 0, i;
    for (i = 0; i < tri; i++) {
      var A = I[i * 3] * 3, B = I[i * 3 + 1] * 3, C = I[i * 3 + 2] * 3;
      var ux = P[B] - P[A], uy = P[B + 1] - P[A + 1], uz = P[B + 2] - P[A + 2], vx = P[C] - P[A], vy = P[C + 1] - P[A + 1], vz = P[C + 2] - P[A + 2];
      var fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      total += Math.sqrt(fx * fx + fy * fy + fz * fz) * 0.5; cum[i] = total;
    }
    var hash = new Map(), inv = 1 / r, out = [], nor = [], p = [0, 0, 0], n = [0, 0, 0], tries = max * 14;
    while (tries-- > 0 && out.length / 3 < max) {
      var u = rnd() * total, lo = 0, hi = tri - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
      var a = I[lo * 3] * 3, b = I[lo * 3 + 1] * 3, c = I[lo * 3 + 2] * 3, s = rnd(), t = rnd();
      if (s + t > 1) { s = 1 - s; t = 1 - t; }
      p[0] = P[a] + (P[b] - P[a]) * s + (P[c] - P[a]) * t; p[1] = P[a + 1] + (P[b + 1] - P[a + 1]) * s + (P[c + 1] - P[a + 1]) * t; p[2] = P[a + 2] + (P[b + 2] - P[a + 2]) * s + (P[c + 2] - P[a + 2]) * t;
      var gx = Math.floor(p[0] * inv), gy = Math.floor(p[1] * inv), gz = Math.floor(p[2] * inv), ok = true;
      for (var dx = -1; dx <= 1 && ok; dx++) for (var dy = -1; dy <= 1 && ok; dy++) for (var dz = -1; dz <= 1 && ok; dz++) {
        var list = hash.get((gx + dx) + ',' + (gy + dy) + ',' + (gz + dz));
        if (list) for (var q = 0; q < list.length; q += 3) { var ex = list[q] - p[0], ey = list[q + 1] - p[1], ez = list[q + 2] - p[2]; if (ex * ex + ey * ey + ez * ez < r * r) { ok = false; break; } }
      }
      if (!ok) continue;
      snap(p, n);
      var key = gx + ',' + gy + ',' + gz, cellList = hash.get(key);
      if (!cellList) hash.set(key, cellList = []);
      cellList.push(p[0], p[1], p[2]);
      out.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]);
    }
    var cnt = out.length / 3, seed = new Float32Array(cnt * 4);
    for (i = 0; i < cnt * 4; i++) seed[i] = rnd();
    return { pos: new Float32Array(out), nor: new Float32Array(nor), seed: seed, count: cnt };
  }

  var geo = null;
  function geometry() {
    if (!geo) { var m = buildMesh(0.028); geo = { mesh: m, points: buildPoints(m, 0.03, 5600) }; }
    return geo;
  }

  /* ---------- шейдеры ---------- */
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNor; attribute float aAO;',
    'uniform mat4 uProj; uniform mat3 uRot; uniform vec3 uOff; uniform float uDist;',
    'varying vec3 vN; varying vec3 vP; varying vec3 vO; varying float vAO;',
    'void main(){ vO = aPos; vec3 p = uRot * aPos + uOff; vP = p; vN = uRot * aNor; vAO = aAO;',
    '  gl_Position = uProj * vec4(p.x, p.y, p.z - uDist, 1.0); }'
  ].join('\n');
  var FS_HEAD = 'precision highp float;\nvarying vec3 vN; varying vec3 vP; varying vec3 vO; varying float vAO;\nuniform float uDist; uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uK; uniform float uOcc;\n';
  // фарфор: мягкий свет, два блика, голубой контур
  var FS_PORCELAIN = FS_HEAD + [
    'void main(){',
    '  vec3 N = normalize(vN); vec3 V = normalize(vec3(0.0, 0.0, uDist) - vP);',
    '  vec3 L1 = normalize(vec3(-0.55, 0.75, 0.62)); vec3 L2 = normalize(vec3(0.85, 0.1, 0.45));',
    '  float d1 = dot(N, L1) * 0.58 + 0.42; d1 = clamp(d1, 0.0, 1.0); d1 *= d1;',
    '  float d2 = max(dot(N, L2), 0.0);',
    '  float lit = clamp(0.18 + 0.78 * d1 + 0.2 * d2, 0.0, 1.0);',
    '  vec3 col = mix(uB, uA, lit);',
    '  col = mix(uB * 0.92, col, mix(0.55, 1.0, vAO));',
    // корни чуть темнее коронки, чтобы форма читалась как зуб
    '  col = mix(col, mix(col, uB, 0.42), smoothstep(0.1, -0.16, vO.y));',
    '  vec3 R = reflect(-V, N);',
    '  float win = smoothstep(0.42, 0.62, R.y) * smoothstep(-0.55, -0.2, R.x) * (1.0 - smoothstep(0.15, 0.45, R.x));',
    '  float bar = smoothstep(0.3, 0.42, R.x) * (1.0 - smoothstep(0.62, 0.74, R.x)) * smoothstep(-0.5, -0.1, R.y) * (1.0 - smoothstep(0.35, 0.6, R.y));',
    '  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 110.0);',
    '  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.6);',
    '  col += vec3(1.0) * (win * 0.34 + bar * 0.12 + s1 * 0.7) * uK;',
    '  col = mix(col, uC, fr * 0.62);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');
  // стекло: светится по краям, середина прозрачная
  var FS_GLASS = FS_HEAD + [
    'void main(){',
    '  vec3 N = normalize(vN); vec3 V = normalize(vec3(0.0, 0.0, uDist) - vP);',
    '  float nv = abs(dot(N, V)); float fr = pow(1.0 - nv, 2.4);',
    '  vec3 L1 = normalize(vec3(-0.55, 0.75, 0.62));',
    '  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 60.0);',
    '  vec3 R = reflect(-V, N); float win = smoothstep(0.5, 0.7, R.y) * smoothstep(-0.5, -0.1, R.x) * (1.0 - smoothstep(0.2, 0.5, R.x));',
    '  float band = 0.5 + 0.5 * sin(vO.y * 9.0 - uTime * 0.9);',
    '  vec3 col = mix(uA, uC, fr) * (fr * 1.25 + 0.05 + band * 0.035) + vec3(1.0) * (s1 * 0.8 + win * 0.22);',
    '  col *= mix(0.6, 1.0, vAO) * uK;',
    // uOcc > 0: стекло заслоняет то, что лежит под холстом (буквы за зубом уходят в синий)
    '  float a = uOcc * (0.4 + 0.5 * fr);',
    '  col += uA * a * 0.8;',
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');
  // сетка линий: параллели и меридианы одной толщины в пикселях
  var FS_WIRE = '#extension GL_OES_standard_derivatives : enable\n' + FS_HEAD + [
    'float ln(float v){ float f = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-5); return 1.0 - clamp(f - uK + 1.0, 0.0, 1.0); }',
    'void main(){',
    '  vec3 N = normalize(vN); vec3 V = normalize(vec3(0.0, 0.0, uDist) - vP);',
    '  float lat = vO.y * 11.0 - uTime * 0.12;',
    '  float a1 = atan(vO.z, vO.x) / 6.2831853 * 28.0; float a2 = atan(-vO.z, -vO.x) / 6.2831853 * 28.0;',
    '  float lon = fwidth(a1) < fwidth(a2) ? a1 : a2;',
    '  float l = max(ln(lat), ln(lon));',
    '  float front = gl_FrontFacing ? 1.0 : 0.0;',
    '  float fr = pow(1.0 - abs(dot(N, V)), 3.0);',
    '  float a = l * mix(0.22, 0.95, front) + fr * 0.5 * front;',
    '  vec3 col = mix(uA, uC, front * 0.0 + fr);',
    '  gl_FragColor = vec4(col * a, a);',
    '}'
  ].join('\n');
  var VS_PTS = [
    'attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aSeed;',
    'uniform mat4 uProj; uniform mat3 uRot; uniform vec3 uOff; uniform float uDist; uniform float uTime; uniform float uAsm; uniform float uSize; uniform float uFlow;',
    'varying float vL; varying float vS; varying float vA;',
    'void main(){',
    '  float w = clamp(uAsm * 1.7 - aSeed.x * 0.7, 0.0, 1.0); w = w * w * (3.0 - 2.0 * w);',
    '  vec3 far = vec3((aSeed.y - 0.5) * 7.0, (aSeed.z - 0.5) * 3.2 + sin(aSeed.w * 40.0) * 0.4, (aSeed.w - 0.5) * 3.0);',
    '  vec3 o = aPos + aNor * (0.012 * sin(uTime * 1.3 + aSeed.x * 60.0));',
    // волна, которая проходит по зубу сверху вниз: точки на гребне приподнимаются
    '  float wave = smoothstep(0.16, 0.0, abs(fract(aPos.y * 0.38 - uTime * 0.11 + 0.5) - 0.5));',
    '  o += aNor * wave * 0.05 * uFlow;',
    '  vec3 p = uRot * mix(far, o, w) + uOff; vec3 n = uRot * aNor;',
    '  vec3 V = normalize(vec3(0.0, 0.0, uDist) - p);',
    '  float nv = dot(n, V);',
    '  vL = clamp(dot(n, normalize(vec3(-0.55, 0.75, 0.62))) * 0.5 + 0.5, 0.0, 1.0);',
    '  vS = aSeed.y + wave * uFlow; vA = mix(1.0, smoothstep(-0.35, 0.25, nv) * 0.86 + 0.14, w) * mix(0.35, 1.0, w);',
    '  gl_Position = uProj * vec4(p.x, p.y, p.z - uDist, 1.0);',
    '  gl_PointSize = uSize * (0.7 + 0.6 * aSeed.z + wave * 0.9 * uFlow) * (uDist / (uDist - p.z));',
    '}'
  ].join('\n');
  var FS_PTS = [
    'precision highp float; varying float vL; varying float vS; varying float vA; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;',
    'void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q); float a = (1.0 - smoothstep(0.34, 0.5, r)) * vA;',
    '  vec3 col = mix(uB, uA, vL); col = mix(col, uC, step(0.9, vS)); gl_FragColor = vec4(col * a, a); }'
  ].join('\n');

  function prog(gl, vs, fs) {
    var p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (s) {
      var sh = gl.createShader(s[0]); gl.shaderSource(sh, s[1]); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(p, sh);
    });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  var hex = function (h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; };

  var PRESET = {
    porcelain: { a: '#ffffff', b: '#a9c4de', c: '#3aa9ea', k: 1 },
    clay: { a: '#ffffff', b: '#7fb6e6', c: '#d9f0ff', k: 0.55 },
    glass: { a: '#0c56c9', b: '#000f40', c: '#7fd4ff', k: 1 },
    glassOver: { a: '#0a4fc0', b: '#000f40', c: '#8fdcff', k: 1.1, o: 0.62 },
    wire: { a: '#008cd8', b: '#000f40', c: '#008cd8', k: 1.15 },
    wireDark: { a: '#2aa8f2', b: '#000f40', c: '#bfe6ff', k: 1.15 },
    points: { a: '#000f40', b: '#55618c', c: '#008cd8', k: 1 },
    pointsDark: { a: '#ffffff', b: '#6f86c4', c: '#2aa8f2', k: 1 }
  };

  /* ---------- один зуб на одном холсте ----------
     opts: mode (porcelain | glass | wire | points), preset, spin (оборотов в минуту), tilt, yaw, scale, fit */
  function Tooth(canvas, opts) {
    opts = opts || {};
    var mode = opts.mode || 'porcelain', pre = PRESET[opts.preset || mode] || PRESET.porcelain;
    var gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) return null;
    var G = geometry(), m = G.mesh, self = this, dead = false;
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var program, buffers = [], isPts = mode === 'points';
    try {
      if (isPts) program = prog(gl, VS_PTS, FS_PTS);
      else {
        if (mode === 'wire' && !gl.getExtension('OES_standard_derivatives')) mode = 'glass';
        program = prog(gl, VS, mode === 'glass' ? FS_GLASS : mode === 'wire' ? FS_WIRE : FS_PORCELAIN);
      }
    } catch (e) { if (global.console) console.warn('tooth shader', e.message); return null; }
    var attr = function (name, data, size) {
      var loc = gl.getAttribLocation(program, name); if (loc < 0) return;
      var b = gl.createBuffer(); buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    gl.useProgram(program);
    var idxType = gl.UNSIGNED_SHORT;
    if (isPts) { attr('aPos', G.points.pos, 3); attr('aNor', G.points.nor, 3); attr('aSeed', G.points.seed, 4); }
    else {
      attr('aPos', m.pos, 3); attr('aNor', m.nor, 3); attr('aAO', m.ao, 1);
      var ib = gl.createBuffer(); buffers.push(ib); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
      if (m.idx instanceof Uint32Array) { gl.getExtension('OES_element_index_uint'); idxType = gl.UNSIGNED_INT; }
    }
    var U = {}; ['uProj', 'uRot', 'uOff', 'uDist', 'uTime', 'uA', 'uB', 'uC', 'uK', 'uOcc', 'uAsm', 'uSize', 'uFlow'].forEach(function (n) { U[n] = gl.getUniformLocation(program, n); });
    var dist = 7.2, fov = 26 * Math.PI / 180, W = 0, H = 0, dpr = 1;
    var st = { yaw: opts.yaw || 0, tilt: opts.tilt == null ? 0.16 : opts.tilt, px: 0, py: 0, tx: 0, ty: 0, asm: reduce || opts.asm === false ? 1 : 0, asmTo: 1, extraYaw: 0, extraTilt: 0, t0: performance.now(), scale: opts.scale || 1, ox: 0, oy: 0 };
    this.state = st;
    var spin = opts.spin == null ? 2.2 : opts.spin; // оборотов в минуту
    var resize = function () {
      var r = canvas.getBoundingClientRect(); dpr = Math.min(global.devicePixelRatio || 1, opts.maxDpr || 2);
      var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, W, H); }
    };
    var proj = new Float32Array(16), rot = new Float32Array(9);
    var draw = function (now) {
      if (dead) return;
      resize();
      var t = (now - st.t0) / 1000, aspect = W / H, f = 1 / Math.tan(fov / 2), near = 1, farp = 30;
      // зуб высотой 2.3 должен помещаться и по высоте, и по ширине холста
      var fitH = 1, need = 1.75 / aspect; if (need > 2.5) fitH = 2.5 / need;
      proj[0] = f / aspect; proj[5] = f; proj[10] = (farp + near) / (near - farp); proj[11] = -1; proj[14] = 2 * farp * near / (near - farp); proj[1] = proj[2] = proj[3] = proj[4] = proj[6] = proj[7] = proj[8] = proj[9] = proj[12] = proj[13] = proj[15] = 0;
      st.px += (st.tx - st.px) * 0.06; st.py += (st.ty - st.py) * 0.06;
      st.asm += (st.asmTo - st.asm) * (isPts ? 0.022 : 0.05);
      var yaw = st.yaw + (reduce ? 0.5 : t * spin * Math.PI * 2 / 60) + st.px * 0.7 + st.extraYaw, tilt = st.tilt + st.py * 0.35 + st.extraTilt;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cxx = Math.cos(tilt), sxx = Math.sin(tilt), s = st.scale * fitH * (isPts ? 1 : 0.6 + 0.4 * (1 - Math.pow(1 - Math.min(st.asm, 1), 3)));
      // R = Rx(tilt) * Ry(yaw), по столбцам
      rot[0] = cy * s; rot[1] = sxx * sy * s; rot[2] = -cxx * sy * s;
      rot[3] = 0; rot[4] = cxx * s; rot[5] = sxx * s;
      rot[6] = sy * s; rot[7] = -sxx * cy * s; rot[8] = cxx * cy * s;
      gl.uniformMatrix4fv(U.uProj, false, proj); gl.uniformMatrix3fv(U.uRot, false, rot);
      gl.uniform3f(U.uOff, st.ox, st.oy + (reduce ? 0 : Math.sin(t * 0.9) * 0.035), 0); gl.uniform1f(U.uDist, dist); gl.uniform1f(U.uTime, t);
      var A = hex(pre.a), B = hex(pre.b), C = hex(pre.c);
      gl.uniform3f(U.uA, A[0], A[1], A[2]); gl.uniform3f(U.uB, B[0], B[1], B[2]); gl.uniform3f(U.uC, C[0], C[1], C[2]);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (isPts) {
        gl.uniform1f(U.uAsm, st.asm); gl.uniform1f(U.uSize, (opts.size || 2.6) * dpr * Math.min(1.25, Math.max(0.62, H / dpr / 620))); gl.uniform1f(U.uFlow, opts.flow == null ? 1 : opts.flow);
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.POINTS, 0, G.points.count);
      } else if (mode === 'porcelain') {
        gl.uniform1f(U.uK, pre.k);
        gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        gl.drawElements(gl.TRIANGLES, m.count, idxType, 0);
      } else {
        gl.uniform1f(U.uK, pre.k);
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.enable(gl.CULL_FACE);
        gl.uniform1f(U.uOcc, pre.o || 0); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.cullFace(gl.FRONT); gl.drawElements(gl.TRIANGLES, m.count, idxType, 0);
        gl.cullFace(gl.BACK); gl.drawElements(gl.TRIANGLES, m.count, idxType, 0);
      }
    };
    var raf = 0, running = false, visible = true;
    var loop = function (now) { raf = 0; if (!running) return; draw(now); if (!reduce || Math.abs(st.asm - st.asmTo) > 0.002) raf = requestAnimationFrame(loop); };
    this.start = function () { if (dead || running) return; running = true; if (!raf) raf = requestAnimationFrame(loop); };
    this.stop = function () { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    this.render = function () { draw(performance.now()); };
    this.pointer = function (x, y) { st.tx = x; st.ty = y; };
    var io = global.IntersectionObserver ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) self.start(); else self.stop(); }, { rootMargin: '120px' }) : null;
    if (io) io.observe(canvas); else this.start();
    var onMove = function (e) { var r = canvas.getBoundingClientRect(); st.tx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (global.innerWidth / 2))); st.ty = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (global.innerHeight / 2))); };
    var fine = global.matchMedia && global.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine && !reduce && opts.follow !== false) global.addEventListener('pointermove', onMove, { passive: true });
    this.destroy = function () {
      dead = true; this.stop(); if (io) io.disconnect(); global.removeEventListener('pointermove', onMove);
      buffers.forEach(function (b) { gl.deleteBuffer(b); }); gl.deleteProgram(program);
      var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    };
    canvas.classList.add('is-live');
  }

  global.MVTooth = { create: function (canvas, opts) { try { var t = new Tooth(canvas, opts); return t && t.start ? t : null; } catch (e) { if (global.console) console.warn('tooth', e); return null; } }, geometry: geometry, sdf: sdf, presets: PRESET };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.MVTooth;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== Общее: шапка, меню, появление блоков, счётчики, зуб, курсор, вкладки, форма ===== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var MV = window.MV = { reduce: reduce, fine: fine, clamp: clamp, hooks: [], frames: [] };
  // если скрипт пришёл поздно, страница уже показана как без скриптов (см. таймер в <head>): возвращаем обычный режим
  root.classList.remove('no-js'); root.classList.add('js');
  var vh = innerHeight;

  /* ---------- плавная прокрутка ---------- */
  var lenis = null;
  if (fine && !reduce && window.Lenis) {
    try { lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -16 }, stopInertiaOnNavigate: true }); MV.lenis = lenis; } catch (e) { lenis = null; }
  }

  /* ---------- шапка ---------- */
  var hdr = $('.hdr'), lastY = scrollY, menuOpen = false, keepHeader = 0;
  document.addEventListener('click', function (e) { if (e.target.closest('a[href*="#"]')) keepHeader = performance.now() + 1200; });
  var onHeader = function () {
    var y = scrollY;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      if (!menuOpen && y > 400 && y > lastY + 4 && performance.now() > keepHeader) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 400) hdr.classList.remove('is-hidden');
    }
    lastY = y;
  };
  var burger = $('.burger'), mnav = $('#mnav');
  var setMenu = function (open) {
    menuOpen = open; root.classList.toggle('is-menu', open); mnav.classList.toggle('is-open', open); mnav.inert = !open;
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) hdr.classList.remove('is-hidden');
  };
  if (burger && mnav) {
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    matchMedia('(min-width: 1021px)').addEventListener('change', function (e) { if (e.matches && menuOpen) setMenu(false); });
  }
  $$('[data-drop]').forEach(function (drop) {
    var btn = $('.drop__btn', drop), timer;
    var isOpen = function () { return drop.classList.contains('is-open'); };
    var set = function (open) { clearTimeout(timer); drop.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
    btn.addEventListener('click', function (e) { set(fine && e.detail ? true : !isOpen()); });
    if (fine) { drop.addEventListener('pointerenter', function () { set(true); }); drop.addEventListener('pointerleave', function () { timer = setTimeout(function () { set(false); }, 180); }); }
    drop.addEventListener('focusout', function (e) { if (!drop.contains(e.relatedTarget)) set(false); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!drop.contains(e.target) || e.target.closest('a')) set(false); });
  });

  /* ---------- появление блоков ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; e.target.classList.add('is-in'); io.unobserve(e.target); });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  var watch = function (scope, replay) {
    $$('[data-rv], .rvh', scope).forEach(function (el) {
      if (reduce || !io) { el.classList.add('is-in'); return; }
      if (replay) el.classList.remove('is-in');
      if (el.classList.contains('is-in')) return;
      /* первый экран показываем целиком сразу, не дожидаясь прокрутки */
      if (el.closest('#hero')) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); }); return; }
      io.observe(el);
    });
  };

  /* ---------- счётчики ---------- */
  var countIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; countIO.unobserve(e.target);
      var el = e.target, to = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1400;
      if (reduce) { el.textContent = fmt(to); return; }
      var tick = function (now) { var p = clamp((now - t0) / dur, 0, 1), k = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * k); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  var counts = function (scope) { $$('[data-count]', scope).forEach(function (el) { if (countIO && !el.dataset.cdone) { el.dataset.cdone = 1; countIO.observe(el); } }); };

  /* ---------- зуб: каждый холст с data-tooth получает свой рисунок ---------- */
  var teeth = [];
  var mountTeeth = function () {
    if (!window.MVTooth) return;
    $$('canvas[data-tooth]').forEach(function (c) {
      if (c.__tooth) return;
      // без WebGL место зуба остаётся пустым, текст и кнопки от него не зависят
      var d = c.dataset, inst = MVTooth.create(c, { mode: d.tooth || 'porcelain', preset: d.preset, spin: d.spin == null ? undefined : +d.spin, tilt: d.tilt == null ? undefined : +d.tilt, yaw: d.yaw == null ? 0.5 : +d.yaw, scale: d.scale == null ? 1 : +d.scale, size: d.size == null ? undefined : +d.size, follow: d.follow !== 'off', asm: d.asm !== 'off' });
      if (inst) { c.__tooth = inst; teeth.push({ canvas: c, inst: inst, scroll: +(d.scroll || 0) }); }
    });
  };
  MV.teeth = function () { return teeth; };

  /* надпись во всю ширину блока: подбираем кегль под любой набор шрифтов */
  var fit = function () {
    $$('[data-fit]').forEach(function (el) {
      var s = el.firstElementChild; el.style.fontSize = '100px';
      var w = s.getBoundingClientRect().width, k = +(el.dataset.fit || 1) || 1;
      var fs = 100 * el.clientWidth / w * k, cap = +(el.dataset.fitMax || 0) * innerHeight / 100;
      if (w > 0) el.style.fontSize = (cap && fs > cap ? cap : fs).toFixed(2) + 'px';
    });
  };
  MV.fit = fit;

  /* ---------- магнитные кнопки и курсор ---------- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest && e.target.closest('[data-magnetic]');
      $$('[data-magnetic].is-mag').forEach(function (x) { if (x !== b) { x.style.transform = ''; x.classList.remove('is-mag'); } });
      if (!b) return;
      var r = b.getBoundingClientRect();
      b.classList.add('is-mag'); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)';
    }, { passive: true });
    var curEl = document.createElement('div'); curEl.className = 'cur'; curEl.setAttribute('aria-hidden', 'true'); curEl.innerHTML = '<i></i>'; document.body.appendChild(curEl);
    var cx = 0, cy = 0, tx = 0, ty = 0, curOn = false;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; if (!curOn) { cx = tx; cy = ty; curOn = true; curEl.classList.add('is-on'); }
      var t = e.target, link = t.closest && t.closest('a, button, [role="button"], [data-cur]'), text = t.closest && t.closest('input, textarea, select');
      curEl.classList.toggle('is-link', !!link && !text); curEl.classList.toggle('is-text', !!text);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { curOn = false; curEl.classList.remove('is-on'); });
    MV.frames.push(function () { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; curEl.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)'; });
  }

  /* ---------- прокрутка: прогресс секций и поворот зуба ---------- */
  var onScroll = function () {
    onHeader();
    $$('[data-prog]').forEach(function (el) {
      var r = el.getBoundingClientRect(), p;
      if (el.dataset.prog === 'pin') p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      else p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      el.style.setProperty('--p', p.toFixed(4));
    });
    teeth.forEach(function (t) { if (t.scroll) { var r = t.canvas.getBoundingClientRect(); t.inst.state.extraYaw = (vh / 2 - (r.top + r.height / 2)) / vh * t.scroll; } });
  };
  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { vh = innerHeight; fit(); onScroll(); if (MV.line) MV.line.rebuild(); }, 140); });
  var loop = function (now) { for (var i = 0; i < MV.frames.length; i++) MV.frames[i](now); requestAnimationFrame(loop); };

  /* ---------- вкладки и форма: общее поведение по атрибутам ---------- */
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-tab]');
    if (tab) {
      var box = tab.closest('[data-tabs]'), id = tab.dataset.tab;
      $$('[data-tab]', box).forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', on); t.classList.toggle('is-on', on); });
      $$('[data-pane]', box).forEach(function (p) { var on = p.dataset.pane === id; p.hidden = !on; if (on) watch(p, true); });
      if (box.dataset.tabs) box.dataset.tabs = id;
      if (MV.line) MV.line.rebuild(); counts(box);
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-demo-form]'); if (!f) return;
    e.preventDefault();
    var ok = $('[data-form-ok]', f); if (ok) { ok.hidden = false; ok.focus && ok.focus(); }
  });

  /* ---------- запуск ---------- */
  fit(); mountTeeth(); counts(document); watch(document, false); onScroll();
  requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); if (MV.line) MV.line.rebuild(); });
  addEventListener('load', function () { vh = innerHeight; onScroll(); if (MV.line) MV.line.rebuild(); });
})();

/* МедВектор: линия-вектор. Одна линия идёт через всю страницу по невидимым меткам [data-vp] в показанных визуалах,
   рисуется по мере прокрутки, впереди идёт стрелка, по готовой части пробегает импульс.
   Метка: data-vp, data-vp-r (как прийти в точку: z, vh, hv, d, l), data-vp-f (доля поворота), data-vp-node (узел). */
(function () {
  'use strict';
  var MV = window.MV, main = document.querySelector('main');
  if (!MV || !main) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function (n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; };
  var svg = el('svg', { 'class': 'vecline', 'aria-hidden': 'true', focusable: 'false' });
  main.insertBefore(svg, main.firstChild);
  var COLOR = { light: '#008cd8', fog: '#008cd8', dark: '#2aa8f2', azure: '#ffffff' };
  var BG = { light: '#ffffff', fog: '#f2f4f7', dark: '#000f40', azure: '#008cd8' };
  var master = null, total = 0, samples = [], drawn = [], pulses = [], dots = [], bands = [], head = null, cur = 0, target = 0, ready = false, R = 30;

  // положение метки относительно main без учёта анимаций transform
  var pos = function (e) { var x = 0, y = 0, n = e; while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return n === main ? { x: x + 0.5, y: y + 0.5 } : null; };

  var route = function (pts) {
    var v = [{ x: pts[0].x, y: pts[0].y }], i, a, p, dx, dy, f, s, m;
    for (i = 1; i < pts.length; i++) {
      a = v[v.length - 1]; p = pts[i]; dx = p.x - a.x; dy = p.y - a.y; f = p.f;
      if (p.r === 'l' || (Math.abs(dx) < 1 || Math.abs(dy) < 1)) { v.push({ x: p.x, y: p.y }); continue; }
      if (p.r === 'vh') { v.push({ x: a.x, y: p.y }, { x: p.x, y: p.y }); continue; }
      if (p.r === 'hv') { v.push({ x: p.x, y: a.y }, { x: p.x, y: p.y }); continue; }
      if (p.r === 'd') { // вертикаль, диагональ под 45 градусов, вертикаль
        s = dy > 0 ? 1 : -1;
        if (Math.abs(dy) >= Math.abs(dx)) { m = a.y + (dy - s * Math.abs(dx)) * f; v.push({ x: a.x, y: m }, { x: p.x, y: m + s * Math.abs(dx) }, { x: p.x, y: p.y }); }
        else { s = dx > 0 ? 1 : -1; m = a.x + (dx - s * Math.abs(dy)) * f; v.push({ x: m, y: a.y }, { x: m + s * Math.abs(dy), y: p.y }, { x: p.x, y: p.y }); }
        continue;
      }
      if (p.r === 'zh') { m = a.x + dx * f; v.push({ x: m, y: a.y }, { x: m, y: p.y }, { x: p.x, y: p.y }); continue; }
      m = a.y + dy * f; v.push({ x: a.x, y: m }, { x: p.x, y: m }, { x: p.x, y: p.y }); // z: вниз, вбок, вниз
    }
    // убрать повторы и точки на одной прямой
    var c = [v[0]];
    for (i = 1; i < v.length; i++) {
      var q = v[i], l = c[c.length - 1];
      if (Math.abs(q.x - l.x) < 0.5 && Math.abs(q.y - l.y) < 0.5) continue;
      if (c.length > 1) { var k = c[c.length - 2], cr = (l.x - k.x) * (q.y - l.y) - (l.y - k.y) * (q.x - l.x); if (Math.abs(cr) < 0.5 && ((l.x - k.x) * (q.x - l.x) + (l.y - k.y) * (q.y - l.y)) > 0) { c[c.length - 1] = q; continue; } }
      c.push(q);
    }
    var d = 'M' + c[0].x.toFixed(1) + ' ' + c[0].y.toFixed(1);
    for (i = 1; i < c.length; i++) {
      var B = c[i], A = c[i - 1], C = c[i + 1];
      if (!C) { d += 'L' + B.x.toFixed(1) + ' ' + B.y.toFixed(1); break; }
      var ab = Math.hypot(B.x - A.x, B.y - A.y), bc = Math.hypot(C.x - B.x, C.y - B.y), r = Math.min(R, ab / 2, bc / 2);
      var p1x = B.x + (A.x - B.x) / ab * r, p1y = B.y + (A.y - B.y) / ab * r, p2x = B.x + (C.x - B.x) / bc * r, p2y = B.y + (C.y - B.y) / bc * r;
      d += 'L' + p1x.toFixed(1) + ' ' + p1y.toFixed(1) + 'Q' + B.x.toFixed(1) + ' ' + B.y.toFixed(1) + ' ' + p2x.toFixed(1) + ' ' + p2y.toFixed(1);
    }
    return d;
  };

  var rebuild = function () {
    var marks = Array.prototype.slice.call(main.querySelectorAll('[data-vp]')).filter(function (m) { return !m.closest('[hidden]') && m.offsetParent !== null; });
    var pts = [];
    marks.forEach(function (m) {
      var p = pos(m); if (!p) return;
      pts.push({ x: p.x, y: p.y, r: m.dataset.vpR || 'z', f: m.dataset.vpF == null ? 0.5 : +m.dataset.vpF, node: m.hasAttribute('data-vp-node'), el: m });
    });
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    drawn = []; pulses = []; dots = []; bands = []; ready = false;
    if (pts.length < 2) return;
    R = innerWidth < 720 ? 18 : 30;
    var d = route(pts), W = main.offsetWidth, defs = el('defs', {});
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + main.offsetHeight);
    svg.setAttribute('width', W); svg.setAttribute('height', main.offsetHeight);
    svg.appendChild(defs);
    master = el('path', { d: d, stroke: 'none' }); svg.appendChild(master);
    total = master.getTotalLength();
    // выборка длины: для каждой длины наибольшая достигнутая высота
    samples = []; var step = 10, my = -1e9, L, pt;
    for (L = 0; L <= total; L += step) { pt = master.getPointAtLength(L); if (pt.y > my) my = pt.y; samples.push(my); }
    Array.prototype.forEach.call(main.querySelectorAll(':scope > section'), function (sec, i) {
      var kind = sec.dataset.line || 'light', col = COLOR[kind] || COLOR.light, top = sec.offsetTop, h = sec.offsetHeight, id = 'vlc' + i;
      var cp = el('clipPath', { id: id }); cp.appendChild(el('rect', { x: -40, y: top, width: W + 80, height: h })); defs.appendChild(cp);
      var g = el('g', { 'clip-path': 'url(#' + id + ')', stroke: col });
      g.appendChild(el('path', { d: d, 'class': 'vl-ghost' }));
      var p = el('path', { d: d, 'class': 'vl-main' }); g.appendChild(p); drawn.push(p);
      var pu = el('path', { d: d, 'class': 'vl-pulse', stroke: kind === 'azure' ? '#000f40' : kind === 'dark' ? '#ffffff' : '#000f40' }); g.appendChild(pu); pulses.push(pu);
      svg.appendChild(g); bands.push({ top: top, bottom: top + h, col: col, bg: BG[kind] || BG.light });
    });
    var band = function (y) { for (var i = 0; i < bands.length; i++) if (y >= bands[i].top && y < bands[i].bottom) return bands[i]; return bands[0] || { col: COLOR.light, bg: BG.light }; };
    // узлы: найти длину пути, ближайшую к метке
    pts.forEach(function (p) {
      if (!p.node) return;
      var best = 0, bd = 1e9, l, q;
      for (l = 0; l <= total; l += 6) { q = master.getPointAtLength(l); var dd = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y); if (dd < bd) { bd = dd; best = l; } }
      var b = band(p.y), c = el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 5.5, 'class': 'vl-dot', stroke: b.col }); c.style.color = b.col; c.style.fill = b.bg;
      svg.appendChild(c); dots.push({ el: c, len: best, bg: b.bg, col: b.col });
    });
    head = el('path', { d: 'M-10 -7.5L0 0L-10 7.5', 'class': 'vl-head' }); head.__band = band; svg.appendChild(head);
    cur = Math.min(cur, total); ready = true; frame(performance.now(), true);
  };

  var lenAt = function (y) { // длина пути, до которой линия не опускается ниже y
    var lo = 0, hi = samples.length - 1;
    if (!samples.length || samples[0] > y) return 0;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (samples[mid] <= y) lo = mid; else hi = mid - 1; }
    return Math.min(total, lo * 10 + 10);
  };
  var frame = function (now, force) {
    if (!ready) return;
    var top = main.getBoundingClientRect().top, y = innerHeight * 0.64 - top;
    target = lenAt(y);
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 6) target = total;
    if (MV.reduce) cur = target; else cur += (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.4) cur = target;
    var da = cur.toFixed(1) + ' ' + (total + 20).toFixed(0), i;
    for (i = 0; i < drawn.length; i++) drawn[i].style.strokeDasharray = da;
    // импульс бежит по нарисованной части к стрелке
    var pp = MV.reduce ? -1 : (now * 0.34) % (cur + 900), pd = pp > 60 && pp < cur ? '0 ' + (pp - 60).toFixed(1) + ' 60 ' + (total + 20).toFixed(0) : '0 ' + (total + 20).toFixed(0);
    for (i = 0; i < pulses.length; i++) pulses[i].style.strokeDasharray = pd;
    if (cur > 14) {
      var a = master.getPointAtLength(cur), b = master.getPointAtLength(cur - 4), ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
      head.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
      head.setAttribute('stroke', head.__band(a.y).col); head.style.opacity = cur >= total - 1 ? 1 : 1;
    } else head.style.opacity = 0;
    for (i = 0; i < dots.length; i++) dots[i].el.style.fill = cur >= dots[i].len ? dots[i].col : dots[i].bg;
  };
  var rt = 0;
  MV.line = { rebuild: function () { cancelAnimationFrame(rt); rt = requestAnimationFrame(rebuild); }, state: function () { return { cur: cur, total: total }; } };
  MV.frames.push(frame);
  MV.line.rebuild();
})();

/* ===== Секции: указатель кейсов, макеты сайтов, колесо вопросов ===== */
(function () {
  'use strict';
  var MV = window.MV; if (!MV) return;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* вкладки, которые переключаются наведением (указатель кейсов) */
  if (MV.fine) {
    $$('[data-hover-tabs] [data-tab]').forEach(function (t) {
      t.addEventListener('pointerenter', function () { if (!t.classList.contains('is-on')) t.click(); });
    });
  }

  /* макеты страниц в секции сайтов: рисуем из одного описания, чтобы не повторять разметку пятнадцать раз */
  var MOCKS = {
    implant: { c: 'light', t: 'Имплантация зубов под ключ', s: 'Имплант, абатмент и коронка в одной цене', h: 'Цены под ключ', p: ['Имплант с коронкой', 'Костная пластика', 'Консультация и снимок'], d: 'Хирург-имплантолог' },
    allon4: { c: 'dark', t: 'Зубы на четырёх имплантах', s: 'All-on-4: протез ставят в день операции', h: 'Что входит в цену', p: ['Четыре импланта', 'Временный протез', 'Постоянный протез'], d: 'Хирург-имплантолог' },
    ortho: { c: 'azure', t: 'Элайнеры и брекеты', s: 'План лечения и цена известны до начала', h: 'Цены на лечение', p: ['Элайнеры', 'Брекеты', 'Ретейнеры'], d: 'Врач-ортодонт' },
    clinic: { c: 'fog', t: 'Стоматология рядом с домом', s: 'Врачи, цены и запись онлайн', h: 'Услуги и цены', p: ['Лечение кариеса', 'Имплантация', 'Исправление прикуса'], d: 'Главный врач' },
    doctors: { c: 'light', t: 'Наши врачи', s: 'Стаж, образование и документы каждого', h: 'Приём врачей', p: ['Терапевт', 'Хирург', 'Ортодонт'], d: 'Стоматолог-терапевт' }
  };
  function mockHTML(k) {
    var m = MOCKS[k] || MOCKS.implant;
    return '<div class="mk mk--' + m.c + '">' +
      '<div class="mk__bar"><i></i><span></span><span></span><span></span><b></b></div>' +
      '<div class="mk__hero"><div><p class="mk__t">' + m.t + '</p><p class="mk__s">' + m.s + '</p><p class="mk__btn">Записаться</p></div><div class="mk__pic"></div></div>' +
      '<div class="mk__row"><i></i><i></i><i></i></div>' +
      '<p class="mk__h">' + m.h + '</p>' +
      '<div class="mk__price">' + m.p.map(function (x) { return '<p><span>' + x + '</span><b></b></p>'; }).join('') + '</div>' +
      '<p class="mk__h">Врач</p>' +
      '<div class="mk__doc"><i></i><div><b>' + m.d + '</b><span></span><span></span></div></div>' +
      '<p class="mk__h">Этапы лечения</p>' +
      '<div class="mk__steps"><i></i><i></i><i></i><i></i></div>' +
      '<p class="mk__h">Отзывы</p>' +
      '<div class="mk__rev"><div><b>Яндекс Карты</b><span></span><span></span></div><div><b>ПроДокторов</b><span></span><span></span></div></div>' +
      '<p class="mk__lic">Имеются противопоказания. Необходима консультация специалиста. Лицензия на медицинскую деятельность</p>' +
      '</div>';
  }
  $$('.mock[data-mock]').forEach(function (el) { el.setAttribute('aria-hidden', 'true'); el.innerHTML = mockHTML(el.dataset.mock); });

  /* колесо вопросов из первого варианта сайта: на широком экране заменяет раскрывающийся список (переключают стили).
     Кольцо с делениями поворачивается целиком, выбранный вопрос встаёт против указателя, ответ меняется справа.
     Колесо замкнуто: после последнего вопроса идёт первый, кольцо продолжает вращаться в ту же сторону. */
  $$('[data-wheel]').forEach(function (qa) {
    var box = qa.parentElement, wheel = box.querySelector('.wheel'); if (!wheel) return;
    var items = $$('.qa__item', qa).map(function (d) { return { q: d.querySelector('.qa__q').innerHTML, a: d.querySelector('.qa__a').innerHTML }; });
    var N = items.length, STEP = 26, half = N >> 1;
    var ring = wheel.querySelector('.wheel__ring'), tabs = $$('.wheel__q', wheel), panel = wheel.querySelector('.wheel__panel');
    var title = wheel.querySelector('.wheel__title'), ans = wheel.querySelector('.wheel__a'), count = wheel.querySelector('.wheel__count b');
    var hub = wheel.querySelector('.wheel__hub canvas');
    if (!N || tabs.length !== N) return;
    var near = function (k) { return ((k % N) + N + half) % N - half; }; // смещение по кругу от -half до half - 1
    var cur = -1, pos = 0, swap;
    var pick = function (i, focus) {
      i = ((i % N) + N) % N;
      if (i === cur) return;
      var first = cur < 0;
      pos += first ? i : near(i - cur); cur = i;
      ring.style.setProperty('--rot', (-pos * STEP) + 'deg');
      tabs.forEach(function (t, k) {
        var o = near(k - cur), on = k === cur;
        t.style.setProperty('--a', ((pos + o) * STEP) + 'deg');
        t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; t.classList.toggle('is-far', Math.abs(o) > 2);
      });
      panel.setAttribute('aria-labelledby', tabs[cur].id);
      count.textContent = cur + 1;
      var fill = function () { title.innerHTML = items[cur].q; ans.innerHTML = items[cur].a; panel.classList.remove('is-swap'); };
      clearTimeout(swap);
      if (first || MV.reduce) fill(); else { panel.classList.add('is-swap'); swap = setTimeout(fill, 220); }
      if (focus) tabs[cur].focus({ preventScroll: true });
    };
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { pick(k); }); });
    $$('.wheel__btn', wheel).forEach(function (b) { b.addEventListener('click', function () { pick(cur + +b.dataset.step); }); });
    wheel.querySelector('.wheel__tabs').addEventListener('keydown', function (e) {
      var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); pick(cur + step, true); }
      else if (e.key === 'Home') { e.preventDefault(); pick(0, true); }
      else if (e.key === 'End') { e.preventDefault(); pick(N - 1, true); }
    });
    pick(0);
    // зуб в середине доворачивается вслед за колесом
    MV.frames.push(function () { var t = hub && hub.__tooth; if (t && t.state) t.state.extraYaw += (pos * 0.7 - t.state.extraYaw) * 0.06; });
  });
  /* стрелки на клавиатуре переключают вкладки */
  document.addEventListener('keydown', function (e) {
    var k = e.key, d = k === 'ArrowDown' || k === 'ArrowRight' ? 1 : k === 'ArrowUp' || k === 'ArrowLeft' ? -1 : 0;
    var tab = d && e.target.closest && e.target.closest('[role="tablist"] [data-tab]'); if (!tab) return;
    var tabs = $$('[data-tab]', tab.closest('[role="tablist"]')), next = tabs[(tabs.indexOf(tab) + d + tabs.length) % tabs.length];
    e.preventDefault(); next.click(); next.focus({ preventScroll: true });
  });

})();
