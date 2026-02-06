import React, { useState, useMemo } from 'react';
import { calculateAmortization } from './lib/financeUtils';
import type { AmortizationType } from './lib/financeUtils';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  Building2,
  ChevronLeft,
  LayoutDashboard,
  Table,
  Sparkles,
  ArrowRight,
  PiggyBank,
  Edit3,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridAnimation } from './components/ui/mouse-following-line';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type Step = 'WELCOME' | 'FINANCING' | 'EXTRA' | 'SUMMARY';
type ViewMode = 'WIZARD' | 'FULL';
type DashboardTab = 'DASHBOARD' | 'PLANILHA';

// --- Custom Components ---

interface RangeInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  isCurrency?: boolean;
}

const RangeInput: React.FC<RangeInputProps> = ({ label, value, onChange, min, max, step = 1, isCurrency = false }) => {
  const [isEditing, setIsEditing] = useState(false);

  const formatValue = (v: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
    }
    return v.toString();
  };

  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4a4030', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isEditing ? (
            <input
              type="number"
              autoFocus
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="input-field"
              style={{ width: '100px', fontSize: '1rem', fontWeight: 900, textAlign: 'right', border: 'none', background: 'transparent', padding: 0 }}
            />
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              {formatValue(value)} <Edit3 size={10} style={{ opacity: 0.3 }} />
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          borderRadius: '10px',
          backgroundColor: '#c9c1af',
          accentColor: 'var(--primary)',
          cursor: 'pointer'
        }}
      />
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('WIZARD');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('DASHBOARD');
  const [step, setStep] = useState<Step>('WELCOME');

  // Finance State
  const [propertyValue, setPropertyValue] = useState(250000);
  const [downPayment, setDownPayment] = useState(50000);
  const [interestRate, setInterestRate] = useState(10.5);
  const [termYears, setTermYears] = useState(30);
  const [type, setType] = useState<AmortizationType>('SAC');
  const [monthlyExtra, setMonthlyExtra] = useState(500);
  const appreciationRate = 6;

  // Calculated Loan Amount
  const loanAmount = useMemo(() => propertyValue - downPayment, [propertyValue, downPayment]);

  // Derived calculations
  const termMonths = termYears * 12;
  const result = useMemo(() => {
    return calculateAmortization(loanAmount, interestRate, termMonths, type, monthlyExtra, {}, appreciationRate);
  }, [loanAmount, interestRate, termMonths, type, monthlyExtra, appreciationRate]);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const netProfit = result.finalPropertyValue - (result.totalPaid + downPayment);

  const chartData = {
    labels: result.installments.filter((_, i) => i % 12 === 0 || i === result.installments.length - 1).map(inst => `Ano ${Math.ceil(inst.month / 12)}`),
    datasets: [
      {
        label: 'Saldo Devedor',
        data: result.installments.filter((_, i) => i % 12 === 0 || i === result.installments.length - 1).map(inst => inst.balance),
        borderColor: '#b89b76',
        backgroundColor: 'rgba(184, 155, 118, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Valorização Imóvel',
        data: result.installments.filter((_, i) => i % 12 === 0 || i === result.installments.length - 1).map((_, i) => {
          return propertyValue * ((1 + appreciationRate / 100) ** i);
        }),
        borderColor: '#0f1e38',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ],
  };

  // --- RENDERING HELPERS ---

  const renderHeader = () => (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#0f1e38',
      color: 'white',
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      marginBottom: '0',
      zIndex: 50,
      position: 'relative',
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <img src="/logoMai.png" alt="Logo" style={{ height: '60px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
        <div style={{ height: '40px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>Maiara Souza</h2>
          <p style={{ fontSize: '0.75rem', color: '#b89b76', margin: 0, letterSpacing: '0.15em', fontWeight: 700 }}>CONSULTORIA IMOBILIÁRIA</p>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600 }}>CRECI-DF 31896</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button className="btn" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b89b76', background: 'rgba(184, 155, 118, 0.1)', padding: '0.6rem 1.25rem', borderRadius: '30px' }}>
          CONSULTORIA DIRETA
        </button>
        <button
          disabled={viewMode === 'WIZARD'}
          className="btn"
          style={{
            backgroundColor: viewMode === 'WIZARD' ? 'rgba(255,255,255,0.1)' : '#b89b76',
            color: 'white',
            fontWeight: 900,
            borderRadius: '40px',
            padding: '0.75rem 2rem',
            fontSize: '0.75rem',
            opacity: viewMode === 'WIZARD' ? 0.3 : 1,
            cursor: viewMode === 'WIZARD' ? 'not-allowed' : 'pointer',
            border: 'none',
            boxShadow: viewMode === 'WIZARD' ? 'none' : '0 4px 15px rgba(184, 155, 118, 0.4)'
          }}
          onClick={() => window.print()}
        >
          IMPRIMIR PDF
        </button>
      </div>
    </header>
  );

  const renderWizardProgress = () => {
    const steps = [
      { id: 'FINANCING', label: 'Dados Iniciais', icon: <Building2 size={12} /> },
      { id: 'EXTRA', label: 'Planejamento', icon: <Zap size={12} /> },
    ];
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.25rem' }}>
        {steps.map((s, idx) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step === s.id ? 1 : 0.3 }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: step === s.id ? '#0f1e38' : '#c9c1af',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.65rem'
            }}>
              {s.icon}
            </div>
            <span style={{ fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#0f1e38' }}>{s.label}</span>
            {idx < steps.length - 1 && <div style={{ width: '40px', height: '1px', backgroundColor: '#c9c1af', marginLeft: '1rem' }} />}
          </div>
        ))}
      </div>
    );
  };

  const renderWizard = () => (
    <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatePresence mode="wait">
        {step === 'WELCOME' && (
          <motion.div
            key="w"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '2rem'
            }}
          >
            <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 900, marginBottom: '0.5rem', color: '#0f1e38', lineHeight: 1.1 }}>
              Mapa de Estratégia <span style={{ color: 'var(--primary)', display: 'block' }}>Patrimonial</span>
            </h1>
            <p style={{ fontSize: '1.35rem', color: '#5a4d3c', maxWidth: '600px', margin: '1rem auto 3.5rem', fontWeight: 500, lineHeight: 1.4 }}>
              Descubra como transformar o seu financiamento imobiliário em um investimento inteligente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary"
                style={{ padding: '1.5rem 4rem', fontSize: '1.25rem', borderRadius: '50px', fontWeight: 900, boxShadow: '0 15px 35px rgba(184, 155, 118, 0.3)' }}
                onClick={() => setStep('FINANCING')}
              >
                Diagnosticar Agora <ArrowRight style={{ marginLeft: '1rem' }} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(15, 30, 56, 0.05)' }}
                whileTap={{ scale: 0.95 }}
                className="btn"
                style={{
                  color: '#0f1e38',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  border: '2px solid rgba(15, 30, 56, 0.1)',
                  padding: '0.75rem 2.5rem',
                  borderRadius: '30px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(8px)'
                }}
                onClick={() => setViewMode('FULL')}
              >
                <LayoutDashboard size={18} /> Ver Dashboard
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'FINANCING' && (
          <motion.div key="f" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card" style={{ width: '100%', padding: '2.5rem', borderRadius: '28px', border: '1px solid var(--border)', boxShadow: '0 25px 50px rgba(0,0,0,0.05)', backgroundColor: 'white' }}>
            {renderWizardProgress()}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '2rem', color: '#0f1e38', textAlign: 'center' }}>Cenário de Aquisição</h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <RangeInput label="Valor do Imóvel" value={propertyValue} onChange={setPropertyValue} min={80000} max={3000000} step={5000} isCurrency={true} />
                <RangeInput label="Sinal de Entrada" value={downPayment} onChange={setDownPayment} min={0} max={propertyValue * 0.95} step={1000} isCurrency={true} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <RangeInput label="Taxa Anual (%)" value={interestRate} onChange={setInterestRate} min={1} max={20} step={0.1} />
                <RangeInput label="Prazo (Anos)" value={termYears} onChange={setTermYears} min={1} max={35} />
              </div>

              <div style={{ padding: '1.5rem 2.5rem', background: '#0f1e38', borderRadius: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.6 }}>VALOR TOTAL DO FINANCIAMENTO:</span>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{formatBRL(loanAmount)}</span>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(0,0,0,0.02)' }}
                  whileTap={{ scale: 0.95 }}
                  className="btn"
                  style={{ flex: 1, border: '2px solid var(--border)', padding: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => setStep('WELCOME')}
                >
                  <ChevronLeft size={18} /> Voltar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '1.25rem', fontWeight: 900 }}
                  onClick={() => setStep('EXTRA')}
                >
                  Avançar <ArrowRight size={18} style={{ marginLeft: '1rem' }} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'EXTRA' && (
          <motion.div key="e" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="card" style={{ width: '100%', padding: '2.5rem', borderRadius: '28px', backgroundColor: 'white', color: '#0f1e38', border: '1px solid var(--border)', boxShadow: '0 25px 50px rgba(0,0,0,0.05)' }}>
            {renderWizardProgress()}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center' }}>Estratégia de Quitação</h2>

            <div style={{ display: 'grid', gap: '2rem' }}>
              <RangeInput
                label="Quanto pretende amortizar por mês?"
                value={monthlyExtra}
                onChange={setMonthlyExtra}
                min={0}
                max={15000}
                step={100}
                isCurrency={true}
              />

              <div>
                <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 900, color: '#7a715e', textTransform: 'uppercase' }}>Sistema de Amortização do Banco</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn" style={{ flex: 1, padding: '1.25rem', backgroundColor: type === 'SAC' ? '#0f1e38' : 'var(--muted)', color: type === 'SAC' ? 'white' : '#7a715e', fontSize: '0.8rem', fontWeight: 900, border: 'none' }} onClick={() => setType('SAC')}>TABELA SAC</button>
                  <button className="btn" style={{ flex: 1, padding: '1.25rem', backgroundColor: type === 'PRICE' ? '#0f1e38' : 'var(--muted)', color: type === 'PRICE' ? 'white' : '#7a715e', fontSize: '0.8rem', fontWeight: 900, border: 'none' }} onClick={() => setType('PRICE')}>TABELA PRICE</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(0,0,0,0.02)' }}
                  whileTap={{ scale: 0.95 }}
                  className="btn"
                  style={{ flex: 1, border: '2px solid var(--border)', padding: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => setStep('FINANCING')}
                >
                  <ChevronLeft size={18} /> Voltar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  style={{ flex: 2, backgroundColor: '#10b981', color: 'white', fontWeight: 900, border: 'none', padding: '1.25rem' }}
                  onClick={() => setViewMode('FULL')}
                >
                  Finalizar Estratégia <Sparkles size={18} style={{ marginLeft: '1rem' }} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderDashboard = () => (
    <div style={{ padding: '2rem 1rem', paddingBottom: '4rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#b89b76', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>Seu Planejamento de Conquista</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f1e38', margin: 0, letterSpacing: '-0.02em' }}>Mapa Estratégico</h1>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '50px', padding: '0.25rem', display: 'flex', border: '1px solid rgba(15, 30, 56, 0.1)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <motion.button
            whileHover={{ backgroundColor: dashboardTab === 'DASHBOARD' ? '#0f1e38' : 'rgba(15, 30, 56, 0.05)' }}
            whileTap={{ scale: 0.95 }}
            className="btn"
            style={{
              borderRadius: '40px',
              padding: '0.75rem 2.5rem',
              fontSize: '0.75rem',
              fontWeight: 900,
              backgroundColor: dashboardTab === 'DASHBOARD' ? '#0f1e38' : 'transparent',
              color: dashboardTab === 'DASHBOARD' ? 'white' : '#7a715e',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onClick={() => setDashboardTab('DASHBOARD')}
          >
            <LayoutDashboard size={14} /> DASHBOARD
          </motion.button>
          <motion.button
            whileHover={{ backgroundColor: dashboardTab === 'PLANILHA' ? '#0f1e38' : 'rgba(15, 30, 56, 0.05)' }}
            whileTap={{ scale: 0.95 }}
            className="btn"
            style={{
              borderRadius: '40px',
              padding: '0.75rem 2.5rem',
              fontSize: '0.75rem',
              fontWeight: 900,
              backgroundColor: dashboardTab === 'PLANILHA' ? '#0f1e38' : 'transparent',
              color: dashboardTab === 'PLANILHA' ? 'white' : '#7a715e',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onClick={() => setDashboardTab('PLANILHA')}
          >
            <Table size={14} /> PLANILHA
          </motion.button>
        </div>
      </div>

      {dashboardTab === 'DASHBOARD' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ backgroundColor: '#0f1e38', color: 'white', padding: '2rem', borderRadius: '24px', border: 'none' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.5, marginBottom: '0.75rem' }}>PRAZO PARA QUITAÇÃO</p>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>{result.installments.length} <span style={{ fontSize: '1rem', opacity: 0.5 }}>meses</span></h2>
              <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 900 }}>Dívida reduzida em {result.monthsReduced} meses</span>
            </div>
            <div className="card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid #10b98144', backgroundColor: 'white' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#9ba3af', marginBottom: '0.75rem' }}>ECONOMIA PROJETADA</p>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#10b981' }}>{formatBRL(result.totalSaved)}</h2>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '0.5rem', color: '#9ba3af' }}>Capital de Juros Evitado</p>
            </div>
            <div className="card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)', backgroundColor: 'white' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#9ba3af', marginBottom: '0.75rem' }}>DESBORSO TOTAL ESTIMADO</p>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f1e38' }}>{formatBRL(result.totalPaid + downPayment)}</h2>
            </div>
            <div className="card" style={{ backgroundColor: 'var(--muted)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#b89b76', marginBottom: '0.75rem' }}>GANHO PATRIMONIAL LÍQUIDO</p>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f1e38' }}>{formatBRL(netProfit)}</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
            <div className="card" style={{ borderRadius: '28px', padding: '2.5rem', border: '1px solid var(--border)', backgroundColor: 'white' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '2.5rem', color: '#0f1e38' }}>Acúmulo de Patrimônio vs Saldo Devedor</h3>
              <div style={{ height: '400px' }}>
                <Line data={chartData} options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { size: 11, weight: 700 } } } },
                  scales: { x: { display: false }, y: { ticks: { font: { size: 11, weight: 700 } } } }
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ borderRadius: '28px', border: '1px solid var(--border)', padding: '2rem', backgroundColor: 'white' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '2rem', color: '#0f1e38' }}>Simulador de Impacto</h4>
                <RangeInput label="Amortização Extra" value={monthlyExtra} onChange={setMonthlyExtra} min={0} max={15000} step={50} isCurrency={true} />
                <RangeInput label="Valor do Bem" value={propertyValue} onChange={setPropertyValue} min={80000} max={3000000} step={5000} isCurrency={true} />
                <RangeInput label="Sinal/Entrada" value={downPayment} onChange={setDownPayment} min={0} max={propertyValue * 0.9} step={1000} isCurrency={true} />
              </div>

              <div className="card" style={{ borderRadius: '28px', backgroundColor: '#0f1e38', color: 'white', padding: '2rem', textAlign: 'center', border: 'none' }}>
                <PiggyBank size={40} color="#b89b76" style={{ marginBottom: '1.5rem', margin: '0 auto 1.5rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', opacity: 0.6 }}>ECONOMIA DE JUROS</h4>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#10b981' }}>{formatBRL(result.totalSaved)}</h2>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="card" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'white' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f1e38', color: 'white' }}>
                  <th style={{ padding: '1.25rem', fontWeight: 900 }}>Mês</th>
                  <th style={{ padding: '1.25rem', fontWeight: 900 }}>Parcela</th>
                  <th style={{ padding: '1.25rem', fontWeight: 900 }}>Juros</th>
                  <th style={{ padding: '1.25rem', fontWeight: 900 }}>Amort.</th>
                  <th style={{ padding: '1.25rem', fontWeight: 900 }}>Amort. Extra</th>
                </tr>
              </thead>
              <tbody>
                {result.installments.slice(0, 100).map((inst, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>{inst.month}</td>
                    <td style={{ padding: '1rem', fontWeight: 900, color: '#0f1e38' }}>{formatBRL(inst.payment)}</td>
                    <td style={{ padding: '1rem', color: '#ef4444', fontWeight: 700 }}>{formatBRL(inst.interest)}</td>
                    <td style={{ padding: '1rem' }}>{formatBRL(inst.amortization)}</td>
                    <td style={{ padding: '1rem', color: '#10b981', fontWeight: 900 }}>{formatBRL(inst.extraAmortization)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      position: 'relative',
      backgroundColor: '#f8f5f0',
      overflowX: 'hidden'
    }}>
      {/* Background - Fixed behind everything */}
      <GridAnimation />

      {/* Content wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderHeader()}

        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: viewMode === 'WIZARD' ? 'center' : 'flex-start',
          alignItems: 'center',
          width: '100%',
          padding: '1rem'
        }}>
          <AnimatePresence mode="wait">
            {viewMode === 'WIZARD' ? (
              <motion.div
                key="wiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {renderWizard()}
              </motion.div>
            ) : (
              <motion.div
                key="dash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ width: '100%' }}
              >
                {renderDashboard()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {viewMode === 'FULL' && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 100 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn"
            style={{
              backgroundColor: 'white',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              borderRadius: '50px',
              padding: '1rem 2.5rem',
              fontWeight: 900,
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#0f1e38'
            }}
            onClick={() => { setViewMode('WIZARD'); setStep('FINANCING'); }}
          >
            <ChevronLeft size={18} /> Voltar ao Início
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default App;
