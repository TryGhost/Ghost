interface FakeCheckoutPageProps {
    mode: string;
    sessionId: string;
}

interface FakeDonationCheckoutPageProps extends FakeCheckoutPageProps {
    amount: number;
    billingName: string;
    currency: string;
    email: string;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format(amount / 100);
}

export function renderFakeCheckoutPage({mode, sessionId}: FakeCheckoutPageProps): string {
    return `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <title>Fake Stripe Checkout</title>
            </head>
            <body>
                <main>
                    <h1>Fake Stripe Checkout</h1>
                    <p>Session: ${escapeHtml(sessionId)}</p>
                    <p>Mode: ${escapeHtml(mode)}</p>
                </main>
            </body>
        </html>`;
}

export function renderFakeDonationCheckoutPage({
    amount,
    billingName,
    currency,
    email,
    mode,
    sessionId
}: FakeDonationCheckoutPageProps): string {
    const formattedAmount = formatCurrency(amount, currency);
    const amountInputValue = (amount / 100).toFixed(2);

    return `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <title>Fake Stripe Checkout</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                        background: #f6f8fc;
                        color: #15171a;
                        margin: 0;
                        padding: 32px 16px;
                    }

                    main {
                        background: #fff;
                        border-radius: 16px;
                        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
                        margin: 0 auto;
                        max-width: 480px;
                        padding: 32px;
                    }

                    h1 {
                        margin-top: 0;
                    }

                    .stack {
                        display: grid;
                        gap: 16px;
                    }

                    .row {
                        display: grid;
                        gap: 8px;
                    }

                    label {
                        display: grid;
                        font-size: 14px;
                        font-weight: 600;
                        gap: 6px;
                    }

                    input, select, button {
                        border: 1px solid #d8dbe6;
                        border-radius: 8px;
                        font: inherit;
                        padding: 12px;
                    }

                    button {
                        background: #15171a;
                        color: #fff;
                        cursor: pointer;
                    }

                    button.secondary {
                        background: #fff;
                        color: #15171a;
                    }

                    #customUnitAmount {
                        display: none;
                    }

                    [data-testid="product-summary-total-amount"] {
                        font-size: 24px;
                        font-weight: 700;
                    }
                </style>
            </head>
            <body>
                <main>
                    <div class="stack">
                        <div>
                            <h1>Fake Stripe Checkout</h1>
                            <p>Session: ${escapeHtml(sessionId)}</p>
                            <p>Mode: ${escapeHtml(mode)}</p>
                        </div>

                        <div class="row">
                            <span data-testid="product-summary-total-amount">${escapeHtml(formattedAmount)}</span>
                            <button class="secondary" data-testid="change-amount-button" id="changeAmountButton" type="button">Change amount</button>
                            <label>
                                Custom amount
                                <input id="customUnitAmount" inputmode="decimal" value="${escapeHtml(amountInputValue)}" />
                            </label>
                        </div>

                        <label>
                            Email
                            <input id="email" type="email" value="${escapeHtml(email)}" />
                        </label>

                        <button data-testid="card-tab-button" type="button">Card</button>

                        <label>
                            Card number
                            <input id="cardNumber" value="4242 4242 4242 4242" />
                        </label>

                        <label>
                            Expiry
                            <input id="cardExpiry" value="12 / 30" />
                        </label>

                        <label>
                            CVC
                            <input id="cardCvc" value="424" />
                        </label>

                        <label>
                            Billing name
                            <input id="billingName" value="${escapeHtml(billingName)}" />
                        </label>

                        <label>
                            Country or region
                            <select aria-label="Country or region">
                                <option value="US">United States</option>
                            </select>
                        </label>

                        <label>
                            Postal code
                            <input id="billingPostalCode" value="42424" />
                        </label>

                        <button data-testid="hosted-payment-submit-button" type="button">Pay</button>
                    </div>
                </main>

                <script>
                    const amountInput = document.getElementById('customUnitAmount');
                    const amountToggle = document.getElementById('changeAmountButton');
                    const totalAmount = document.querySelector('[data-testid="product-summary-total-amount"]');
                    const formatter = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: ${JSON.stringify(currency.toUpperCase())}
                    });

                    const renderAmount = () => {
                        const parsed = Number.parseFloat(amountInput.value || '0');

                        if (!Number.isFinite(parsed)) {
                            totalAmount.textContent = formatter.format(0);
                            return;
                        }

                        totalAmount.textContent = formatter.format(parsed);
                    };

                    amountToggle.addEventListener('click', () => {
                        amountInput.style.display = 'block';
                        amountInput.focus();
                        amountInput.select();
                    });

                    amountInput.addEventListener('input', renderAmount);
                    renderAmount();
                </script>
            </body>
        </html>`;
}
