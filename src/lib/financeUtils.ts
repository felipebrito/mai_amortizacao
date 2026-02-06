export type AmortizationType = 'SAC' | 'PRICE';

export interface Installment {
    month: number;
    initialBalance: number;
    payment: number;
    interest: number;
    amortization: number;
    extraAmortization: number;
    balance: number;
}

export interface CalculationResult {
    installments: Installment[];
    totalPaid: number;
    totalInterest: number;
    monthsReduced: number;
    totalSaved: number;
    finalPropertyValue: number;
}

export interface FGTSConfig {
    initialBalance: number;
    monthlyGrossIncome: number;
    useEveryTwoYears: boolean;
}

export const calculateAmortization = (
    propertyValue: number,
    loanAmount: number,
    annualInterestRate: number,
    termMonths: number,
    type: AmortizationType,
    monthlyExtra: number = 0,
    oneTimeExtras: { [month: number]: number } = {},
    appreciationRate: number = 5, // % per year default
    fgts: FGTSConfig = { initialBalance: 0, monthlyGrossIncome: 0, useEveryTwoYears: false }
): CalculationResult => {
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    const monthlyAppreciationRate = (1 + appreciationRate / 100) ** (1 / 12) - 1;
    const installments: Installment[] = [];
    let currentBalance = loanAmount;
    let currentPropertyValue = propertyValue;
    let totalPaid = 0;
    let totalInterest = 0;

    // FGTS State
    let currentFGTSBalance = fgts.initialBalance;
    const monthlyFGTSDeposit = fgts.monthlyGrossIncome * 0.08;

    // For PRICE, calculate fixed payment (without extras)
    // M = P * (i * (1 + i)^n) / ((1 + i)^n - 1)
    const n = termMonths;
    const i = monthlyInterestRate;
    const fixedPricePayment = loanAmount * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

    for (let month = 1; month <= termMonths; month++) {
        if (currentBalance <= 0) break;

        // Accrue FGTS
        currentFGTSBalance += monthlyFGTSDeposit;

        const interest = currentBalance * monthlyInterestRate;
        let amortization = 0;
        let payment = 0;

        if (type === 'SAC') {
            amortization = loanAmount / termMonths;
            payment = amortization + interest;
        } else {
            payment = fixedPricePayment;
            amortization = payment - interest;
        }

        // Ensure amortization doesn't exceed balance
        if (amortization > currentBalance) {
            amortization = currentBalance;
            payment = amortization + interest;
        }

        let extra = monthlyExtra + (oneTimeExtras[month] || 0);

        // FGTS Application (Every 2 years = months 24, 48, 72...)
        if (fgts.useEveryTwoYears && month % 24 === 0) {
            extra += currentFGTSBalance;
            currentFGTSBalance = 0; // Reset FGTS after use
        }

        const actualExtra = Math.min(extra, currentBalance - amortization);

        const currentBalanceBefore = currentBalance;
        currentBalance -= (amortization + actualExtra);
        currentPropertyValue *= (1 + monthlyAppreciationRate);
        totalPaid += (payment + actualExtra);
        totalInterest += interest;

        installments.push({
            month,
            initialBalance: currentBalanceBefore,
            payment: payment + actualExtra,
            interest,
            amortization,
            extraAmortization: actualExtra,
            balance: Math.max(0, currentBalance),
        });
    }

    // Calculate savings by comparing with base case (no extras)
    const baseResult = calculateAmortizationBase(loanAmount, annualInterestRate, termMonths, type);
    const totalSaved = baseResult.totalInterest - totalInterest;
    const monthsReduced = termMonths - installments.length;

    return {
        installments,
        totalPaid,
        totalInterest,
        monthsReduced,
        totalSaved,
        finalPropertyValue: currentPropertyValue
    };
};

const calculateAmortizationBase = (
    loanAmount: number,
    annualInterestRate: number,
    termMonths: number,
    type: AmortizationType
) => {
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    let currentBalance = loanAmount;
    let totalInterest = 0;

    const i = monthlyInterestRate;
    const n = termMonths;
    const fixedPricePayment = loanAmount * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

    for (let month = 1; month <= termMonths; month++) {
        const interest = currentBalance * monthlyInterestRate;
        let amortization = type === 'SAC' ? (loanAmount / termMonths) : (fixedPricePayment - interest);

        if (amortization > currentBalance) amortization = currentBalance;
        currentBalance -= amortization;
        totalInterest += interest;
        if (currentBalance <= 0) break;
    }

    return { totalInterest };
};

export const calculateExtraNeeded = (
    propertyValue: number,
    loanAmount: number,
    annualInterestRate: number,
    termMonths: number,
    type: AmortizationType,
    targetMonths: number
): number => {
    let low = 0;
    let high = loanAmount;
    let extra = 0;

    for (let i = 0; i < 20; i++) {
        extra = (low + high) / 2;
        const result = calculateAmortization(propertyValue, loanAmount, annualInterestRate, termMonths, type, extra);
        if (result.installments.length > targetMonths) {
            low = extra;
        } else {
            high = extra;
        }
    }

    return high;
};
