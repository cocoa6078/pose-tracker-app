'use client'; // 修正点: このページ全体をクライアントコンポーネントとして宣言する

import dynamic from 'next/dynamic';

// サーバーサイドレンダリング（SSR）を無効にしてコンポーネントを動的にインポートする。
// クライアントコンポーネント内でのみ ssr: false が許可されます。
const PoseTracker = dynamic(() => import('../components/PoseTracker'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[640px] mx-auto h-[480px] flex items-center justify-center bg-gray-200 rounded-lg shadow-xl">
      <p className="text-gray-600 font-bold animate-pulse">コンポーネントを読み込み中...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
          姿勢トラッキング・プロトタイプ
        </h1>
        <p className="text-gray-600">
          TensorFlow.js (MoveNet) を使用したリアルタイムの関節検知
        </p>
      </div>

      {/* 動的にインポートされた姿勢トラッキングコンポーネントのマウント */}
      <PoseTracker />
    </main>
  );
}