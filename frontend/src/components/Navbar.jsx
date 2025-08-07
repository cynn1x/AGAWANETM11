import React from 'react';
import { Box, Flex, Text, Button, Spacer, Icon } from '@chakra-ui/react';
import { CgProfile } from 'react-icons/cg';
import { Link } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';
import ThemeToggle from '../components/ThemeToggle';


function Navbar() {
  let isAdmin = false;



  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = jwtDecode(token);
      console.log('[DEBUG] Decoded JWT:', decoded);
      isAdmin = decoded.is_admin === true;
    }
  } catch (err) {
    console.error('[DEBUG] JWT decode failed:', err);
  }

  return (
    <Flex bg="blue.500" color="white" p="4" alignItems="center">
      <Box p="2">
        <Link to="/events">
          <Text fontSize="xl" fontWeight="bold">Tessera Events</Text>
        </Link>
      </Box>

      <Spacer />

      {/* Admin-only button */}
      {isAdmin && (
        <Box mr={4}>
          <Link to="/create-event-full">
            <Button colorScheme="yellow" variant="outline" color="white">
              Admin: Create Event
            </Button>
          </Link>
        </Box>
      )}
          <Spacer />
      <Box mr={4}>
        <Link to="/my-tickets">
          <Button colorScheme="blue" variant="outline" color="white">
            My Tickets
          </Button>
        </Link>
      </Box>

      <Box>
        <Link to="/profile">
          <Button colorScheme="blue" variant="outline" color="white">
            <Icon as={CgProfile} boxSize={5} mr={2} color="white" />
            Profile
          </Button>
        </Link>
      </Box>
      <ThemeToggle />
    </Flex>
  );
}

export default Navbar;
