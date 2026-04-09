import { useState, useEffect, useRef } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_KEY_USER = "tdx_user";
const STORAGE_KEY_LOGS = "tdx_usage_logs";

// ── Topic classifier ──────────────────────────────────────────────────────────
function classifyTopic(question) {
  const q = question.toLowerCase();
  if (/integrat|api|odata|rest|soap|service bus|azure|middleware|webhook/.test(q)) return "Integration";
  if (/test|uat|defect|bug|qa|test case|scenario/.test(q)) return "Testing";
  if (/deploy|release|lcs|pipeline|devops|go.live|cutover/.test(q)) return "Deployment";
  if (/design|hld|lld|architect|sdd|tdd/.test(q)) return "Architecture";
  if (/backlog|sprint|user stor|agile|scrum|velocity|epic/.test(q)) return "Agile";
  if (/secur|role|permission|aad|auth|compliance/.test(q)) return "Security";
  if (/migrat|data|import|export|entity|dmf/.test(q)) return "Data Migration";
  if (/finance|ap|ar|gl|ledger|invoice|payment|budget/.test(q)) return "Finance";
  if (/supply|scm|purchase|vendor|inventory|warehouse|wms/.test(q)) return "SCM";
  if (/sales|crm|customer|lead|opportunit|ce|d365 sales/.test(q)) return "CRM / Sales";
  if (/document|report|template|word|excel|pdf/.test(q)) return "Documentation";
  return "General";
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a Senior Microsoft Dynamics 365 Technical Architect and Functional Consultant with 15+ years of experience across D365 Finance & Operations, D365 CE (CRM), Power Platform, and Azure integrations.

You help project teams with:
- Business process mapping and solution architecture
- D365 F&O module guidance (Finance, SCM, WMS, TMS, Project Accounting)
- D365 CE / CRM (Sales, Customer Service, Field Service)
- Integration patterns (OData, REST API, Azure Service Bus, Dual-write, Logic Apps)
- Data migration strategies (DMF, data entities, BYOD)
- Security roles, compliance, and Azure AD
- Testing strategies (unit, integration, UAT, performance)
- ALM, Azure DevOps, LCS deployments
- Agile artifacts (epics, user stories, sprint planning)
- Documentation (HLD, LLD, TDD, BRD, SDD, test cases, release notes)

Your responses are:
- Precise and technically accurate for D365 context
- Structured with clear headings when the answer is complex
- Enriched with real D365 examples (module names, data entities, table names, menu paths)
- Professional consulting grade — suitable for client-facing delivery
- Concise for simple questions, detailed for architectural or complex ones

Always reference specific D365 modules, standard data entities (e.g., SalesOrderHeadersV2Entity, VendInvoiceInfoTable), and Azure services where relevant. Never give generic textbook answers.`;

// ── Icons (SVG inline) ────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const BotIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    <line x1="12" y1="3" x2="12" y2="7"/><circle cx="8.5" cy="16.5" r="1.5"/><circle cx="15.5" cy="16.5" r="1.5"/>
  </svg>
);
const LogIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const ClearIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const TOPIC_COLORS = {
  "Integration":    { bg: "#E6F1FB", text: "#0C447C", border: "#85B7EB" },
  "Testing":        { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
  "Deployment":     { bg: "#FAEEDA", text: "#633806", border: "#EF9F27" },
  "Architecture":   { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" },
  "Agile":          { bg: "#FBEAF0", text: "#72243E", border: "#ED93B1" },
  "Security":       { bg: "#FCEBEB", text: "#791F1F", border: "#F09595" },
  "Data Migration": { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5" },
  "Finance":        { bg: "#E6F1FB", text: "#185FA5", border: "#378ADD" },
  "SCM":            { bg: "#EAF3DE", text: "#27500A", border: "#639922" },
  "CRM / Sales":    { bg: "#FAECE7", text: "#712B13", border: "#F0997B" },
  "Documentation":  { bg: "#F1EFE8", text: "#444441", border: "#B4B2A9" },
  "General":        { bg: "#F1EFE8", text: "#5F5E5A", border: "#B4B2A9" },
};

const SUGGESTED = [
  "How do I integrate D365 F&O with a 3PL via REST API?",
  "What data entities are used for Sales Order processing?",
  "How do I set up Business Events in D365 F&O?",
  "Explain the Dual-write architecture between D365 F&O and CE",
  "What is the best ALM strategy using Azure DevOps for D365?",
  "How do I configure security roles in D365 Finance?",
  "What are the steps for a D365 data migration using DMF?",
  "How do I create a test plan for UAT in D365?",
];

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:14px 0 4px;color:inherit">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:600;margin:16px 0 5px;color:inherit">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:16px;font-weight:700;margin:18px 0 6px;color:inherit">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 5px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin:3px 0 3px 16px;list-style:disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:3px 0 3px 16px;list-style:decimal">$2</li>')
    .replace(/\n{2,}/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.)/m, '<p style="margin:0">$1')
    + '</p>';
}

export default function PMOAgent() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState("login"); // login | chat | logs
  const [user, setUser] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("All");
  const [logsOpen, setLogsOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load persisted data ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedUser = window.storage ? null : JSON.parse(sessionStorage.getItem(STORAGE_KEY_USER) || "null");
      if (savedUser) { setUser(savedUser); setScreen("chat"); }
    } catch {}
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const result = await window.storage.get(STORAGE_KEY_LOGS, true);
      if (result) setLogs(JSON.parse(result.value));
    } catch {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY_LOGS);
        if (raw) setLogs(JSON.parse(raw));
      } catch {}
    }
  }

  async function saveLogs(updatedLogs) {
    try {
      await window.storage.set(STORAGE_KEY_LOGS, JSON.stringify(updatedLogs), true);
    } catch {
      try { sessionStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updatedLogs)); } catch {}
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Login ─────────────────────────────────────────────────────────────────
  function handleLogin(e) {
    e.preventDefault();
    const name = nameInput.trim();
    const email = emailInput.trim();
    if (!name) { setLoginError("Please enter your name."); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLoginError("Please enter a valid email address."); return; }
    const u = { name, email, loginTime: new Date().toISOString() };
    setUser(u);
    try { sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u)); } catch {}
    setScreen("chat");
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text) {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput("");

    const userMsg = { role: "user", content: question, ts: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });
      const data = await response.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "I encountered an issue. Please try again.";

      const assistantMsg = { role: "assistant", content: reply, ts: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);

      // Log usage
      const topic = classifyTopic(question);
      const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        userName: user?.name || "Unknown",
        userEmail: user?.email || "",
        question: question.length > 120 ? question.slice(0, 120) + "…" : question,
        topic,
      };
      const updated = [logEntry, ...logs];
      setLogs(updated);
      saveLogs(updated);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please check your connection and try again.",
        ts: new Date().toISOString(),
        error: true,
      }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function exportCSV() {
    const header = ["Timestamp", "User Name", "Email", "Topic", "Question"].join(",");
    const rows = logs.map(l =>
      [`"${l.timestamp}"`, `"${l.userName}"`, `"${l.userEmail}"`, `"${l.topic}"`, `"${l.question.replace(/"/g, '""')}"`].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "technical_documentation_expert_usage_log.csv"; a.click();
  }

  function clearLogs() {
    if (window.confirm("Clear all usage logs?")) {
      setLogs([]);
      saveLogs([]);
    }
  }

  // ── Topic counts ──────────────────────────────────────────────────────────
  const topicCounts = logs.reduce((acc, l) => { acc[l.topic] = (acc[l.topic] || 0) + 1; return acc; }, {});
  const uniqueUsers = [...new Set(logs.map(l => l.userEmail))].length;
  const filteredLogs = logFilter === "All" ? logs : logs.filter(l => l.topic === logFilter);
  const allTopics = ["All", ...Object.keys(TOPIC_COLORS)];

  // ── Render: Login ─────────────────────────────────────────────────────────
  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .login-card { animation: fadeUp 0.5s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .login-input { width:100%; padding:10px 14px; border:1px solid var(--color-border-secondary); border-radius:8px; font-size:14px; font-family:inherit; background:var(--color-background-primary); color:var(--color-text-primary); outline:none; transition:border-color 0.15s; }
        .login-input:focus { border-color:#185FA5; box-shadow:0 0 0 3px rgba(24,95,165,0.12); }
        .login-btn { width:100%; padding:11px; background:#185FA5; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:500; font-family:inherit; cursor:pointer; transition:background 0.15s, transform 0.1s; }
        .login-btn:hover { background:#0C447C; }
        .login-btn:active { transform:scale(0.99); }
        .chip { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:500; }
      `}</style>
      <div className="login-card" style={{ width: "100%", maxWidth: 440 }}>

        {/* Brand bar */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, background: "#185FA5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.2 }}>Technical Documentation Expert</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", letterSpacing: "0.04em" }}>POWERED BY CLAUDE AI</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
            Your AI-powered Microsoft Dynamics 365<br/>Technical Documentation Specialist
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 14, padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 1.5rem", textAlign: "center" }}>
            Enter your details to get started — no password required
          </p>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Full Name</label>
              <input className="login-input" placeholder="e.g. Sarah Mitchell" value={nameInput} onChange={e => { setNameInput(e.target.value); setLoginError(""); }} autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Work Email</label>
              <input className="login-input" type="email" placeholder="e.g. sarah@company.com" value={emailInput} onChange={e => { setEmailInput(e.target.value); setLoginError(""); }} />
            </div>
            {loginError && (
              <div style={{ background: "#FCEBEB", border: "1px solid #F09595", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#791F1F", marginBottom: 14 }}>
                {loginError}
              </div>
            )}
            <button className="login-btn" type="submit">Access the Agent →</button>
          </form>
        </div>

        {/* Capability chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: "1.5rem" }}>
          {["D365 F&O", "D365 CE", "Azure Integrations", "Power Platform", "ALM & DevOps", "Documentation"].map(t => (
            <span key={t} className="chip" style={{ background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-tertiary)" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render: Chat ──────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "var(--color-background-tertiary)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .msg-bubble { animation: msgIn 0.25s ease; }
        @keyframes msgIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .send-btn { display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#185FA5; color:#fff; border:none; cursor:pointer; transition:background 0.15s, transform 0.1s; flex-shrink:0; }
        .send-btn:hover:not(:disabled) { background:#0C447C; }
        .send-btn:disabled { background:var(--color-border-secondary); cursor:not-allowed; }
        .send-btn:active:not(:disabled) { transform:scale(0.95); }
        .chat-input { flex:1; padding:10px 14px; border:1px solid var(--color-border-secondary); border-radius:8px; font-size:14px; font-family:inherit; background:var(--color-background-primary); color:var(--color-text-primary); outline:none; resize:none; transition:border-color 0.15s; line-height:1.5; }
        .chat-input:focus { border-color:#185FA5; box-shadow:0 0 0 3px rgba(24,95,165,0.12); }
        .sugg-chip { display:inline-flex; padding:7px 13px; border-radius:20px; font-size:12px; background:var(--color-background-primary); border:1px solid var(--color-border-secondary); color:var(--color-text-secondary); cursor:pointer; transition:all 0.15s; white-space:nowrap; font-family:inherit; }
        .sugg-chip:hover { background:var(--color-background-secondary); color:var(--color-text-primary); border-color:#185FA5; }
        .nav-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:7px; border:1px solid var(--color-border-secondary); background:transparent; color:var(--color-text-secondary); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .nav-btn:hover { background:var(--color-background-secondary); color:var(--color-text-primary); }
        .nav-btn.active { background:#E6F1FB; border-color:#85B7EB; color:#185FA5; }
        .dot-anim span { display:inline-block; animation: bounce 1.2s infinite; }
        .dot-anim span:nth-child(2) { animation-delay: 0.2s; }
        .dot-anim span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-5px); } }
        .log-row:hover { background:var(--color-background-secondary) !important; }
        .filter-chip { padding:4px 12px; border-radius:20px; font-size:11px; font-weight:500; border:1px solid var(--color-border-secondary); background:transparent; cursor:pointer; color:var(--color-text-secondary); font-family:inherit; transition:all 0.15s; }
        .filter-chip.active { background:#185FA5; color:#fff; border-color:#185FA5; }
        .filter-chip:hover:not(.active) { background:var(--color-background-secondary); }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:var(--color-border-secondary); border-radius:3px; }
      `}</style>

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--color-background-primary)", borderBottom: "1px solid var(--color-border-tertiary)", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#185FA5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.2 }}>Technical Documentation Expert</div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", letterSpacing: "0.04em" }}>DYNAMICS 365 AI SPECIALIST</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className={`nav-btn ${screen === "chat" ? "active" : ""}`} onClick={() => setScreen("chat")}>
            <BotIcon /> Chat
          </button>
          <button className={`nav-btn ${screen === "logs" ? "active" : ""}`} onClick={() => { setScreen("logs"); loadLogs(); }}>
            <LogIcon /> Usage Log {logs.length > 0 && <span style={{ background: "#185FA5", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{logs.length}</span>}
          </button>
          <div style={{ width: 1, height: 24, background: "var(--color-border-tertiary)", margin: "0 4px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#185FA5" }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.2 }}>{user?.name}</span>
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{user?.email}</span>
            </div>
            <button onClick={() => { setUser(null); setMessages([]); setScreen("login"); try { sessionStorage.removeItem(STORAGE_KEY_USER); } catch {} }}
              style={{ padding: "4px 10px", fontSize: 11, border: "1px solid var(--color-border-secondary)", borderRadius: 6, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit", marginLeft: 4 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ── SCREEN: Chat ─────────────────────────────────────────────────── */}
      {screen === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Welcome state */}
            {messages.length === 0 && (
              <div style={{ maxWidth: 680, margin: "2rem auto", width: "100%" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                  <div style={{ width: 56, height: 56, background: "#E6F1FB", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 6px" }}>Hello, {user?.name?.split(" ")[0]} 👋</h2>
                  <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
                    Ask me anything about Dynamics 365 documentation —<br/>architecture, integrations, modules, testing, or ALM.
                  </p>
                </div>

                {/* Capability cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
                  {[
                    { icon: "⚙️", label: "Architecture & Design", desc: "HLD, LLD, SDD, TDD" },
                    { icon: "🔗", label: "Integrations", desc: "API, Azure, Dual-write" },
                    { icon: "📦", label: "Modules & Entities", desc: "Finance, SCM, WMS, CRM" },
                    { icon: "🧪", label: "Testing", desc: "Test plans, UAT, defects" },
                    { icon: "🚀", label: "ALM & DevOps", desc: "Azure DevOps, LCS, CI/CD" },
                    { icon: "📄", label: "Documentation", desc: "BRD, PRD, User stories" },
                  ].map(c => (
                    <div key={c.label} style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>{c.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{c.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Suggestions */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, letterSpacing: "0.04em" }}>TRY ASKING</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SUGGESTED.map(s => (
                      <button key={s} className="sugg-chip" onClick={() => sendMessage(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message thread */}
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const topic = isUser ? classifyTopic(msg.content) : null;
              const tc = topic ? TOPIC_COLORS[topic] : null;
              return (
                <div key={i} className="msg-bubble" style={{ display: "flex", gap: 12, maxWidth: 760, margin: "0 auto", width: "100%", flexDirection: isUser ? "row-reverse" : "row" }}>
                  {/* Avatar */}
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isUser ? "#E6F1FB" : "#185FA5", color: isUser ? "#185FA5" : "white", marginTop: 2 }}>
                    {isUser ? <UserIcon /> : <BotIcon />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexDirection: isUser ? "row-reverse" : "row" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{isUser ? user?.name : "Technical Documentation Expert"}</span>
                      {tc && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, fontWeight: 500 }}>{topic}</span>}
                      <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    {/* Bubble */}
                    <div style={{
                      background: isUser ? "#185FA5" : "var(--color-background-primary)",
                      color: isUser ? "#fff" : "var(--color-text-primary)",
                      border: isUser ? "none" : "1px solid var(--color-border-tertiary)",
                      borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.6,
                      maxWidth: "100%",
                    }}>
                      {isUser
                        ? <span>{msg.content}</span>
                        : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      }
                      {msg.error && <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>⚠ Connection error</div>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {loading && (
              <div className="msg-bubble" style={{ display: "flex", gap: 12, maxWidth: 760, margin: "0 auto", width: "100%" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#185FA5", color: "white" }}><BotIcon /></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 5 }}>Technical Documentation Expert</div>
                  <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: "4px 12px 12px 12px", padding: "12px 16px", display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginRight: 4 }}>Thinking</span>
                    <span className="dot-anim">
                      <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#185FA5" }} />
                      <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#185FA5", margin: "0 3px" }} />
                      <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#185FA5" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--color-border-tertiary)", flexShrink: 0 }} />

          {/* Input area */}
          <div style={{ background: "var(--color-background-primary)", padding: "1rem 1.5rem", flexShrink: 0 }}>
            <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                className="chat-input"
                rows={1}
                placeholder="Ask about D365 documentation, architecture, integrations, testing, ALM…"
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={handleKeyDown}
                style={{ minHeight: 42 }}
              />
              <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
                <SendIcon />
              </button>
            </div>
            <div style={{ maxWidth: 760, margin: "6px auto 0", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center" }}>
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}

      {/* ── SCREEN: Usage Logs ────────────────────────────────────────────── */}
      {screen === "logs" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
              {[
                { label: "Total Queries", value: logs.length },
                { label: "Unique Users", value: uniqueUsers },
                { label: "Top Topic", value: Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—" },
                { label: "Today's Queries", value: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 4, letterSpacing: "0.03em" }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Topic breakdown */}
            {Object.keys(topicCounts).length > 0 && (
              <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 12, letterSpacing: "0.04em" }}>TOPIC BREAKDOWN</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => {
                    const tc = TOPIC_COLORS[topic] || TOPIC_COLORS.General;
                    const pct = Math.round((count / logs.length) * 100);
                    return (
                      <div key={topic} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: tc.bg, border: `1px solid ${tc.border}` }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: tc.text }}>{topic}</span>
                        <span style={{ fontSize: 11, color: tc.text, opacity: 0.8 }}>{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Log table toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allTopics.map(t => (
                  <button key={t} className={`filter-chip ${logFilter === t ? "active" : ""}`} onClick={() => setLogFilter(t)}>{t}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500, border: "1px solid var(--color-border-secondary)", borderRadius: 7, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                  <ExportIcon /> Export CSV
                </button>
                <button onClick={clearLogs} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500, border: "1px solid #F09595", borderRadius: 7, background: "transparent", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>
                  <ClearIcon /> Clear Logs
                </button>
              </div>
            </div>

            {/* Log table */}
            <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
              {filteredLogs.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
                  {logs.length === 0 ? "No queries logged yet. Start chatting to see usage data here." : "No queries match the selected filter."}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)" }}>
                      {["Timestamp", "User", "Email", "Topic", "Question"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, i) => {
                      const tc = TOPIC_COLORS[log.topic] || TOPIC_COLORS.General;
                      return (
                        <tr key={log.id} className="log-row" style={{ borderBottom: "1px solid var(--color-border-tertiary)", background: "transparent" }}>
                          <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 11 }}>
                            {new Date(log.timestamp).toLocaleDateString()}<br/>
                            <span style={{ opacity: 0.7 }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{log.userName}</td>
                          <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", fontSize: 12 }}>{log.userEmail}</td>
                          <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 12, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, fontSize: 11, fontWeight: 500 }}>{log.topic}</span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "var(--color-text-primary)", maxWidth: 400 }}>{log.question}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 10, textAlign: "right" }}>
              Showing {filteredLogs.length} of {logs.length} entries · Shared across all users · Export to CSV for Excel analysis
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
