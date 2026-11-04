import { useMemo } from 'react'

type Props = {
  /** Chuỗi để sinh hoa văn — cùng chuỗi cho cùng một mã QR. */
  seed: string
  size?: number
  /** Màu các ô đen của mã QR. */
  color?: string
  /** Chữ in ở giữa mã (logo MoMo / VNPay). */
  logoText?: string
  logoBg?: string
}

const N = 29 // số ô mỗi cạnh (giống QR phiên bản 3)

const hashSeed = (text: string): number => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Bộ sinh số giả ngẫu nhiên cố định (mulberry32)
const makeRandom = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Dựng ma trận ô đen/trắng trông giống mã QR thật (có 3 ô định vị, đường kẻ timing, ô căn chỉnh). */
const buildMatrix = (seed: string): boolean[][] => {
  const rnd = makeRandom(hashSeed(seed))
  const m: boolean[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => rnd() > 0.5))

  const clearArea = (r0: number, c0: number, size: number) => {
    for (let r = r0; r < r0 + size; r++) {
      for (let c = c0; c < c0 + size; c++) {
        if (r >= 0 && r < N && c >= 0 && c < N) m[r][c] = false
      }
    }
  }

  const finder = (r0: number, c0: number) => {
    clearArea(r0 - 1, c0 - 1, 9) // vùng trắng bao quanh
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const ring = r === 0 || r === 6 || c === 0 || c === 6
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
        if (r0 + r < N && c0 + c < N) m[r0 + r][c0 + c] = ring || core
      }
    }
  }
  finder(0, 0)
  finder(0, N - 7)
  finder(N - 7, 0)

  // Đường timing
  for (let i = 8; i < N - 8; i++) {
    m[6][i] = i % 2 === 0
    m[i][6] = i % 2 === 0
  }

  // Ô căn chỉnh góc dưới phải
  const ar = N - 9
  clearArea(ar - 1, ar - 1, 7)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      m[ar + r][ar + c] = r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2)
    }
  }

  // Chừa chỗ cho logo ở giữa
  clearArea(Math.floor(N / 2) - 3, Math.floor(N / 2) - 3, 7)
  return m
}

/**
 * Mã QR GIẢ LẬP phục vụ trang thanh toán demo. Đây chỉ là hình vẽ giống QR, không chứa dữ liệu
 * thật nên quét bằng điện thoại sẽ không ra gì.
 */
function FakeQr({ seed, size = 220, color = '#111827', logoText, logoBg = '#ffffff' }: Props) {
  const matrix = useMemo(() => buildMatrix(seed), [seed])
  const quiet = 2
  const total = N + quiet * 2

  const path = useMemo(() => {
    const parts: string[] = []
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (matrix[r][c]) parts.push(`M${c + quiet} ${r + quiet}h1v1h-1z`)
      }
    }
    return parts.join('')
  }, [matrix])

  const logoSize = 6
  const center = total / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label="Mã QR giả lập"
      shapeRendering="crispEdges"
      style={{ background: '#fff' }}
    >
      <path d={path} fill={color} />
      {logoText && (
        <g>
          <rect x={center - logoSize / 2} y={center - logoSize / 2} width={logoSize} height={logoSize} rx={1.2} fill={logoBg} stroke="#fff" strokeWidth={0.5} />
          <text
            x={center}
            y={center + 1.1}
            textAnchor="middle"
            fontSize={3.4}
            fontWeight={800}
            fill={color === '#111827' ? '#111827' : color}
            fontFamily="Arial, Helvetica, sans-serif"
          >
            {logoText}
          </text>
        </g>
      )}
    </svg>
  )
}

export default FakeQr
