# PWA 用の PNG アイコンを生成するスクリプト（候補1「的＋ダーツ」デザイン）
# 追加パッケージ不要（Python 標準ライブラリのみ）
# 実行: py icons/gen_icons.py
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))

BG = (16, 24, 40)        # #101828
CREAM = (245, 241, 230)  # #f5f1e6
RED = (232, 69, 60)      # #e8453c
SHAFT = (201, 210, 227)  # #c9d2e3
FLIGHT = (244, 182, 63)  # #f4b63f

SS = 2  # スーパーサンプリング倍率（縮小平均でエッジを滑らかに）


class Canvas:
    def __init__(self, size):
        self.s = size * SS
        self.scale_512 = self.s / 512.0
        self.buf = bytearray(self.s * self.s * 4)  # RGBA、初期は透明

    def px(self, v):
        return v * self.scale_512

    def set(self, x, y, c):
        i = (y * self.s + x) * 4
        self.buf[i] = c[0]
        self.buf[i + 1] = c[1]
        self.buf[i + 2] = c[2]
        self.buf[i + 3] = 255

    def fill_rounded_rect(self, rad, c):
        s, r = self.s, self.px(rad)
        r2 = r * r
        for y in range(s):
            for x in range(s):
                cx = r if x < r else (s - r if x > s - r else None)
                cy = r if y < r else (s - r if y > s - r else None)
                if cx is not None and cy is not None:
                    dx, dy = x + 0.5 - cx, y + 0.5 - cy
                    if dx * dx + dy * dy > r2:
                        continue
                self.set(x, y, c)

    def fill_rect_full(self, c):
        for y in range(self.s):
            for x in range(self.s):
                self.set(x, y, c)

    def fill_circle(self, cx, cy, r, c):
        cx, cy, r = self.px(cx), self.px(cy), self.px(r)
        r2 = r * r
        x0, x1 = max(0, int(cx - r - 1)), min(self.s - 1, int(cx + r + 1))
        y0, y1 = max(0, int(cy - r - 1)), min(self.s - 1, int(cy + r + 1))
        for y in range(y0, y1 + 1):
            dy = y + 0.5 - cy
            dy2 = dy * dy
            for x in range(x0, x1 + 1):
                dx = x + 0.5 - cx
                if dx * dx + dy2 <= r2:
                    self.set(x, y, c)

    def thick_line(self, x1, y1, x2, y2, w, c):
        # 両端が丸いカプセル形
        x1, y1, x2, y2, hw = self.px(x1), self.px(y1), self.px(x2), self.px(y2), self.px(w) / 2
        hw2 = hw * hw
        vx, vy = x2 - x1, y2 - y1
        ll = vx * vx + vy * vy or 1.0
        x0, xx1 = max(0, int(min(x1, x2) - hw - 1)), min(self.s - 1, int(max(x1, x2) + hw + 1))
        y0, yy1 = max(0, int(min(y1, y2) - hw - 1)), min(self.s - 1, int(max(y1, y2) + hw + 1))
        for y in range(y0, yy1 + 1):
            py = y + 0.5
            for x in range(x0, xx1 + 1):
                pxx = x + 0.5
                t = ((pxx - x1) * vx + (py - y1) * vy) / ll
                t = 0.0 if t < 0 else (1.0 if t > 1 else t)
                dx, dy = pxx - (x1 + t * vx), py - (y1 + t * vy)
                if dx * dx + dy * dy <= hw2:
                    self.set(x, y, c)

    def fill_triangle(self, p1, p2, p3, c):
        pts = [(self.px(p[0]), self.px(p[1])) for p in (p1, p2, p3)]
        (ax, ay), (bx, by), (cx, cy) = pts
        x0 = max(0, int(min(ax, bx, cx)))
        x1 = min(self.s - 1, int(max(ax, bx, cx)) + 1)
        y0 = max(0, int(min(ay, by, cy)))
        y1 = min(self.s - 1, int(max(ay, by, cy)) + 1)
        for y in range(y0, y1 + 1):
            py = y + 0.5
            for x in range(x0, x1 + 1):
                pxx = x + 0.5
                d1 = (bx - ax) * (py - ay) - (by - ay) * (pxx - ax)
                d2 = (cx - bx) * (py - by) - (cy - by) * (pxx - bx)
                d3 = (ax - cx) * (py - cy) - (ay - cy) * (pxx - cx)
                neg = d1 < 0 or d2 < 0 or d3 < 0
                pos = d1 > 0 or d2 > 0 or d3 > 0
                if not (neg and pos):
                    self.set(x, y, c)

    def downsample(self):
        # SS×SS の平均で目的サイズに縮小
        out_s = self.s // SS
        out = bytearray(out_s * out_s * 4)
        for y in range(out_s):
            for x in range(out_s):
                r = g = b = a = 0
                for dy in range(SS):
                    row = ((y * SS + dy) * self.s + x * SS) * 4
                    for dx in range(SS):
                        i = row + dx * 4
                        r += self.buf[i]
                        g += self.buf[i + 1]
                        b += self.buf[i + 2]
                        a += self.buf[i + 3]
                n = SS * SS
                o = (y * out_s + x) * 4
                out[o] = r // n
                out[o + 1] = g // n
                out[o + 2] = b // n
                out[o + 3] = a // n
        return out_s, out


def write_png(path, w, rgba):
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xFFFFFFFF)

    raw = b''.join(b'\x00' + bytes(rgba[y * w * 4:(y + 1) * w * 4]) for y in range(w))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, w, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    print('wrote', path)


def draw_icon(size, maskable=False):
    cv = Canvas(size)
    if maskable:
        # maskable は全面塗り + 中央約 80% に収める
        cv.fill_rect_full(BG)
        sc, off = 0.78, 0.11 * 512
    else:
        cv.fill_rounded_rect(104, BG)
        sc, off = 1.0, 0.0

    def t(v):
        return v * sc + off

    # 的
    cv.fill_circle(t(246), t(286), 172 * sc, CREAM)
    cv.fill_circle(t(246), t(286), 132 * sc, RED)
    cv.fill_circle(t(246), t(286), 92 * sc, CREAM)
    cv.fill_circle(t(246), t(286), 52 * sc, RED)
    # ダーツ（シャフト + フライト）
    cv.thick_line(t(246), t(286), t(408), t(112), 22 * sc, SHAFT)
    cv.fill_triangle((t(396), t(100)), (t(478), t(84)), (t(432), t(30)), FLIGHT)
    # ブルの刺さり点
    cv.fill_circle(t(246), t(286), 14 * sc, BG)

    w, data = cv.downsample()
    return w, data


if __name__ == '__main__':
    for size, name, mask in [(512, 'icon-512.png', False),
                             (192, 'icon-192.png', False),
                             (512, 'icon-maskable-512.png', True)]:
        w, data = draw_icon(size, mask)
        write_png(os.path.join(HERE, name), w, data)
