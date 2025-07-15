import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, Input, Button, FormControl, FormLabel,
  Spinner, Alert, AlertIcon, List, ListItem, ListIcon, useToast
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventName, setEventName] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [ticketNum, setTicketNum] = useState(1);
  const toast = useToast();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('http://localhost:5000/getUserProfile', {
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
    if (!eventName || !transferTo || ticketNum <= 0) {
      toast({
        title: 'All fields are required.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/transferTickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          event: eventName,
          transfer_username: transferTo,
          ticket_num: ticketNum
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Tickets transferred!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setEventName('');
        setTransferTo('');
        setTicketNum(1);
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
      <Heading mb={4}>My Tickets</Heading>
      {tickets.length === 0 ? (
        <Text>No tickets purchased yet.</Text>
      ) : (
        <List spacing={3} mb={6}>
          {tickets.map((ticket, idx) => (
            <ListItem key={idx}>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Event: {ticket.event_name} | Row {ticket.rowName} Seat {ticket.seatNumber}
            </ListItem>
          ))}
        </List>
      )}

      <Heading size="md" mb={4}>Transfer Tickets</Heading>
      <FormControl mb={3}>
        <FormLabel>Event Name</FormLabel>
        <Input
          placeholder="Event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </FormControl>
      <FormControl mb={3}>
        <FormLabel>Transfer To (username)</FormLabel>
        <Input
          placeholder="Recipient's username"
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
        />
      </FormControl>
      <FormControl mb={4}>
        <FormLabel>How Many Tickets</FormLabel>
        <Input
          type="number"
          min={1}
          value={ticketNum}
          onChange={(e) => setTicketNum(Number(e.target.value))}
        />
      </FormControl>
      <Button colorScheme="blue" onClick={handleTransfer}>Transfer</Button>
    </Box>
  );
}

export default TicketsPage;
