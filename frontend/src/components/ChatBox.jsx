import { useEffect, useRef, useState } from "react";
import { Bot, Send, User, Volume2 } from "lucide-react";

import { sendChatMessage } from "../services/chatService";

const voiceLocales = { en: "en-IN", or: "or-IN", hi: "hi-IN", bn: "bn-IN", mr: "mr-IN", te: "te-IN" };

function ChatBox({ location, coordinates, language = "en", labels }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const [messages, setMessages] = useState([{ role: "ai", text: labels.chatGreeting(location) }]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function sendMessage(event) {
    event.preventDefault();
    const userMessage = message.trim();
    if (!userMessage || loading) return;
    setMessages((previous) => [...previous, { role: "user", text: userMessage }]);
    setMessage("");
    setLoading(true);
    try {
      const data = await sendChatMessage(userMessage, { latitude: coordinates.latitude, longitude: coordinates.longitude }, language);
      setMessages((previous) => [...previous, { role: "ai", text: data.response || "I could not generate a weather answer." }]);
    } catch (error) {
      setMessages((previous) => [...previous, { role: "ai", text: error.message || labels.chatUnavailable }]);
    } finally {
      setLoading(false);
    }
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLocales[language] || "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  async function toggleVoice() {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setVoiceError(labels.voiceUnsupported); return; }
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) { setVoiceError(labels.voiceSecure); return; }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
      const recognition = new Recognition();
      recognition.lang = voiceLocales[language] || "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { setListening(true); setVoiceError(""); };
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results || []).map((result) => result?.[0]?.transcript || "").join(" ").trim();
        if (transcript) setMessage(transcript);
      };
      recognition.onerror = (event) => { setListening(false); setVoiceError(event.error === "not-allowed" ? labels.micDenied : labels.voiceFailed); };
      recognition.onend = () => { setListening(false); recognitionRef.current = null; };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      setListening(false);
      setVoiceError(error.name === "NotAllowedError" ? labels.micDenied : labels.voiceFailed);
    }
  }

  return (
    <div className="chat-box">
      <div className="chat-header"><div className="chat-title"><div className="bot-avatar"><Bot size={20} /></div><div><h2>{labels.aiAssistant}</h2><span>{labels.aiSubtitle} · {language.toUpperCase()}</span></div></div><div className="online-dot" title={labels.online} /></div>
      <div className="chat-messages">{messages.map((msg, index) => <div className={`message-row ${msg.role}`} key={`${index}-${msg.role}`}><div className="message-avatar">{msg.role === "ai" ? <Bot size={15} /> : <User size={15} />}</div><div className="message">{msg.text}{msg.role === "ai" && <button className="speak-answer" type="button" onClick={() => speak(msg.text)} aria-label={labels.readAnswer}><Volume2 size={14} /></button>}</div></div>)}{loading && <div className="message-row ai"><div className="message-avatar"><Bot size={15} /></div><div className="typing-indicator"><span /><span /><span /></div></div>}<div ref={messagesEndRef} /></div>
      <form className="chat-input" onSubmit={sendMessage}><input aria-label={labels.aiAssistant} type="text" placeholder={labels.chatPlaceholder} value={message} onChange={(event) => setMessage(event.target.value)} disabled={loading} /><button className={listening ? "voice-active" : ""} type="button" onClick={toggleVoice} aria-label={listening ? labels.stopVoice : labels.askVoice}>{listening ? "■" : "🎙"}</button><button type="submit" disabled={loading || !message.trim()} aria-label={labels.send}><Send size={18} /></button></form>
      {voiceError && <p className="voice-error" role="status">{voiceError}</p>}
      <div className="suggestions">{labels.chatSuggestions.map((suggestion) => <button type="button" key={suggestion} disabled={loading} onClick={() => setMessage(suggestion)}>{suggestion}</button>)}</div>
    </div>
  );
}

export default ChatBox;
