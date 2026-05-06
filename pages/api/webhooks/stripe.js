// pages/api/webhooks/stripe.js
// ─────────────────────────────────────────────────────────────
// Receives Stripe webhook events. The critical one is
// `checkout.session.completed`, fired when an advertiser finishes
// payment. We use it to flip the corresponding ad_bookings row
// from `pending_payment` → `active` so Phase 2 (ad rendering)
// has accurate data.
//
// Email confirmations are handled by Stripe's built-in features:
//   • Customer receipts:  Dashboard → Settings → Emails
//   • Owner alerts:       Dashboard → Settings → Notifications
// No transactional email service required.
//
// Setup steps (do this in Stripe Dashboard, one time):
//   1. Developers → Webhooks → Add endpoint
//      URL:    https://<your-domain>/api/webhooks/stripe
//      Events: checkout.session.completed
//   2. Copy the signing secret (starts with whsec_...) into
//      STRIPE_WEBHOOK_SECRET in your environment.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { db } from '../../../lib/supabase';

// Disable Next.js body parsing — we need the raw body to verify
// the Stripe signature with HMAC SHA256.
export const config = {
  api: {
    bodyParser: false,
  },
};

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Read the raw request body as a Buffer, then return as string.
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Verify the Stripe-Signature header using the standard scheme.
// https://stripe.com/docs/webhooks/signatures
function verifyStripeSignature(rawBody, header, secret) {
  if (!header || !secret) return false;

  const parts = header.split(',').reduce((acc, kv) => {
    const [k, v] = kv.split('=');
    if (!acc[k]) acc[k] = [];
    acc[k].push(v);
    return acc;
  }, {});

  const timestamp = parts.t && parts.t[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Constant-time comparison against any of the provided v1 signatures
  return signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    console.error('[stripe-webhook] Failed reading raw body:', e.message);
    return res.status(400).json({ error: 'Could not read body' });
  }

  // Verify signature — without this, anyone could POST fake events.
  const signature = req.headers['stripe-signature'];
  if (!verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET)) {
    console.warn('[stripe-webhook] Signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log(`[stripe-webhook] Received ${event.type} (id=${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;

      // Optional: handle subscription cancellation so we know to
      // stop showing the ad. Wired but currently a no-op stub.
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      default:
        // Other events arrive (invoice.paid, etc.) — acknowledge them
        // so Stripe stops retrying, but we don't act on them.
        break;
    }
  } catch (err) {
    // Log but return 200 so Stripe doesn't retry indefinitely on a
    // bug we need to fix anyway. We can replay events from the
    // Stripe Dashboard if needed.
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, err);
  }

  return res.status(200).json({ received: true });
}

// Flip the ad_bookings row from `pending_payment` → `active`.
// The bookings.id column equals the internal_id we stamped onto the
// Stripe session metadata at checkout creation time.
async function handleCheckoutCompleted(event) {
  const session = event.data?.object;
  if (!session) {
    console.warn('[stripe-webhook] checkout.session.completed had no session object');
    return;
  }

  // Internal id was attached to subscription_data.metadata when the
  // session was created (see pages/api/checkout.js).
  const internalId =
    session.subscription_details?.metadata?.internal_id ||
    session.metadata?.internal_id ||
    null;

  // Fall back to looking up by stripe_session_id if we can't find
  // the internal id (older sessions may not have it).
  const lookupQuery = internalId
    ? `?id=eq.${encodeURIComponent(internalId)}`
    : `?stripe_session_id=eq.${encodeURIComponent(session.id)}`;

  const patch = {
    status: 'active',
    paid_at: new Date().toISOString(),
    stripe_subscription_id: session.subscription || null,
    stripe_customer_id:     session.customer || null,
  };

  try {
    await db.update('ad_bookings', patch, lookupQuery);
    console.log(`[stripe-webhook] Marked ad_bookings ${lookupQuery} → active`);
  } catch (e) {
    // If the columns paid_at/stripe_subscription_id/stripe_customer_id
    // don't exist yet in the table, retry with just the status flip
    // so at minimum we record the payment landed.
    console.warn('[stripe-webhook] Full update failed, retrying with status only:', e.message);
    await db.update('ad_bookings', { status: 'active' }, lookupQuery);
  }
}

async function handleSubscriptionDeleted(event) {
  const sub = event.data?.object;
  if (!sub?.id) return;

  // When a subscription is canceled (manually by the advertiser via
  // Stripe billing portal, or automatically after failed retries),
  // mark the booking inactive so it stops appearing on the site.
  try {
    await db.update(
      'ad_bookings',
      { status: 'canceled', canceled_at: new Date().toISOString() },
      `?stripe_subscription_id=eq.${encodeURIComponent(sub.id)}`
    );
    console.log(`[stripe-webhook] Marked subscription ${sub.id} → canceled`);
  } catch (e) {
    console.warn('[stripe-webhook] Could not mark subscription canceled:', e.message);
  }
}
