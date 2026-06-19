export type TestCategory = 'ELISA IgG' | 'RT-PCR Viral Load' | 'HPLC Potency' | 'NGS Library Prep';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface HistoryEvent {
  id: string;
  status: string;
  changedBy: string;
  text: string;
  createdAt: string;
}

export interface QCIssue {
  id: string;
  sampleId: string;
  batchId: string;
  testName: TestCategory;
  measuredValue: number;
  expectedValue: number;
  standardDeviation: number;
  zScore: number;
  priority: 'Urgent' | 'Medium' | 'Low';
  status: 'Open' | 'Under Investigation' | 'CAPA Action' | 'Resolved' | 'Closed';
  investigator: string;
  detectedAt: string;
  updatedAt: string;
  issueDescription: string;
  rootCause?: string;
  capaActionPlan?: string;
  aiAnalysis?: string;
  comments: Comment[];
  history: HistoryEvent[];
}

export interface ControlRun {
  id: string;
  testName: TestCategory;
  runDate: string;
  runNumber: number;
  measuredValue: number;
  expectedValue: number;
  standardDeviation: number;
  status: 'In-Control' | 'Warning' | 'Out-of-Control';
  violationRules?: string[]; // e.g. "1_3s", "2_2s", etc.
  investigator: string;
  notes?: string;
}

export interface DashboardStats {
  totalIssues: number;
  activeIssues: number;
  criticalIssues: number;
  resolvedIssues: number;
  controlFailureRate: number; // percentage of runs flagged as warning or out of control
}
