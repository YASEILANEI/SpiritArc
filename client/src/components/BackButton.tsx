interface Props {
  onClick: () => void
  className?: string
}

export default function BackButton({ onClick, className = '' }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-mystic-text/50 hover:text-mystic-gold transition-colors mb-4 ${className}`}
    >
      ← 返回
    </button>
  )
}
