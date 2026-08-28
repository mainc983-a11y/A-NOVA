// Utility functions for client-side audio conversion, Gemini Speech-to-Text transcription, and Gemini Text-to-Speech audio playback.

export function pcmToWavBlob(base64Pcm: string, sampleRate = 24000): Blob {
  const cleanBase64 = base64Pcm.includes(",") ? base64Pcm.split(",")[1] : base64Pcm;
  const binaryStr = atob(cleanBase64.replace(/-/g, "+").replace(/_/g, "/").trim());
  const len = binaryStr.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  /* RIFF identifier */
  view.setUint32(0, 0x52494646, false); // "RIFF"
  /* RIFF chunk length */
  view.setUint32(4, 36 + len, true);
  /* RIFF type */
  view.setUint32(8, 0x57415645, false); // "WAVE"
  /* format chunk identifier */
  view.setUint32(12, 0x666d7420, false); // "fmt "
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (1 = PCM) */
  view.setUint16(20, 1, true);
  /* channel count (1 = mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * 1 * 2) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (1 * 2) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  view.setUint32(36, 0x64617461, false); // "data"
  /* data chunk length */
  view.setUint32(40, len, true);

  // Copy raw PCM byte data
  const uint8View = new Uint8Array(buffer, 44);
  for (let i = 0; i < len; i++) {
    uint8View[i] = binaryStr.charCodeAt(i);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      if (!res) {
        reject(new Error("Empty audio blob result"));
        return;
      }
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudioBlob(blob: Blob): Promise<string> {
  if (!blob || blob.size < 200) return "";
  try {
    const audioBase64 = await blobToBase64(blob);
    const mimeType = blob.type || "audio/webm";

    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audioBase64,
        mimeType,
      }),
    });

    if (!response.ok) {
      console.warn("[transcribeAudioBlob] Server response not OK:", response.status);
      return "";
    }

    const data = await response.json();
    return (data.text || "").trim();
  } catch (err) {
    console.error("[transcribeAudioBlob] Error calling /api/transcribe:", err);
    return "";
  }
}

export async function fetchGeminiTtsAudio(text: string, voiceName = "Zephyr"): Promise<{ audioUrl: string; base64: string } | null> {
  if (!text || !text.trim()) return null;
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("myai_token") : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/tts", {
      method: "POST",
      headers,
      body: JSON.stringify({ text: text.trim().slice(0, 1000), voiceName }),
    });

    if (!res.ok) {
      console.warn("[fetchGeminiTtsAudio] TTS server response error:", res.status);
      return null;
    }

    const data = await res.json();
    if (data && data.audioBase64) {
      const wavBlob = pcmToWavBlob(data.audioBase64, 24000);
      const audioUrl = URL.createObjectURL(wavBlob);
      return { audioUrl, base64: data.audioBase64 };
    }
    return null;
  } catch (err) {
    console.error("[fetchGeminiTtsAudio] Error requesting TTS audio:", err);
    return null;
  }
}
