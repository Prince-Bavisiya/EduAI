"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  fallbackRoute?: string;
  label?: string;
}

export default function BackButton({ fallbackRoute = "/", label = "Back" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackRoute);
    }
  };

  return (
    <button
      onClick={handleBack}
      type="button"
      className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1.5 py-1 mb-2 self-start"
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}
