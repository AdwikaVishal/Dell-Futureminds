const CARD = "#161D19";
const BORDER = "#232B26";

export function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 11,
        padding: "16px 18px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
