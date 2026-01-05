import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';

import { fetchRecordingStatus } from '@/src/api/client';
import { SETTINGS } from '@/src/config';
import { RecordingStep } from '@/src/api/schemas';

const statusCopy: Record<string, string> = {
  CREATED: 'Waiting for upload…',
  UPLOADING: 'Upload in progress…',
  UPLOADED: 'Upload received. Processing…',
  PROCESSING: 'Processing video…',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const StepCard = ({ step }: { step: RecordingStep }) => {
  const openKeyframe = () => {
    if (step.evidence?.keyframeUrl) {
      Linking.openURL(step.evidence.keyframeUrl);
    }
  };

  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepIndex}>Step {step.index + 1}</Text>
        <Text style={styles.stepTiming}>
          {step.startSec}s - {step.endSec}s
        </Text>
      </View>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepDescription}>{step.description}</Text>
      {step.evidence?.transcriptSnippet ? (
        <Text style={styles.stepTranscript}>{step.evidence.transcriptSnippet}</Text>
      ) : null}
      {step.evidence?.keyframeUrl ? (
        <Pressable style={styles.keyframeButton} onPress={openKeyframe}>
          <Image source={{ uri: step.evidence.keyframeUrl }} style={styles.keyframeImage} />
          <Text style={styles.keyframeText}>Open keyframe</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const recordingId = typeof params.recordingId === 'string' ? params.recordingId : '';

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: () => fetchRecordingStatus(recordingId),
    enabled: !!recordingId,
    refetchInterval: (queryData) => {
      if (!queryData) return SETTINGS.pollIntervalMs;
      return queryData.status === 'COMPLETED' || queryData.status === 'FAILED'
        ? false
        : SETTINGS.pollIntervalMs;
    },
  });

  const statusText = data ? statusCopy[data.status] ?? data.status : 'Loading…';
  const isComplete = data?.status === 'COMPLETED';
  const isFailed = data?.status === 'FAILED';

  if (!recordingId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Missing recording id.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Back to Record</Text>
        </Pressable>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {(error as Error)?.message || 'Failed to load recording status.'}
        </Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>Record Again</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => refetch()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
      <Text style={styles.header}>Result</Text>
      <Text style={styles.infoText}>We are turning your recording into structured steps.</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Recording ID</Text>
          <Text style={styles.value}>{recordingId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{statusText}</Text>
        </View>
      </View>

      {isFetching && !isComplete && !isFailed ? (
        <Text style={styles.infoText}>Polling for updates…</Text>
      ) : null}

      {isComplete && data?.steps?.length ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>Detected steps</Text>
          {data.steps.map((step) => (
            <StepCard key={step.index} step={step} />
          ))}
        </View>
      ) : null}

      {isComplete && (!data?.steps || data.steps.length === 0) ? (
        <Text style={styles.infoText}>Completed, but no steps were returned.</Text>
      ) : null}

      {isFailed ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.errorText}>{data?.error || 'Processing failed.'}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    padding: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndex: {
    fontWeight: '700',
    color: '#111827',
  },
  stepTiming: {
    color: '#6b7280',
    fontSize: 13,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  stepDescription: {
    color: '#374151',
    fontSize: 14,
  },
  stepTranscript: {
    color: '#1f2937',
    fontSize: 13,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
  },
  keyframeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyframeImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  keyframeText: {
    color: '#2563eb',
    fontWeight: '600',
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
    padding: 16,
    gap: 12,
  },
});
