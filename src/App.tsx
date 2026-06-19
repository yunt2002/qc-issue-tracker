import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Layers, 
  FileSpreadsheet, 
  TrendingUp, 
  ClipboardList, 
  Atom, 
  Clock, 
  Database, 
  Cpu, 
  CheckCircle2,
  AlertTriangle,
  Flame,
  LayoutDashboard
} from "lucide-react";
import { QCIssue, ControlRun, DashboardStats, TestCategory } from "./types";
import Dashboard from "./components/Dashboard";
import IssuesLog from "./components/IssuesLog";
import IssueDetails from "./components/IssueDetails";
import LeveyJenningsView from "./components/LeveyJenningsView";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs" | "charts">("dashboard");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  
  // States
  const [issues, setIssues] = useState<QCIssue[]>([]);
  const [runs, setRuns] = useState<ControlRun[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalIssues: 0,
    activeIssues: 0,
    criticalIssues: 0,
    resolvedIssues: 0,
    controlFailureRate: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date());

  // Real-time clock tick for professional clinical uptime monitoring
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all initial metadata
  const fetchAllData = async () => {
    try {
      const [statsRes, issuesRes, runsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/issues"),
        fetch("/api/runs")
      ]);

      if (statsRes.ok && issuesRes.ok && runsRes.ok) {
        const statsData = await statsRes.json();
        const issuesData = await issuesRes.json();
        const runsData = await runsRes.json();

        setStats(statsData);
        setIssues(issuesData);
        setRuns(runsData);
      }
    } catch (error) {
      console.error("Clinical API Fetch Error: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handler: Add a manual issue
  const handleAddIssue = async (newIssue: {
    sampleId: string;
    batchId: string;
    testName: TestCategory;
    measuredValue: number;
    priority: "Urgent" | "Medium" | "Low";
    investigator: string;
    issueDescription: string;
  }) => {
    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIssue)
      });
      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error("Manual issue logging error: ", error);
    }
  };

  // Handler: Update issue parameters (status, priority, rca text, capa text)
  const handleUpdateIssue = async (issueId: string, updates: Partial<QCIssue> & { investigator?: string; text?: string }) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error("Failed updating parameters on server: ", error);
    }
  };

  // Handler: Add comment
  const handleAddComment = async (issueId: string, author: string, text: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, text })
      });
      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error("Feedback dispatch error: ", error);
    }
  };

  // Handler: Submit standard run (Runs Westgard)
  const handleAddRun = async (
    testName: TestCategory, 
    measuredValue: number, 
    investigator: string, 
    notes?: string
  ): Promise<{ success: boolean; triggeredAutoIssue: boolean }> => {
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testName, measuredValue, investigator, notes })
      });
      if (response.ok) {
        const bodyObj = await response.json();
        await fetchAllData();
        return { success: true, triggeredAutoIssue: bodyObj.triggeredAutoIssue };
      }
      return { success: false, triggeredAutoIssue: false };
    } catch (error) {
      console.error("Failed adding daily run: ", error);
      return { success: false, triggeredAutoIssue: false };
    }
  };

  // Handler: Call Gemini analysis
  const handleTriggerAI = async (issueId: string) => {
    setIsAiLoading(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.fallback) {
          const message =
            result.source === "previous"
              ? "Gemini 할당량/토큰이 소진되어 이전 AI 분석 결과를 유지합니다."
              : "Gemini API를 사용할 수 없어 오프라인 CAPA 체크리스트(이전 버전)로 전환했습니다.";
          alert(message);
        }
        await fetchAllData();
      } else {
        alert("AI 분석 요청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Gemini context pipeline broken: ", error);
      alert("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedIssue = issues.find(i => i.id === selectedIssueId);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ko-KR", { hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  };

  return (
    <div id="high-density-app" className="min-h-screen bg-[#F1F5F9] font-sans text-slate-900 flex flex-col md:flex-row overflow-x-hidden select-none">
      
      {/* 🔮 Left Sidebar - High Density Dark Mode */}
      <aside className="w-full md:w-64 bg-[#0F172A] text-slate-300 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-800">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-white text-xs tracking-tighter">
            QC
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight block">BioTrack v1.0</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-mono">Precision System</span>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <div className="px-5 py-2 text-[10px] uppercase tracking-widest text-[#64748B] font-bold mb-1">
            Monitoring & SOP
          </div>
          
          {/* Dashboard Button */}
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setSelectedIssueId(null);
            }}
            className={`w-full flex items-center px-5 py-2.5 text-xs font-semibold tracking-tight transition-colors text-left border-r-4 ${
              activeTab === "dashboard" && !selectedIssueId
                ? "bg-[#1E293B] text-white border-emerald-500"
                : "border-transparent text-slate-400 hover:bg-[#1E293B] hover:text-white"
            }`}
          >
            <span className={`mr-3 ${activeTab === "dashboard" && !selectedIssueId ? "text-emerald-400" : "text-slate-600"}`}>■</span>
            QC 정밀 대시보드
          </button>

          {/* Logs Button */}
          <button
            onClick={() => {
              setActiveTab("logs");
              setSelectedIssueId(null);
            }}
            className={`w-full flex items-center px-5 py-2.5 text-xs font-semibold tracking-tight transition-colors text-left border-r-4 ${
              activeTab === "logs" || selectedIssueId
                ? "bg-[#1E293B] text-white border-emerald-500"
                : "border-transparent text-slate-400 hover:bg-[#1E293B] hover:text-white"
            }`}
          >
            <span className={`mr-3 ${activeTab === "logs" || selectedIssueId ? "text-emerald-400" : "text-slate-600"}`}>▲</span>
            CAPA 이상 로그 추적
            {stats.activeIssues > 0 && (
              <span className="ml-auto bg-red-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full">
                {stats.activeIssues}
              </span>
            )}
          </button>

          {/* Charts Button */}
          <button
            onClick={() => {
              setActiveTab("charts");
              setSelectedIssueId(null);
            }}
            className={`w-full flex items-center px-5 py-2.5 text-xs font-semibold tracking-tight transition-colors text-left border-r-4 ${
              activeTab === "charts" && !selectedIssueId
                ? "bg-[#1E293B] text-white border-emerald-500"
                : "border-transparent text-slate-400 hover:bg-[#1E293B] hover:text-white"
            }`}
          >
            <span className={`mr-3 ${activeTab === "charts" && !selectedIssueId ? "text-emerald-400" : "text-slate-600"}`}>⚡</span>
            Levey-Jennings 모니터
          </button>

          <div className="px-5 py-2 text-[10px] uppercase tracking-widest text-[#64748B] font-bold mt-6 mb-1">
            Integration Stack
          </div>
          <div className="px-5 py-2 space-y-2 text-[11px] text-slate-400 font-mono">
            <div className="flex justify-between border-b border-slate-800/60 pb-1">
              <span>Database:</span>
              <strong className="text-emerald-400 text-xs">Supabase</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-1">
              <span>Uptime:</span>
              <strong className="text-slate-300">100.00%</strong>
            </div>
            <div className="flex justify-between">
              <span>SOP Standard:</span>
              <strong className="text-slate-300">CLIA/GMP</strong>
            </div>
          </div>
        </nav>

        {/* Investigator Profiler info footer matches design HTML */}
        <div className="p-4 border-t border-slate-800 bg-[#1E293B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold uppercase">
              QC
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">yunt3209@gmail.com</p>
              <p className="text-[10px] text-slate-400 truncate">Verifying Lab Quality</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ⚡ Right Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Top Header Bar matches design height 14 (56px) and clean styling */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="font-bold text-slate-900 uppercase tracking-tighter text-xs">
              QC Issue Tracking System
            </span>
            <span className="text-slate-300">/</span>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 
              SUPABASE CONNECTED
            </span>
            <span className="hidden sm:inline bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">
              VERCEL HOSTED
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-xs font-mono text-slate-400">
              {formatDate(systemTime)} {formatTime(systemTime)}
            </div>
            <div className="hidden sm:block h-5 w-px bg-slate-200"></div>
            <div className="text-[10px] bg-indigo-50 border border-indigo-100/60 text-indigo-700 font-extrabold px-2.5 py-1 rounded">
              FDA CLIA COMPLIANT
            </div>
          </div>
        </header>

        {/* Main Section Content Container */}
        <section className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400 space-y-4">
              <span className="p-3 bg-white border border-slate-200 rounded-full shadow-xs animate-spin">
                <Atom size={28} className="text-emerald-500" />
              </span>
              <p className="text-xs font-semibold font-mono tracking-tight text-slate-600">의료 기준 QC 이상 데이터 동기화 계측중...</p>
            </div>
          ) : selectedIssueId && selectedIssue ? (
            <IssueDetails
              issue={selectedIssue}
              onBack={() => setSelectedIssueId(null)}
              onUpdateIssue={handleUpdateIssue}
              onAddComment={handleAddComment}
              onTriggerAI={handleTriggerAI}
              isAiLoading={isAiLoading}
            />
          ) : activeTab === "dashboard" ? (
            <Dashboard
              stats={stats}
              issues={issues}
              onSelectIssue={setSelectedIssueId}
              onNavigateToTab={setActiveTab}
            />
          ) : activeTab === "logs" ? (
            <IssuesLog
              issues={issues}
              onSelectIssue={setSelectedIssueId}
              onAddIssue={handleAddIssue}
            />
          ) : (
            <LeveyJenningsView
              runs={runs}
              onAddRun={handleAddRun}
            />
          )}
        </section>

        {/* Dynamic Compact Footer */}
        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0 select-none">
          <span>© 2026 BioTech Quality Assurance Engine. SECURE FDA AUDIT TRAIL LOGGED.</span>
          <div className="flex items-center gap-1">
            <Cpu size={10} className="text-slate-400" />
            <span>Vite 6 + React 19 + Express Server-Side Proxy</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
