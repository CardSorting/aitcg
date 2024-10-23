import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { Redis } from '@upstash/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-09-30.acacia',
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const config = {
  api: {
    bodyParser: false, // Stripe requires the raw body to validate signatures
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;

    // Fetch the stored checkout session data from Redis
    const sessionData = await redis.get(`checkout_session_${sessionId}`);
    if (!sessionData) {
      return res.status(400).json({ error: 'Checkout session data not found' });
    }

    const { userId, credits } = JSON.parse(sessionData);

    // Fetch the current user credits from Redis
    const currentCredits = (await redis.get<number>(userId)) || 0;

    // Update the user's credits in Redis
    await redis.set(userId, currentCredits + credits);

    console.log(`User ${userId} has been credited with ${credits} credits.`);
  }

  res.status(200).json({ received: true });
}
