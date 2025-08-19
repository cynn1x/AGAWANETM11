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

  // Build list based on perks toggle
  const filteredSeats = includePerks
    ? selectedSeats
    : selectedSeats.map(({ perk, ...seat }) => seat);

  // Sum using either price or amount (fallback to 0)
  const adjustedTotal = filteredSeats.reduce(
    (sum, seat) => sum + Number(seat.price ?? seat.amount ?? 0),
    0
  );

  useEffect(() => {
    if (!isOpen) {
      // reset state when modal closes
      setClientSecret('');
      setError('');
      setSuccess(false);
      setLoading(false);
      setIncludePerks(true);
      return;
    }

    // Only create an intent when we have a valid amount
    const cents = Math.round(adjustedTotal * 100);
    if (!Number.isFinite(adjustedTotal) || cents < 50) {
      setClientSecret('');
      if (filteredSeats.length > 0) {
        setError('Invalid amount. Total must be at least $0.50.');
      }
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setError('');
        const res = await fetch(`${apiBaseUrl}/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({ amount: cents }),
          signal: ac.signal,
        });

        // handle non-2xx (show server error if provided)
        if (!res.ok) {
          const msg = await res.json().catch(() => ({}));
          throw new Error(msg.error || `Failed to initialize payment (${res.status})`);
        }

        const data = await res.json();
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('Payment initialization did not return a client secret.');
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setClientSecret('');
          setError(e.message || 'Failed to initialize payment.');
        }
      }
    })();

    return () => ac.abort();
  }, [isOpen, adjustedTotal, apiBaseUrl, filteredSeats.length]);

  const handlePayment = async () => {
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Payment form is not ready. Please try again.');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Payment failed.');
      }

      if (result.paymentIntent?.status === 'succeeded') {
        // Tell backend to finalize ticket ownership
        const payload = {
          paymentIntentId: result.paymentIntent.id,
          seats: filteredSeats.map((s) => ({ ticketId: s.ticketId })),
        };

        const res = await fetch(`${apiBaseUrl}/complete-purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Purchase finalization failed.');
        }

        setSuccess(true);
      } else {
        throw new Error('Payment was not completed.');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  const centsPreview = Math.max(0, Math.round(adjustedTotal * 100));
  const payDisabled = !isOpen || !stripe || !elements || !clientSecret || loading;

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
                You are purchasing <strong>{filteredSeats.length}</strong> ticket(s) for{' '}
                <strong>${(centsPreview / 100).toFixed(2)}</strong>.
              </Text>

              {selectedSeats.some((seat) => seat.perk) && (
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

              {/* Only mount the CardElement once we have a clientSecret */}
              {clientSecret && <CardElement options={{ hidePostalCode: true }} />}
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {success ? (
            <Button onClick={onClose} colorScheme="green">
              Close
            </Button>
          ) : (
            <Button onClick={handlePayment} colorScheme="blue" isLoading={loading} isDisabled={payDisabled}>
              Pay Now
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TicketPurchaseModal;
