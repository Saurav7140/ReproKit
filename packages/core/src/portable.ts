import { LIMITS, parseReport, ReportValidationError, type Report } from './report.js';

export async function readReportFile(file: Pick<File, 'name' | 'size' | 'text'>, signal?: AbortSignal): Promise<Report> {
  signal?.throwIfAborted();
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > LIMITS.bytes) {
    throw new ReportValidationError('too-large', 'Report exceeds the 5 MiB limit.');
  }
  if (!file.name.toLowerCase().endsWith('.json')) throw new ReportValidationError('invalid-report', 'Choose a .reprokit.json or .json report file.');
  const text = await file.text();
  signal?.throwIfAborted();
  const report = parseReport(text);
  signal?.throwIfAborted();
  return report;
}

export function prepareReportExport(report: Report): { filename: string; text: string } {
  const validated = parseReport(JSON.stringify(report));
  return { filename: `${validated.id}.reprokit.json`, text: JSON.stringify(validated) };
}
