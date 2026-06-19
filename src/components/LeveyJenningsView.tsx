import React, { useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ResponsiveContainer 
} from "recharts";
import { 
  ShieldCheck, 
  Plus,
  Loader2
} from "lucide-react";
import { ControlRun, TestCategory } from "../types";

interface LeveyJenningsViewProps {
  runs: ControlRun[];
  onAddRun: (testName: TestCategory, measuredValue: number, investigator: string, notes?: string) => Promise<{ success: boolean; triggeredAutoIssue: boolean }>;
}

export default function LeveyJenningsView({ runs, onAddRun }: LeveyJenningsViewProps) {
  const [activeTest, setActiveTest] = useState<TestCategory>("ELISA IgG");
  
  // Simulation form states
  const [simValue, setSimValue] = useState("");
  const [investigator, setInvestigator] = useState("");
  const [notes, setNotes] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  // Constants mapping
  const ANALYTE_CONFIG: Record<TestCategory, { mean: number; sd: number; unit: string; description: string }> = {
    'ELISA IgG': { mean: 1.50, sd: 0.10, unit: "OD450", description: "Enzyme-Linked Immunosorbent Assay optical absorbance index" },
    'RT-PCR Viral Load': { mean: 3.00, sd: 0.20, unit: "Log Copies/mL", description: "Reverse Transcription Real-Time PCR quantitative log cycle" },
    'HPLC Potency': { mean: 98.50, sd: 0.80, unit: "% Assay recovery", description: "High-Peak Chromatographic purification index" },
    'NGS Library Prep': { mean: 45.00, sd: 3.00, unit: "ng/uL concentration", description: "Next-Generation Sequencing dual-index yield density" }
  };

  const { mean, sd, unit, description } = ANALYTE_CONFIG[activeTest];

  // Filtering runs for active test
  const filteredRuns = React.useMemo(() => {
    return runs
      .filter(r => r.testName === activeTest)
      .sort((a, b) => a.runNumber - b.runNumber);
  }, [runs, activeTest]);

  // Compute Westgard analytics
  const runAnalytics = React.useMemo(() => {
    const total = filteredRuns.length;
    const errors = filteredRuns.filter(r => r.status === "Out-of-Control").length;
    const warnings = filteredRuns.filter(r => r.status === "Warning").length;
    const activeDeviation = total > 0 ? (filteredRuns[total - 1].measuredValue - mean) / sd : 0;

    return { total, errors, warnings, activeDeviation };
  }, [filteredRuns, mean, sd]);

  // Calculate coordinates for Y-axis ranges (to center nicely)
  const yDomain = [
    parseFloat((mean - 4.2 * sd).toFixed(2)),
    parseFloat((mean + 4.2 * sd).toFixed(2))
  ];

  // Form submit handler
  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simValue || !investigator) return;

    setIsSimulating(true);
    try {
      const res = await onAddRun(activeTest, parseFloat(simValue), investigator, notes);
      if (res.triggeredAutoIssue) {
        alert(`🚨 Westgard 경보 발령!\n\n${activeTest} 측정값이 관리한계(Mean ± 3SD)를 이탈했습니다.\n이로 인해 시스템에 신규 QC 이상건이 자동 등록되었습니다.`);
      } else {
        alert(`✅ 측정 기록 완료\n\n신규 런 값(${simValue} ${unit})이 한계 내에 존재합니다.`);
      }

      setSimValue("");
      setNotes("");
    } catch (err) {
      console.error(err);
      alert("데이터 등록에 실패했습니다.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Recharts custom payload tooltip formatter
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ControlRun = payload[0].payload;
      const deviationZ = ((data.measuredValue - mean) / sd).toFixed(2);
      return (
        <div className="bg-slate-900 border border-slate-755 text-white text-[10px] p-2 rounded shadow-lg space-y-1 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 gap-3">
            <span className="font-extrabold text-blue-300">Run #{data.runNumber} ({data.runDate})</span>
            <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${
              data.status === "Out-of-Control" ? "bg-red-500 text-white" :
              data.status === "Warning" ? "bg-amber-500 text-slate-950" : "bg-emerald-500 text-white"
            }`}>
              {data.status}
            </span>
          </div>
          <div>측정 실측치: <strong className="text-cyan-200">{data.measuredValue} {unit}</strong></div>
          <div>이탈 편차 (Z): <strong className="text-cyan-200">{deviationZ} SD</strong></div>
          <div className="text-slate-300">검사자: {data.investigator}</div>
          {data.violationRules && data.violationRules.length > 0 && (
            <div className="text-red-300 font-bold">위반 규칙: {data.violationRules.join(", ")}</div>
          )}
          {data.notes && <div className="text-slate-400 italic">비고: {data.notes}</div>}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="levey-jennings-view-root" className="space-y-4 animate-slide-in font-sans">
      {/* Target Analyte Select Tabs */}
      <div id="analyte-tabs" className="flex flex-wrap gap-1 bg-white p-1 border border-slate-200 rounded">
        {(Object.keys(ANALYTE_CONFIG) as TestCategory[]).map((category) => (
          <button
            key={category}
            onClick={() => setActiveTest(category)}
            className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all cursor-pointer ${
              activeTest === category 
                ? "bg-slate-900 border-slate-900 text-white shadow-3xs" 
                : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Analyte info, Westgard stats, Levey-Jennings Chart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1: Analyte Overview */}
          <div className="lab-card border border-slate-200 rounded p-4 shadow-xs space-y-3 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{activeTest} Levey-Jennings 차트</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-100 p-1.5 px-2.5 rounded font-mono text-[10px]">
                <span className="text-slate-450 uppercase font-sans font-bold">기준 정보 (Target)</span>
                <strong className="text-slate-800">{mean.toFixed(2)} ± {sd.toFixed(2)} {unit}</strong>
              </div>
            </div>

            {/* Westgard Stats quick breakdown */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-2.5 rounded border border-slate-100/80 font-mono">
              <div className="text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">인프라 총 Run</span>
                <span className="text-sm font-bold text-slate-800">{runAnalytics.total}회</span>
              </div>
              <div className="text-center border-x border-slate-200/60">
                <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">경고 이탈 (±2SD)</span>
                <span className="text-sm font-bold text-amber-500">{runAnalytics.warnings}회</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">오류 이탈 (±3SD)</span>
                <span className="text-sm font-bold text-red-500">{runAnalytics.errors}회</span>
              </div>
            </div>

            {/* Levey-Jennings Plot Chart using Recharts */}
            <div className="h-72 md:h-80 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={filteredRuns}
                  margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="runNumber" 
                    tickFormatter={(val) => `Run ${val}`}
                    tick={{ fill: '#94A3B8', fontSize: 9, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={yDomain}
                    tick={{ fill: '#94A3B8', fontSize: 9, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderCustomTooltip} />
                  
                  {/* Reference Lines representing Mean and 1,2,3 Standard Deviations */}
                  <ReferenceLine y={mean} stroke="#10B981" strokeWidth={1.2} label={{ value: 'Mean', fill: '#10B981', fontSize: 8, position: 'insideTopLeft' }} />
                  
                  <ReferenceLine y={mean + sd} stroke="#94A3B8" strokeDasharray="2 2" strokeWidth={0.8} label={{ value: '+1SD', fill: '#94A3B8', fontSize: 8, position: 'insideLeft' }} />
                  <ReferenceLine y={mean - sd} stroke="#94A3B8" strokeDasharray="2 2" strokeWidth={0.8} label={{ value: '-1SD', fill: '#94A3B8', fontSize: 8, position: 'insideLeft' }} />
                  
                  <ReferenceLine y={mean + 2 * sd} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={0.8} label={{ value: '+2SD', fill: '#F59E0B', fontSize: 8, position: 'insideLeft' }} />
                  <ReferenceLine y={mean - 2 * sd} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={0.8} label={{ value: '-2SD', fill: '#F59E0B', fontSize: 8, position: 'insideLeft' }} />
                  
                  <ReferenceLine y={mean + 3 * sd} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={0.8} label={{ value: '+3SD', fill: '#EF4444', fontSize: 8, position: 'insideLeft' }} />
                  <ReferenceLine y={mean - 3 * sd} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={0.8} label={{ value: '-3SD', fill: '#EF4444', fontSize: 8, position: 'insideLeft' }} />

                  {/* Primary control value line */}
                  <Line 
                    type="monotone" 
                    dataKey="measuredValue" 
                    stroke="#4F46E5" 
                    strokeWidth={1.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      let fill = '#4F46E5';
                      let r = 3;
                      if (payload.status === "Out-of-Control") {
                        fill = '#EF4444';
                        r = 4.5;
                      } else if (payload.status === "Warning") {
                        fill = '#F59E0B';
                        r = 4;
                      }
                      return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#FFF" strokeWidth={1} key={payload.id} />;
                    }}
                    activeDot={{ r: 6, strokeWidth: 1 }}
                    name="측정치"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Daily standard run submission form */}
        <div className="space-y-4">
          {/* Section 2: Laboratory run simulated logger */}
          <div className="lab-card border border-slate-200 rounded p-4 shadow-xs space-y-3 bg-white">
            <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded">
                <Plus size={13} />
              </span>
              <span className="font-bold text-slate-800 text-xs">표준 관리 물질 측정값 등록</span>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal font-normal">
              매일 의무 수행하는 정도관리(Control Sample) 계측 결과를 등록합니다. 
              실시간 Westgard 규칙 진단 모듈이 즉각 가동됩니다.
            </p>

            <form onSubmit={handleSimulateSubmit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                  <span>금일 정도 측정값 ({unit})</span>
                  <span className="text-slate-400 font-mono">기준: {mean.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder={`예시 권장값: ${mean.toFixed(2)} 내외`}
                  value={simValue}
                  onChange={(e) => setSimValue(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">작업 담당원 이름</label>
                <input
                  type="text"
                  required
                  placeholder="작업자 성함"
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">비고 / 장치 상태 특이사항</label>
                <input
                  type="text"
                  placeholder="예: '재보정 직후 측정함', '기기 가열 15분 후'"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-400 text-white font-bold rounded text-xs shadow-none transition-all cursor-pointer"
              >
                {isSimulating ? (
                  <span className="flex items-center justify-center gap-1">
                    <Loader2 size={12} className="animate-spin text-white" />
                    품질 규범 엔진 진단중...
                  </span>
                ) : "정상 가동 승인 및 Westgard 진단"}
              </button>
            </form>
          </div>

          {/* Section 3: Static Westgard Rules SOP reference card */}
          <div className="lab-card border border-slate-200 rounded p-4 shadow-xs space-y-2 bg-slate-50/50">
            <h4 className="text-[10px] font-extrabold text-slate-700 uppercase flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-500" />
              Westgard 가이드라인 규격
            </h4>
            <div className="space-y-1 text-[10px] text-slate-500 leading-relaxed font-sans">
              <p>CLIA 규범에 의거, 다음 상용 위반 여부를 측정합니다:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong className="text-slate-700 font-mono font-bold">1_2s Warning</strong>: 2SD 이탈 (경고 및 관찰 활성)</li>
                <li><strong className="text-red-600 font-mono font-bold">1_3s Reject</strong>: 3SD 이탈 (무작위/계통 이상 극단적 이탈)</li>
                <li><strong className="text-red-500 font-mono font-bold">2_2s Reject</strong>: 2회 연속 2SD 초과 (계통형 오차 판정)</li>
                <li><strong className="text-red-500 font-mono font-bold">R_4s Reject</strong>: 전후 차이 4SD 초과 (무작위 장비 오차)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
