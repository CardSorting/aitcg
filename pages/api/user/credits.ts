// pages/api/user/credits.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0'; // Added getSession for deeper logging
import { Redis } from '@upstash/redis';

// Initialize Redis client with your Upstash credentials
const redis = new Redis({
  url: 'https://fair-cardinal-41631.upstash.io',
  token: 'AaKfAAIjcDFmMjA3YzY1MDk3YTY0N2E5YmRkYTYzOGIxNzY4YWY1OXAxMA',
});

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);

    if (req.method !== 'GET') {
      console.error('Invalid request method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log the full session object for debugging
    const session = await getSession(req, res);
    console.log('Session object:', session);

    // Access the user directly from req.user
    const user = req.user;
    console.log('User object from session:', user);

    if (!user || !user.sub) {
      console.error('User not authenticated or session missing sub');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Extract user information
    const userId = user.sub;
    console.log('User ID:', userId);

    // Retrieve credits from Redis
    const credits = await redis.get(userId);
    console.log(`Credits fetched for user ${userId}:`, credits);

    // If no credits exist, initialize with default value (e.g., 25 credits)
    if (!credits) {
      console.log(`No credits found for user ${userId}. Initializing with 25 credits.`);
      await redis.set(userId, 25); // Starting credits
      return res.status(200).json({ credits: 25 });
    }

    // Send the credits back to the client
    console.log(`Returning ${credits} credits for user ${userId}.`);
    return res.status(200).json({ credits });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});