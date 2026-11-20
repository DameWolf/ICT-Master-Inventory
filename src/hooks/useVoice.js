import { useState, useCallback, useRef, useEffect } from "react";

// ── Feature detection ────────────────────────────────────────
const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const synth =
  typeof window !== "undefined" ? window.speechSynthesis : null;

// ── LocalStorage keys ────────────────────────────────────────
const VOICE_SETTINGS_KEY = "ict_voice_settings";

function loadVoiceSettings() {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveVoiceSettings(settings) {
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

function scoreVoice(voice) {
  const name = (voice?.name || "").toLowerCase();
  const lang = (voice?.lang || "").toLowerCase();
  let score = 0;

  if (lang.startsWith("en-us")) score += 20;
  else if (lang.startsWith("en-gb")) score += 16;
  else if (lang.startsWith("en")) score += 12;

  if (/neural|natural|wavenet|online|premium|enhanced/.test(name)) score += 30;
  if (/microsoft|google|apple/.test(name)) score += 18;
  if (/aria|jenny|guy|sara|davis|ryan|zira|emma/.test(name)) score += 8;

  if (/default|espeak|compact/.test(name)) score -= 20;
  return score;
}

// ── Strip markdown for cleaner speech ────────────────────────
function stripMarkdownForSpeech(text) {
  if (!text) return "";
  return text
    // Remove markdown tables entirely (they sound terrible spoken)
    .replace(/\|[^\n]+\|/g, "")
    .replace(/\|-+[|-\s]+/g, "")
    // Remove markdown formatting
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Clean bullet points
    .replace(/^[-•*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Make technical text easier to hear
    .replace(/\bAI\b/g, "A I")
    .replace(/\bICT\b/g, "I C T")
    .replace(/\bIT\b/g, "I T")
    .replace(/\bPM\b/g, "P M")
    .replace(/>=/g, "greater than or equal to")
    .replace(/<=/g, "less than or equal to")
    .replace(/\bvs\.?\b/gi, "versus")
    .replace(/\bdept\b/gi, "department")
    .replace(/\bqty\b/gi, "quantity")
    .replace(/\bproc\b/gi, "procurement")
    .replace(/%/g, " percent")
    // Clean excess whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function computeProsodyForChunk(chunk, baseRate, expressive) {
  const text = String(chunk || "");
  const hasQuestion = text.includes("?");
  const hasExclamation = text.includes("!");
  const hasNumbers = /\d/.test(text);
  const isHeadingLike = /^[A-Z\s\d\-:]{8,}$/.test(text.trim());

  let rate = baseRate;
  let pitch = 1.0;

  if (hasQuestion) {
    rate -= 0.03;
    pitch += 0.07;
  }
  if (hasExclamation) {
    rate += 0.02;
    pitch += 0.05;
  }
  if (hasNumbers) {
    rate -= 0.03;
  }
  if (isHeadingLike) {
    rate -= 0.05;
    pitch += 0.02;
  }

  if (expressive) {
    const jitter = (Math.random() - 0.5) * 0.04;
    rate += jitter;
    pitch += (Math.random() - 0.5) * 0.06;
  }

  return {
    rate: Math.max(0.75, Math.min(1.25, rate)),
    pitch: Math.max(0.85, Math.min(1.25, pitch)),
  };
}

// ── Hook ─────────────────────────────────────────────────────
export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(
    () => loadVoiceSettings().voiceURI || ""
  );
  const [speechRate, setSpeechRate] = useState(
    () => loadVoiceSettings().rate || 1.0
  );
  const [expressiveVoice, setExpressiveVoice] = useState(
    () => loadVoiceSettings().expressiveVoice !== false
  );
  const [autoSpeak, setAutoSpeak] = useState(
    () => loadVoiceSettings().autoSpeak !== false // default true
  );

  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef("");

  // Browser support flags
  const sttSupported = Boolean(SpeechRecognition);
  const ttsSupported = Boolean(synth);

  // ── Load available voices ──────────────────────────────────
  useEffect(() => {
    if (!synth) return;

    const loadVoices = () => {
      const available = synth.getVoices();
      if (available.length > 0) {
        setVoices(available);
        if (!selectedVoiceURI) {
          const preferred = [...available]
            .filter((v) => v.lang?.toLowerCase().startsWith("en"))
            .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
          if (preferred) {
            setSelectedVoiceURI(preferred.voiceURI);
          }
        }
      }
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [selectedVoiceURI]);

  // ── Persist settings changes ───────────────────────────────
  useEffect(() => {
    saveVoiceSettings({
      voiceURI: selectedVoiceURI,
      rate: speechRate,
      expressiveVoice,
      autoSpeak,
    });
  }, [selectedVoiceURI, speechRate, expressiveVoice, autoSpeak]);

  // ── Speech-to-Text ─────────────────────────────────────────
  const startListening = useCallback(
    (onFinalResult) => {
      if (!SpeechRecognition) return;
      // Stop any existing recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      finalTranscriptRef.current = "";
      setTranscript("");
      setInterimTranscript("");

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          finalTranscriptRef.current = final;
          setTranscript(final);
        }
        setInterimTranscript(interim);

        // Reset silence timer — auto-stop after 2s of silence
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const fullText = (finalTranscriptRef.current + " " + interim).trim();
          if (fullText) {
            recognition.stop();
            onFinalResult?.(fullText);
          }
        }, 2000);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "aborted") {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        clearTimeout(silenceTimerRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    []
  );

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  // ── Text-to-Speech ─────────────────────────────────────────
  const speak = useCallback(
    (text) => {
      if (!synth || !text) return;

      // Cancel any current speech
      synth.cancel();

      const cleanText = stripMarkdownForSpeech(text);
      if (!cleanText) return;

      // Chrome has a bug where long utterances cut off at ~15s
      // Split into chunks at sentence boundaries
      const chunks = splitIntoChunks(cleanText, 200);

      let chunkIndex = 0;

      const speakNext = () => {
        if (chunkIndex >= chunks.length) {
          setIsSpeaking(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
        const prosody = computeProsodyForChunk(chunks[chunkIndex], speechRate, expressiveVoice);
        utterance.rate = prosody.rate;
        utterance.pitch = prosody.pitch;
        utterance.volume = 1.0;

        // Set selected voice
        if (selectedVoiceURI) {
          const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
          if (voice) utterance.voice = voice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          chunkIndex++;
          // Add a tiny breathing pause so speech sounds less mechanical.
          const pauseMs = expressiveVoice ? 80 + Math.floor(Math.random() * 100) : 20;
          setTimeout(speakNext, pauseMs);
        };
        utterance.onerror = (e) => {
          if (e.error !== "canceled") {
            console.warn("TTS error:", e.error);
          }
          setIsSpeaking(false);
        };

        utteranceRef.current = utterance;
        synth.speak(utterance);
      };

      speakNext();
    },
    [selectedVoiceURI, speechRate, expressiveVoice, voices]
  );

  const stopSpeaking = useCallback(() => {
    if (synth) {
      synth.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // ── Replay a specific message ──────────────────────────────
  const replayMessage = useCallback(
    (text) => {
      speak(text);
    },
    [speak]
  );

  // ── Cleanup on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (synth) synth.cancel();
    };
  }, []);

  return {
    // STT
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    sttSupported,

    // TTS
    isSpeaking,
    speak,
    stopSpeaking,
    replayMessage,
    ttsSupported,

    // Voice settings
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    speechRate,
    setSpeechRate,
    expressiveVoice,
    setExpressiveVoice,
    autoSpeak,
    setAutoSpeak,
  };
}

// ── Helper: split text into speakable chunks ─────────────────
function splitIntoChunks(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
