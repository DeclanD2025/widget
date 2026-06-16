interface Props {
  name: string
  colour: string
  size?: number
}

/** A premium club-crest avatar: a shield in the player's colour with their initial. */
export default function Crest({ name, colour, size = 80 }: Props) {
  const initial = (name.trim()[0] || 'C').toUpperCase()
  const id = `crest-${colour.replace('#', '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" aria-label={`${name} crest`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.95" />
          <stop offset="100%" stopColor={colour} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path
        d="M50 4 L92 18 V58 C92 84 72 100 50 106 C28 100 8 84 8 58 V18 Z"
        fill={`url(#${id})`}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2.5"
      />
      <path d="M50 4 L92 18 V58 C92 84 72 100 50 106 Z" fill="rgba(0,0,0,0.18)" />
      <text
        x="50"
        y="64"
        textAnchor="middle"
        fontFamily="'Saira Condensed', sans-serif"
        fontWeight="800"
        fontSize="52"
        fill="#fff"
      >
        {initial}
      </text>
    </svg>
  )
}
