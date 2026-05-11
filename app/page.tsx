import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-zinc-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">高考志愿选择行为研究</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">北京大学 × Maestro AI</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <p className="text-sm text-zinc-600 text-center leading-relaxed">
            本研究旨在了解高考考生在志愿填报过程中的决策行为与偏好。
          </p>
          <Link
            href="/s/demo"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            进入演示
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
