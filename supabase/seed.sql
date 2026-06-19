-- Seed data for QC Issue Tracker (run once after migration)
-- Usage: Supabase SQL Editor or `supabase db execute`

INSERT INTO public.control_runs (id, test_name, run_date, run_number, measured_value, expected_value, standard_deviation, status, violation_rules, investigator, notes) VALUES
('R-EL-001', 'ELISA IgG', '2026-06-01', 1, 1.52, 1.50, 0.10, 'In-Control', '[]', 'Dr. Sarah Jenkins', ''),
('R-EL-011', 'ELISA IgG', '2026-06-11', 11, 1.34, 1.50, 0.10, 'Out-of-Control', '["10_X (Ten consecutive runs on one side of Mean)"]', 'Dr. Sarah Jenkins', 'Plate batch QC drift triggered a 10-X violation.'),
('R-PC-005', 'RT-PCR Viral Load', '2026-06-14', 5, 3.82, 3.00, 0.20, 'Out-of-Control', '["1_3s (Value exceeds ±3SD limit)"]', 'Dr. Kenji Tanaka', 'Severe contamination suspected.'),
('R-HP-005', 'HPLC Potency', '2026-06-15', 5, 95.8, 98.50, 0.80, 'Out-of-Control', '["1_3s (Value exceeds ±3SD limit)"]', 'Dr. Sarah Jenkins', 'Column calibration shift.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.qc_issues (id, sample_id, batch_id, test_name, measured_value, expected_value, standard_deviation, z_score, priority, status, investigator, detected_at, updated_at, issue_description, root_cause, capa_action_plan, ai_analysis, comments, history) VALUES
('QC-2026-001', 'SMP-HPLC-092', 'BTH-HP-15', 'HPLC Potency', 95.8, 98.5, 0.8, -3.375, 'Medium', 'Resolved', 'Dr. Sarah Jenkins', '2026-06-15T09:30:22Z', '2026-06-16T15:00:00Z', 'HPLC potency benchmark dropped to 95.8%.', 'Column particulate blockage.', 'Flushed chromatographic column.', '### Gemini Expert CAPA Analysis', '[{"id":"c1","author":"Dr. Sarah Jenkins","text":"Successfully flushed column.","createdAt":"2026-06-15T18:22:00Z"}]', '[{"id":"h1","status":"Open","changedBy":"Dr. Sarah Jenkins","text":"QC issue auto-detected.","createdAt":"2026-06-15T09:30:22Z"}]'),
('QC-2026-002', 'SMP-PCR-449', 'BTH-PC-08', 'RT-PCR Viral Load', 3.82, 3.00, 0.20, 4.10, 'Urgent', 'Under Investigation', 'Dr. Kenji Tanaka', '2026-06-14T14:45:00Z', '2026-06-14T15:20:00Z', 'Viral amplification log value of 3.82 against target 3.00.', '', '', '### Gemini PCR Contamination Diagnostics', '[{"id":"c11","author":"Dr. Kenji Tanaka","text":"Master mix contamination likely.","createdAt":"2026-06-14T16:00:00Z"}]', '[{"id":"h11","status":"Open","changedBy":"Dr. Kenji Tanaka","text":"Auto-detected failure.","createdAt":"2026-06-14T14:45:00Z"}]'),
('QC-2026-003', 'SMP-EL-990', 'BTH-EL-22', 'ELISA IgG', 1.34, 1.50, 0.10, -1.60, 'Medium', 'Open', 'Emily Carter', '2026-06-11T11:15:00Z', '2026-06-11T12:00:00Z', '10_X Westgard systematic shift violation.', NULL, NULL, NULL, '[]', '[{"id":"h31","status":"Open","changedBy":"Emily Carter","text":"QC issue generated due to systematic drift.","createdAt":"2026-06-11T11:15:00Z"}]')
ON CONFLICT (id) DO NOTHING;
