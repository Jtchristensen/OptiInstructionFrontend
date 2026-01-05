type UploadParams = {
  fileUri: string;
  uploadUrl: string;
  headers?: Record<string, string>;
  fileName: string;
  contentType: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

export const uploadVideo = ({
  fileUri,
  uploadUrl,
  headers,
  fileName,
  contentType,
  signal,
  onProgress,
}: UploadParams): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    xhr.open('PUT', uploadUrl);

    xhr.onload = () => {
      if (settled) return;
      settled = true;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => rejectOnce(new Error('Network error during upload'));
    xhr.onabort = () => rejectOnce(new DOMException('Upload aborted', 'AbortError'));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = event.total > 0 ? event.loaded / event.total : 0;
        onProgress(progress);
      }
    };

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    }
    xhr.setRequestHeader('Content-Type', contentType);

    if (signal) {
      signal.addEventListener('abort', () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          xhr.abort();
        }
      });
    }

    const fileBody = {
      uri: fileUri,
      type: contentType,
      name: fileName,
    } as any;

    try {
      xhr.send(fileBody);
    } catch (err) {
      rejectOnce(err);
    }
  });
};
