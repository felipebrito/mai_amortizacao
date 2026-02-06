
const calculateAmortization = (
    propertyValue,
    loanAmount,
    annualInterestRate,
    termMonths,
    type,
    monthlyExtra = 0,
    oneTimeExtras = {},
    appreciationRate = 5
) => {
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    const monthlyAppreciationRate = (1 + appreciationRate / 100) ** (1 / 12) - 1;
    const installments = [];
    let currentBalance = loanAmount;
    let currentPropertyValue = propertyValue;
    let totalPaid = 0;
    let totalInterest = 0;

    const n = termMonths;
    const i = monthlyInterestRate;
    // PRICE Fixed Payment Formula
    const fixedPricePayment = loanAmount * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

    console.log(`Debug: Loan=${loanAmount}, Rate=${annualInterestRate}%, Term=${termMonths}, Type=${type}`);
    console.log(`Debug: Monthly Rate=${monthlyInterestRate.toFixed(8)}`);
    console.log(`Debug: Fixed Price Payment (calc)=${fixedPricePayment.toFixed(2)}`);

    for (let month = 1; month <= termMonths; month++) {
        if (currentBalance <= 0.01) break;

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

        const extra = monthlyExtra + (oneTimeExtras[month] || 0);
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

    return {
        totalPaid,
        totalInterest,
        installments
    };
};

const loan = 156817.28;
const rate = 4.5;
const term = 420;

console.log("\n--- PDF CASE VERIFICATION (PRICE) ---");
const priceResult = calculateAmortization(loan, loan, rate, term, 'PRICE');

const m1 = priceResult.installments[0];
console.log(`Month 1: Pmt=${m1.payment.toFixed(2)} (Expected ~742.14)`);
console.log(`Month 1: Int=${m1.interest.toFixed(2)} (Expected ~588.06)`);
console.log(`Month 1: Amort=${m1.amortization.toFixed(2)} (Expected ~154.08)`);
console.log(`Month 1: Bal=${m1.balance.toFixed(2)} (Expected ~156663.20)`);

const m2 = priceResult.installments[1];
console.log(`Month 2: Pmt=${m2.payment.toFixed(2)}`);
console.log(`Month 2: Int=${m2.interest.toFixed(2)}`);
console.log(`Month 2: Amort=${m2.amortization.toFixed(2)}`);
console.log(`Month 2: Bal=${m2.balance.toFixed(2)}`);

console.log("\n--- SAC COMPARISON ---");
const sacResult = calculateAmortization(loan, loan, rate, term, 'SAC');
console.log(`SAC Month 1 Pmt=${sacResult.installments[0].payment.toFixed(2)}`);
