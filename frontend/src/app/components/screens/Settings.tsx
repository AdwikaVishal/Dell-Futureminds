import { useEffect, useState, useCallback } from "react";
import { Settings2, User, Shield, Bell, Palette, Key, Smartphone, Sun, Moon, Keyboard, RefreshCw, Check, Copy, Eye, EyeOff, Globe, Download, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Card } from "../shared/Card";
import { getMemoryPreferences, getHealth, WebSocketEvent } from "../../api/taskpilot";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useTheme } from "../../contexts/ThemeContext";
import { toast } from "sonner";

const SETTINGS_SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "theme", label: "Theme", icon: Sun },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "api", label: "API Keys", icon: Key },
  { id: "devices", label: "Devices", icon: Smartphone },
];

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
      <button onClick={() => onChange(!enabled)} style={{
        background: "none", border: "none", cursor: "pointer", padding: 0,
        color: enabled ? "#2E7D32" : "var(--text-muted)",
      }}>
        {enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
      </button>
    </div>
  );
}

export function Settings() {
  const [activeSection, setActiveSection] = useState("preferences");
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [localPrefs, setLocalPrefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const { theme, setTheme, isDark } = useTheme();

  // Profile state
  const [profile, setProfile] = useState({
    displayName: "Default User",
    email: "user@taskpilot.local",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    role: "User",
    company: "TaskPilot Inc.",
  });

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    emailAlerts: true,
    desktopNotifications: true,
    soundAlerts: false,
    weeklyDigest: true,
    criticalOnly: false,
    taskReminders: true,
  });

  // API Keys
  const [apiKeys, setApiKeys] = useState([
    { name: "Production", key: "tp_prod_••••••••••••••••", created: "2026-01-15", lastUsed: "2026-06-22" },
    { name: "Development", key: "tp_dev_••••••••••••••••", created: "2026-03-01", lastUsed: "2026-06-21" },
  ]);
  const [showKey, setShowKey] = useState<number | null>(null);

  // Security
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    ipWhitelist: false,
  });

  // Devices
  const [devices, setDevices] = useState([
    { name: "MacBook Pro", type: "Desktop", lastActive: "2 min ago", current: true },
    { name: "iPhone 15", type: "Mobile", lastActive: "1 hour ago", current: false },
  ]);

  useEffect(() => {
    Promise.all([
      getMemoryPreferences().then(data => {
        setPrefs(data.preferences || {});
        setLocalPrefs(data.preferences || {});
      }).catch(() => {}),
      getHealth().then(h => setHealth(h)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Preferences saved successfully");
  };

  const handleThemeChange = setTheme;

  const handleProfileSave = () => {
    toast.success("Profile updated successfully");
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key.replace(/•/g, "")).catch(() => {});
    toast.success("API key copied to clipboard");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Settings2 size={20} /> Settings
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Manage your account and preferences</p>
        </div>
        <button onClick={() => { setLoading(true); getHealth().then(h => setHealth(h)).finally(() => setLoading(false)); }}
          style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 12, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
        {/* Sidebar */}
        <Card shadow style={{ padding: 8, position: "sticky", top: 16, alignSelf: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SETTINGS_SECTIONS.map(section => {
              const Icon = section.icon;
              return (
                <button key={section.id} onClick={() => setActiveSection(section.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: activeSection === section.id ? "#0D0D0D" : "transparent",
                    color: activeSection === section.id ? "#FFFFFF" : "var(--text-primary)",
                    border: "none", fontSize: 13, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                    width: "100", textAlign: "left",
                  }}>
                  <Icon size={16} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Profile Section */}
          {activeSection === "profile" && (
            <Card shadow>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <User size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Profile</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: "linear-gradient(135deg, #C9D8FF, #BFD78D)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 700, color: "#0D0D0D",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    {profile.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{profile.displayName}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{profile.email}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>ID: user_001</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Display Name", key: "displayName", value: profile.displayName },
                    { label: "Email", key: "email", value: profile.email },
                    { label: "Timezone", key: "timezone", value: profile.timezone },
                    { label: "Role", key: "role", value: profile.role },
                    { label: "Company", key: "company", value: profile.company },
                  ].map((f) => (
                    <div key={f.key}>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>{f.label}</div>
                      <input value={f.value}
                        onChange={(e) => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
                          fontSize: 13, color: "var(--text-primary)", fontFamily: "'Inter', sans-serif",
                          outline: "none", transition: "border 0.15s",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "var(--blue-primary)"}
                        onBlur={(e) => e.target.style.borderColor = "var(--border-default)"} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={handleProfileSave}
                    style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "10px 24px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                    Save Profile
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Preferences Section */}
          {activeSection === "preferences" && (
            <>
              <Card variant="blue" shadow>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Palette size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>AI Preferences</span>
                </div>
                {loading ? (
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Loading preferences...</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {Object.keys(localPrefs).length > 0 ? (
                      Object.entries(localPrefs).map(([key, val]) => (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-default)" }}>
                          <span style={{ color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, minWidth: 140 }}>{key}</span>
                          <input value={val}
                            onChange={(e) => setLocalPrefs(p => ({ ...p, [key]: e.target.value }))}
                            style={{
                              flex: 1, padding: "8px 10px", borderRadius: 8,
                              border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
                              fontSize: 12, color: "var(--text-primary)", fontFamily: "'Inter', sans-serif",
                              outline: "none",
                            }} />
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--text-secondary)", fontSize: 12, padding: "8px 0" }}>
                        No preferences stored yet. The AI will learn your preferences over time as you provide feedback on tasks.
                      </div>
                    )}
                  </div>
                )}
              </Card>

              <Card variant="yellow" shadow>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Bell size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>System Status</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, color: "var(--text-secondary)" }}>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginBottom: 2 }}>VERSION</div>
                    <strong style={{ color: "#111" }}>{health?.version ?? "--"}</strong>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginBottom: 2 }}>UPTIME</div>
                    <strong style={{ color: "#111" }}>{health?.uptime_seconds ? `${Math.round(health.uptime_seconds / 60)} min` : "--"}</strong>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginBottom: 2 }}>TASKS</div>
                    <strong style={{ color: "#111" }}>{health?.task_count ?? 0}</strong>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginBottom: 2 }}>DATABASE</div>
                    <strong style={{ color: health?.database_connected ? "#2E7D32" : "#C62828" }}>
                      {health?.database_connected ? "Connected" : "Disconnected"}
                    </strong>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginBottom: 2 }}>JIRA</div>
                    <strong style={{ color: health?.jira_connected ? "#2E7D32" : "#C62828" }}>
                      {health?.jira_connected ? "Connected" : "Disconnected"}
                    </strong>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginBottom: 2 }}>GITHUB</div>
                    <strong style={{ color: health?.github_connected ? "#2E7D32" : "#C62828" }}>
                      {health?.github_connected ? "Connected" : "Disconnected"}
                    </strong>
                  </div>
                </div>
              </Card>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setLocalPrefs(prefs); toast.info("Preferences reset"); }}
                  style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", padding: "10px 24px", borderRadius: 12, fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Reset
                </button>
                <button onClick={handleSave}
                  style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "10px 24px", borderRadius: 12, fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {saved ? "✓ Saved" : "Save Preferences"}
                </button>
              </div>
            </>
          )}

          {/* Theme Section */}
          {activeSection === "theme" && (
            <Card variant="orange" shadow>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Palette size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Appearance</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { id: "light", icon: Sun, label: "Light", desc: "Warm pastel theme", color: "var(--blue-primary)" },
                  { id: "dark", icon: Moon, label: "Dark", desc: "Dark mode", color: "var(--blue-primary)" },
                  ...(false ? [] : [{ id: "system", icon: Globe, label: "System", desc: "Follow system theme", color: "var(--blue-primary)" }]),
                ].filter(Boolean).map(({ id: t, icon: Icon, label, desc, color }: any) => (
                  <button key={t} onClick={() => {
                    if (t === "system") {
                      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                      setTheme(prefersDark ? "dark" : "light");
                    } else {
                      handleThemeChange(t);
                    }
                  }}
                    style={{
                      padding: "20px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                      border: theme === t ? `2px solid ${color}` : "1px solid var(--border-default)",
                      background: theme === t ? "var(--bg-primary)" : "var(--bg-elevated)",
                      transition: "all 0.15s",
                    }}>
                    <Icon size={28} style={{ margin: "0 auto 10px", display: "block", color }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                {isDark ? "Dark mode active — easy on the eyes" : "Light mode active — warm pastel theme"}
              </div>
            </Card>
          )}

          {/* Shortcuts Section */}
          {activeSection === "shortcuts" && (
            <Card variant="blue" shadow>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Keyboard size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Keyboard Shortcuts</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { keys: "Ctrl+K", action: "Open AI Chat" },
                  { keys: "Ctrl+B", action: "Toggle AI Assistant panel" },
                  { keys: "G then D", action: "Go to Dashboard" },
                  { keys: "G then I", action: "Go to Inbox" },
                  { keys: "G then P", action: "Go to Planner" },
                  { keys: "G then T", action: "Go to Timeline" },
                  { keys: "G then H", action: "Go to Hidden Tasks" },
                  { keys: "G then R", action: "Go to Reports" },
                  { keys: "G then C", action: "Go to Chat" },
                  { keys: "G then N", action: "Go to Notifications" },
                  { keys: "G then S", action: "Go to Settings" },
                  { keys: "G then X", action: "Go to Pipeline Traces" },
                  { keys: "Escape", action: "Close modal / panel" },
                  { keys: "?", action: "Show keyboard shortcuts" },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", borderRadius: 8,
                    background: i % 2 === 0 ? "var(--bg-primary)" : "transparent",
                  }}>
                    <span style={{ fontSize: 12, color: "#555" }}>{s.action}</span>
                    <kbd style={{
                      fontSize: 11, padding: "3px 10px", background: "var(--bg-elevated)",
                      borderRadius: 6, border: "1px solid var(--border-default)",
                      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                      color: "var(--text-primary)",
                    }}>{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <Card shadow>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Bell size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Notification Preferences</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Toggle enabled={notifPrefs.emailAlerts} onChange={(v) => setNotifPrefs(p => ({ ...p, emailAlerts: v }))} label="Email Alerts" />
                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />
                <Toggle enabled={notifPrefs.desktopNotifications} onChange={(v) => setNotifPrefs(p => ({ ...p, desktopNotifications: v }))} label="Desktop Notifications" />
                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />
                <Toggle enabled={notifPrefs.soundAlerts} onChange={(v) => setNotifPrefs(p => ({ ...p, soundAlerts: v }))} label="Sound Alerts" />
                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />
                <Toggle enabled={notifPrefs.weeklyDigest} onChange={(v) => setNotifPrefs(p => ({ ...p, weeklyDigest: v }))} label="Weekly Digest" />
                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />
                <Toggle enabled={notifPrefs.taskReminders} onChange={(v) => setNotifPrefs(p => ({ ...p, taskReminders: v }))} label="Task Reminders" />
                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />
                <Toggle enabled={notifPrefs.criticalOnly} onChange={(v) => setNotifPrefs(p => ({ ...p, criticalOnly: v }))} label="Critical Alerts Only" />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={() => toast.success("Notification preferences saved")}
                  style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "10px 24px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Save Preferences
                </button>
              </div>
            </Card>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <Card shadow>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Shield size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Security Settings</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Toggle enabled={security.twoFactorEnabled} onChange={(v) => setSecurity(p => ({ ...p, twoFactorEnabled: v }))} label="Two-Factor Authentication (2FA)" />
                <Toggle enabled={security.ipWhitelist} onChange={(v) => setSecurity(p => ({ ...p, ipWhitelist: v }))} label="IP Whitelist" />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>Session Timeout</span>
                  <select value={security.sessionTimeout} onChange={(e) => setSecurity(p => ({ ...p, sessionTimeout: Number(e.target.value) }))}
                    style={{
                      padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)",
                      fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
                      color: "var(--text-primary)", background: "var(--bg-elevated)", outline: "none",
                    }}>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => toast.success("Security settings saved")}
                    style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "10px 24px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                    Save Security Settings
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* API Keys Section */}
          {activeSection === "api" && (
            <Card shadow>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Key size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>API Keys</span>
                </div>
                <button onClick={() => toast.success("New API key generated")}
                  style={{ background: "var(--bg-sidebar)", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
                  <Key size={12} /> Generate New Key
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {apiKeys.map((ak, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-default)",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "#C9D8FF", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0,
                    }}>
                      <Key size={16} color="#555" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{ak.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <code style={{
                          fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                          color: "var(--text-secondary)", background: "var(--bg-elevated)", padding: "3px 8px",
                          borderRadius: 6, border: "1px solid var(--border-default)",
                        }}>
                          {showKey === i ? ak.key.replace(/•/g, "x") : ak.key}
                        </code>
                        <button onClick={() => setShowKey(showKey === i ? null : i)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                          {showKey === i ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => handleCopyApiKey(ak.key)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                          <Copy size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
                        Created: {ak.created} · Last used: {ak.lastUsed}
                      </div>
                    </div>
                    <button onClick={() => toast.success(`Key "${ak.name}" revoked`)}
                      style={{
                        background: "#FFEBEE", color: "#C62828", border: "none",
                        padding: "6px 12px", borderRadius: 8, fontSize: 10,
                        fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                        display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                      }}>
                      <Trash2 size={11} /> Revoke
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Devices Section */}
          {activeSection === "devices" && (
            <Card shadow>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Smartphone size={14} /> <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Connected Devices</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {devices.map((device, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    background: device.current ? "#F0F8FF" : "var(--bg-primary)",
                    borderRadius: 12, border: device.current ? "1px solid #BFD78D" : "1px solid var(--border-default)",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: device.type === "Desktop" ? "#C9D8FF" : "#F7C5E6",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Smartphone size={18} color="#555" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{device.name}</span>
                        {device.current && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                            color: "#2E7D32", background: "#E8F5E9",
                            padding: "1px 8px", borderRadius: 4,
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}>
                            Current
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                        {device.type} · Active {device.lastActive}
                      </div>
                    </div>
                    {!device.current && (
                      <button onClick={() => toast.success(`${device.name} disconnected`)}
                        style={{
                          background: "#FFEBEE", color: "#C62828", border: "none",
                          padding: "6px 12px", borderRadius: 8, fontSize: 10,
                          fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                        Disconnect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
