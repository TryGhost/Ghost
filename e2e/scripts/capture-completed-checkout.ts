import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { provision, stripeClient } from './provision-stripe-environment.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, '../helpers/services/stripe/fixtures');

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

function log(message = ''): void {
  process.stdout.write(`${message}\n`);
}

function save(name: string, object: object): void {
  fs.writeFileSync(
    path.resolve(fixtureDir, `${name}.json`),
    `${JSON.stringify(object, null, 2)}\n`,
  );
  log(`  saved ${name}.json`);
}

// One place decides what a usable key is, and refuses a live one.
const stripe = stripeClient();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * A completed Checkout Session is the one fixture that cannot be captured from the API:
 * Stripe blocks automating its hosted payment page, so a person has to pay it. This
 * script does everything either side of that, and asks for one card entry.
 *
 * Shipping address, tax ID and custom field collection are requested on the same
 * session, so a single payment captures every shape we do not otherwise have. Ghost
 * cannot produce this session itself yet, which is the point of BER-3872, so the
 * session is created directly rather than through Ghost.
 */
async function main(): Promise<void> {
  // Through provision() rather than a local lookup: it paginates and matches the whole
  // price contract, so this cannot pick up a differently-priced Monthly from another
  // account, or miss ours because it sits beyond the first page.
  const { prices } = await provision(stripe);
  const monthly = prices.find((price) => price.nickname === 'Monthly');
  if (!monthly) {
    log('Provisioning did not produce a Monthly price.');
    process.exit(1);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: monthly.id, quantity: 1 }],
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
    shipping_address_collection: { allowed_countries: ['GB', 'US'] },
    tax_id_collection: { enabled: true },
    custom_fields: [
      {
        key: 'delivery_notes',
        label: { type: 'custom', custom: 'Delivery notes' },
        type: 'text',
        optional: true,
      },
    ],
  });

  log('');
  log('  Open this and pay:');
  log('');
  log(`  ${session.url}`);
  log('');
  log('  Card 4242 4242 4242 4242, any future expiry, any CVC, any postcode.');
  log('  Fill in the shipping address, the name, the tax ID and the delivery note,');
  log('  so every field we are trying to learn about comes back populated.');
  log('');
  log('  Use invented details. The result is committed, so do not enter anything');
  log('  real: these fixtures are read by everyone working on Stripe.');
  log('');
  log(`  Waiting for payment (up to ${POLL_TIMEOUT_MS / 60000} minutes)`);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let completed: Stripe.Checkout.Session | null = null;

  while (Date.now() < deadline) {
    await wait(POLL_INTERVAL_MS);
    const current = await stripe.checkout.sessions.retrieve(session.id);
    if (current.status === 'complete') {
      completed = current;
      break;
    }
    if (current.status === 'expired') {
      log('  Session expired. Re-run to get a fresh link.');
      process.exit(1);
    }
    process.stdout.write('.');
  }

  if (!completed) {
    log('');
    log('  Timed out. Nothing was captured; re-run for a fresh link.');
    process.exit(1);
  }

  // A capture is only worth keeping if the operator filled everything in. A session
  // paid with fields skipped still completes, and saving it would silently replace a
  // good fixture with one that answers none of the questions it exists to answer.
  const shippingDetails = (
    completed as unknown as { shipping?: { name?: string; address?: unknown } }
  ).shipping;
  const customFields =
    (completed as unknown as { custom_fields?: Array<{ key: string; text?: { value?: string } }> })
      .custom_fields ?? [];
  const missing = [
    [shippingDetails?.address, 'shipping address'],
    [shippingDetails?.name, 'recipient name'],
    [completed.customer_details?.tax_ids?.[0]?.value, 'tax ID'],
    [customFields.find((field) => field.key === 'delivery_notes')?.text?.value, 'delivery note'],
  ]
    .filter(([value]) => !value)
    .map(([, label]) => label);

  if (missing.length > 0) {
    log('');
    log(`  Paid, but these came back empty: ${missing.join(', ')}.`);
    log('  Nothing was written. Re-run and fill in every field on the page.');
    process.exit(1);
  }

  log('');
  log('  Paid. Capturing.');
  save('checkout_session.completed', completed);

  // The event envelope is deliberately not captured. An Event is an immutable snapshot
  // rendered when it was created, at the account's default API version, and fetching it
  // with a pinned client does not re-render it. Ghost pins its webhook endpoint to
  // STRIPE_API_VERSION (stripe-api.js createWebhookEndpoint), so what Ghost receives and
  // what this script could fetch are different renderings of the same event: at the
  // account default the shipping address moves to collected_information.shipping_details,
  // which Ghost will never see. A fixture of that would describe an API we do not call.
  //
  // Ghost reads only event.type and event.data.object, so the envelope carries nothing
  // worth pinning anyway; the session saved above is the part that matters.

  const shipping = (completed as unknown as { shipping?: Record<string, unknown> }).shipping;
  log('');
  log('  What this answers:');
  log(`    shipping keys        ${shipping ? Object.keys(shipping).join(', ') : 'null'}`);
  log(`    shipping.name        ${JSON.stringify((shipping as { name?: unknown })?.name)}`);
  log(`    tax_ids              ${JSON.stringify(completed.customer_details?.tax_ids)}`);
  log(
    `    custom field answer  ${JSON.stringify((completed as unknown as { custom_fields?: unknown[] }).custom_fields)}`,
  );
  log('');
}

main().catch((error: Error) => {
  log(`Capture failed: ${error.message}`);
  process.exit(1);
});
