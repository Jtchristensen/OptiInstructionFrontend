import { SETTINGS } from '@/src/config';
import {
  InitRecordingResponse,
  RecordingStatusResponse,
  initRecordingResponseSchema,
  recordingStatusSchema,
} from './schemas';

type InitRecordingRequest = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  durationSec?: number;
  stepMarkersSec?: number[];
};

const parseJson = async <T>(response: Response, schema: { parse: (input: unknown) => T }) => {
  const data = await response.json();
  return schema.parse(data);
};

const handleError = async (response: Response) => {
  let message = `Request failed (${response.status})`;
  try {
    const text = await response.text();
    if (text) {
      message += `: ${text}`;
    }
  } catch {
    // ignore
  }
  throw new Error(message);
};

export const initRecording = async (
  payload: InitRecordingRequest,
): Promise<InitRecordingResponse> => {
  const response = await fetch(`${SETTINGS.apiBaseUrl}/api/recordings/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleError(response);
  }

  return parseJson(response, initRecordingResponseSchema);
};

export const markUploadComplete = async (recordingId: string): Promise<void> => {
  const response = await fetch(`${SETTINGS.apiBaseUrl}/api/recordings/${recordingId}/complete`, {
    method: 'POST',
  });

  if (!response.ok) {
    await handleError(response);
  }
};

export const fetchRecordingStatus = async (
  recordingId: string,
): Promise<RecordingStatusResponse> => {
  const response = await fetch(`${SETTINGS.apiBaseUrl}/api/recordings/${recordingId}`);

  if (!response.ok) {
    await handleError(response);
  }

  return parseJson(response, recordingStatusSchema);
};
