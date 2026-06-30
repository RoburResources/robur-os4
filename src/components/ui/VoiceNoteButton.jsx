import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * VoiceNoteButton — voice-to-text for field notes.
 * Uses the browser SpeechRecognition API. Auto-categorizes the
 * transcribed note based on keyword detection (issue, incident, etc).
 * Returns { text, noteType } via onResult.
 */

const categoryKeywords = {
  incident: ["crash", "accident", "damage", "injury", "spill", "hazard", "danger", "unsafe", "collision"],
  issue: ["delay", "problem", "broken", "issue", "stuck", "fault", "fail", "waiting", "blocked", "breakdown"],
  completion: ["done", "complete", "finished", "delivered", "loaded", "unloaded", "signed", "picked up"],
};

function categorize(text) {
  const lower = text.toLowerCase();
  for (const [type, words] of Object.entries(categoryKeywords)) {
    if (words.some((w) => lower.includes(w))) return type;
  }
  return "general";
}

export default function VoiceNoteButton({ onResult, className }) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onResult?.({ text: "", noteType: "general", error: "Voice input not supported on this device." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-AU";

    recognition.onstart = () => {
      setListening(true);
      setProcessing(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const noteType = categorize(transcript);
      onResult?.({ text: transcript, noteType });
    };

    recognition.onerror = () => {
      onResult?.({ text: "", noteType: "general", error: "Could not capture voice. Try again." });
    };

    recognition.onend = () => {
      setListening(false);
      setProcessing(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setProcessing(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold transition-all active:scale-95",
        listening
          ? "bg-red-500 text-white animate-pulse"
          : "bg-robur-charcoal text-white hover:bg-robur-charcoal/90",
        className
      )}
    >
      {processing && !listening ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : listening ? (
        <Square className="h-3 w-3" fill="currentColor" />
      ) : (
        <Mic className="h-3 w-3" />
      )}
      {listening ? "Stop" : "Voice"}
    </button>
  );
}