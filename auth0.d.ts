// auth0.d.ts
import { UserProfile } from '@auth0/nextjs-auth0';

declare module 'next' {
  interface NextApiRequest {
    user?: UserProfile;
  }
}
