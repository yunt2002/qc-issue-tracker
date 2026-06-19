import React, { useState } from "react";
import { 
  ArrowLeft, 
  Activity, 
  User, 
  Clock, 
  Wrench, 
  Search, 
  Sparkles, 
  Send,
  Loader2,
  Lightbulb,
  History
} from "lucide-react";
import Markdown from "react-markdown";
import { QCIssue } from "../types";

interface IssueDetailsProps {
  issue: QCIssue;
  onBack: () => void;
  onUpdateIssue: (issueId: string, updates: Partial<QCIssue> & { investigator?: string; text?: string }) => void;
  onAddComment: (issueId: string, author: string, text: string) => void;
  onTriggerAI: (issueId: string) => Promise<void>;
  isAiLoading: boolean;
}

export default function IssueDetails({ 
  issue, 
  onBack, 
  onUpdateIssue, 
  onAddComment, 
  onTriggerAI,
  isAiLoading
}: IssueDetailsProps) {
  const [rootCause, setRootCause] = useState(issue.rootCause || "");
  const [capaActionPlan, setCapaActionPlan] = useState(issue.capaActionPlan || "");
  const [investigator, setInvestigator] = useState("");
  const [commentText, setCommentText] = useState("");
  const [actionInvestigator, setActionInvestigator] = useState("");

  const handleUpdateCAPA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionInvestigator) {
      alert("변경 처리를 기록할 작업자 이름을 기재해 주십시오.");
      return;
    }
    onUpdateIssue(issue.id, {
      rootCause,
      capaActionPlan,
      investigator: actionInvestigator,
      text: "원인(Root Cause) 및 CAPA 조치 변경 사항이 수기 기록되었습니다."
    });
    alert("원인 분석 및 조치 방안이 정상 저장되었습니다.");
  };

  const handleStatusChange = (newStatus: typeof issue.status) => {
    const userRole = prompt("상태 전이를 조작하고 있는 담당연구원 이름을 기재해주세요:", issue.investigator);
    if (!userRole) return;

    onUpdateIssue(issue.id, {
      status: newStatus,
      investigator: userRole,
    });
  };

  const handlePriorityChange = (newPriority: typeof issue.priority) => {
    const userRole = prompt("우선순위를 변경하려는 담당연구원 이름을 기재해주세요:", issue.investigator);
    if (!userRole) return;

    onUpdateIssue(issue.id, {
      priority: newPriority,
      investigator: userRole,
      text: `우선순위가 '${issue.priority}'에서 '${newPriority}'(으)로 변경되었습니다.`
    });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigator || !commentText) return;

    onAddComment(issue.id, investigator, commentText);
    setCommentText("");
  };

  const getStatusStepClass = (step: number, currentStatus: string) => {
    const statusOrder = ["Open", "Under Investigation", "CAPA Action", "Resolved", "Closed"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = step;

    if (currentIndex >= stepIndex) {
      if (currentStatus === "Closed" && stepIndex === statusOrder.length - 1) {
        return "bg-slate-900 text-white border-slate-950 font-bold";
      }
      return "bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs";
    }
    return "bg-white text-slate-400 border-slate-200";
  };

  return (
    <div id="issue-details-root" className="space-y-4 animate-slide-in font-sans">
      {/* Top action header bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded border border-slate-200 shadow-3xs cursor-pointer"
        >
          <ArrowLeft size={13} />
          실험 분석 목록으로 돌아가기
        </button>

        <div className="flex flex-wrap gap-1.5">
          {issue.status === "Open" && (
            <button
              onClick={() => handleStatusChange("Under Investigation")}
              className="px-2.5 py-1.5 bg-yellow-50 hover:bg-yellow-101 text-yellow-700 font-bold rounded border border-yellow-200 text-[10px] cursor-pointer"
            >
              🔍 원인 규명 착수
            </button>
          )}

          {["Open", "Under Investigation"].includes(issue.status) && (
            <button
              onClick={() => handleStatusChange("CAPA Action")}
              className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-101 text-orange-700 font-bold rounded border border-orange-200 text-[10px] cursor-pointer"
            >
              🛠️ 위험 제거 조치 개시 (CAPA)
            </button>
          )}

          {["Under Investigation", "CAPA Action"].includes(issue.status) && (
            <button
              onClick={() => handleStatusChange("Resolved")}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-705 text-white font-bold rounded text-[10px] cursor-pointer"
            >
              ✅ 조치 완료 승인
            </button>
          )}

          {issue.status === "Resolved" && (
            <button
              onClick={() => handleStatusChange("Closed")}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded text-[10px] cursor-pointer"
            >
              📁 이슈 최종 영구보관 (Closed)
            </button>
          )}

          {issue.status === "Closed" && (
            <button
              onClick={() => handleStatusChange("Open")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] cursor-pointer"
            >
              🔓 보관 해제 및 재조사
            </button>
          )}
        </div>
      </div>

      {/* Visual investigation tracking timeline pipeline / stepper */}
      <div className="lab-card border border-slate-200 rounded p-3 bg-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 rounded bg-indigo-50 font-mono text-[10px] font-black text-indigo-700 border border-indigo-100">
              {issue.id}
            </span>
            <div className="text-[10px] text-slate-400 font-medium">
              최종 전송: {new Date(issue.updatedAt).toLocaleString("ko-KR")}
            </div>
          </div>

          {/* Stepper bubbles mapping */}
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className={`px-2 py-0.5 border rounded ${getStatusStepClass(0, issue.status)}`}>이상보고 (Open)</span>
            <span className="text-slate-300">→</span>
            <span className={`px-2 py-0.5 border rounded ${getStatusStepClass(1, issue.status)}`}>원인분석중</span>
            <span className="text-slate-300">→</span>
            <span className={`px-2 py-0.5 border rounded ${getStatusStepClass(2, issue.status)}`}>CAPA 시행</span>
            <span className="text-slate-300">→</span>
            <span className={`px-2 py-0.5 border rounded ${getStatusStepClass(3, issue.status)}`}>조치완료</span>
            <span className="text-slate-300">→</span>
            <span className={`px-2 py-0.5 border rounded ${getStatusStepClass(4, issue.status)}`}>영구종결</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Metadata description + CAPA registry form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1: Detailed Metadata Card */}
          <div className="lab-card border border-slate-200 rounded p-4 shadow-xs space-y-3 bg-white">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">원 시험 측정 정보 및 현황</span>
              <div className="flex gap-1">
                {["Urgent", "Medium", "Low"].map((level) => (
                  <button
                    key={level}
                    onClick={() => handlePriorityChange(level as any)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      issue.priority === level 
                        ? level === "Urgent" 
                          ? "bg-red-50 border-red-300 text-red-700" 
                          : level === "Medium"
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded border border-slate-100 font-mono">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">실험 종류</span>
                <span className="block text-xs font-black text-slate-800">{issue.testName}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">측정 결과값</span>
                <span className="block text-xs font-black text-red-600">{issue.measuredValue}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">관리한계 (Mean ± SD)</span>
                <span className="block text-xs font-semibold text-slate-700">
                  {issue.expectedValue.toFixed(2)} ± {issue.standardDeviation.toFixed(2)}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Z-Score 값</span>
                <span className="block text-xs font-black text-red-500">
                  {issue.zScore > 0 ? `+${issue.zScore}` : issue.zScore}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">발생 경위 및 오차 설명</span>
              <p className="text-xs text-slate-700 leading-normal bg-slate-50/50 p-3 rounded border border-slate-100 font-normal">
                {issue.issueDescription}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-400">
              <div className="flex items-center gap-1.5">
                <User size={12} className="text-slate-400" />
                <span>조사 주무관: <strong className="text-slate-600">{issue.investigator}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                <span>최초 관찰시각: <strong className="text-slate-600">{new Date(issue.detectedAt).toLocaleString("ko-KR", {hour12:false})}</strong></span>
              </div>
            </div>
          </div>

          {/* Section 2: CAPA Lab Form Registry */}
          <div className="lab-card border border-slate-200 rounded p-4 shadow-xs space-y-3 bg-white">
            <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">
                <Wrench size={13} />
              </span>
              <span className="font-bold text-[#0F172A] text-xs">원인 기인분석 및 오차 시정 조치(CAPA)</span>
            </div>

            <form onSubmit={handleUpdateCAPA} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  🔍 이상 발생 근본 원인분석 (Root Cause Analysis)
                </label>
                <textarea
                  rows={2}
                  placeholder="예: 'HPLC 피크 피크 퍼짐 현상 확인. 대조군 흡광도가 경계치를 초과하여 수명이 소모된 역상 Column의 충전제 문제로 판정함.'"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50/20 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  🛠️ 예방 조치 지침 (CAPA Action Plan)
                </label>
                <textarea
                  rows={2}
                  placeholder="예: '1단계: 이동상 신선 제조 교체 및 기포 초음파 제거. 2단계: 신규 컬럼 교환 후 6시간 압력 안정화 수행.'"
                  value={capaActionPlan}
                  onChange={(e) => setCapaActionPlan(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50/20 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <User size={12} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="조치 수기로그 등록자 정보 기재"
                    value={actionInvestigator}
                    onChange={(e) => setActionInvestigator(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded bg-slate-50 focus:bg-white outline-none transition-all text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                >
                  RCA 및 CAPA 조치 전달
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Gemini Expert Panel & History Discuss */}
        <div className="space-y-4">
          {/* Gemini Expert Panel */}
          <div className="bg-slate-900 text-white rounded p-4 border border-slate-800 space-y-3 relative overflow-hidden shadow-xs">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none transform translate-x-3 -translate-y-3">
              <Sparkles size={110} />
            </div>
            
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 px-1.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20 font-sans">
                    <Sparkles size={13} />
                  </span>
                  <span className="font-bold text-white text-xs font-sans">Gemini AI CAPA 품질 자문</span>
                </div>
                <span className="text-[9px] font-bold font-mono bg-slate-800 text-indigo-400 px-1.5 py-0.2 rounded uppercase">
                  v3.5 Flash
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                검체 이탈 측정값, 대상 오차의 Z-Score, Mean/SD 인자가 
                포함된 CLIA 가이드라인 및 서식 권고사항을 Gemini가 즉각 분석하여 
                SOP 맞춤식 정밀 기술 분석 보고서를 제공합니다.
              </p>

              {issue.aiAnalysis ? (
                <div className="bg-slate-950/85 rounded p-3 border border-slate-800 text-[10px] overflow-y-auto max-h-64 text-slate-300 space-y-2 font-mono">
                  <span className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase block border-b border-slate-800 pb-1 font-sans">
                    자문 결과 레포트
                  </span>
                  <div className="markdown-body space-y-1 text-slate-200">
                    <Markdown>{issue.aiAnalysis}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-dashed border-slate-800 p-4 text-center text-slate-450 text-xs">
                  <Lightbulb className="mx-auto text-indigo-400 mb-1" size={18} />
                  아직 자문 레포트가 요청되지 않았습니다.
                </div>
              )}

              <button
                type="button"
                onClick={() => onTriggerAI(issue.id)}
                disabled={isAiLoading}
                className="w-full flex items-center justify-center gap-1 py-1.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded text-xs shadow-none transition-all cursor-pointer font-sans"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    Chief Medical Officer 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    {issue.aiAnalysis ? "AI 컨설팅 재자문 요청" : "Gemini AI 원인진단 자문발송"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Timeline of History and Comments list */}
          <div className="lab-card border border-slate-200 rounded p-4 shadow-xs space-y-3 bg-white">
            <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="p-1 bg-slate-50 text-slate-600 rounded">
                <History size={13} />
              </span>
              <span className="font-bold text-[#0F172A] text-xs">감사 추적 및 피드백 (Audit Trail)</span>
            </div>

            {/* Comment subform */}
            <form onSubmit={handleCommentSubmit} className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  placeholder="작업자"
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="w-14 flex-none text-[10px] p-1.5 border border-slate-200 rounded bg-slate-50 outline-none focus:bg-white focus:border-emerald-500 font-bold"
                />
                <input
                  type="text"
                  required
                  placeholder="의견이나 관찰 피드백 추가..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 text-[10px] p-1.5 border border-slate-200 rounded bg-slate-50 outline-none focus:bg-white focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 rounded transition-colors shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
            </form>

            {/* Combined Chronological timeline list */}
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {issue.history.map((evt) => (
                <div key={evt.id} className="relative pl-3.5 border-l-2 border-slate-200 text-[10px] flex flex-col gap-0.5">
                  <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-slate-300"></div>
                  <div className="flex items-center justify-between text-slate-400 font-bold">
                    <span className="flex items-center gap-1 text-[10px]">
                      <User size={10} /> {evt.changedBy}
                    </span>
                    <span className="font-mono text-[9px]">
                      {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#334155] leading-normal font-medium">
                    {evt.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
