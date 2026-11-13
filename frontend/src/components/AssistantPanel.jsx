import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  BookOpen,
  Cpu,
  Droplets,
  Wheat,
  Activity,
  AlertTriangle,
  RotateCcw,
  Users,
  ExternalLink,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import { Maximize2 } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import AiChatbotOrb from './AiChatbotOrb';
import { TEAM_INFO, TEAM_LEADER, TEAM_MEMBERS, ALL_TEAM } from '../data/teamData';

export default function AssistantPanel({ selectedFarmId, compact = false, height = null, onExpandFull = null }) {
  const {
    pendingAiPrompt,
    setPendingAiPrompt,
    selectedFieldId,
    selectedParcel,
    selectedLocation,
    isPrimaryGodagari,
    activeWorkspace,
    viewMode,
    token,
    user,
    setTeamModalOpen,
  } = useAgriSense();
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Welcome to AgriSense AI Agricultural Assistant.

I am your evidence-backed scientific intelligence assistant configured for the High Barind Tract (AEZ 26, Godagari Upazila, Rajshahi, 24.469°N, 88.330°E).

You can ask me questions in English or Bangla (বাংলা):
- FAO-56 Water Balance: Daily ET₀, root zone depletion (Dr), and missing-input / staleness disclosures.
- Candidate Crop Rotations: MCDA-ranked low-water alternatives to Boro rice.
- Aquifer Depletion Proxy: BMDA regional monitoring and 0.65 m/year drawdown trends (Jahan et al., 2010).
- Plant Pathology: Environmental & soil-borne risk screening across 17 Bangladesh crop diseases.
- IoT Telemetry: Simulated ESP32 / FDR v2 prototype soil moisture readings (UNCALIBRATED).
- Sentinel-2 LULC: 21-feature Random Forest accuracy (84.63% ± 3.81% 5-fold spatial CV; 85.77% Block C holdout; Macro-F1 0.8257).

Select a suggested query below or enter your inquiry.`,
      metadata: {
        provider: 'offline_deterministic_synthesizer',
        language: 'en',
        tool_calls: [],
        sources: [
          { title: 'FAO-56 Irrigation Paper No. 56', doi: 'https://doi.org/10.1016/j.agwat.2005.07.003' },
          { title: 'High Barind Aquifer Drawdown (Jahan et al. 2010)', doi: 'https://doi.org/10.1007/s12594-010-0083-0' },
        ],
      },
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});
  const messagesEndRef = useRef(null);

  const suggestedQueries = [
    {
      labelEn: 'Meet the Team (6 Squad)',
      labelBn: 'টিম পরিচিতি ও যোগাযোগ',
      icon: Users,
      query: 'Who are the engineers and researchers behind AgriSense Fusion (NASA Space Apps 2026)?',
    },
    {
      labelEn: 'FAO-56 ET₀ & Irrigation Need',
      labelBn: 'বাষ্পীভবন ও সেচ চাহিদা',
      icon: Droplets,
      query: 'What is the daily reference evapotranspiration ET0 in Godagari and how should I irrigate?',
    },
    {
      labelEn: 'Boro Rice Alternatives (MCDA)',
      labelBn: 'বোরো ধানের বিকল্প শস্য পর্যায়',
      icon: Wheat,
      query: 'গোদাগাড়ীতে বোরো ধানের বিকল্প হিসেবে কোন শস্য পর্যায় সবচেয়ে কম সেচ দাবি করে?',
    },
    {
      labelEn: 'Barind Aquifer Drawdown',
      labelBn: 'ভূগর্ভস্থ পানির স্তর হ্রাস (BMDA)',
      icon: Activity,
      query: 'What is the current status of groundwater overdraft in Barind tract deep tubewells?',
    },
    {
      labelEn: 'Rice Blast Pathology',
      labelBn: 'ধানের ব্লাস্ট রোগ ও লক্ষণ',
      icon: BookOpen,
      query: 'My rice leaves show spindle-shaped lesions with brown borders. What disease is this?',
    },
    {
      labelEn: 'Latest FDR Sensor Reading',
      labelBn: 'মাটির আর্দ্রতা সেন্সর তথ্য',
      icon: Cpu,
      query: 'What is the latest FDR sensor reading for plot A-1?',
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText = null) => {
    const textToSend = queryText || inputValue;
    if (!textToSend || !textToSend.trim() || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      metadata: { timestamp: new Date().toISOString() },
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInputValue('');
    setLoading(true);

    // Fast-path: Answer Team & Authors inquiries instantly with verified squad roster
    if (/team|member|developer|leader|author|who built|squad|সদস্য|টিম|ashik|tanim|tusar|mynuddin|tanvir|mizanur/i.test(textToSend)) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `team-${Date.now()}`,
            role: 'assistant',
            content: `🌾 **AgriSense Fusion — Official Team Roster & Contact Directory**\n\n` +
              `**Challenge:** NASA Space Apps Challenge 2026\n` +
              `**Track:** Field Shift Track\n` +
              `**Region:** Dhaka, Bangladesh (6-Member Squad)\n` +
              `**Project Repository:** ${TEAM_INFO.githubRepoUrl}\n\n` +
              `### 👑 Team Leadership\n` +
              `• **${TEAM_LEADER.name}** (${TEAM_LEADER.role})\n` +
              `  📍 Region: ${TEAM_LEADER.region} | 📞 ${TEAM_LEADER.phone} | ✉️ ${TEAM_LEADER.email}\n` +
              `  🔗 GitHub: ${TEAM_LEADER.github}\n\n` +
              `### 🔬 Engineering & Research Specialists\n` +
              TEAM_MEMBERS.map((m) => `• **${m.name}** (${m.role})\n  📞 ${m.phone} | ✉️ ${m.email}`).join('\n\n') +
              `\n\nClick below to open the complete interactive glassmorphic team card showcase.`,
            metadata: {
              isTeamResponse: true,
              sources: [
                { title: 'AgriSense Fusion GitHub Repository', doi: TEAM_INFO.githubRepoUrl },
                { title: 'NASA Space Apps Challenge Official Showcase', doi: TEAM_INFO.nasaShowcaseUrl },
              ],
            },
          },
        ]);
        setLoading(false);
      }, 350);
      return;
    }

    try {
      const storedToken =
        token ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('agrisense_token') || localStorage.getItem('token') || null
          : null);
      const headers = { 'Content-Type': 'application/json' };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const payload = {
        message: textToSend.trim(),
        farm_id: selectedFarmId || 'farm-barind-01',
        field_id: selectedFieldId || 'field-godagari-a',
        location_context: selectedLocation
          ? {
              name: selectedLocation.name,
              district: selectedLocation.district,
              aez: selectedLocation.aez,
              lat: selectedLocation.lat,
              lon: selectedLocation.lon,
              coverage_status: selectedLocation.coverageStatus,
              is_godagari_pilot: isPrimaryGodagari,
            }
          : null,
      };
      if (storedToken && conversationId) {
        payload.conversation_id = conversationId;
      }

      const res = await fetch('/api/v1/assistant/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        if (!conversationId && data.conversation_id) {
          setConversationId(data.conversation_id);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: data.message_id || `asst-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            metadata: {
              provider: data.provider,
              language: data.language,
              tool_calls: data.tool_calls || [],
              sources: data.sources || [],
            },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${data.error || 'Unable to process query.'}`,
            metadata: { isError: true },
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Network error connecting to AgriSense Assistant API: ${err.message}`,
          metadata: { isError: true },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingAiPrompt) {
      const promptToRun = pendingAiPrompt;
      setPendingAiPrompt(null);
      handleSend(promptToRun);
    }
  }, [pendingAiPrompt]);

  const handleFeedback = async (messageId, rating) => {
    setFeedbackState((prev) => ({ ...prev, [messageId]: rating }));
    try {
      const headers = { 'Content-Type': 'application/json' };
      const storedToken =
        token ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('agrisense_token') || localStorage.getItem('token') || null
          : null);
      if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
      await fetch('/api/v1/assistant/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversation_id: conversationId,
          message_id: messageId,
          rating: rating === 'up' ? 5 : 1,
          comments: rating === 'up' ? 'Helpful response' : 'Needs improvement',
        }),
      });
    } catch (_) {}
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Conversation reset. Ready for your agricultural or hydrological inquiries for Godagari Upazila (AEZ 26).',
        metadata: { tool_calls: [], sources: [] },
      },
    ]);
    setConversationId(null);
  };

  return (
    <div
      className={compact ? '' : 'card'}
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: height || (compact ? '100%' : '760px'),
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: compact ? '0.85rem 1.05rem' : '1.1rem 1.4rem',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <AiChatbotOrb size="mini" />
          <div>
            <h3 style={{ margin: 0, fontSize: compact ? '0.96rem' : '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              AgriSense AI Copilot &amp; RAG Intelligence
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {selectedLocation?.name || 'Godagari Upazila'} ({selectedLocation?.coverageStatus || 'FULL SCIENTIFIC COVERAGE'}) • {selectedParcel?.code || 'PARCEL A-01'} • {viewMode === 'home' ? 'Story Home' : activeWorkspace} • {user ? `JWT (${user.role})` : 'Public Demo'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {!compact && (
            <span className="badge badge-live" style={{ fontSize: '0.72rem' }}>
              ● Physics &amp; RAG Active
            </span>
          )}
          {onExpandFull && (
            <button
              type="button"
              onClick={onExpandFull}
              className="btn btn-secondary"
              style={{ padding: '0.32rem 0.65rem', fontSize: '0.72rem' }}
              title="Open full-screen Assistant page"
            >
              <Maximize2 size={13} /> Expand
            </button>
          )}
          <button
            type="button"
            onClick={handleClearChat}
            className="btn btn-secondary"
            style={{ padding: '0.32rem 0.65rem', fontSize: '0.72rem' }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Suggested Quick Queries Banner */}
      <div
        style={{
          padding: '0.65rem 1rem',
          background: 'var(--bg-alt)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginRight: '0.2rem' }}>
          SUGGESTED:
        </span>
        {suggestedQueries.map((q, idx) => {
          const IconComp = q.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q.query)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem', flexShrink: 0 }}
            >
              <IconComp size={12} />
              <span>{q.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '100%',
              }}
            >
              <div
                style={{
                  maxWidth: isUser ? '80%' : '88%',
                  background: isUser ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: isUser ? '#FFFFFF' : 'var(--text-main)',
                  padding: '0.9rem 1.2rem',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  border: `1px solid ${isUser ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  boxShadow: 'var(--shadow-xs)',
                  lineHeight: '1.6',
                  fontSize: '0.88rem',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}

                {/* Tool Invocations Badge */}
                {m.metadata?.tool_calls && m.metadata.tool_calls.length > 0 && (
                  <div
                    className="surface"
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.55rem 0.8rem',
                      borderLeft: '3px solid var(--accent-primary)',
                      fontSize: '0.78rem',
                    }}
                  >
                    <strong style={{ color: 'var(--accent-primary)' }}>
                      Deterministic Calculation Verification:
                    </strong>
                    {m.metadata.tool_calls.map((tc, tcIdx) => (
                      <div key={tcIdx} style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        • <code>{tc.tool}</code>: {tc.result?.methodology || tc.result?.authority || 'Computed via native engine'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Knowledge Provenance & Literature Sources */}
                {m.metadata?.sources && m.metadata.sources.length > 0 && (
                  <div
                    className="surface"
                    style={{
                      marginTop: '0.65rem',
                      padding: '0.55rem 0.8rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <strong style={{ color: 'var(--accent-water)' }}>Grounded Citations &amp; DOIs:</strong>
                    {m.metadata.sources.map((s, sIdx) => (
                      <div key={sIdx} style={{ marginTop: '0.2rem' }}>
                        • <strong>{s.title}</strong>
                        {s.doi && (
                          <span>
                            {' '}
                            —{' '}
                            <a
                              href={s.doi}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--accent-water)', textDecoration: 'underline' }}
                            >
                              {s.doi}
                            </a>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Team Roster Launcher Button */}
                {m.metadata?.isTeamResponse && (
                  <div
                    style={{
                      marginTop: '0.9rem',
                      paddingTop: '0.8rem',
                      borderTop: '1px solid rgba(52, 211, 153, 0.25)',
                      display: 'flex',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setTeamModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.48rem 1rem',
                        borderRadius: '999px',
                        background: '#34D399',
                        color: '#061A12',
                        border: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(52, 211, 153, 0.35)',
                      }}
                    >
                      <Users size={15} />
                      <span>Open Interactive Team Directory</span>
                    </button>
                    <a
                      href={TEAM_INFO.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.48rem 0.95rem',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#FFFFFF',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <GithubIcon size={14} color="#FFFFFF" />
                      <span>GitHub Repository</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Feedback buttons */}
              {!isUser && !m.metadata?.isError && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', marginLeft: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => handleFeedback(m.id, 'up')}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem',
                      color: feedbackState[m.id] === 'up' ? 'var(--accent-primary)' : undefined,
                    }}
                  >
                    <ThumbsUp size={12} /> Helpful
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(m.id, 'down')}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem',
                      color: feedbackState[m.id] === 'down' ? 'var(--accent-danger)' : undefined,
                    }}
                  >
                    <ThumbsDown size={12} /> Inaccurate
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.84rem' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span>Querying RAG scientific knowledge base &amp; executing models...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div
        style={{
          padding: '0.9rem 1.25rem',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '0.65rem',
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask in English or বাংলা (e.g. What is today's ET0? or বোরো ধানের বিকল্প শস্য পর্যায় কি?)..."
          disabled={loading}
          style={{
            flex: 1,
            fontSize: '0.88rem',
            padding: '0.65rem 1rem',
          }}
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !inputValue.trim()}
          className="btn btn-primary"
          style={{ padding: '0 1.25rem' }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
