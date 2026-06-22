import { SparkleIcon } from "./SparkleIcon";

export function AIRationale({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
      <SparkleIcon size={12} color="#DCC7F7" />
      <span style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
