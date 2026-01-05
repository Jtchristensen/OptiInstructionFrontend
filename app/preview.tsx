import { Video, ResizeMode } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseMarkersParam } from '@/src/utils/params';

export default function PreviewScreen() {
  const router = useRouter();
  const videoRef = useRef<Video | null>(null);
  const params = useLocalSearchParams();

  const videoUri = typeof params.uri === 'string' ? params.uri : '';
  const durationSec = params.duration ? Number(params.duration) : undefined;
  const markers = useMemo(() => parseMarkersParam(params.markers), [params.markers]);

  if (!videoUri) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No video found. Please record again.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const onUpload = () => {
    router.push({
      pathname: '/upload',
      params: {
        uri: videoUri,
        duration: durationSec ? `${durationSec}` : undefined,
        markers: JSON.stringify(markers),
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Preview</Text>
      <Text style={styles.infoText}>Review your recording before uploading.</Text>

      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoUri }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          useNativeControls
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Duration</Text>
        <Text style={styles.metaValue}>{durationSec ? `${durationSec}s` : 'Unknown'}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Step markers</Text>
        <Text style={styles.metaValue}>{markers.length}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryButtonText}>Retake</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={onUpload}>
          <Text style={styles.primaryButtonText}>Upload</Text>
        </Pressable>
      </View>
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
  videoWrapper: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  metaValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    textAlign: 'center',
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
