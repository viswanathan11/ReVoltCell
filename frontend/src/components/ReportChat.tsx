import React, { useState, useEffect, useRef, useId } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  User,
  X,
  MessageSquare,
  Bot,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { aiApi } from '../api/aiApi';
import { ChatMessage, ChatMode } from '../types/ai';
import { VoltIQAvatar } from './VoltIQAvatar';

export interface ReportChatProps {
  testId: string;
  mode?: ChatMode;
  cellId?: string;
  defaultExpanded?: boolean;
  variant?: 'floating' | 'inline';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: { bottom?: number; right?: number };
}

export const ReportChat: React.FC<ReportChatProps> = ({
  testId,
  mode = 'dashboard',
  cellId,
  defaultExpanded = false,
  variant = 'floating',
  isOpen: controlledIsOpen,
  onOpenChange,
  position = { bottom: 24, right: 24 },
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultExpanded);
  const isChatOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const [isExpanded, setIsExpanded] = useState(false);

  const setChatOpen = (open: boolean) => {
    if (!open) {
      setIsExpanded(false);
    }
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    'Explain this screening result ⚡',
    'What is the ReVoltCell vision? 🔄',
    'Which applications fit best? 💡',
    'Was capacity or internal resistance measured? 🔍',
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isPassport = mode === 'passport';
  const accentColor = isPassport ? '#10b981' : '#38bdf8';
  const pulseClass = isPassport ? 'voltiq-fab-pulse-passport' : 'voltiq-fab-pulse-dashboard';

  // Initial welcome message
  useEffect(() => {
    const welcomeText = isPassport
      ? `Hey! ⚡ Welcome to the Digital Battery Passport for **${cellId || testId}**! I'm **VoltIQ**, your AI battery partner.\n\nEvery retired EV cell holds immense clean energy potential — ask me about this cell's screening grade, discharge stability, recommended reuse projects, or the ReVoltCell circular economy vision!`
      : `Hey! ⚡ **VoltIQ** is here to guide you through report **${testId}**${cellId ? ` (Cell **${cellId}**)` : ''}!\n\nLet's explore this battery's second-life potential together. Ask me about its screening score, voltage sag under load, thermal drift, or our mission to give retired EV cells a second life.`;

    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidenceUsed: [`Report: ${testId}`],
      },
    ]);
    setConversationId(undefined);
  }, [testId, cellId, mode, isPassport]);

  // Focus input when opened
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isChatOpen]);

  // Handle escape key to minimize or close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChatOpen && variant === 'floating') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          setChatOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen, isExpanded, variant]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isChatOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    setError(null);
    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => !m.isError && m.id !== 'welcome-msg')
        .slice(-4)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await aiApi.chatAboutTest({
        testId,
        message: textToSend,
        conversationId,
        mode,
        history: historyPayload,
      });

      const data = res.data;
      setConversationId(data.conversationId);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidenceUsed: data.evidenceUsed,
        missingInformation: data.missingInformation,
        suggestedNextSteps: data.suggestedQuestions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to connect to VoltIQ assistant.';
      setError(errMsg);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `VoltIQ encountered an error: ${errMsg}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConversationId(undefined);
    setError(null);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `Conversation reset! ⚡ VoltIQ is ready to chat about report **${testId}** or brainstorm second-life energy projects. What's on your mind?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const formattedLine = isBullet ? line.trim().substring(2) : line;

      const parts = formattedLine.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} style={{ color: '#f8fafc', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={pIdx}
              style={{
                backgroundColor: '#1e293b',
                padding: '2px 6px',
                borderRadius: 4,
                color: '#38bdf8',
                fontSize: '0.85em',
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, paddingLeft: 6 }}>
            <span style={{ color: accentColor }}>•</span>
            <span style={{ flex: 1 }}>{renderedParts}</span>
          </div>
        );
      }

      return (
        <div key={idx} style={{ minHeight: line === '' ? 8 : undefined, marginBottom: 4 }}>
          {renderedParts}
        </div>
      );
    });
  };

  // Render the core chat interface container
  const renderChatInterface = () => (
    <div
      className={
        variant === 'floating'
          ? isExpanded
            ? 'voltiq-chat-window-expanded'
            : 'voltiq-chat-window'
          : ''
      }
      style={{
        width:
          variant === 'floating'
            ? isExpanded
              ? 'min(1080px, calc(100vw - 48px))'
              : 'min(500px, calc(100vw - 32px))'
            : '100%',
        maxWidth: '100%',
        height:
          variant === 'floating'
            ? isExpanded
              ? 'min(860px, calc(100vh - 64px))'
              : 'min(700px, calc(100vh - 120px))'
            : 'auto',
        maxHeight: variant === 'floating' ? (isExpanded ? 'calc(100vh - 48px)' : 'calc(100vh - 40px)') : 'none',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16,
        backgroundColor: '#090d16',
        border: `1px solid ${isExpanded ? `${accentColor}50` : '#1e293b'}`,
        boxShadow:
          variant === 'floating'
            ? isExpanded
              ? `0 30px 90px rgba(0, 0, 0, 0.85), 0 0 50px ${accentColor}35`
              : `0 24px 50px -10px rgba(0, 0, 0, 0.75), 0 0 30px ${accentColor}25`
            : '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        zIndex: variant === 'floating' ? 10001 : 1,
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.25s ease',
        ...(variant === 'floating'
          ? isExpanded
            ? {
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                margin: 'auto',
              }
            : {
                position: 'fixed',
                top: 'auto',
                left: 'auto',
                bottom: (position.bottom ?? 24) + 72,
                right: position.right ?? 24,
                margin: 0,
              }
          : {}),
      }}
    >
      {/* Header with Robot Bot Avatar, Title, Reset, Expand, and Close Cross Mark */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isExpanded ? '14px 20px' : '12px 16px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f172a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Small Robot Bot Logo */}
          <VoltIQAvatar size={isExpanded ? 38 : 34} mode={mode} glow animate />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: isExpanded ? '1.05rem' : '0.95rem', color: '#f8fafc' }}>VoltIQ</span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  backgroundColor: isPassport ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: isPassport ? '#34d399' : '#38bdf8',
                  textTransform: 'uppercase',
                }}
              >
                {isPassport ? 'Passport Partner' : 'Battery AI'}
              </span>
              {isExpanded && (
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    textTransform: 'uppercase',
                  }}
                >
                  Expanded View
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>{cellId ? `Cell ${cellId}` : `Report ${testId}`} • Online Guide</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Reset Conversation Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{
              padding: '5px 9px',
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#1e293b',
              color: '#cbd5e1',
            }}
            onClick={handleReset}
            title="Reset conversation"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          {/* Expand / Minimize Big Size Toggle */}
          {variant === 'floating' && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Restore standard size' : 'Expand chat to big size'}
              title={isExpanded ? 'Restore standard size' : 'Expand chat interface (Big size)'}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                border: `1px solid ${isExpanded ? accentColor : '#334155'}`,
                color: isExpanded ? accentColor : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = isExpanded ? 'rgba(56, 189, 248, 0.3)' : '#334155';
                e.currentTarget.style.color = '#f8fafc';
                e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = isExpanded ? 'rgba(56, 189, 248, 0.2)' : '#1e293b';
                e.currentTarget.style.color = isExpanded ? accentColor : '#94a3b8';
                e.currentTarget.style.borderColor = isExpanded ? accentColor : '#334155';
              }}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Cross Mark to Close Chat (Prominent & Intuitive) */}
          {variant === 'floating' && (
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Close VoltIQ Chat"
              title="Close chat (Esc)"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b';
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <X size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        style={{
          flex: 1,
          padding: isExpanded ? '18px 24px' : '14px 16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isExpanded ? 16 : 14,
          backgroundColor: '#090d16',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: isExpanded ? 12 : 8,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: isExpanded ? '80%' : '88%',
            }}
          >
            {/* Robot Profile Avatar next to assistant messages */}
            {msg.role === 'assistant' && (
              <div style={{ marginTop: 2, flexShrink: 0 }}>
                {msg.isError ? (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertCircle size={15} color="#fff" />
                  </div>
                ) : (
                  <VoltIQAvatar size={isExpanded ? 32 : 28} mode={mode} animate={false} />
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  padding: isExpanded ? '13px 16px' : '11px 13px',
                  borderRadius: 12,
                  backgroundColor:
                    msg.role === 'user'
                      ? '#1e3a8a'
                      : msg.isError
                      ? 'rgba(239, 68, 68, 0.15)'
                      : '#111827',
                  border:
                    msg.role === 'user'
                      ? '1px solid #2563eb'
                      : msg.isError
                      ? '1px solid #ef4444'
                      : '1px solid #1f2937',
                  color: '#e2e8f0',
                  fontSize: isExpanded ? '0.88rem' : '0.84rem',
                  lineHeight: isExpanded ? 1.55 : 1.48,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                }}
              >
                {renderFormattedText(msg.content)}

                {/* Grounded Evidence Tags */}
                {msg.role === 'assistant' && !msg.isError && (
                  <>
                    {msg.evidenceUsed && msg.evidenceUsed.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 6,
                          borderTop: '1px solid #1f2937',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 5,
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Evidence:</span>
                        {msg.evidenceUsed.map((ev, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.66rem',
                              padding: '1px 5px',
                              borderRadius: 4,
                              backgroundColor: isPassport ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                              color: isPassport ? '#34d399' : '#38bdf8',
                              border: `1px solid ${isPassport ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.25)'}`,
                            }}
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Unmeasured Parameters Alert */}
                    {msg.missingInformation && msg.missingInformation.length > 0 && (
                      <div
                        style={{
                          marginTop: 5,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 5,
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Unmeasured:</span>
                        {msg.missingInformation.map((item, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.66rem',
                              padding: '1px 5px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <span
                style={{
                  fontSize: '0.65rem',
                  color: '#475569',
                  marginTop: 3,
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.timestamp}
              </span>
            </div>

            {/* User Profile Avatar next to user message */}
            {msg.role === 'user' && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <User size={15} color="#fff" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Spinner / Thinking indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
            <VoltIQAvatar size={28} mode={mode} animate={true} />
            <div
              style={{
                padding: '9px 13px',
                borderRadius: 12,
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                color: '#94a3b8',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div className="spinner" style={{ width: 12, height: 12, borderTopColor: accentColor }} />
              <span>VoltIQ is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div
        style={{
          padding: isExpanded ? '10px 18px' : '8px 12px',
          backgroundColor: '#0b1120',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexWrap: 'wrap',
          gap: isExpanded ? 7 : 5,
          alignItems: 'center',
          maxHeight: isExpanded ? 104 : 76,
          overflowY: 'auto',
        }}
      >
        <span style={{ fontSize: isExpanded ? '0.72rem' : '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
          <HelpCircle size={12} /> Suggested:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            disabled={loading}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              borderRadius: 14,
              padding: isExpanded ? '4px 11px' : '2px 8px',
              fontSize: isExpanded ? '0.75rem' : '0.7rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <div
        style={{
          padding: isExpanded ? '12px 18px' : '10px 14px',
          borderTop: '1px solid #1e293b',
          backgroundColor: '#0f172a',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            isPassport
              ? 'Say hi or ask VoltIQ about this cell...'
              : 'Say hi or ask VoltIQ about this test...'
          }
          maxLength={1000}
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: '#090d16',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: isExpanded ? '10px 14px' : '8px 12px',
            color: '#f8fafc',
            fontSize: isExpanded ? '0.88rem' : '0.84rem',
            outline: 'none',
          }}
        />

        <button
          className="btn btn-primary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: isExpanded ? '10px 16px' : '8px 12px',
            backgroundColor: isPassport ? '#10b981' : undefined,
            opacity: !input.trim() || loading ? 0.6 : 1,
          }}
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Send size={14} />
          <span>Send</span>
        </button>
      </div>

      {/* Decision Support Disclaimer */}
      <div
        style={{
          padding: '5px 12px',
          backgroundColor: '#070b14',
          borderTop: '1px solid #172033',
          fontSize: '0.65rem',
          color: '#64748b',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
        }}
      >
        <ShieldAlert size={10} color="#94a3b8" />
        <span>Advisory only. Pre-screening scores do not replace BMS safety systems.</span>
      </div>
    </div>
  );

  // If rendering inline (e.g. legacy embedded card)
  if (variant === 'inline') {
    return renderChatInterface();
  }

  // Floating Partner Experience: Circular AI Launcher Button + Floating Popup Chat
  return (
    <>
      {/* Frosted Backdrop for Expanded (Big Size) Mode */}
      {isChatOpen && isExpanded && variant === 'floating' && (
        <div
          className="voltiq-backdrop"
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 10000,
            cursor: 'zoom-out',
          }}
          aria-label="Close expanded view"
        />
      )}

      {/* Floating Popup Chat Interface (when open) */}
      {isChatOpen && renderChatInterface()}

      {/* Circular AI Action Button (Launcher) */}
      <div
        style={{
          position: 'fixed',
          bottom: position.bottom ?? 24,
          right: position.right ?? 24,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Calling Tooltip / Companion Pill (when chat is closed) */}
        {!isChatOpen && (
          <div
            onClick={() => setChatOpen(true)}
            style={{
              backgroundColor: '#0f172a',
              border: `1px solid ${accentColor}80`,
              color: '#f8fafc',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: '0.78rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = accentColor;
              e.currentTarget.style.transform = 'translateX(-3px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = `${accentColor}80`;
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Sparkles size={13} color={accentColor} />
            <span>{isPassport ? 'Ask VoltIQ ⚡' : 'Chat with VoltIQ'}</span>
          </div>
        )}

        {/* The Circular Button with Robot Bot Logo */}
        <button
          type="button"
          onClick={() => setChatOpen(!isChatOpen)}
          aria-label={isChatOpen ? 'Close VoltIQ AI Chat' : 'Open VoltIQ AI Chat'}
          className={!isChatOpen ? pulseClass : ''}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: '#090d16',
            border: `2px solid ${isChatOpen ? '#ef4444' : accentColor}`,
            boxShadow: isChatOpen
              ? '0 8px 25px rgba(239, 68, 68, 0.4)'
              : `0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px ${accentColor}50`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isChatOpen ? 'rotate(90deg)' : 'none',
          }}
          onMouseOver={(e) => {
            if (!isChatOpen) {
              e.currentTarget.style.transform = 'scale(1.08)';
            }
          }}
          onMouseOut={(e) => {
            if (!isChatOpen) {
              e.currentTarget.style.transform = 'none';
            }
          }}
        >
          {isChatOpen ? (
            <X size={26} color="#ef4444" strokeWidth={2.5} />
          ) : (
            <VoltIQAvatar size={42} mode={mode} glow animate />
          )}

          {/* Active Status Beacon Dot (when closed) */}
          {!isChatOpen && (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '2.5px solid #090d16',
                boxShadow: '0 0 6px #10b981',
              }}
            />
          )}
        </button>
      </div>
    </>
  );
};
