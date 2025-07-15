import React, { useState, useEffect } from 'react';
import { 
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, Text, Alert, AlertIcon, useDisclosure 
} from '@chakra-ui/react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Modal component for handling ticket payment
function TicketPurchaseModal({ isOpen, onClose, selectedSeats, totalAmount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
        if (isOpen && totalAmount > 0) {
          // When modal opens, create a PaymentIntent by calling our backend
          fetch('http://localhost:5000/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ amount: totalAmount * 100 })
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
    // Optionally, reset state when closing the modal
    if (!isOpen) {
      setClientSecret('');
      setError('');
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen, totalAmount]);

  const handlePayment = async () => {
  if (!stripe || !elements || !clientSecret) return;
  setLoading(true);
  setError('');

  const cardElement = elements.getElement(CardElement);
  const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement }
  });

  if (result.error) {
    setError(result.error.message || 'Payment failed. Please try again.');
    setLoading(false);
    return;
  }
if (result.paymentIntent.status === 'succeeded') {
  try {
    console.log("[DEBUG] selectedSeats before sending:", selectedSeats);

    const payload = {
      paymentIntentId: result.paymentIntent.id,
      seats: selectedSeats.map(seat => ({ ticketId: seat.ticketId }))
    };

    console.log('[DEBUG] payload:', JSON.stringify(payload));

    const res = await fetch('http://localhost:5000/complete-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(payload)
    });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error completing purchase.');
      }

      // If backend returns success:
      setSuccess(true);

    } catch (err) {
      console.error("[ERROR] Purchase failed:", err);
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
            <Text fontSize="lg" fontWeight="bold" color="green.600">
              Payment successful! Your tickets have been booked.
            </Text>
          ) : (
            <>
              <Text mb={4}>You are about to purchase <b>{selectedSeats.length}</b> tickets for a total of <b>${totalAmount.toFixed(2)}</b>.</Text>
              {error && (
                <Alert status="error" mb={4}>
                  <AlertIcon />
                  {error}
                </Alert>
              )}
              <CardElement 
                options={{ hidePostalCode: true }} 
              />
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {!success ? (
            <Button colorScheme="blue" isLoading={loading} onClick={handlePayment}>
              Pay Now
            </Button>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TicketPurchaseModal;
