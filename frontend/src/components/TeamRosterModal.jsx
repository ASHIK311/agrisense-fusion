import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  ExternalLink,
  MapPin,
  Award,
  Check,
  Copy,
  Users,
  Sparkles,
  Rocket,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import { TEAM_INFO, TEAM_LEADER, TEAM_MEMBERS, ALL_TEAM } from '../data/teamData';

export default function TeamRosterModal({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredMembers =
    filter === 'all'
      ? TEAM_MEMBERS
      : filter === 'engineering'
        ? TEAM_MEMBERS.filter((m) => m.id === 'member-02' || m.id === 'member-03')
        : filter === 'research'
          ? TEAM_MEMBERS.filter((m) => m.id === 'member-01' || m.id === 'member-04' || m.id === 'member-05')
          : TEAM_MEMBERS;

  const showLeader = filter === 'all' || filter === 'leadership';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AgriSense Fusion Team Directory"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(3, 8, 6, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="team-modal-container"
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '26px',
          background: 'linear-gradient(145deg, rgba(12, 25, 20, 0.96) 0%, rgba(6, 14, 11, 0.98) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.28)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75), 0 0 50px rgba(16, 185, 129, 0.12)',
          color: '#F8FAFC',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Subtle Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.16) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '1.4rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(52, 211, 153, 0.14)',
                  color: '#34D399',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Rocket size={11} />
                NASA Space Apps Challenge 2026
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                }}
              >
                Region: Dhaka · 6-Member Squad
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(56, 189, 248, 0.14)',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                }}
              >
                Track: Field Shift
              </span>
            </div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Users size={22} style={{ color: '#34D399' }} />
              FIELD SHIFT — Official Team Roster &amp; Directory
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <a
              href={TEAM_INFO.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            >
              <GithubIcon size={15} />
              <span>GitHub Repo</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Team Modal"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'grid',
                placeItems: 'center',
                color: '#CBD5E1',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                e.currentTarget.style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#CBD5E1';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            padding: '0.65rem 1.75rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { id: 'all', label: 'All Squad (6)' },
              { id: 'leadership', label: 'Leadership' },
              { id: 'engineering', label: 'Software & UX' },
              { id: 'research', label: 'Research & Hardware' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  background: filter === tab.id ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                  borderColor: filter === tab.id ? '#34D399' : 'rgba(255, 255, 255, 0.12)',
                  color: filter === tab.id ? '#34D399' : 'rgba(255, 255, 255, 0.65)',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.74rem', color: 'rgba(226, 244, 235, 0.65)' }}>
            Primary Study Area: <span style={{ color: '#34D399', fontWeight: 600 }}>High Barind Tract, Godagari</span>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.4rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.4rem',
          }}
        >
          {/* Section 1: Team Leadership (Hero Showcase Card) */}
          {showLeader && (
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: '#34D399',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <Award size={15} />
                <span>1. Team Leadership</span>
              </div>

              <div
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.2) 100%)',
                  border: '1px solid rgba(52, 211, 153, 0.45)',
                  padding: '1.35rem',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '1.4rem',
                  alignItems: 'center',
                  position: 'relative',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                }}
              >
                {/* Leader Photo */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '105px',
                      height: '105px',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      border: '2px solid #34D399',
                      boxShadow: '0 0 25px rgba(52, 211, 153, 0.35)',
                      background: '#04100b',
                    }}
                  >
                    <img
                      src={TEAM_LEADER.image}
                      alt={TEAM_LEADER.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'top center',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-7px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: '#34D399',
                      color: '#061a12',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Leader
                  </span>
                </div>

                {/* Leader Details */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {TEAM_LEADER.role}
                      </div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: '0.15rem 0' }}>
                        {TEAM_LEADER.name}
                      </h3>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', color: '#94A3B8' }}>
                        <MapPin size={12} style={{ color: '#F59E0B' }} />
                        <span>Region: {TEAM_LEADER.region}</span>
                      </div>
                    </div>

                    {/* Quick Contacts */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <a
                        href={`tel:${TEAM_LEADER.phone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.7rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          color: '#FFFFFF',
                          fontSize: '0.74rem',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        <Phone size={13} style={{ color: '#34D399' }} />
                        <span>{TEAM_LEADER.phone}</span>
                      </a>
                      <a
                        href={`mailto:${TEAM_LEADER.email}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.7rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          color: '#FFFFFF',
                          fontSize: '0.74rem',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        <Mail size={13} style={{ color: '#38BDF8' }} />
                        <span>{TEAM_LEADER.email}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${TEAM_LEADER.name} (${TEAM_LEADER.phone}, ${TEAM_LEADER.email})`, 'leader')}
                        title="Copy contact info"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '10px',
                          background: 'rgba(52, 211, 153, 0.15)',
                          border: '1px solid rgba(52, 211, 153, 0.35)',
                          color: '#34D399',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedId === 'leader' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedId === 'leader' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: '0.65rem 0 0.75rem', fontSize: '0.8rem', lineHeight: 1.55, color: 'rgba(226, 244, 235, 0.85)' }}>
                    {TEAM_LEADER.bio}
                  </p>

                  {/* Skills tags */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {TEAM_LEADER.skills.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: '0.66rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid rgba(52, 211, 153, 0.25)',
                          color: '#A7F3D0',
                          fontWeight: 500,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Team Members (5 Specialists) */}
          {(filter === 'all' || filter === 'engineering' || filter === 'research') && (
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: '#38BDF8',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <Cpu size={15} />
                <span>2. Engineering &amp; Research Specialists ({filteredMembers.length} Members)</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: '1rem',
                }}
              >
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      borderRadius: '18px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.45)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                  >
                    <div>
                      {/* Member Header: Image + Name + Member# */}
                      <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '68px',
                            height: '68px',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            border: '1.5px solid rgba(52, 211, 153, 0.35)',
                            background: '#04100b',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={member.image}
                            alt={member.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'top center',
                            }}
                          />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '0.12rem 0.45rem',
                              borderRadius: '999px',
                              background: 'rgba(56, 189, 248, 0.14)',
                              color: '#38BDF8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              display: 'inline-block',
                              marginBottom: '0.2rem',
                            }}
                          >
                            {member.memberNo}
                          </span>
                          <h4
                            style={{
                              fontSize: '0.98rem',
                              fontWeight: 700,
                              color: '#FFFFFF',
                              margin: 0,
                              lineHeight: 1.25,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {member.name}
                          </h4>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#34D399',
                              fontWeight: 600,
                              lineHeight: 1.35,
                              marginTop: '0.2rem',
                            }}
                          >
                            {member.role}
                          </div>
                        </div>
                      </div>

                      <p style={{ margin: '0.75rem 0 0.5rem', fontSize: '0.75rem', lineHeight: 1.5, color: 'rgba(226, 244, 235, 0.78)' }}>
                        {member.bio}
                      </p>

                      {/* Skills */}
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {member.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: '0.62rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: 'rgba(255, 255, 255, 0.7)',
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Member Contacts */}
                    <div
                      style={{
                        paddingTop: '0.65rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <a
                          href={`tel:${member.phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            color: '#94A3B8',
                            textDecoration: 'none',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                          }}
                        >
                          <Phone size={11} style={{ color: '#34D399' }} />
                          <span>{member.phone}</span>
                        </a>
                        <a
                          href={`mailto:${member.email}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            color: '#94A3B8',
                            textDecoration: 'none',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                          }}
                        >
                          <Mail size={11} style={{ color: '#38BDF8' }} />
                          <span>Email</span>
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${member.name} (${member.phone}, ${member.email})`, member.id)}
                        title="Copy contact"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedId === member.id ? '#34D399' : 'rgba(255, 255, 255, 0.45)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.68rem',
                          padding: '0.2rem',
                        }}
                      >
                        {copiedId === member.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.55)' }}>
            AgriSense Fusion · NASA Space Apps Challenge 2026 Dhaka Region · Released for Scientific Review
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <a
              href={TEAM_INFO.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontSize: '0.76rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <GithubIcon size={14} />
              <span>https://github.com/ASHIK311/agrisense-fusion</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '10px',
                background: '#34D399',
                color: '#061A12',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
