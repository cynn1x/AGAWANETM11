import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, Input, Button, FormControl, FormLabel,
  Spinner, Alert, AlertIcon, useToast, Select
} from '@chakra-ui/react';

function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const toast = useToast();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;


  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('${apiBaseUrl}/getUserProfile', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch tickets');

        const data = await response.json();
        setTickets(data.tickets);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const handleTransfer = async () => {
    if (!selectedTicketId || !transferTo) {
      toast({
        title: 'All fields are required.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('${apiBaseUrl}/transferTickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ticket_id: selectedTicketId,
          transfer_username: transferTo
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Ticket transferred!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setSelectedTicketId('');
        setTransferTo('');
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
    <Box maxW="700px" mx="auto" mt={10} p={5} boxShadow="md" borderRadius="md">
      <Heading mb={6}>Transfer a Ticket</Heading>

      {tickets.length === 0 ? (
        <Text>No tickets purchased yet.</Text>
      ) : (
        <>
          <FormControl mb={3}>
            <FormLabel>Select Ticket</FormLabel>
            <Select
              placeholder="Select a ticket"
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
            >
              {tickets.map((ticket) => (
                <option key={ticket.ticketId} value={ticket.ticketId}>
                  {ticket.event_name} — Row {ticket.rowName}, Seat {ticket.seatNumber}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Transfer To (username)</FormLabel>
            <Input
              placeholder="Recipient's username"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            />
          </FormControl>

          <Button colorScheme="blue" onClick={handleTransfer}>Transfer Ticket</Button>
        </>
      )}
    </Box>
  );
}

export default TicketsPage;
