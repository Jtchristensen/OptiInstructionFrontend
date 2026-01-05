import { CameraCapturedVideo, CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SETTINGS } from '@/src/config';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

export default function RecordScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [markers, setMarkers] = useState<number[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    requestCameraPermission();
    requestMicrophonePermission();
  }, [requestCameraPermission, requestMicrophonePermission]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isRecording) {
      timer = setInterval(() => {
        if (startTimeRef.current) {
          const seconds = Math.min(
            SETTINGS.maxDurationSec,
            Math.floor((Date.now() - startTimeRef.current) / 1000),
          );
          setElapsedSec(seconds);
        }
      }, 500);
    } else {
      setElapsedSec(0);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRecording]);

  const permissionsLoaded = cameraPermission !== null && microphonePermission !== null;
  const permissionsGranted = !!cameraPermission?.granted && !!microphonePermission?.granted;

  const handleRecordingFinished = (video?: CameraCapturedVideo | null) => {
    setIsRecording(false);
    const durationSec =
      startTimeRef.current !== null
        ? Math.min(
            SETTINGS.maxDurationSec,
            Math.round((Date.now() - startTimeRef.current) / 1000),
          )
        : 0;
    startTimeRef.current = null;

    if (!video?.uri) {
      setRecordingError('No video captured. Please try again.');
      return;
    }

    router.push({
      pathname: '/preview',
      params: {
        uri: video.uri,
        duration: `${durationSec}`,
        markers: JSON.stringify(markers),
      },
    });
  };

  const handleRecordingError = (error: unknown) => {
    console.error('Recording error', error);
    setIsRecording(false);
    startTimeRef.current = null;
    setRecordingError('Recording failed. Please try again.');
  };

  const startRecording = async () => {
    if (!permissionsGranted) {
      setPermissionError('Camera and microphone permissions are required.');
      return;
    }

    if (!cameraRef.current) {
      setRecordingError('Camera not ready yet.');
      return;
    }

    setPermissionError(null);
    setRecordingError(null);
    setMarkers([]);
    setElapsedSec(0);
    startTimeRef.current = Date.now();
    setIsRecording(true);

    try {
      await cameraRef.current.startRecording({
        maxDuration: SETTINGS.maxDurationSec,
        quality: '720p',
        onRecordingFinished: handleRecordingFinished,
        onRecordingError: handleRecordingError,
      });
    } catch (err) {
      handleRecordingError(err);
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
    }
  };

  const markStep = () => {
    if (!isRecording || !startTimeRef.current) return;
    const seconds = Math.min(
      SETTINGS.maxDurationSec,
      Math.floor((Date.now() - startTimeRef.current) / 1000),
    );
    setMarkers((prev) => [...prev, seconds]);
  };

  if (!permissionsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.infoText}>Checking permissions…</Text>
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Camera + Mic Access Needed</Text>
        <Text style={styles.infoText}>
          We need permission to record your work. Please allow camera and microphone access.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            requestCameraPermission();
            requestMicrophonePermission();
          }}>
          <Text style={styles.primaryButtonText}>Grant Permissions</Text>
        </Pressable>
        {permissionError ? <Text style={styles.errorText}>{permissionError}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Record Process</Text>
      <Text style={styles.infoText}>
        Record up to {Math.floor(SETTINGS.maxDurationSec / 60)} minutes of your work. Mark steps as
        you go.
      </Text>
      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          facing={CameraType.back}
          style={styles.camera}
          videoQuality="720p"
          mode="video"
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Elapsed</Text>
          <Text style={styles.statValue}>{formatTime(elapsedSec)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Step markers</Text>
          <Text style={styles.statValue}>{markers.length}</Text>
        </View>
      </View>

      {recordingError ? <Text style={styles.errorText}>{recordingError}</Text> : null}

      <View style={styles.buttonRow}>
        {!isRecording ? (
          <Pressable style={styles.primaryButton} onPress={startRecording}>
            <Text style={styles.primaryButtonText}>Start Recording</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.dangerButton} onPress={stopRecording}>
            <Text style={styles.primaryButtonText}>Stop</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.secondaryButton, !isRecording && styles.disabledButton]}
          onPress={markStep}
          disabled={!isRecording}>
          <Text style={styles.secondaryButtonText}>Mark Step</Text>
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
  cameraWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  camera: {
    flex: 1,
  },
  controls: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  statValue: {
    color: '#111827',
    fontSize: 16,
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
  dangerButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
    padding: 16,
    gap: 12,
  },
});
