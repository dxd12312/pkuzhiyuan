import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "高考志愿选择研究",
  description: "高考志愿选择行为研究实验平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
      </head>
      <body
        className="min-h-full flex flex-col antialiased"
        style={{ fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
