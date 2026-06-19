import React from "react";
import { 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Radio
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell
} from "recharts";
import { QCIssue, DashboardStats } from "../types";

interface DashboardProps {
  stats: DashboardStats;
  issues: QCIssue[];
  onSelectIssue: (issueId: string) => void;
  onNavigateToTab: (tab: "logs" | "charts") => void;
}

export default function Dashboard({ stats, issues, onSelectIssue, onNavigateToTab }: DashboardProps) {
  // Compute issues distribution by test name
  const testDistribution = React.useMemo(() => {
    const distribution: Record<string, { name: string; Open: number; Resolved: number }> = {
      'ELISA IgG': { name: 'ELISA IgG', Open: 0, Resolved: 0 },
      'RT-PCR Viral Load': { name: 'RT-PCR', Open: 0, Resolved: 0 },
      'HPLC Potency': { name: 'HPLC Potency', Open: 0, Resolved: 0 },
      'NGS Library Prep': { name: 'NGS Library', Open: 0, Resolved: 0 }
    };

    issues.forEach(issue => {
      const cat = issue.testName;
      const isResolved = ["Resolved", "Closed"].includes(issue.status);
      if (distribution[cat]) {
        if (isResolved) {
          distribution[cat].Resolved += 1;
        } else {
          distribution[cat].Open += 1;
        }
      }
    });

    return Object.values(distribution);
  }, [issues]);

  const urgentIssues = React.useMemo(() => {
    return issues.filter(i => i.priority === "Urgent" && i.status !== "Closed").slice(0, 3);
  }, [issues]);

  const COLORS = {
    Open: "#F87171",     // red-400
    Resolved: "#34D399" // emerald-400
  };

  return (
    <div className="space-y-4 animate-slide-in">
      {/* QC Operations Status Banner */}
      <div className="relative overflow-hidden bg-slate-900 text-[#F8FAFC] rounded border border-slate-800 p-4 shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none transform translate-x-8 -translate-y-8">
          <ShieldCheck size={180} className="text-emerald-400" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
              <Radio size={11} className="animate-pulse" />
              QC Lab Operations — Live
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white leading-snug">
            실험실 정도관리(QC) 통합 모니터링 · Westgard 규칙 기반 이상 탐지 · CAPA 워크플로
          </h2>
          <p className="text-slate-400 max-w-4xl text-xs leading-normal">
            ELISA, RT-PCR, HPLC, NGS 등 <strong className="text-slate-300">4개 검사 항목</strong>의 일일 대조군(Run Control) 결과를 실시간 집계합니다.
            ±2SD/±3SD 위반, 10_X 체계적 편차 등 <strong className="text-slate-300">Westgard 다중 규칙</strong>에 따라 자동 플래그되며,
            이상 건은 CAPA 조사·Gemini AI 기술 자문·감사 추적(Audit Trail)까지 한 화면에서 처리합니다.
          </p>
          <div className="pt-1 flex flex-wrap gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Westgard Rules: Active
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
              Run Control DB: Synced
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60">
              <span className={`h-1.5 w-1.5 rounded-full ${stats.criticalIssues > 0 ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`}></span>
              {stats.criticalIssues > 0
                ? `긴급 알람 ${stats.criticalIssues}건 — 즉시 CAPA 검토 필요`
                : "긴급 알람 없음 — All Clear"}
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
              CLIA/CAP Audit Trail: Enabled
            </span>
          </div>
        </div>
      </div>

      {/* 📊 Clinical Metrics Cards - Compact Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active Issues */}
        <div id="stat-active" className="lab-card rounded border border-slate-200 p-3 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all alert-glow-amber bg-white">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">활성 QC 조사 건수</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-slate-900">{stats.activeIssues}</span>
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded border border-amber-100">
                개선중
              </span>
            </div>
            <p className="text-[10px] text-slate-400">전체 {stats.totalIssues}건 중 미결</p>
          </div>
          <div className="p-2 bg-amber-50 text-amber-500 rounded border border-amber-100">
            <Clock size={18} />
          </div>
        </div>

        {/* Critical Alerts */}
        <div id="stat-critical" className="lab-card rounded border border-slate-200 p-3 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all alert-glow-red bg-white">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">긴급 정지 경보</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-red-600">{stats.criticalIssues}</span>
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-100 animate-pulse">
                CRITICAL
              </span>
            </div>
            <p className="text-[10px] text-slate-400">즉각적인 CAPA 검증 필요</p>
          </div>
          <div className="p-2 bg-red-50 text-red-500 rounded border border-red-100">
            <ShieldAlert size={18} />
          </div>
        </div>

        {/* Resolved Issues */}
        <div id="stat-resolved" className="lab-card rounded border border-slate-200 p-3 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all alert-glow-green bg-white">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">해결 및 종결 건수</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-emerald-600">{stats.resolvedIssues}</span>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">
                100% 종결
              </span>
            </div>
            <p className="text-[10px] text-slate-400">완료율 {stats.totalIssues > 0 ? ((stats.resolvedIssues / stats.totalIssues)*100).toFixed(0) : 0}%</p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded border border-emerald-100">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Control Failure Rate */}
        <div id="stat-failure-rate" className="lab-card rounded border border-slate-200 p-3 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all bg-white">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">오차 초과율 (Run Rate)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-indigo-600">{stats.controlFailureRate}%</span>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded border border-indigo-100">
                Westgard SD
              </span>
            </div>
            <p className="text-[10px] text-slate-400">허용 오차 한도 초과율</p>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-500 rounded border border-indigo-100">
            <Activity size={18} />
          </div>
        </div>
      </div>

      {/* Grid: Charts + Urgent Action List - Dense Spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Bar Chart */}
        <div className="lg:col-span-3 lab-card border border-slate-200 rounded p-4 shadow-xs space-y-3 bg-white">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">실험 항목별 이상 보고 현황</h3>
              <p className="text-[11px] text-slate-400">미결(Open/Investigating) 과 완결(Resolved/Closed) 비교</p>
            </div>
            <button 
              onClick={() => onNavigateToTab("charts")}
              className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1 hover:underline hover:text-indigo-800"
            >
              Levey-Jennings 상세 <ArrowUpRight size={13} />
            </button>
          </div>
          
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={testDistribution}
                margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748B', fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '11px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0F172A' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 5 }} />
                <Bar dataKey="Open" name="미해결 건" stackId="a" fill={COLORS.Open} />
                <Bar dataKey="Resolved" name="조치 완료" stackId="a" fill={COLORS.Resolved} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Urgent Action Center */}
        <div className="lg:col-span-2 lab-card border border-slate-200 rounded p-4 shadow-xs space-y-3 flex flex-col justify-between bg-white">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">조치 대기열 (Urgent)</h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 animate-pulse border border-red-200">
                HIGH PRIORITY
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {urgentIssues.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-1.5">
                  <CheckCircle2 className="mx-auto text-emerald-500" size={24} />
                  <p className="text-xs font-semibold text-slate-700">대기 중인 긴급 경보가 없습니다.</p>
                  <p className="text-[10px] text-slate-400">모든 실험실 품질 기준이 만족되었습니다.</p>
                </div>
              ) : (
                urgentIssues.map(issue => (
                  <div 
                    key={issue.id} 
                    onClick={() => onSelectIssue(issue.id)}
                    className="py-2 flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-colors group"
                  >
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"></div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                          {issue.id}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(issue.detectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {issue.testName} (Z: {issue.zScore})
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {issue.issueDescription}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 self-center group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab("logs")}
            className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 rounded border border-slate-200 transition-colors shadow-none"
          >
            전체 이상 로그 및 CAPA 추적기 이동
          </button>
        </div>
      </div>
    </div>
  );
}
