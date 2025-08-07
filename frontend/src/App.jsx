import React from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import EventsPage from './pages/EventsPage';
import EventDetail from './pages/EventDetail'; 
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/signUpPage'; 
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PurchasePage from './pages/PurchasePage';
import ProfilePage from './pages/ProfilePage';
import CreateEventWithTickets from './pages/CreateEventWithTickets';
import Signup from './pages/Signup';
import TicketsPage from './pages/TicketsPage';

const stripePromise = loadStripe('pk_test_51RiFwE018awpSg5sfVM7S0gqjY4P0d3ruHSZBtPDS13zC4SnNAibpj4ht2q603Iq4lbGq5wFGiZ6sWa5kUm6lodU00nn4rJ5Ka'); 
const theme = extendTheme({});

function App() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/signup' || location.pathname === '/login';

  return (
    <Elements stripe={stripePromise}>
      <ChakraProvider theme={theme}>
        {!hideNavbar && <Navbar />}

        <Routes>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events/:eventId" element={<EventDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/user" element={<SignUpPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/payment" element={<PurchasePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/create-event-full" element={<CreateEventWithTickets />} />
          <Route path="/my-tickets" element={<TicketsPage />} />
        </Routes>
      </ChakraProvider>
    </Elements>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}
