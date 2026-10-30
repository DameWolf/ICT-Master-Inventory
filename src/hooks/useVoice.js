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

// ── Strip markdown for cleaner speech ────────────────────────
function stripMarkdownForSpeech(text) {
  if (!text) return "";
  return text
    // Remove markdown tables entirely (they sound terrible spoken)
    .replace(/\|[^\n]+\|/g, "")
    .replace(/\|-+[\|\-\s]+/g, "")
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
    // Clean excess whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
        // Auto-select a good default if none saved
        if (!selectedVoiceURI) {
          const preferred = available.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Google") ||
                v.name.includes("Microsoft") ||
                v.name.includes("Natural"))
          );
          if (preferred) {
            setSelectedVoiceURI(preferred.voiceURI);
          }
        }
      }
    };

    loadVoices();
    // Chrome loads voices asynchronously
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // ── Persist settings changes ───────────────────────────────
  useEffect(() => {
    saveVoiceSettings({
      voiceURI: selectedVoiceURI,
      rate: speechRate,
      autoSpeak,
    });
  }, [selectedVoiceURI, speechRate, autoSpeak]);

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
        utterance.rate = speechRate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set selected voice
        if (selectedVoiceURI) {
          const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
          if (voice) utterance.voice = voice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          chunkIndex++;
          speakNext();
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
    [selectedVoiceURI, speechRate, voices]
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
