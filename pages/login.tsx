import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { SEO } from '@layout';

const LoginPage = () => {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/'); // Redirect to home page if user is already logged in
    }
  }, [user, router]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <>
      <SEO title="Secure Login" />
      <Container maxWidth="sm">
        <Box
          sx={{
            mt: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: 400,
              borderRadius: 2,
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            }}
          >
            <LockIcon fontSize="large" color="primary" />
            <Typography
              component="h1"
              variant="h5"
              gutterBottom
              sx={{ mt: 2, fontWeight: 'bold' }}
            >
              Secure Login to PlayMoreTCG
            </Typography>
            <Typography
              variant="body1"
              gutterBottom
              sx={{ textAlign: 'center' }}
            >
              Please log in with your credentials to access the AI Image
              Generator and other premium features.
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              gutterBottom
              sx={{ textAlign: 'center', mt: 1 }}
            >
              Your information is protected with industry-standard security
              practices.
            </Typography>
            <Box sx={{ mt: 3, width: '100%' }}>
              <Button
                href="/api/auth/login" // Direct the user to the Auth0 login route
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
              >
                <LockIcon sx={{ mr: 1 }} /> Log in with Auth0
              </Button>
            </Box>
          </Paper>
          <Typography
            variant="caption"
            sx={{ mt: 2, color: 'gray', textAlign: 'center' }}
          >
            By logging in, you agree to our{' '}
            <a href="/terms" style={{ textDecoration: 'underline' }}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" style={{ textDecoration: 'underline' }}>
              Privacy Policy
            </a>
            .
          </Typography>
        </Box>
      </Container>
    </>
  );
};

export default LoginPage;
