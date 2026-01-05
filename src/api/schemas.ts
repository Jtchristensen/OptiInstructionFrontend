import { z } from 'zod';

export const initRecordingResponseSchema = z.object({
  recordingId: z.string(),
  uploadUrl: z.string().url(),
  headers: z.record(z.string()).optional(),
});

export const evidenceSchema = z
  .object({
    transcriptSnippet: z.string().optional(),
    keyframeUrl: z.string().url().optional(),
  })
  .optional();

export const recordingStepSchema = z.object({
  index: z.number(),
  startSec: z.number(),
  endSec: z.number(),
  title: z.string(),
  description: z.string(),
  evidence: evidenceSchema,
});

export const recordingStatusSchema = z.object({
  recordingId: z.string(),
  status: z.enum(['CREATED', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED']),
  error: z.string().optional(),
  steps: z.array(recordingStepSchema).optional(),
});

export type InitRecordingResponse = z.infer<typeof initRecordingResponseSchema>;
export type RecordingStatusResponse = z.infer<typeof recordingStatusSchema>;
export type RecordingStep = z.infer<typeof recordingStepSchema>;
