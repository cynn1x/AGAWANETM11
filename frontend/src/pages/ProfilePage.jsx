// src/pages/ProfilePage.jsx

import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, Input, Button, FormControl, FormLabel,
  Spinner, Alert, AlertIcon, useToast
} from '@chakra-ui/react';

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const toast = useToast();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;


  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/getUserProfile`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch profile data');

        const data = await response.json();
        setProfile(data.profile);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast({
        title: 'Both fields are required.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/changePWD`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Password changed successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setOldPassword('');
        setNewPassword('');
      } else {
        toast({
          title: 'Error',
          description: data.error,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Request failed.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  if (loading) return <Spinner />;
  if (error) return (
    <Alert status="error">
      <AlertIcon />
      {error}
    </Alert>
  );

  return (
    <Box maxW="600px" mx="auto" mt={10} p={5} boxShadow="md" borderRadius="md">
      <Heading mb={4}>My Profile</Heading>
      <Text><b>Username:</b> {profile?.username}</Text>
      <Text mb={6}><b>Email:</b> {profile?.email}</Text>

      <Heading size="md" mb={4}>Change Password</Heading>
      <FormControl mb={3}>
        <FormLabel>Old Password</FormLabel>
        <Input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </FormControl>
      <FormControl mb={4}>
        <FormLabel>New Password</FormLabel>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </FormControl>
      <Button colorScheme="blue" onClick={handleChangePassword}>
        Update Password
      </Button>
    </Box>
  );
}

export default ProfilePage;
