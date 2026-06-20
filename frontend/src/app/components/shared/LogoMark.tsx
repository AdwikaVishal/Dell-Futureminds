import { SparkleIcon } from "./SparkleIcon";

const BORDER = "#232B26";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: "linear-gradient(135deg, #1a3d2b 0%, #0f2419 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${BORDER}`,
      }}
    >
      <SparkleIcon size={size * 0.55} />
    </div>
  );
}
