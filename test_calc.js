
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
    const fixedPricePayment = loanAmount * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

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
        installmentsCount: installments.length
    };
};

const val = 250000;
const loan = 200000;
const rate = 10; // 10%
const term = 360; // 30 years

console.log("--- NO EXTRA ---");
const sac = calculateAmortization(val, loan, rate, term, 'SAC');
const price = calculateAmortization(val, loan, rate, term, 'PRICE');
console.log("SAC Total Paid:", sac.totalPaid.toFixed(2));
console.log("PRICE Total Paid:", price.totalPaid.toFixed(2));

console.log("\n--- WITH EXTRA 500 ---");
const sacExtra = calculateAmortization(val, loan, rate, term, 'SAC', 500);
const priceExtra = calculateAmortization(val, loan, rate, term, 'PRICE', 500);
console.log("SAC Extra Total Paid:", sacExtra.totalPaid.toFixed(2));
console.log("PRICE Extra Total Paid:", priceExtra.totalPaid.toFixed(2));
