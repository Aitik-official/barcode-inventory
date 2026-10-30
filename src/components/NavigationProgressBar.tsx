"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress on pathname or searchParams change
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept click on links to show instant 0ms feedback
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Only trigger for internal links that differ from current location
      if (
        href.startsWith("/") &&
        !href.startsWith("//") &&
        target.getAttribute("target") !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const targetPath = href.split("?")[0].split("#")[0];
        const currentPath = window.location.pathname;

        // Trigger if going to a different route or sub-route
        if (targetPath !== currentPath || href !== window.location.pathname + window.location.search) {
          setIsNavigating(true);
          setProgress(25);

          // Animate gradually while waiting
          setTimeout(() => setProgress((p) => (p === 25 ? 65 : p)), 150);
          setTimeout(() => setProgress((p) => (p === 65 ? 85 : p)), 400);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[#056468] via-[#14b8a6] to-[#34d399] transition-all duration-300 ease-out shadow-[0_0_10px_#14b8a6]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
