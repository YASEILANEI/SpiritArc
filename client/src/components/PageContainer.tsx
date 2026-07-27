import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export default function PageContainer({ children, className = '' }: Props) {
  return (
    <div className={`min-h-screen pt-16 px-4 pb-6 ${className}`}>
      <div className="w-full max-w-lg mx-auto">
        {children}
      </div>
    </div>
  )
}
