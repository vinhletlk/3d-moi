"use client";

import React from "react";
import type { CanvasProps } from "@react-three/fiber";
import dynamic from "next/dynamic";

function loadCanvas() {
  // Work-around for ReactCurrentOwner undefined bug in React 18 + r3f
  // See https://github.com/pmndrs/react-three-fiber/issues/2733
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internals: any = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  const prev = internals?.ReactCurrentOwner?.current;
  if (internals?.ReactCurrentOwner) internals.ReactCurrentOwner.current = null;

  return import("@react-three/fiber").then((mod) => {
    // restore previous owner after module executed
    if (internals?.ReactCurrentOwner) internals.ReactCurrentOwner.current = prev;
    return { default: mod.Canvas } as { default: React.ComponentType<CanvasProps> };
  });
}

const LazyCanvas = dynamic(loadCanvas, {
  ssr: false,
  loading: () => null,
});

export function SafeCanvas(props: CanvasProps) {
  return <LazyCanvas {...props} />;
}
