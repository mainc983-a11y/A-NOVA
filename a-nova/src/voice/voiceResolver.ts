export interface VoiceAudioParams {
  voice: SpeechSynthesisVoice | null;
  pitch: number;
  rate: number;
}

const PROFILES = ["Nova", "Orbit", "Aura", "Pulse", "Vector"] as const;

const PROFILE_PARAMS: Record<
  string,
  { pitch: number; rate: number; keywords: string[] }
> = {
  Nova: {
    pitch: 1.0,
    rate: 1.20,
    keywords: ["nova", "google us english", "samantha", "ava", "jenny", "zira", "natural", "female"],
  },
  Orbit: {
    pitch: 0.92,
    rate: 1.30,
    keywords: ["orbit", "david", "alex", "daniel", "google uk english male", "guy", "mark", "male", "crisp"],
  },
  Aura: {
    pitch: 1.12,
    rate: 1.22,
    keywords: ["aura", "fiona", "veena", "claire", "moira", "soft", "siri", "google uk english female", "google australian english female", "helena"],
  },
  Pulse: {
    pitch: 1.25,
    rate: 1.32,
    keywords: ["pulse", "puck", "rishi", "fred", "tessa", "junior", "google australian english", "expressive", "upbeat"],
  },
  Vector: {
    pitch: 0.75,
    rate: 1.12,
    keywords: ["vector", "george", "ralph", "oliver", "yuri", "deep", "charon", "google india english", "google english male"],
  },
};

/**
  Resolves unique voice profile settings for all 5 AI profiles to guarantee distinct TTS voices.
 */
export function resolveAllVoices(
  selectedLang: string = "en-US",
  voices: SpeechSynthesisVoice[] = []
): Record<string, VoiceAudioParams> {
  const lang = selectedLang || "en-US";
  const langPrefix = lang.split("-")[0].toLowerCase();

  const langVoices = voices.filter((v) =>
    v.lang.toLowerCase().replace("_", "-").startsWith(langPrefix)
  );
  const candidatePool = langVoices.length > 0 ? langVoices : voices;

  const assignedVoices = new Set<SpeechSynthesisVoice>();
  const result: Record<string, VoiceAudioParams> = {};

  // Pass 1: Try keyword matching on unassigned voices
  for (const profile of PROFILES) {
    const params = PROFILE_PARAMS[profile];
    let chosen: SpeechSynthesisVoice | null = null;

    // First try exact profile name match
    chosen =
      candidatePool.find(
        (v) => !assignedVoices.has(v) && v.name.toLowerCase().includes(profile.toLowerCase())
      ) || null;

    // Then try keywords on unassigned candidate voices
    if (!chosen) {
      for (const kw of params.keywords) {
        const match = candidatePool.find(
          (v) => !assignedVoices.has(v) && v.name.toLowerCase().includes(kw)
        );
        if (match) {
          chosen = match;
          break;
        }
      }
    }

    if (chosen) {
      assignedVoices.add(chosen);
      result[profile] = { voice: chosen, pitch: params.pitch, rate: params.rate };
    }
  }

  // Pass 2: Assign remaining profiles to unused voices in candidatePool / voices
  for (const profile of PROFILES) {
    if (!result[profile]) {
      const params = PROFILE_PARAMS[profile];
      let unused = candidatePool.find((v) => !assignedVoices.has(v));
      if (!unused && voices.length > 0) {
        unused = voices.find((v) => !assignedVoices.has(v));
      }

      if (unused) {
        assignedVoices.add(unused);
        result[profile] = { voice: unused, pitch: params.pitch, rate: params.rate };
      }
    }
  }

  // Pass 3: Fallback for any remaining unassigned
  for (let i = 0; i < PROFILES.length; i++) {
    const profile = PROFILES[i];
    if (!result[profile]) {
      const params = PROFILE_PARAMS[profile];
      const fallbackVoice = candidatePool[i % Math.max(1, candidatePool.length)] || voices[0] || null;
      result[profile] = { voice: fallbackVoice, pitch: params.pitch, rate: params.rate };
    }
  }

  return result;
}

/**
 * Resolves distinct voice profile settings (voice selection, pitch, rate) for AI speech synthesis.
 */
export function resolveVoiceAndAudioParams(
  profileName: string = "Nova",
  selectedLang: string = "en-US",
  voices: SpeechSynthesisVoice[] = []
): VoiceAudioParams {
  // Normalize legacy voice profile names
  let profile = profileName || "Nova";
  if (profile === "Atlas") profile = "Orbit";
  if (profile === "Luna") profile = "Aura";
  if (profile === "Echo") profile = "Pulse";
  if (profile === "Sage") profile = "Vector";

  const all = resolveAllVoices(selectedLang, voices);
  return all[profile] || all["Nova"];
}



