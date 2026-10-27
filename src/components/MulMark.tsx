/**
 * MUL Digital beeldmerk — U-haak, 10° helling, scherpe hoeken.
 * Volgt de merkgids: streekdikte x, lange arm 7x, korte arm 3,5x.
 * Default = Papier-mark op Hook-vlak (primair gebruik).
 */
type Variant =
  | 'primary'   // papier-mark op hook-vlak        (sidebar brand, login)
  | 'secondary' // hook-mark op inkt-vlak          (dark mode / donkere headers)
  | 'ink'       // inkt-mark, geen vlak            (losse eenkleurige toepassing)
  | 'paper';    // papier-mark, geen vlak          (op donkere/hook achtergrond)

export default function MulMark({
  size = 20,
  variant = 'primary',
  className,
  withBlock = true,
  blockSize,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  withBlock?: boolean;
  blockSize?: number;
}) {
  const strokeColor =
    variant === 'primary' ? '#F7F5EF' :
    variant === 'secondary' ? '#FF4A12' :
    variant === 'paper' ? '#F7F5EF' :
    '#0D0D0D';

  const blockBg =
    variant === 'primary' ? '#FF4A12' :
    variant === 'secondary' ? '#0D0D0D' :
    'transparent';

  // Hoogte-naar-breedte: viewBox 64x90 → 0.711
  const svgHeight = size;
  const svgWidth = Math.round(size * (64 / 90));

  const svg = (
    <svg
      viewBox="0 0 64 90"
      width={svgWidth}
      height={svgHeight}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="translate(15.87,0) skewX(-10)">
        <path
          d="M 42 0 V 84 H 6 V 42"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </g>
    </svg>
  );

  if (!withBlock || blockBg === 'transparent') {
    return <span className={className}>{svg}</span>;
  }

  const bs = blockSize ?? Math.round(size * 1.5);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: blockBg,
        width: bs,
        height: bs,
        flex: 'none',
      }}
    >
      {svg}
    </span>
  );
}
