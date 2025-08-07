import React, { useEffect, useState } from 'react';
import { SimpleGrid, Container } from '@chakra-ui/react';
import EventCard from '../components/EventCard';
import ThemeToggle from '../components/ThemeToggle';


function EventsPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/events')
      .then(response => response.json()) 
      .then(data => {
        const now = new Date().getTime();

        const upcomingEvents = data.filter(event => {
          if (!event.date || !event.time) return false;

          const dateTimeString = `${event.date}T${event.time}`;
          const eventDateTime = new Date(dateTimeString).getTime();

          return eventDateTime > now; 
        });

        setEvents(upcomingEvents); 
      })
      .catch(error => console.error('Error fetching events:', error));
  }, []);

  return (
    <Container maxW="container.xl" centerContent>
      <ThemeToggle />
      <SimpleGrid columns={{ sm: 1, md: 2, lg: 3 }} spacing={10} py={5}>
        {events.map(event => (
          <EventCard
            key={event.event_id}
            id={event.event_id}
            name={event.name}
            date={event.date}
            time={event.time}
            location={event.location}
            imageUrl={event.img_url}
            perkDescription={event.perk_description}  
          />
        ))}
      </SimpleGrid>
    </Container>
  );
}

export default EventsPage;
