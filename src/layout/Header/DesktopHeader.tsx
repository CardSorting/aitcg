import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
  useTheme,
  useMediaQuery,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Link,
  Typography,
} from '@mui/material';
import { Forward as ForwardIcon, Menu as MenuIcon } from '@mui/icons-material';
import { useUser } from '@auth0/nextjs-auth0/client';
import axios from 'axios';
import Routes from '@routes';
import { NavItems } from './styles';

const DesktopHeader: FC = () => {
  const { pathname } = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useUser(); // Get logged-in user from Auth0
  const [credits, setCredits] = useState<number | null>(null); // Store credits
  const [loadingCredits, setLoadingCredits] = useState<boolean>(true); // Track loading state
  const [error, setError] = useState<boolean>(false); // Track if there's an error

  // Fetch the user's credits when logged in
  useEffect(() => {
    const fetchCredits = async () => {
      if (user) {
        try {
          const response = await axios.get('/api/user/credits', {
            withCredentials: true, // Ensure cookies are sent
          });
          setCredits(response.data.credits);
        } catch (error: any) {
          if (error.response && error.response.status === 401) {
            setError(true); // Set error state if the user is not authorized
          }
          console.error('Error fetching credits:', error);
        } finally {
          setLoadingCredits(false); // Ensure loading stops
        }
      } else {
        setLoadingCredits(false);
      }
    };
    fetchCredits();
  }, [user]);

  // Return null for certain routes
  if (pathname === Routes.Creator || pathname === Routes.ImageUploadAndOrder)
    return null;

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const buttonStyle = {
    mx: { xs: 0, sm: 1 },
    my: { xs: 1, sm: 0 },
    px: 2,
    py: 1,
    borderRadius: '20px',
    transition: 'all 0.3s ease-in-out',
    fontSize: '0.875rem',
    textTransform: 'none' as const,
    fontWeight: 500,
    width: { xs: '100%', sm: 'auto' },
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  };

  const renderCredits = () => {
    if (loadingCredits)
      return <Typography sx={{ mx: 2 }}>Loading credits...</Typography>;
    if (error)
      return <Typography sx={{ mx: 2 }}>Failed to load credits</Typography>;
    if (credits !== null)
      return <Typography sx={{ mx: 2 }}>Credits: {credits}</Typography>;
    return null; // No credits to display
  };

  const navContent = (
    <>
      <NextLink href={Routes.Creator} passHref>
        <Button
          component={Link}
          variant="contained"
          color="secondary"
          endIcon={<ForwardIcon />}
          sx={{
            ...buttonStyle,
            background: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
          }}
        >
          Get Started Now
        </Button>
      </NextLink>

      {!user ? (
        <NextLink href="/api/auth/login" passHref>
          <Button
            component={Link}
            variant="contained"
            color="primary"
            sx={buttonStyle}
          >
            Log in
          </Button>
        </NextLink>
      ) : (
        <>
          <Typography sx={{ mx: 2, fontWeight: 'bold', color: 'text.primary' }}>
            Welcome, {user.name || user.email}!
          </Typography>
          {renderCredits()}
        </>
      )}

      <NextLink href="/checkout" passHref>
        <Button
          component={Link}
          variant="contained"
          color="primary"
          sx={buttonStyle}
        >
          Checkout
        </Button>
      </NextLink>
    </>
  );

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      sx={{ padding: { xs: '10px 0', sm: '20px 0' } }}
    >
      {isMobile ? (
        <>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenu}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem
              onClick={handleClose}
              sx={{ flexDirection: 'column', alignItems: 'flex-start' }}
            >
              {navContent}
            </MenuItem>
          </Menu>
        </>
      ) : (
        <NavItems sx={{ display: 'flex', gap: 2 }}>{navContent}</NavItems>
      )}
    </Box>
  );
};

export default DesktopHeader;
