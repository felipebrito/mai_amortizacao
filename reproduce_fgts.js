
const calculateAmortization = (
    propertyValue,
    loanAmount,
    annualInterestRate,
    termMonths,
    type,
    monthlyExtra = 0,
    oneTimeExtras = {},
    appreciationRate = 5,
    fgts = { initialBalance: 0, monthlyGrossIncome: 0, useEveryTwoYears: false }
) => {
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    // ... Simplified mock of the TS logic for testing JS script ...
    // Actually, it's better to copy the exact logic or import it if possible. 
    // Since I can't import TS easily in node without setup, I'll copy the logic logic I just wrote.

    const installments = [];
    let currentBalance = loanAmount;
    let totalPaid = 0;
    let totalInterest = 0;

    // FGTS State
    let currentFGTSBalance = fgts.initialBalance;
    const monthlyFGTSDeposit = fgts.monthlyGrossIncome * 0.08;

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

        if (amortization > currentBalance) {
            amortization = currentBalance;
            payment = amortization + interest;
        }

        let extra = monthlyExtra + (oneTimeExtras[month] || 0);

        // FGTS Application
        let fgtsApplied = 0;
        if (fgts.useEveryTwoYears && month % 24 === 0) {
            fgtsApplied = currentFGTSBalance;
            extra += currentFGTSBalance;
            currentFGTSBalance = 0;
        }

        const actualExtra = Math.min(extra, currentBalance - amortization);
        const currentBalanceBefore = currentBalance;
        currentBalance -= (amortization + actualExtra);
        totalPaid += (payment + actualExtra);
        totalInterest += interest;

        installments.push({
            month,
            initialBalance: currentBalanceBefore,
            payment: payment + actualExtra,
            interest,
            amortization,
            extraAmortization: actualExtra,
            fgtsApplied, // Track for debugging
            balance: Math.max(0, currentBalance),
        });
    }

    return { installments, totalPaid, totalInterest };
};

// Test Case
console.log("--- TEST: FGTS Amortization ---");
const initialBalance = 10000;
const salary = 10000; // 8% = 800/month
const loan = 200000;
const rate = 10;
const months = 360;

const result = calculateAmortization(300000, loan, rate, months, 'SAC', 0, {}, 5, {
    initialBalance: initialBalance,
    monthlyGrossIncome: salary,
    useEveryTwoYears: true
});

// Check Month 24
const m24 = result.installments[23]; // Index 23 is month 24
console.log(`Month 24 Extra Amortization: ${m24.extraAmortization.toFixed(2)}`);
// Expected: Initial (10000) + 24 * 800 (19200) = 29200.
// Actually, deposit happens at start or end? Let's assume simplest: monthly deposit adds up.
// Month 1: 10000 + 800 = 10800 available? Or accumulates then used?
// Logic: Accrue then Check use. 
// Month 1 start: 10000. Accrue 800. End M1=10800.
// ...
// Month 24: Start M23=... Accrue 800.
// 10000 + 24*800 = 29200.
console.log(`Expected approx: ${10000 + 24 * 800}`);
console.log(`FGTS Balance Used: ${m24.fgtsApplied.toFixed(2)}`);

if (Math.abs(m24.fgtsApplied - 29200) < 1) {
    console.log("✅ FGTS Calculation is CORRECT.");
} else {
    console.log("❌ FGTS Calculation MISMATCH.");
}
