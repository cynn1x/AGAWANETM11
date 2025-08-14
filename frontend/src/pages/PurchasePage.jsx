import React, { useState, useEffect } from 'react';
import { 
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, Text, Alert, AlertIcon, Checkbox, VStack 
} from '@chakra-ui/react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

function TicketPurchaseModal({ isOpen, onClose, selectedSeats, totalAmount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [includePerks, setIncludePerks] = useState(true);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;


  // Compute final total based on opt-in
  const filteredSeats = includePerks
    ? selectedSeats
    : selectedSeats.map(({ perk, ...seat }) => seat);
  const adjustedTotal = filteredSeats.reduce((sum, seat) => sum + seat.price, 0);

  useEffect(() => {
    if (isOpen && adjustedTotal > 0) {
      fetch('${apiBaseUrl}/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ amount: adjustedTotal * 100 })
      })
        .then(res => res.json())
        .then(data => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setError('');
          } else {
            setError('Failed to initialize payment.');
          }
        })
        .catch(() => setError('Failed to initialize payment.'));
    }

    if (!isOpen) {
      setClientSecret('');
      setError('');
      setSuccess(false);
      setLoading(false);
      setIncludePerks(true);
    }
  }, [isOpen, adjustedTotal]);

  const handlePayment = async () => {
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement }
    });

    if (result.error) {
      setError(result.error.message || 'Payment failed.');
      setLoading(false);
      return;
    }

    if (result.paymentIntent.status === 'succeeded') {
      try {
        const payload = {
          paymentIntentId: result.paymentIntent.id,
          seats: filteredSeats.map(seat => ({ ticketId: seat.ticketId }))
        };

        const res = await fetch('${apiBaseUrl}/complete-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Purchase failed.');
        }

        setSuccess(true);
      } catch (err) {
        console.error("Purchase error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Complete Purchase</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {success ? (
            <Text fontSize="lg" fontWeight="bold" color="green.500">
              🎉 Payment successful! Your tickets are confirmed.
            </Text>
          ) : (
            <VStack align="stretch" spacing={4}>
              <Text>
                You are purchasing <strong>{filteredSeats.length}</strong> ticket(s)
                for <strong>${adjustedTotal.toFixed(2)}</strong>.
              </Text>

              {selectedSeats.some(seat => seat.perk) && (
                <Checkbox
                  isChecked={includePerks}
                  onChange={(e) => setIncludePerks(e.target.checked)}
                >
                  Include afterparty perks (free add-on)
                </Checkbox>
              )}

              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <CardElement options={{ hidePostalCode: true }} />
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          {success ? (
            <Button onClick={onClose} colorScheme="green">Close</Button>
          ) : (
            <Button onClick={handlePayment} colorScheme="blue" isLoading={loading}>
              Pay Now
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TicketPurchaseModal;
