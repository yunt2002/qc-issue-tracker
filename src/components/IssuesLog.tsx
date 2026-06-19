import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  HelpCircle, 
  Activity, 
  User, 
  Tag, 
  X,
  FileSpreadsheet,
  PlusCircle,
  Hash
} from "lucide-react";
import { QCIssue, TestCategory } from "../types";

interface IssuesLogProps {
  issues: QCIssue[];
  onSelectIssue: (issueId: string) => void;
  onAddIssue: (issue: {
    sampleId: string;
    batchId: string;
    testName: TestCategory;
    measuredValue: number;
    priority: "Urgent" | "Medium" | "Low";
    investigator: string;
    issueDescription: string;
  }) => void;
}

export default function IssuesLog({ issues, onSelectIssue, onAddIssue }: IssuesLogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [testFilter, setTestFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [sampleId, setSampleId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [testName, setTestName] = useState<TestCategory>("ELISA IgG");
  const [measuredValue, setMeasuredValue] = useState("");
  const [priority, setPriority] = useState<"Urgent" | "Medium" | "Low">("Medium");
  const [investigator, setInvestigator] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  const filteredIssues = React.useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = 
        issue.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.investigator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.issueDescription.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "All" || issue.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || issue.priority === priorityFilter;
      const matchesTest = testFilter === "All" || issue.testName === testFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesTest;
    });
  }, [issues, searchTerm, statusFilter, priorityFilter, testFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleId || !batchId || !measuredValue || !investigator) return;

    onAddIssue({
      sampleId,
      batchId,
      testName,
      measuredValue: parseFloat(measuredValue),
      priority,
      investigator,
      issueDescription
    });

    // Reset and close
    setSampleId("");
    setBatchId("");
    setMeasuredValue("");
    setInvestigator("");
    setIssueDescription("");
    setShowAddForm(false);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "Urgent": return "bg-red-50 text-red-700 border-red-200";
      case "Medium": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Open": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Under Investigation": return "bg-purple-50 text-purple-700 border-purple-200";
      case "CAPA Action": return "bg-orange-50 text-orange-700 border-orange-200";
      case "Resolved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Closed": return "bg-zinc-700 text-white border-zinc-900";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div id="issues-log-root" className="space-y-4 animate-slide-in">
      {/* Search and Filters Header */}
      <div className="lab-card border border-slate-200 rounded p-3 shadow-xs space-y-3 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="검체/배치 번호, 조사관 이름, 오류 세부내용 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-xs text-slate-800"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <PlusCircle size={13} />
              인위적 이상 등록
            </button>
          </div>
        </div>

        {/* Inline Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
              <Activity size={11} /> 실험종류:
            </span>
            <select
              value={testFilter}
              onChange={(e) => setTestFilter(e.target.value)}
              className="flex-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1 outline-none focus:bg-white focus:border-slate-300"
            >
              <option value="All">전체 항목</option>
              <option value="ELISA IgG">ELISA IgG</option>
              <option value="RT-PCR Viral Load">RT-PCR Viral Load</option>
              <option value="HPLC Potency">HPLC Potency</option>
              <option value="NGS Library Prep">NGS Library Prep</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
              <Tag size={11} /> 해결상태:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1 outline-none focus:bg-white focus:border-slate-300"
            >
              <option value="All">전체 상태</option>
              <option value="Open">등록 완료 (Open)</option>
              <option value="Under Investigation">원인 조사 중</option>
              <option value="CAPA Action">CAPA 조치 진행중</option>
              <option value="Resolved">이상 조치 완료 (Resolved)</option>
              <option value="Closed">종결 (Closed)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
              <HelpCircle size={11} /> 우선순위:
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded p-1 outline-none focus:bg-white focus:border-slate-300"
            >
              <option value="All">전체 우선순위</option>
              <option value="Urgent">Urgent (긴급)</option>
              <option value="Medium">Medium (보통)</option>
              <option value="Low">Low (낮음)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Manual QC Registration Dialog/Form */}
      {showAddForm && (
        <div className="p-[1px] bg-[#E2E8F0] rounded border border-slate-300 shadow-sm animate-slide-in">
          <div className="bg-white rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-emerald-50 text-emerald-600 rounded">
                  <FileSpreadsheet size={14} />
                </span>
                <span className="font-bold text-slate-800 text-xs">이상 및 오차 강제 로그온 (Audit Trail 수동 등록)</span>
              </div>
              <button 
                onClick={() => setShowAddForm(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Hash size={11} /> 검체 일련번호 (Sample ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: SMP-EL-884"
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Hash size={11} /> 제조/실험 배치번호 (Batch ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: BTH-EL-090"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Activity size={11} /> 실험 분석 항목 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={testName}
                    onChange={(e) => setTestName(e.target.value as TestCategory)}
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  >
                    <option value="ELISA IgG">ELISA IgG (Mean 1.50, SD 0.10)</option>
                    <option value="RT-PCR Viral Load">RT-PCR Viral Load (Mean 3.00, SD 0.20)</option>
                    <option value="HPLC Potency">HPLC Potency (Mean 98.50, SD 0.80)</option>
                    <option value="NGS Library Prep">NGS Library Prep (Mean 45.00, SD 3.00)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Activity size={11} /> 측정 측정값 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="예: 1.34"
                    value={measuredValue}
                    onChange={(e) => setMeasuredValue(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">위험 수준</label>
                  <div className="flex gap-1.5">
                    {["Urgent", "Medium", "Low"].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setPriority(lvl as any)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded border transition-all ${
                          priority === lvl 
                            ? "bg-[#0F172A] border-[#0F172A] text-white" 
                            : "bg-slate-50 border-slate-200 text-[#475569] hover:bg-slate-100"
                        }`}
                      >
                        {lvl === "Urgent" ? "Urgent" : lvl === "Medium" ? "Medium" : "Low"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <User size={11} /> 검사 등록원 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="작업자 성함 입력"
                    value={investigator}
                    onChange={(e) => setInvestigator(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">관찰된 오차/현상 세부 기록</label>
                  <input
                    type="text"
                    placeholder="구체적인 이상 징후를 상세 기재(예: '대조군 흡광도가 임계치를 이탈함')"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded text-xs transition-all shadow-xs cursor-pointer"
                >
                  이상 등록 (Open)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Logs Display List */}
      <div className="lab-card border border-slate-200 rounded overflow-hidden shadow-xs bg-white">
        <div className="bg-slate-50/70 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 block">QC 품질 관리 데이터 로그 수기</span>
            <span className="text-[10px] text-slate-400 block font-mono">지정한 필터 기준 일계표: {filteredIssues.length} 건</span>
          </div>
          <span className="text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
            총 {issues.length}건 보관됨
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredIssues.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-1.5">
              <Search className="mx-auto text-slate-300" size={24} />
              <p className="text-xs font-semibold text-slate-700">조건에 맞는 QC 경보 사항이 존재하지 않습니다.</p>
              <p className="text-[11px] text-slate-400">상위 검색 요건이나 해결 분류 필터를 조정해 주십시오.</p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              return (
                <div 
                  key={issue.id}
                  onClick={() => onSelectIssue(issue.id)}
                  className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer active:bg-slate-100/50 transition-colors group"
                >
                  {/* Left Column: Metadata / ID */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div id={`issue-header-${issue.id}`} className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-sm">
                        {issue.id}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-sm">
                        {issue.testName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        검체: {issue.sampleId} | 배치: {issue.batchId}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-[#0F172A] line-clamp-1 group-hover:text-amber-600 transition-all">
                      {issue.issueDescription}
                    </h4>

                    <div className="flex flex-wrap items-center gap-y-0.5 gap-x-2 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <User size={11} /> {issue.investigator}
                      </span>
                      <span>•</span>
                      <span className="font-mono">등록일: {new Date(issue.detectedAt).toLocaleString("ko-KR", {hour12:false})}</span>
                      {issue.comments.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-500 font-bold">{issue.comments.length}개의 논의 피드</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Values / Badges */}
                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                    {/* Measurement Variance */}
                    <div className="text-right space-y-0.5 hidden sm:block font-mono">
                      <div className="text-[11px] font-bold text-slate-700">
                        측정: {issue.measuredValue} <span className="text-slate-400 font-normal">(기준 {issue.expectedValue})</span>
                      </div>
                      <div className="text-[10px] font-bold text-red-500">
                        Z-Score: {issue.zScore > 0 ? `+${issue.zScore}` : issue.zScore}
                      </div>
                    </div>

                    {/* Status Actions Badges */}
                    <div className="flex items-center gap-1.5 text-[9px] font-bold">
                      <span className={`px-2 py-0.5 rounded border ${getPriorityColor(issue.priority)}`}>
                        {issue.priority === "Urgent" ? "🚨 Urgent" : issue.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${getStatusColor(issue.status)}`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
