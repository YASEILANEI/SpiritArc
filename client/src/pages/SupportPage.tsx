import PageContainer from '../components/PageContainer'

export default function SupportPage() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="text-5xl text-mystic-gold/60 mb-6">♥</div>
        <h2 className="text-2xl font-serif text-mystic-gold mb-4">支持一下</h2>
        <div className="w-16 h-0.5 bg-mystic-gold/40 mx-auto mb-6 rounded-full" />
        <p className="text-mystic-text/40 text-sm max-w-xs leading-relaxed">
          内容待添加...
        </p>
      </div>
    </PageContainer>
  )
}
