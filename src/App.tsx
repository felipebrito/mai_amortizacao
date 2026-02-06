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
  isCompact?: boolean;
  showValue?: boolean;
}

const RangeInput = ({ label, value, onChange, min, max, step = 1, isCurrency = false, isCompact = false, showValue = true }: RangeInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const numVal = parseFloat(inputValue);
    if (!isNaN(numVal)) {
      onChange(numVal);
    } else {
      setInputValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div style={{ marginBottom: isCompact ? '0.5rem' : '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
        <label style={{ fontSize: isCompact ? '0.65rem' : '0.8rem', fontWeight: 700, color: '#0f1e38' }}>{label}</label>
        {showValue && (
          <div style={{ position: 'relative' }}>
            {isEditing ? (
              <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                step={step}
                className="no-spinners"
                style={{
                  fontSize: isCompact ? '0.75rem' : '1rem',
                  fontWeight: 900,
                  color: '#b89b76',
                  textAlign: 'right',
                  border: 'none',
                  background: 'transparent',
                  width: isCompact ? '80px' : '120px',
                  outline: 'none',
                  padding: 0,
                  margin: 0,
                  fontFamily: 'inherit'
                }}
              />
            ) : (
              <span
                onClick={() => setIsEditing(true)}
                style={{ fontSize: isCompact ? '0.75rem' : '1rem', fontWeight: 900, color: '#b89b76', textAlign: 'right', cursor: 'text' }}
              >
                {isCurrency
                  ? formatBRL(value)
                  : label.includes('meses')
                    ? `${value} (${(value / 12).toFixed(1).replace('.0', '')} anos)`
                    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value) + (label.includes('Taxa') ? '%' : label.includes('Prazo') || label.includes('Tempo') ? ' anos' : '')}
              </span>
            )}
          </div>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input"
        style={{ height: isCompact ? '4px' : '6px', width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
      />
      <style>{`
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
        }
      `}</style>
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
  const [interestRate, setInterestRate] = useState(9.57);
  const [termMonths, setTermMonths] = useState(420);
  const [type, setType] = useState<AmortizationType>('SAC');
  const [monthlyExtra, setMonthlyExtra] = useState(0);
  const [strategyMode, setStrategyMode] = useState<'VALUE' | 'TIME'>('VALUE');
  const [targetYears, setTargetYears] = useState(10);
  const appreciationRate = 5; // Fixed estimate based on Brazilian market indices (IPCA + Real Growth)

  // Calculated Loan Amount
  const loanAmount = useMemo(() => propertyValue - downPayment, [propertyValue, downPayment]);
  const termYears = termMonths / 12;

  const calculateMonthlyPayment = (principal: number, annualRate: number, months: number, amortType: AmortizationType): number => {
    const monthlyRate = annualRate / 100 / 12;
    if (amortType === 'PRICE') {
      if (monthlyRate === 0) return principal / months;
      return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    } else {
      const initialAmortization = principal / months;
      const initialInterest = principal * monthlyRate;
      return initialAmortization + initialInterest;
    }
  };

  const baseMonthlyPayment = useMemo(() => {
    return calculateMonthlyPayment(loanAmount, interestRate, termMonths, type);
  }, [loanAmount, interestRate, termMonths, type]);

  const calculatedExtraValue = useMemo(() => {
    if (strategyMode === 'VALUE') return monthlyExtra;
    const targetMonths = targetYears * 12;
    if (targetMonths >= termMonths) return 0;
    const requiredMonthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, targetMonths, type);
    return Math.max(0, requiredMonthlyPayment - baseMonthlyPayment);
  }, [strategyMode, monthlyExtra, loanAmount, interestRate, termMonths, type, targetYears, baseMonthlyPayment]);

  const activeExtra = useMemo(() => strategyMode === 'VALUE' ? monthlyExtra : calculatedExtraValue, [strategyMode, monthlyExtra, calculatedExtraValue]);

  const result = useMemo(() => {
    return calculateAmortization(propertyValue, loanAmount, interestRate, termMonths, type, activeExtra, {}, appreciationRate);
  }, [propertyValue, loanAmount, interestRate, termMonths, type, activeExtra, appreciationRate]);

  const totalExtraInvested = useMemo(() => {
    return result.installments.reduce((acc, inst) => acc + inst.extraAmortization, 0);
  }, [result]);



  const efficiency = useMemo(() => {
    if (totalExtraInvested === 0) return 0;
    return Math.round((result.totalSaved / totalExtraInvested) * 100);
  }, [result.totalSaved, totalExtraInvested]);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleExportCSV = () => {
    const headers = ['Mes', 'Amort. Adicional', 'Sd. Dev. Inicial', 'Juros', 'Saldo Atual', 'Amortizacao', 'Nova Parc.', 'Sd. Dev. Final'];
    const rows = result.installments.map(inst => [
      inst.month,
      inst.extraAmortization.toFixed(2).replace('.', ','),
      inst.initialBalance.toFixed(2).replace('.', ','),
      inst.interest.toFixed(2).replace('.', ','),
      (inst.initialBalance + inst.interest).toFixed(2).replace('.', ','),
      inst.amortization.toFixed(2).replace('.', ','),
      inst.payment.toFixed(2).replace('.', ','),
      inst.balance.toFixed(2).replace('.', ',')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `planejamento_patrimonial_maiara_souza.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = useMemo(() => {
    const years = [];
    const debtData = [];
    const propertyValueData = [];
    const netWorthData = [];
    const yearlyAppreciation = appreciationRate / 100;

    for (let year = 0; year <= termYears; year++) {
      years.push(`Ano ${year}`);

      // Get debt at end of the year if available, else 0
      const monthIndex = year * 12 - 1;
      const debt = monthIndex < 0 ? loanAmount : (result.installments[monthIndex]?.balance ?? 0);
      debtData.push(debt);

      const pVal = propertyValue * (1 + yearlyAppreciation) ** year;
      propertyValueData.push(pVal);
      netWorthData.push(pVal - debt);
    }

    return {
      labels: years,
      datasets: [
        {
          label: 'Saldo Devedor',
          data: debtData,
          borderColor: '#b89b76',
          backgroundColor: 'rgba(184, 155, 118, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
        },
        {
          label: 'Valor do Imóvel',
          data: propertyValueData,
          borderColor: '#b89b76',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: 'Patrimônio Líquido',
          data: netWorthData,
          borderColor: '#0f1e38',
          backgroundColor: 'rgba(15, 30, 56, 0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#0f1e38',
        }
      ]
    };
  }, [result.installments, propertyValue, loanAmount, termYears, appreciationRate]);

  // --- RENDERING HELPERS ---

  const renderPrintHeader = () => (
    <div className="print-header" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <img src="/logoMai.png" alt="Logo" style={{ height: '50px' }} />
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f1e38' }}>Maiara Souza</h2>
          <p style={{ fontSize: '0.7rem', color: '#b89b76', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Consultoria Imobiliária</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f1e38', margin: 0 }}>RELATÓRIO DE ESTRATÉGIA PATRIMONIAL</p>
        <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0 }}>Documento preparado em {new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
  );


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
        <button className="btn" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b89b76', background: 'rgba(184, 155, 118, 0.1)', padding: '0.6rem 1.25rem', borderRadius: '30px', border: 'none', cursor: 'pointer' }}>
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
            padding: '0.75rem 2.5rem',
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
                style={{ padding: '1.5rem 4rem', fontSize: '1.25rem', borderRadius: '50px', fontWeight: 900, boxShadow: '0 15px 35px rgba(184, 155, 118, 0.3)', border: 'none', cursor: 'pointer' }}
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
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer'
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
                <RangeInput label="Prazo (meses)" value={termMonths} onChange={setTermMonths} min={60} max={420} step={1} />
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
                  style={{ flex: 1, border: '2px solid var(--border)', padding: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '12px' }}
                  onClick={() => setStep('WELCOME')}
                >
                  <ChevronLeft size={18} /> Voltar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '1.25rem', fontWeight: 900, border: 'none', cursor: 'pointer', borderRadius: '12px' }}
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
              <div>
                <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 900, color: '#7a715e', textTransform: 'uppercase' }}>Tipo de Estratégia</label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  <button className="btn" style={{ flex: 1, padding: '1rem', backgroundColor: strategyMode === 'VALUE' ? '#0f1e38' : 'var(--muted)', color: strategyMode === 'VALUE' ? 'white' : '#7a715e', fontSize: '0.75rem', fontWeight: 900, border: 'none', cursor: 'pointer', borderRadius: '12px' }} onClick={() => setStrategyMode('VALUE')}>POR VALOR EXTRA</button>
                  <button className="btn" style={{ flex: 1, padding: '1rem', backgroundColor: strategyMode === 'TIME' ? '#0f1e38' : 'var(--muted)', color: strategyMode === 'TIME' ? 'white' : '#7a715e', fontSize: '0.75rem', fontWeight: 900, border: 'none', cursor: 'pointer', borderRadius: '12px' }} onClick={() => setStrategyMode('TIME')}>POR TEMPO ALVO</button>
                </div>

                {strategyMode === 'VALUE' ? (
                  <RangeInput
                    label="Quanto pretende amortizar por mês?"
                    value={monthlyExtra}
                    onChange={setMonthlyExtra}
                    min={0}
                    max={15000}
                    step={100}
                    isCurrency={true}
                  />
                ) : (
                  <RangeInput
                    label="Em quantos anos quer quitar?"
                    value={targetYears}
                    onChange={setTargetYears}
                    min={1}
                    max={termYears}
                    step={1}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 900, color: '#7a715e', textTransform: 'uppercase' }}>Sistema de Amortização do Banco</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn" style={{ flex: 1, padding: '1.25rem', backgroundColor: type === 'SAC' ? '#0f1e38' : 'var(--muted)', color: type === 'SAC' ? 'white' : '#7a715e', fontSize: '0.8rem', fontWeight: 900, border: 'none', cursor: 'pointer', borderRadius: '12px' }} onClick={() => setType('SAC')}>TABELA SAC</button>
                  <button className="btn" style={{ flex: 1, padding: '1.25rem', backgroundColor: type === 'PRICE' ? '#0f1e38' : 'var(--muted)', color: type === 'PRICE' ? 'white' : '#7a715e', fontSize: '0.8rem', fontWeight: 900, border: 'none', cursor: 'pointer', borderRadius: '12px' }} onClick={() => setType('PRICE')}>TABELA PRICE</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(0,0,0,0.02)' }}
                  whileTap={{ scale: 0.95 }}
                  className="btn"
                  style={{ flex: 1, border: '2px solid var(--border)', padding: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '12px' }}
                  onClick={() => setStep('FINANCING')}
                >
                  <ChevronLeft size={18} /> Voltar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  style={{ flex: 2, backgroundColor: '#10b981', color: 'white', fontWeight: 900, border: 'none', padding: '1.25rem', cursor: 'pointer', borderRadius: '12px' }}
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
      {renderPrintHeader()}

      <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
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
              padding: '0.6rem 2rem',
              fontSize: '0.75rem',
              fontWeight: 900,
              backgroundColor: dashboardTab === 'DASHBOARD' ? '#0f1e38' : 'transparent',
              color: dashboardTab === 'DASHBOARD' ? 'white' : '#7a715e',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
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
              padding: '0.6rem 2rem',
              fontSize: '0.75rem',
              fontWeight: 900,
              backgroundColor: dashboardTab === 'PLANILHA' ? '#0f1e38' : 'transparent',
              color: dashboardTab === 'PLANILHA' ? 'white' : '#7a715e',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
            onClick={() => setDashboardTab('PLANILHA')}
          >
            <Table size={14} /> PLANILHA
          </motion.button>
        </div>
      </div>

      {dashboardTab === 'DASHBOARD' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ backgroundColor: '#0f1e38', color: 'white', padding: '1.25rem', borderRadius: '16px', border: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 900, opacity: 0.5, marginBottom: '0.4rem' }}>PRAZO PARA QUITAÇÃO</p>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>{result.installments.length} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>meses</span></h2>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 900, alignSelf: 'flex-start' }}>-{result.monthsReduced} meses</span>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#9ba3af', marginBottom: '0.4rem' }}>VALOR DO IMÓVEL (HOJE)</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f1e38', lineHeight: 1 }}>{formatBRL(propertyValue)}</h2>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#9ba3af', marginBottom: '0.4rem' }}>INVESTIMENTO TOTAL</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f1e38', lineHeight: 1 }}>{formatBRL(result.totalPaid + downPayment)}</h2>
            </div>
            <div className="card" style={{ backgroundColor: 'var(--muted)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#b89b76', marginBottom: '0.4rem' }}>TOTAL EM JUROS</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f1e38', lineHeight: 1 }}>{formatBRL(result.totalInterest)}</h2>
            </div>
            <div className="card" style={{ background: 'linear-gradient(135deg, #0f1e38 0%, #1e293b 100%)', color: 'white', padding: '1.25rem', borderRadius: '16px', border: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>ECONOMIA DE JUROS ESTIMADA</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{formatBRL(result.totalSaved)}</h2>
            </div>
            <div className="card" style={{ background: 'linear-gradient(135deg, #b89b76 0%, #a68a64 100%)', color: 'white', padding: '1.25rem', borderRadius: '16px', border: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 900, opacity: 0.8, marginBottom: '0.4rem' }}>EFICIÊNCIA</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>{efficiency}%</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
            <div className="card" style={{ borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)', backgroundColor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f1e38' }}>Evolução de Patrimônio vs Dívida</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 700 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#b89b76' }} /> Saldo Devedor
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 700 }}>
                    <div style={{ backgroundColor: '#b89b76', height: '2px', width: '12px' }} /> <div style={{ width: '4px', height: '2px' }} /> <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #b89b76' }} /> Valor Imóvel
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 700 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0f1e38' }} /> Patrimônio Líquido
                  </div>
                </div>
              </div>
              <div style={{ height: '320px', backgroundColor: '#fdfcfb', borderRadius: '16px', padding: '1rem' }}>
                <Line data={chartData} options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                          }
                          return label;
                        }
                      }
                    }
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      grid: { color: '#f0ede8' },
                      ticks: {
                        font: { size: 10, weight: 600 },
                        color: '#9ba3af',
                        callback: (value: any) => new Intl.NumberFormat('pt-BR').format(value)
                      }
                    }
                  }
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ borderRadius: '24px', border: '1px solid var(--border)', padding: '1.5rem', backgroundColor: 'white' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '1.5rem', color: '#0f1e38', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} color="var(--primary)" /> Simulador de Impacto
                </h4>

                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', backgroundColor: 'var(--muted)', padding: '0.2rem', borderRadius: '10px' }}>
                  <button onClick={() => setStrategyMode('VALUE')} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 900, backgroundColor: strategyMode === 'VALUE' ? 'white' : 'transparent', color: strategyMode === 'VALUE' ? '#0f1e38' : '#9ba3af' }}>POR VALOR</button>
                  <button onClick={() => setStrategyMode('TIME')} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 900, backgroundColor: strategyMode === 'TIME' ? 'white' : 'transparent', color: strategyMode === 'TIME' ? '#0f1e38' : '#9ba3af' }}>POR TEMPO</button>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  {strategyMode === 'VALUE' ? (
                    <RangeInput label="Amortização Adicional" value={monthlyExtra} onChange={setMonthlyExtra} min={0} max={15000} step={50} isCurrency={true} />
                  ) : (
                    <RangeInput label="Tempo Alvo de Quitação" value={targetYears} onChange={setTargetYears} min={1} max={termYears} step={1} showValue={false} />
                  )}

                  <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', padding: '1rem', borderRadius: '16px', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {strategyMode === 'TIME' ? `Estratégia para ${targetYears} anos:` : 'Resumo da Estratégia:'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Parcela Base:</span>
                        <span style={{ fontSize: '0.75rem', color: '#0f1e38', fontWeight: 700 }}>{formatBRL(baseMonthlyPayment)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Amortização Extra:</span>
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800 }}>+ {formatBRL(activeExtra)}</span>
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#e0f2fe', margin: '0.25rem 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 900 }}>TOTAL MENSAL:</span>
                        <span style={{ fontSize: '1.1rem', color: '#0c4a6e', fontWeight: 900 }}>{formatBRL(baseMonthlyPayment + activeExtra)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '1rem 0', opacity: 0.3 }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <RangeInput label="Valor" value={propertyValue} onChange={setPropertyValue} min={80000} max={3000000} step={25000} isCurrency={true} isCompact={true} />
                  <RangeInput label="Entrada" value={downPayment} onChange={setDownPayment} min={0} max={propertyValue * 0.9} step={5000} isCurrency={true} isCompact={true} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <RangeInput label="Taxa (%)" value={interestRate} onChange={setInterestRate} min={0} max={18} step={0.1} isCompact={true} />
                  <RangeInput label="Prazo (meses)" value={termMonths} onChange={setTermMonths} min={60} max={420} step={1} isCompact={true} />
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setType('SAC')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', backgroundColor: type === 'SAC' ? '#0f1e38' : 'var(--muted)', color: type === 'SAC' ? 'white' : '#7a715e', fontWeight: 900, fontSize: '0.65rem', cursor: 'pointer' }}>SAC</button>
                  <button onClick={() => setType('PRICE')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', backgroundColor: type === 'PRICE' ? '#0f1e38' : 'var(--muted)', color: type === 'PRICE' ? 'white' : '#7a715e', fontWeight: 900, fontSize: '0.65rem', cursor: 'pointer' }}>PRICE</button>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.6rem', color: '#9ba3af', fontStyle: 'italic' }}>
                    * Premissa: Valorização imobiliária estimada em {new Intl.NumberFormat('pt-BR').format(appreciationRate)}% a.a. (Média Brasil)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="card" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div className="no-print" style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#fdfcfb' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportCSV}
              className="btn"
              style={{
                backgroundColor: 'rgba(184, 155, 118, 0.1)',
                color: '#b89b76',
                fontWeight: 900,
                fontSize: '0.7rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(184, 155, 118, 0.2)',
                cursor: 'pointer'
              }}
            >
              <Table size={14} /> EXPORTAR CSV
            </motion.button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f1e38', color: 'white' }}>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>MÊS</th>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>AMORT. ADIC.</th>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>SD. DEV. INICIAL</th>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>JUROS</th>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>SALDO ATUAL</th>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>AMORTIZAÇÃO</th>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>NOVA PARC.</th>
                  <th style={{ padding: '1rem', fontWeight: 900 }}>SD. DEV. FINAL</th>
                </tr>
              </thead>
              <tbody>
                {result.installments.map((inst, i) => {
                  const isLast = i === result.installments.length - 1;
                  const showYearDivider = inst.month > 1 && (inst.month - 1) % 12 === 0;
                  const year = Math.floor((inst.month - 1) / 12) + 1;

                  return (
                    <React.Fragment key={i}>
                      {showYearDivider && (
                        <tr className="year-divider">
                          <td colSpan={8}>ANO {year}</td>
                        </tr>
                      )}
                      <tr className={isLast ? 'success-row' : ''} style={{ borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <td style={{ padding: '0.6rem', fontWeight: 700 }}>{inst.month}</td>
                        <td style={{ padding: '0.6rem', color: isLast ? 'inherit' : '#10b981', fontWeight: 900 }}>
                          {isLast && inst.balance === 0 ? (
                            <div className="success-badge"><Sparkles size={10} /> QUITADO</div>
                          ) : (
                            formatBRL(inst.extraAmortization)
                          )}
                        </td>
                        <td style={{ padding: '0.6rem' }}>{formatBRL(inst.initialBalance)}</td>
                        <td style={{ padding: '0.6rem', color: isLast ? 'inherit' : '#ef4444' }}>{formatBRL(inst.interest)}</td>
                        <td style={{ padding: '0.6rem', fontWeight: 700 }}>{formatBRL(inst.initialBalance + inst.interest)}</td>
                        <td style={{ padding: '0.6rem' }}>{formatBRL(inst.amortization)}</td>
                        <td style={{ padding: '0.6rem', fontWeight: 900, color: isLast ? 'inherit' : '#0f1e38' }}>{formatBRL(inst.payment)}</td>
                        <td style={{ padding: '0.6rem', fontWeight: 900 }}>{formatBRL(inst.balance)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
      }
    </div >
  );

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      position: 'relative',
      backgroundColor: '#f8f5f0',
      overflowX: 'hidden'
    }}>
      <GridAnimation />
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
              color: '#0f1e38',
              cursor: 'pointer'
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
