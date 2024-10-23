import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getSession } from '@auth0/nextjs-auth0';
import { Redis } from '@upstash/redis';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-09-30.acacia',
});

// Initialize Redis instance
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Define package types
interface Package {
  price: number;
  credits: number;
}

// Define available packages with their price and credits
const packages: Record<'small' | 'medium' | 'large', Package> = {
  small: { price: 500, credits: 50 },
  medium: { price: 1000, credits: 120 },
  large: { price: 2000, credits: 250 },
};

// API route handler for the checkout session
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the user's session using Auth0
  const session = await getSession(req, res);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Extract the package ID from the request body and validate it
  const { package: packageId } = req.body as { package: 'small' | 'medium' | 'large' };
  const selectedPackage = packages[packageId];

  if (!selectedPackage) {
    return res.status(400).json({ error: 'Invalid package selected' });
  }

  try {
    // Extract the user's ID from the session
    const userId = session.user.sub;

    // Create a new Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${selectedPackage.credits} Credits Package`,
            },
            unit_amount: selectedPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      metadata: {
        userId,
        credits: selectedPackage.credits, // Store credits in metadata for later use
      },
    });

    // Store the checkout session details in Redis
    await redis.set(
      `checkout_session_${checkoutSession.id}`,
      JSON.stringify({
        userId,
        credits: selectedPackage.credits,
      }),
    );

    // Respond with the checkout session ID to the frontend
    return res.status(200).json({ id: checkoutSession.id });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}