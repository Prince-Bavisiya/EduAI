"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student?tab=profile");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 font-medium animate-pulse">Loading Profile...</div>
    </div>
  );
}
