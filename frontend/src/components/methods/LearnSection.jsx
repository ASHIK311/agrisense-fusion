import React, { useState } from 'react';
import { CheckCircle2, Globe, Languages, MapPin, Printer, RotateCcw, XCircle } from 'lucide-react';
import { BANGLADESH_REGIONS } from '../../data/regions';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const fmtNum = (val, lang) => (lang === 'bn' ? String(val).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(val));

const COPY = {
  en: {
    title: 'Field Guide, District Readiness & Interactive Quiz',
    subtitle: 'Understand the science behind Barind crop adaptation in plain language — English or বাংলা.',
    cards: [
      {
        title: '1. What is Reference ET₀?',
        body: 'ET₀ (mm/day) measures how fast the sun, wind, heat, and dry air pull water out of a standard crop surface. On hot, dry Barind afternoons (high VPD), ET₀ jumps above 6–7 mm/day.',
      },
      {
        title: '2. Why Boro Rice Strains the Aquifer',
        body: 'Dry-season Boro rice requires ~1,150 mm of water when rainfall is lowest. Continuous deep-tubewell pumping contributes to regional drawdown toward the 28m centrifugal suction limit.',
      },
      {
        title: '3. Why Smart Crop Rotation Helps',
        body: 'Swapping dry-season monoculture for Mustard, Lentil, Mungbean, or Rabi Maize lowers irrigation demand while keeping T. Aman rice in the rainfed monsoon season.',
      },
      {
        title: '4. What Our Models Refuse to Guess',
        body: 'Crop species without field polygons (HTTP 422), noisy ML yield forecasts (HTTP 501), and unmeasured leaf-wetness pathology are blocked—not guessed.',
      },
    ],
    checkerTitle: 'Check Your District Readiness (Live NASA POWER + Coverage Registry)',
    checkerBtn: 'Query Live NASA POWER',
    quizTitle: '5-Question Scientific Self-Check',
    printBtn: 'Print Field Worksheet',
    resetBtn: 'Reset Quiz',
  },
  bn: {
    title: 'মাঠ-পর্যায়ের নির্দেশিকা, জেলার ডেটা প্রস্তুতি ও কুইজ',
    subtitle: 'বরেন্দ্র অঞ্চলের ফসল ও পানির বিজ্ঞান সহজ ভাষায় জানুন — ইংরেজি বা বাংলায়।',
    cards: [
      {
        title: '১. রেফারেন্স ET₀ কী?',
        body: 'ET₀ (মিমি/দিন) হলো সূর্যের তাপ, বাতাস ও শুষ্ক আবহাওয়ায় ফসল ও মাটি থেকে প্রতিদিন কতটুকু পানি বাষ্পীভূত হয় তার পদার্থবিজ্ঞান-ভিত্তিক হিসাব।',
      },
      {
        title: '২. বোরো ধানে ভূগর্ভস্থ পানিতে চাপ কেন?',
        body: 'শুষ্ক মৌসুমে বোরো ধানে প্রায় ১,১৫০ মিমি পানি লাগে যখন বৃষ্টি প্রায় থাকে না। অতিরিক্ত পাম্পিংয়ের ফলে পানির স্তর ২৮ মিটার সাকশন সীমার কাছাকাছি নেমে যায়।',
      },
      {
        title: '৩. শস্যবিন্যাস (Crop Rotation) কেন জরুরি?',
        body: 'বর্ষায় রোপা আমন রেখে শুষ্ক মৌসুমে সরিষা, মসুর, মুগডাল বা ভুট্টা চাষ করলে সেচের চাপ কমে এবং মাটির স্বাস্থ্য ভালো থাকে।',
      },
      {
        title: '৪. আমাদের সিস্টেম যা অনুমান করে না',
        body: 'মাঠের সীমানা ছাড়া ফসলের প্রজাতি (HTTP 422), ভুল ফলন পূর্বাভাস (HTTP 501), এবং অ-পরিমাপকৃত পাতার আর্দ্রতা—কোনোটিই অনুমান করে দেখানো হয় না।',
      },
    ],
    checkerTitle: 'আপনার জেলার ডেটা প্রস্তুতি যাচাই করুন (লাইভ NASA POWER)',
    checkerBtn: 'লাইভ NASA POWER দেখুন',
    quizTitle: '৫টি প্রশ্নে বৈজ্ঞানিক কুইজ',
    printBtn: 'ফিল্ড ওয়ার্কশিট প্রিন্ট করুন',
    resetBtn: 'আবার শুরু করুন',
  },
};

const QUIZ_ITEMS = [
  {
    q: {
      en: 'Why does AgriSense Fusion return HTTP 422 on crop-species satellite classification?',
      bn: 'ফসলের প্রজাতি (যেমন গম বনাম সরিষা) শনাক্তে সিস্টেম HTTP 422 দেখায় কেন?',
    },
    opts: {
      en: ['Field-level DAE cadastral polygons are not collected yet', 'Sentinel-2 lacks green bands', 'The server is offline'],
      bn: ['মাঠ-পর্যায়ের DAE সীমানা ও গ্রাউন্ড-ট্রুথ এখনো সংগৃহীত হয়নি', 'Sentinel-2 তে সবুজ ব্যান্ড নেই', 'সার্ভার অফলাইন'],
    },
    correct: 0,
    why: {
      en: '15-feature Random Forest validates 4 broad land-cover classes (84.63% ± 3.81% CV), but crop-species requires ground-truth parcel labels.',
      bn: 'Random Forest ৪টি প্রধান ভূমিরূপ শ্রেণি (৮৪.৬৩% ± ৩.৮১% CV) যাচাই করেছে; প্রজাতি আলাদা করতে মাঠের লেবেল প্রয়োজন।',
    },
  },
  {
    q: {
      en: 'What is the Sentinel-2 Block C pure interior vs. mixed boundary accuracy?',
      bn: 'Sentinel-2 Block C-তে Pure Interior বনাম Mixed Boundary নির্ভুলতা কত?',
    },
    opts: {
      en: ['90.64% pure interior vs. 75.92% mixed boundary', '99.9% vs. 12%', '50% vs. 50%'],
      bn: ['৯০.৬৪% Pure Interior বনাম ৭৫.৯২% Mixed Boundary', '৯৯.৯% বনাম ১২%', '৫০% বনাম ৫০%'],
    },
    correct: 0,
    why: {
      en: 'Sub-pixel spectral mixing at 10m parcel edges drops accuracy from 90.64% interior to 75.92% boundary.',
      bn: '১০ মিটার পিক্সেলে জমির কিনারায় মিশ্রণের কারণে ৯০.৬৪% থেকে ৭৫.৯২%-এ নেমে আসে।',
    },
  },
  {
    q: {
      en: 'Why is bare-soil evaporation (Es) kept null in our FAO-56 water balance?',
      bn: 'আমাদের FAO-56 ওয়াটার ব্যালান্সে Es (সরাসরি মাটির বাষ্পীভবন) null রাখা হয়েছে কেন?',
    },
    opts: {
      en: ['We run Single-Kc mode without weighing micro-lysimeters', 'Soil never evaporates water', 'JavaScript does not support decimals'],
      bn: ['আমরা মাইক্রো-লাইসিমিটার ছাড়া Single-Kc মোড ব্যবহার করছি', 'মাটি থেকে পানি বাষ্পীভূত হয় না', 'জাভাস্ক্রিপ্ট দশমিক সমর্থন করে না'],
    },
    correct: 0,
    why: {
      en: 'Tier 4 weighing micro-lysimeters are required before splitting Es from basal crop transpiration (Kcb).',
      bn: 'Es ও Kcb আলাদা করতে টিয়ার-৪ লাইসিমিটার ক্যালিব্রেশন প্রয়োজন।',
    },
  },
  {
    q: {
      en: 'Which regional district currently has full AEZ-26 pilot coverage & ESP32 simulation?',
      bn: 'কোন অঞ্চলে বর্তমানে সম্পূর্ণ AEZ-26 পাইলট কাভারেজ ও সিমুলেটেড ESP32 আছে?',
    },
    opts: {
      en: ['Godagari Upazila, Rajshahi (AEZ-26)', 'Dinajpur Sadar', 'Mymensingh Sadar'],
      bn: ['গোদাগাড়ী উপজেলা, রাজশাহী (AEZ-26)', 'দিনাজপুর সদর', 'ময়মনসিংহ সদর'],
    },
    correct: 0,
    why: {
      en: 'Godagari is the primary AEZ-26 pilot; other districts withhold Godagari soil & BMDA proxy metrics to prevent spatial leakage.',
      bn: 'গোদাগাড়ীই মূল AEZ-26 পাইলট; অন্য জেলায় গোদাগাড়ীর মাটি বা নলকূপের ডেটা অনুমান করে বসানো হয় না।',
    },
  },
  {
    q: {
      en: 'How is our ESP32 soil moisture dataset transparently labeled?',
      bn: 'আমাদের ESP32 মাটির আর্দ্রতা ডেটাসেট কীভাবে চিহ্নিত করা থাকে?',
    },
    opts: {
      en: ['is_simulated = true and UNCALIBRATED (Tier 1)', 'Field-calibrated commercial probe', 'Official BMD weather station'],
      bn: ['is_simulated = true এবং UNCALIBRATED (টিয়ার ১)', 'মাঠে ক্যালিব্রেটেড প্রোব', 'সরকারি আবহাওয়া স্টেশন'],
    },
    correct: 0,
    why: {
      en: 'All 5,760 source records are synthetic FDR v2 prototype telemetry awaiting Tier 3 gravimetric calibration.',
      bn: 'সব ৫,৭৬০টি রেকর্ড টিয়ার-৩ গ্র্যাভিমেট্রিক ক্যালিব্রেশনের আগে পর্যন্ত সিমুলেটেড প্রোটোটাইপ হিসেবে চিহ্নিত।',
    },
  },
];

export default function LearnSection({ onInspect }) {
  const [lang, setLang] = useState('en');
  const [regionId, setRegionId] = useState(BANGLADESH_REGIONS[0].id);
  const [liveWeather, setLiveWeather] = useState(null);
  const [checkingLive, setCheckingLive] = useState(false);
  const [answers, setAnswers] = useState({});

  const t = COPY[lang];
  const selectedRegion = BANGLADESH_REGIONS.find((r) => r.id === regionId) || BANGLADESH_REGIONS[0];

  const handleCheckDistrict = async () => {
    setCheckingLive(true);
    try {
      const res = await fetch(`/api/nasa/power?lat=${encodeURIComponent(selectedRegion.lat)}&lon=${encodeURIComponent(selectedRegion.lon)}&days=5`);
      const json = await res.json();
      setLiveWeather(json);
    } catch (err) {
      setLiveWeather({ success: false, error: err.message });
    } finally {
      setCheckingLive(false);
    }
  };

  const selectAnswer = (qIdx, optIdx) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    if (onInspect) onInspect('learn');
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = QUIZ_ITEMS.reduce((acc, q, i) => (answers[i] === q.correct ? acc + 1 : acc), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Top Header + Language Switcher + Print Button */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-terracotta)' }}>
        <div className="methods-card-band">
          <div>
            <h3 className="font-display" style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>{t.title}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.18rem 0 0' }}>{t.subtitle}</p>
          </div>

          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', padding: '0.2rem', borderRadius: '999px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'en', label: 'English' },
                { id: 'bn', label: 'বাংলা' },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  className={lang === l.id ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ padding: '0.28rem 0.72rem', fontSize: '0.73rem', borderRadius: '999px' }}
                >
                  <Languages size={12} />
                  <span>{l.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.73rem' }}
            >
              <Printer size={13} />
              <span>{t.printBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Concept Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {t.cards.map((c, idx) => {
          const cardPalette = ['var(--m-sky)', 'var(--m-terracotta)', 'var(--m-emerald)', 'var(--m-rose)'];
          const accent = cardPalette[idx % cardPalette.length];
          return (
            <div key={c.title} className="card tilt-card" style={{ padding: 0, overflow: 'hidden', borderTop: `2px solid ${accent}` }}>
              <div className="methods-card-band" style={{ padding: '0.62rem 1.15rem' }}>
                <h4 className="font-display" style={{ fontSize: '0.94rem', fontWeight: 800, margin: 0, color: accent }}>
                  {c.title}
                </h4>
              </div>
              <div style={{ padding: '0.95rem 1.15rem' }}>
                <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.58, margin: 0 }}>{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* District Readiness Checker (inspired by ShadowAstra CheckTown) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-flare)' }}>
        <div className="methods-card-band">
          <strong className="font-display" style={{ fontSize: '0.98rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <MapPin size={15} style={{ color: 'var(--m-flare)' }} />
            {t.checkerTitle}
          </strong>
          <span className={`badge ${selectedRegion.isPrimary ? 'badge-live' : 'badge-demo'}`} style={{ fontSize: '0.68rem' }}>
            {selectedRegion.coverageStatus}
          </span>
        </div>
        <div style={{ padding: '1.15rem 1.25rem' }}>

        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center', marginBottom: '0.9rem' }}>
          {BANGLADESH_REGIONS.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => {
                setRegionId(reg.id);
                setLiveWeather(null);
              }}
              className={reg.id === regionId ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '0.3rem 0.68rem', fontSize: '0.72rem' }}
            >
              {reg.district}
            </button>
          ))}
          <button
            type="button"
            onClick={handleCheckDistrict}
            disabled={checkingLive}
            className="btn btn-terracotta"
            style={{ padding: '0.34rem 0.78rem', fontSize: '0.72rem', marginLeft: 'auto' }}
          >
            <Globe size={13} />
            <span>{checkingLive ? '...' : t.checkerBtn}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
          {Object.entries(selectedRegion.coverage || {}).map(([key, info]) => {
            const unavail = info.status === 'UNAVAILABLE' || info.status === 'NOT DEPLOYED';
            return (
              <div
                key={key}
                className="surface"
                style={{
                  padding: '0.65rem 0.85rem',
                  borderLeft: `3px solid ${unavail ? 'var(--m-rose)' : 'var(--m-emerald)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-main)' }}>{key}</span>
                  <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 700, color: unavail ? 'var(--m-rose)' : 'var(--m-emerald)' }}>
                    {info.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{info.label}</div>
              </div>
            );
          })}
        </div>

        {liveWeather && (
          <div className="surface" style={{ marginTop: '0.85rem', padding: '0.75rem 0.95rem', borderLeft: '3px solid var(--m-sky)', fontSize: '0.78rem' }}>
            {liveWeather.success ? (
              <span className="mono">
                <strong>{selectedRegion.district}</strong> ({selectedRegion.lat}°N, {selectedRegion.lon}°E) · Source: <strong>{liveWeather.isRealNasaData ? 'Live NASA POWER API' : 'Cached Reanalysis'}</strong> · Latest Tmax: <strong>{fmtNum(liveWeather.latest?.t2m_max ?? '--', lang)}°C</strong> · Rain: <strong>{fmtNum(liveWeather.latest?.precip_mm ?? '--', lang)} mm</strong>
              </span>
            ) : (
              <span style={{ color: 'var(--accent-danger)' }}>Query notice: {liveWeather.error}</span>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Interactive 5-Question Quiz */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-violet)' }}>
        <div className="methods-card-band">
          <strong className="font-display" style={{ fontSize: '0.98rem' }}>
            {t.quizTitle} ({fmtNum(correctCount, lang)} / {fmtNum(QUIZ_ITEMS.length, lang)})
          </strong>
          {answeredCount > 0 && (
            <button
              type="button"
              onClick={() => setAnswers({})}
              className="btn btn-secondary no-print"
              style={{ padding: '0.28rem 0.65rem', fontSize: '0.71rem' }}
            >
              <RotateCcw size={12} />
              <span>{t.resetBtn}</span>
            </button>
          )}
        </div>

        <div className="methods-quiz-grid" style={{ padding: '1.15rem 1.25rem' }}>
          {QUIZ_ITEMS.map((item, qIdx) => {
            const picked = answers[qIdx];
            const isCorrect = picked === item.correct;
            const qAccents = ['var(--m-sky)', 'var(--m-emerald)', 'var(--m-flare)', 'var(--m-terracotta)', 'var(--m-violet)'];
            const qAccent = qAccents[qIdx % qAccents.length];
            return (
              <div
                key={qIdx}
                className={qIdx === QUIZ_ITEMS.length - 1 ? 'surface methods-quiz-span' : 'surface'}
                style={{ padding: '0.95rem', borderTop: `2.5px solid ${qAccent}` }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem', lineHeight: 1.45 }}>
                  <span className="mono" style={{ color: qAccent, marginRight: '0.35rem', fontWeight: 800 }}>{fmtNum(qIdx + 1, lang)}.</span>
                  {item.q[lang]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.38rem' }}>
                  {item.opts[lang].map((opt, optIdx) => {
                    const selected = picked === optIdx;
                    const rightOpt = optIdx === item.correct;
                    let border = 'var(--border-subtle)';
                    if (picked !== undefined && rightOpt) border = 'var(--m-emerald)';
                    else if (selected && !rightOpt) border = 'var(--accent-danger)';
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => selectAnswer(qIdx, optIdx)}
                        style={{
                          textAlign: 'left',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          border: `1px solid ${border}`,
                          background: selected ? 'var(--bg-elevated)' : 'var(--bg-alt)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {picked !== undefined && (
                  <div style={{ marginTop: '0.55rem', fontSize: '0.73rem', color: isCorrect ? 'var(--m-emerald)' : 'var(--accent-danger)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem', lineHeight: 1.45 }}>
                    {isCorrect ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> : <XCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />}
                    <span>{item.why[lang]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
