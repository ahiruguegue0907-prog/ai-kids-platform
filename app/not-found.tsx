import Link from 'next/link'

// ✅ 404ページも動的にすることでビルドエラーを防ぐ
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <h2 className="text-4xl font-bold mb-4">404 - Not Found</h2>
      <p className="text-xl mb-8">お探しのページは見つかりませんでした。</p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-bold"
      >
        ホームに戻る
      </Link>
    </div>
  )
}
