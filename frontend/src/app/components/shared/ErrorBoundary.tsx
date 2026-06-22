import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100%", color: "var(--text-secondary)", fontSize: 13, padding: 40, textAlign: "center",
        }}>
          <p style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 600, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>Something went wrong</p>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 16, padding: "10px 24px", borderRadius: 12, border: "none", background: "var(--bg-sidebar)", color: "#FFFFFF", cursor: "pointer", fontWeight: 500 }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
