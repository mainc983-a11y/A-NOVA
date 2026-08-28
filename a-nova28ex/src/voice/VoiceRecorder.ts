export interface VoiceRecorderCallbacks {
  onError?: (errorMessage: string) => void;
  onDisconnected?: () => void;
}

export class VoiceRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  public async acquireMicrophone(callbacks?: VoiceRecorderCallbacks): Promise<MediaStream | null> {
    this.stopAndRelease();

    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      callbacks?.onError?.("Microphone API is not supported in this browser environment.");
      return null;
    }

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (firstErr) {
        // Fallback for strict mobile devices
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.mediaStream = stream;

      // Monitor stream tracks for unexpected disconnection
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          console.warn("[VoiceRecorder] Microphone track ended unexpectedly.");
          callbacks?.onDisconnected?.();
        };
      });

      return stream;
    } catch (err: any) {
      console.error("[VoiceRecorder] getUserMedia error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        callbacks?.onError?.("Microphone permission denied. Please allow microphone access in browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        callbacks?.onError?.("No microphone found. Please connect a microphone and try again.");
      } else {
        callbacks?.onError?.("Could not connect to microphone. Please check your audio settings.");
      }
      return null;
    }
  }

  public startRecording(): boolean {
    if (!this.mediaStream || !this.mediaStream.active) {
      return false;
    }

    try {
      this.audioChunks = [];
      const options: MediaRecorderOptions = {};
      
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options.mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options.mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options.mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          options.mimeType = "audio/aac";
        }
      }

      this.mediaRecorder = Object.keys(options).length > 0
        ? new MediaRecorder(this.mediaStream, options)
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.error("[VoiceRecorder] MediaRecorder start error:", err);
      return false;
    }
  }

  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        resolve(this.getAudioBlob());
        return;
      }

      this.mediaRecorder.onstop = () => {
        resolve(this.getAudioBlob());
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.error("[VoiceRecorder] MediaRecorder stop error:", err);
        resolve(this.getAudioBlob());
      }
    });
  }

  public getAudioBlob(): Blob | null {
    if (this.audioChunks.length === 0) return null;
    const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
    return new Blob(this.audioChunks, { type: mimeType });
  }

  public getStream(): MediaStream | null {
    return this.mediaStream;
  }

  public stopAndRelease() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }
    this.mediaRecorder = null;

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
      } catch (_) {}
      this.mediaStream = null;
    }

    this.audioChunks = [];
  }
}
