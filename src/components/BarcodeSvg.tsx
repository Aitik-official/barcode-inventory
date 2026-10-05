"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type Props = {
  barcode?: string;
  value?: string;
  displayValue?: boolean;
  height?: number;
  width?: number;
  fontSize?: number;
  className?: string;
};

export function BarcodeSvg({
  barcode,
  value,
  displayValue = true,
  height = 50,
  width = 1.5,
  fontSize = 12,
  className,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const textValue = barcode || value || "";

  useEffect(() => {
    if (!ref.current || !textValue) return;
    try {
      JsBarcode(ref.current, textValue, {
        format: "CODE128",
        displayValue,
        height,
        width,
        fontSize,
        margin: 4,
        background: "#ffffff",
        lineColor: "#111111",
      });
    } catch {
      // invalid value for Code128 — leave blank
    }
  }, [textValue, displayValue, height, width, fontSize]);

  return <svg ref={ref} className={className} />;
}
