import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { Redis } from '@upstash/redis';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

// Initialize Redis
const redis = new Redis({
  url: 'https://fair-cardinal-41631.upstash.io',
  token: 'AaKfAAIjcDFmMjA3YzY1MDk3YTY0N2E5YmRkYTYzOGIxNzY4YWY1OXAxMA',
});

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user session from Auth0
    const session = await getSession(req, res);
    const user = session?.user;

    if (!user || !user.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Extract the selected package
    const { package: selectedPackage } = req.body;

    // Define the pricing tiers (for security)
    const tiers = {
      small: { credits: 50, price: 500 },
      medium: { credits: 120, price: 1000 },
      large: { credits: 250, price: 2000 },
    };

    const selectedTier = tiers[selectedPackage];
    if (!selectedTier) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    // Create a Stripe Checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage,
            },
            unit_amount: selectedTier.price, // Stripe expects price in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
    });

    // Return the session ID to the frontend to redirect the user to Stripe
    res.status(200).json({ id: stripeSession.id });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
