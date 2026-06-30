import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import TopBar from "@/components/layout/TopBar";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AgentChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      const unsubscribe = base44.agents.subscribeToConversation(activeConversation, (data) => {
        setMessages(data.messages || []);
      });
      return () => unsubscribe();
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({ agent_name: "booking_agent" });
      setConversations(convs || []);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  };

  const handleNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "booking_agent",
        metadata: { name: `Chat ${new Date().toLocaleString("en-AU")}` },
      });
      setActiveConversation(conv.id);
      setMessages([]);
      await loadConversations();
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return;
    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    try {
      const conv = conversations.find((c) => c.id === activeConversation);
      if (conv) {
        await base44.agents.addMessage(conv, { role: "user", content: userMessage });
      }
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <TopBar title="Booking Agent" subtitle="Autonomous client booking assistant" />
      <div className="grid grid-cols-12 gap-5" style={{ minHeight: "70vh" }}>
        {/* Conversation list */}
        <div className="col-span-12 lg:col-span-3">
          <GlassCard level={2} className="p-4 h-full">
            <Button onClick={handleNewConversation} className="w-full mb-4 bg-robur-charcoal hover:bg-robur-charcoal/90" size="sm">
              + New Chat
            </Button>
            <div className="space-y-2">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveConversation(c.id);
                    setMessages(c.messages || []);
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    activeConversation === c.id
                      ? "bg-robur-charcoal text-white"
                      : "bg-robur-charcoal/5 text-robur-steel hover:bg-robur-charcoal/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.metadata?.name || "Untitled"}</span>
                  </div>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-robur-steel/60 text-center py-4">No conversations yet</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Chat area */}
        <div className="col-span-12 lg:col-span-9">
          <GlassCard level={2} className="p-5 h-full flex flex-col">
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-robur-charcoal/5 mb-4">
                  <Bot className="h-8 w-8 text-robur-steel" />
                </div>
                <p className="text-sm font-semibold text-robur-charcoal mb-1">Booking Agent</p>
                <p className="text-xs text-robur-steel text-center max-w-xs">
                  Start a new conversation to have the agent autonomously create bookings from client requests.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4" style={{ maxHeight: "55vh" }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-robur-charcoal text-white"
                            : "bg-robur-charcoal/5 text-robur-charcoal"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <ReactMarkdown className="text-sm prose prose-sm max-w-none">{msg.content}</ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-robur-charcoal/5 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-robur-steel/40 animate-pulse" />
                          <span className="h-2 w-2 rounded-full bg-robur-steel/40 animate-pulse" style={{ animationDelay: "0.2s" }} />
                          <span className="h-2 w-2 rounded-full bg-robur-steel/40 animate-pulse" style={{ animationDelay: "0.4s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type your message..."
                    disabled={loading}
                  />
                  <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon" className="bg-robur-charcoal hover:bg-robur-charcoal/90">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}