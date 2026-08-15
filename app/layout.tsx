import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pose Tracker Prototype',
  description: 'ブラウザベースのリアルタイム姿勢トラッキング',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      {/* Tailwindを利用して、画面全体をグレー背景にし、子要素を中央に配置する */}
      <body className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
        {children}
      </body>
    </html>
  );
}