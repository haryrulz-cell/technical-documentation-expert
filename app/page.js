"use client";
import { useState, useEffect, useRef } from "react";

const STORAGE_KEY_USER = "tdx_user";
const STORAGE_KEY_LOGS = "tdx_usage_logs";

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
  "Generate a HLD for integrating D365 F&O with a 3PL via REST API",
  "Create a BRD for implementing Accounts Payable automation in D365 Finance",
  "Write a Test Plan for D365 WMS Outbound Shipment UAT",
  "Generate User Stories for the D365 Sales CRM implementation sprint",
  "Create a TDD for a custom D365 F&O purchase order approval workflow",
  "Write a Deployment Guide for D365 F&O go-live cutover",
  "How do I set up Business Events in D365 F&O?",
  "Explain the Dual-write architecture between D365 F&O and CE",
];

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
    .replace(/^(.)/m, '<p style="margin:0">$1') + '</p>';
}

const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const UserIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const BotIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="3" x2="12" y2="7"/><circle cx="8.5" cy="16.5" r="1.5"/><circle cx="15.5" cy="16.5" r="1.5"/></svg>;
const LogIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const ExportIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ClearIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const DownloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const DocIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;

export default function Home() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("All");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_USER);
      if (saved) { setUser(JSON.parse(saved)); setScreen("chat"); }
      const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      if (savedLogs) setLogs(JSON.parse(savedLogs));
    } catch {}
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function handleLogin(e) {
    e.preventDefault();
    const name = nameInput.trim(), email = emailInput.trim();
    if (!name) { setLoginError("Please enter your name."); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLoginError("Please enter a valid email."); return; }
    const u = { name, email, loginTime: new Date().toISOString() };
    setUser(u);
    try { sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u)); } catch {}
    setScreen("chat");
  }

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, userName: user?.name })
      });
      const data = await res.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "Something went wrong. Please try again.";
      const assistantMsg = { role: "assistant", content: reply, ts: new Date().toISOString() };
      if (data.document) assistantMsg.document = data.document;
      setMessages(prev => [...prev, assistantMsg]);
      const topic = classifyTopic(question);
      const docType = data.document ? data.document.docType : null;
      const entry = { id: Date.now(), timestamp: new Date().toISOString(), userName: user?.name, userEmail: user?.email, question: question.slice(0, 120), topic, docGenerated: docType || null };
      const updated = [entry, ...logs];
      setLogs(updated);
      try { localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated)); } catch {}
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again.", ts: new Date().toISOString(), error: true }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function downloadDoc(doc) {
    try {
      const bytes = Uint8Array.from(atob(doc.base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = doc.filename; a.click();
    } catch(e) { alert("Download failed: " + e.message); }
  }

  function exportCSV() {
    const rows = [["Timestamp","User","Email","Topic","Doc Generated","Question"], ...logs.map(l => [l.timestamp, l.userName, l.userEmail, l.topic, l.docGenerated||"", `"${(l.question||"").replace(/"/g,'""')}"`])];
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tdx_usage_log.csv"; a.click();
  }

  const topicCounts = logs.reduce((a, l) => { a[l.topic] = (a[l.topic] || 0) + 1; return a; }, {});
  const filteredLogs = logFilter === "All" ? logs : logs.filter(l => l.topic === logFilter);
  const allTopics = ["All", ...Object.keys(TOPIC_COLORS)];
  const docsGenerated = logs.filter(l => l.docGenerated).length;

  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: "#F5F7FA", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, background: "#185FA5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>Technical Documentation Expert</div>
              <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.05em" }}>POWERED BY CLAUDE AI</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>Your AI-powered D365 Technical Documentation Specialist</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "1.75rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 13, color: "#666", marginBottom: "1.25rem", textAlign: "center" }}>Enter your details to get started — no password required</p>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#555", display: "block", marginBottom: 5 }}>Full Name</label>
              <input style={{ width: "100%", padding: "9px 13px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                placeholder="e.g. Sarah Mitchell" value={nameInput} onChange={e => { setNameInput(e.target.value); setLoginError(""); }} autoFocus />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#555", display: "block", marginBottom: 5 }}>Work Email</label>
              <input style={{ width: "100%", padding: "9px 13px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                type="email" placeholder="e.g. sarah@company.com" value={emailInput} onChange={e => { setEmailInput(e.target.value); setLoginError(""); }} />
            </div>
            {loginError && <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#991B1B", marginBottom: 12 }}>{loginError}</div>}
            <button type="submit" style={{ width: "100%", padding: "11px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Access the Agent →
            </button>
          </form>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: "1.25rem" }}>
          {["D365 F&O","D365 CE","Azure Integrations","Power Platform","ALM & DevOps","Word Docs"].map(t => (
            <span key={t} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, background: "#fff", border: "1px solid #E2E8F0", color: "#64748B" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#F5F7FA" }}>
      <style>{`
        * { box-sizing: border-box; }
        .chat-input { flex:1; padding:9px 13px; border:1px solid #D1D5DB; border-radius:8px; font-size:14px; font-family:inherit; outline:none; resize:none; line-height:1.5; background:#fff; }
        .chat-input:focus { border-color:#185FA5; }
        .send-btn { width:38px; height:38px; border-radius:8px; background:#185FA5; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .send-btn:disabled { background:#CBD5E1; cursor:not-allowed; }
        .sugg { padding:6px 12px; border-radius:20px; font-size:12px; background:#fff; border:1px solid #E2E8F0; color:#64748B; cursor:pointer; white-space:nowrap; font-family:inherit; }
        .sugg:hover { background:#F1F5F9; color:#185FA5; border-color:#185FA5; }
        .nav-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:7px; border:1px solid #E2E8F0; background:transparent; color:#64748B; font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; }
        .nav-btn:hover { background:#F1F5F9; }
        .nav-btn.active { background:#EFF6FF; border-color:#93C5FD; color:#1D4ED8; }
        .fchip { padding:4px 11px; border-radius:20px; font-size:11px; font-weight:500; border:1px solid #E2E8F0; background:transparent; cursor:pointer; color:#64748B; font-family:inherit; }
        .fchip.active { background:#185FA5; color:#fff; border-color:#185FA5; }
        .lrow:hover td { background:#F8FAFC; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:2px; }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .msg { animation: msgIn 0.2s ease; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }
        .d1{animation:bounce 1.2s infinite} .d2{animation:bounce 1.2s 0.2s infinite} .d3{animation:bounce 1.2s 0.4s infinite}
        .dl-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:#185FA5; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; margin-top:10px; transition:background 0.15s; }
        .dl-btn:hover { background:#0C447C; }
        .doc-card { margin-top:10px; background:#F0F7FF; border:1.5px solid #93C5FD; border-radius:10px; padding:12px 14px; }
        .doc-type-badge { display:inline-flex; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:700; background:#1E3A5F; color:#fff; letter-spacing:0.05em; margin-bottom:6px; }
      `}</style>

      {/* Nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "#185FA5", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111", lineHeight: 1.2 }}>Technical Documentation Expert</div>
            <div style={{ fontSize: 10, color: "#94A3B8", letterSpacing: "0.04em" }}>D365 AI SPECIALIST · WORD DOCUMENT GENERATION</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <button className={`nav-btn ${screen === "chat" ? "active" : ""}`} onClick={() => setScreen("chat")}><BotIcon /> Chat</button>
          <button className={`nav-btn ${screen === "logs" ? "active" : ""}`} onClick={() => setScreen("logs")}>
            <LogIcon /> Usage Log {logs.length > 0 && <span style={{ background: "#185FA5", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{logs.length}</span>}
          </button>
          <div style={{ width: 1, height: 22, background: "#E5E7EB", margin: "0 3px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#1D4ED8" }}>{user?.name?.charAt(0)}</div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{user?.name}</span>
            <button onClick={() => { setUser(null); setMessages([]); setScreen("login"); try { sessionStorage.removeItem(STORAGE_KEY_USER); } catch {} }}
              style={{ padding: "3px 9px", fontSize: 11, border: "1px solid #E2E8F0", borderRadius: 6, background: "transparent", color: "#94A3B8", cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
          </div>
        </div>
      </div>

      {screen === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.length === 0 && (
              <div style={{ maxWidth: 680, margin: "1.5rem auto", width: "100%" }}>
                <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                  <div style={{ width: 52, height: 52, background: "#DBEAFE", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <h2 style={{ fontSize: 19, fontWeight: 600, color: "#111", margin: "0 0 6px" }}>Hello, {user?.name?.split(" ")[0]} 👋</h2>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.6 }}>Ask me to generate any D365 document — I'll produce the answer <strong>and</strong> a formatted, client-ready Word file you can download and share.</p>
                </div>
                <div style={{ background: "#F0F7FF", border: "1px solid #93C5FD", borderRadius: 10, padding: "11px 14px", marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>📄</span>
                  <div style={{ fontSize: 13, color: "#1E3A5F", lineHeight: 1.6 }}>
                    <strong>Document generation enabled.</strong> When you request an HLD, BRD, TDD, Test Plan, User Stories, or any formal deliverable — a <strong>downloadable Word (.docx) file</strong> will be automatically generated with a professional title page, header/footer, version history, and full formatting.
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: "1.25rem" }}>
                  {[["📐","Architecture Docs","HLD, LLD, SDD, TDD"],["📋","Requirements","BRD, PRD, User Stories"],["🧪","Test Artifacts","Test Plan, Cases, Summary"],["🚀","Deployment Docs","Release Notes, Go-Live Guide"],["⚙️","Agile Artifacts","Backlog, Sprint, Epics"],["💬","Q&A Consulting","Ask any D365 question"]].map(([i,l,d]) => (
                    <div key={l} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "11px 13px" }}>
                      <div style={{ fontSize: 17, marginBottom: 5 }}>{i}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{d}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", marginBottom: 7, letterSpacing: "0.04em" }}>TRY ASKING</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUGGESTED.map(s => <button key={s} className="sugg" onClick={() => sendMessage(s)}>{s}</button>)}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const topic = isUser ? classifyTopic(msg.content) : null;
              const tc = topic ? TOPIC_COLORS[topic] : null;
              return (
                <div key={i} className="msg" style={{ display: "flex", gap: 10, maxWidth: 740, margin: "0 auto", width: "100%", flexDirection: isUser ? "row-reverse" : "row" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isUser ? "#DBEAFE" : "#185FA5", color: isUser ? "#1D4ED8" : "#fff", marginTop: 2 }}>
                    {isUser ? <UserIcon /> : <BotIcon />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexDirection: isUser ? "row-reverse" : "row" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{isUser ? user?.name : "Technical Documentation Expert"}</span>
                      {tc && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 11, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, fontWeight: 500 }}>{topic}</span>}
                      <span style={{ fontSize: 10, color: "#94A3B8" }}>{new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div style={{ background: isUser ? "#185FA5" : "#fff", color: isUser ? "#fff" : "#1E293B", border: isUser ? "none" : "1px solid #E5E7EB", borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px", padding: "9px 13px", fontSize: 14, lineHeight: 1.6 }}>
                      {isUser ? msg.content : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />}
                    </div>
                    {/* Document download card */}
                    {msg.document && (
                      <div className="doc-card">
                        <div className="doc-type-badge">{msg.document.docType}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1E3A5F", marginBottom: 2 }}>{msg.document.docTitle}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 2 }}>Client-ready Word document · Title page · Header/footer · Version history</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 8, fontFamily: "monospace" }}>{msg.document.filename}</div>
                        <button className="dl-btn" onClick={() => downloadDoc(msg.document)}>
                          <DownloadIcon /> Download Word Document (.docx)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="msg" style={{ display: "flex", gap: 10, maxWidth: 740, margin: "0 auto", width: "100%" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#185FA5", color: "#fff" }}><BotIcon /></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4 }}>Technical Documentation Expert</div>
                  <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "4px 12px 12px 12px", padding: "11px 14px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 11, color: "#94A3B8", marginRight: 5 }}>Generating document</span>
                    {[1,2,3].map(n => <span key={n} className={`d${n}`} style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#185FA5" }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ height: 1, background: "#E5E7EB", flexShrink: 0 }} />
          <div style={{ background: "#fff", padding: "0.875rem 1.5rem", flexShrink: 0 }}>
            <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 9, alignItems: "flex-end" }}>
              <textarea ref={inputRef} className="chat-input" rows={1} placeholder='Try: "Generate an HLD for D365 F&O integration with Salesforce via REST API"'
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                style={{ minHeight: 40 }} />
              <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}><SendIcon /></button>
            </div>
            <div style={{ maxWidth: 740, margin: "5px auto 0", fontSize: 11, color: "#94A3B8", textAlign: "center" }}>Enter to send · Shift+Enter for new line · Document requests auto-generate a .docx file</div>
          </div>
        </div>
      )}

      {screen === "logs" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 11, marginBottom: "1.25rem" }}>
              {[["Total Queries", logs.length],["Unique Users",[...new Set(logs.map(l=>l.userEmail))].length],["Docs Generated", docsGenerated],["Today", logs.filter(l=>new Date(l.timestamp).toDateString()===new Date().toDateString()).length]].map(([label,value])=>(
                <div key={label} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "13px 15px" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginBottom: 3, letterSpacing: "0.03em" }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#111" }}>{value}</div>
                </div>
              ))}
            </div>
            {Object.keys(topicCounts).length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 10, letterSpacing: "0.04em" }}>TOPIC BREAKDOWN</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).map(([topic,count])=>{
                    const tc = TOPIC_COLORS[topic]||TOPIC_COLORS.General;
                    return <div key={topic} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:8,background:tc.bg,border:`1px solid ${tc.border}`}}>
                      <span style={{fontSize:12,fontWeight:600,color:tc.text}}>{topic}</span>
                      <span style={{fontSize:11,color:tc.text,opacity:0.8}}>{count} ({Math.round(count/logs.length*100)}%)</span>
                    </div>;
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 9 }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {allTopics.map(t => <button key={t} className={`fchip ${logFilter===t?"active":""}`} onClick={()=>setLogFilter(t)}>{t}</button>)}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={exportCSV} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",fontSize:12,fontWeight:500,border:"1px solid #E2E8F0",borderRadius:7,background:"transparent",color:"#64748B",cursor:"pointer",fontFamily:"inherit" }}><ExportIcon /> Export CSV</button>
                <button onClick={() => { if(window.confirm("Clear all logs?")){ setLogs([]); try{localStorage.removeItem(STORAGE_KEY_LOGS);}catch{} } }} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",fontSize:12,fontWeight:500,border:"1px solid #FCA5A5",borderRadius:7,background:"transparent",color:"#991B1B",cursor:"pointer",fontFamily:"inherit" }}><ClearIcon /> Clear</button>
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
              {filteredLogs.length === 0
                ? <div style={{ padding: "2.5rem", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>{logs.length === 0 ? "No queries logged yet. Start chatting to see usage data here." : "No entries match this filter."}</div>
                : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E5E7EB" }}>
                      {["Timestamp","User","Topic","Doc Generated","Question"].map(h=><th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:11,fontWeight:600,color:"#94A3B8",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h.toUpperCase()}</th>)}
                    </tr></thead>
                    <tbody>{filteredLogs.map(log=>{
                      const tc = TOPIC_COLORS[log.topic]||TOPIC_COLORS.General;
                      return <tr key={log.id} className="lrow" style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{padding:"9px 13px",color:"#94A3B8",whiteSpace:"nowrap",fontFamily:"monospace",fontSize:11}}>{new Date(log.timestamp).toLocaleDateString()}<br/>{new Date(log.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
                        <td style={{padding:"9px 13px",fontWeight:500,color:"#374151",whiteSpace:"nowrap"}}>{log.userName}<br/><span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}>{log.userEmail}</span></td>
                        <td style={{padding:"9px 13px",whiteSpace:"nowrap"}}><span style={{padding:"3px 9px",borderRadius:11,background:tc.bg,color:tc.text,border:`1px solid ${tc.border}`,fontSize:11,fontWeight:500}}>{log.topic}</span></td>
                        <td style={{padding:"9px 13px",whiteSpace:"nowrap"}}>{log.docGenerated ? <span style={{padding:"3px 9px",borderRadius:6,background:"#DBEAFE",color:"#1E40AF",fontSize:11,fontWeight:600}}>{log.docGenerated}</span> : <span style={{fontSize:11,color:"#CBD5E1"}}>—</span>}</td>
                        <td style={{padding:"9px 13px",color:"#374151",maxWidth:360,fontSize:12}}>{log.question}</td>
                      </tr>;
                    })}</tbody>
                  </table>
              }
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8, textAlign: "right" }}>Showing {filteredLogs.length} of {logs.length} entries · Export to CSV for Excel analysis</div>
          </div>
        </div>
      )}
    </div>
  );
}
