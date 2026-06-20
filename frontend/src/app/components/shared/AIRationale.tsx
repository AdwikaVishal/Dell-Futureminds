import { SparkleIcon } from "./SparkleIcon";

const SAGE = "#8FCBA8";

export function AIRationale({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 10 }}>
      <span style={{ marginTop: 1, flexShrink: 0 }}>
        <SparkleIcon size={12} />
      </span>
      <span style={{ color: SAGE, fontSize: 12, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
