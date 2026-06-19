import { TestCategory } from "../src/types";

export const TEST_CONFIGS: Record<TestCategory, { mean: number; sd: number }> = {
  "ELISA IgG": { mean: 1.5, sd: 0.1 },
  "RT-PCR Viral Load": { mean: 3.0, sd: 0.2 },
  "HPLC Potency": { mean: 98.5, sd: 0.8 },
  "NGS Library Prep": { mean: 45.0, sd: 3.0 },
};
