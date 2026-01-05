import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { initRecording, markUploadComplete } from '@/src/api/client';
import { SETTINGS } from '@/src/config';
import { parseMarkersParam } from '@/src/utils/params';
import { uploadVideo } from '@/src/upload/uploadVideo';

type UploadState = 'idle' | 'init' | 'uploading' | 'notifying' | 'done' | 'error';

export default function UploadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const videoUri = typeof params.uri === 'string' ? params.uri : '';
  const durationSec = params.duration ? Number(params.duration) : undefined;
  const markers = useMemo(() => parseMarkersParam(params.markers), [params.markers]);

  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { mutateAsync: initMutate } = useMutation({
    mutationFn: initRecording,
  });

  const { mutateAsync: completeMutate } = useMutation({
    mutationFn: markUploadComplete,
  });

  const startUploadFlow = useCallback(async () => {
    if (!videoUri) {
      setError('Missing video to upload.');
      setState('error');
      return;
    }

    try {
      setError(null);
      setProgress(0);
      setState('init');

      const info = await FileSystem.getInfoAsync(videoUri, { size: true });
      if (!info.exists || !info.size) {
        throw new Error('Could not read video file.');
      }

      const fileName = videoUri.split('/').pop() || 'recording.mp4';
      const initResponse = await initMutate({
        fileName,
        contentType: SETTINGS.uploadContentType,
        sizeBytes: info.size,
        durationSec: durationSec ? Math.round(durationSec) : undefined,
        stepMarkersSec: markers.length ? markers : undefined,
      });
      setRecordingId(initResponse.recordingId);

      setState('uploading');
      const abortController = new AbortController();
      abortRef.current = abortController;

      await uploadVideo({
        fileUri: videoUri,
        uploadUrl: initResponse.uploadUrl,
        headers: initResponse.headers,
        fileName,
        contentType: SETTINGS.uploadContentType,
        signal: abortController.signal,
        onProgress: (value) => setProgress(value),
      });

      setState('notifying');
      await completeMutate(initResponse.recordingId);
      setState('done');
      router.replace({
        pathname: '/result',
        params: { recordingId: initResponse.recordingId },
      });
    } catch (err) {
      console.error('Upload error', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setState('error');
    }
  }, [videoUri, durationSec, markers, initMutate, completeMutate, router]);

  useEffect(() => {
    startUploadFlow();
    return () => {
      abortRef.current?.abort();
    };
  }, [startUploadFlow]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setError('Upload cancelled.');
    setState('error');
  };

  if (!videoUri) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No video found. Please record again.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Uploading</Text>
      <Text style={styles.infoText}>
        We are preparing and uploading your video. Keep this screen open until it finishes.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Recording ID</Text>
          <Text style={styles.value}>{recordingId ?? 'Pending'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Step markers</Text>
          <Text style={styles.value}>{markers.length}</Text>
        </View>
        {durationSec ? (
          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{Math.round(durationSec)}s</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {state === 'init' && 'Requesting upload slot…'}
            {state === 'uploading' && `Uploading ${Math.round(progress * 100)}%`}
            {state === 'notifying' && 'Notifying backend…'}
            {state === 'done' && 'Done'}
            {state === 'error' && 'Error'}
            {state === 'idle' && 'Waiting'}
          </Text>
        </View>
      </View>

      {state === 'uploading' ? (
        <Pressable style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Cancel Upload</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {state === 'error' ? (
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>Back to Record</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={startUploadFlow}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {(state === 'init' || state === 'uploading' || state === 'notifying') && (
        <View style={styles.centeredRow}>
          <ActivityIndicator />
          <Text style={styles.infoText}>Working…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    padding: 16,
    gap: 12,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#6b7280',
    fontSize: 14,
  },
  value: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  progressWrapper: {
    gap: 8,
  },
  progressBar: {
    height: 12,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
    padding: 16,
    gap: 12,
  },
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
