import React, { useEffect, useState } from 'react';
import {
  Box,
  Image,
  Text,
  VStack,
  Heading,
  LinkBox,
  Button
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';

function EventCard({ id, name, date, time, location, imageUrl, perkDescription }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const dateTimeString = `${date}T${time}`;
      const eventDate = new Date(dateTimeString).getTime();
      const now = new Date().getTime();
      const distance = eventDate - now;
      if (distance < 0) {
        setTimeLeft('Event has started');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [date, time]);

  return (
    <LinkBox as="article" w="full" borderWidth="1px" rounded="md" overflow="hidden" boxShadow="md">
      <VStack align="stretch">
        {imageUrl && (
          <Image
            borderRadius="md"
            src={imageUrl}
            alt={`Image for ${name}`}
            objectFit="cover"
            w="100%"   // 👈 responsive width
            h="200px"
          />
        )}

        <VStack align="stretch" p="5">
          <Heading size="md" my="2">{name}</Heading>
          <Text textAlign="left" fontSize="sm">Date: {date}</Text>
          <Text fontSize="sm">Location: {location}</Text>
          <Text fontSize="sm">Time of event: {time}</Text>
          <Text fontSize="sm" color="red.500">{timeLeft}</Text>

          {/* 🎁 Show the perk if present */}
          {perkDescription && (
            <Box
              mt="2"
              bg="green.600"
              color="white"
              px="3"
              py="2"
              borderRadius="md"
              fontSize="sm"
              fontWeight="bold"
              textAlign="center"
            >
              🎁 Perk: {perkDescription}
            </Box>
          )}

          <Button
            colorScheme="blue"
            mt="4"
            as={Link}
            to={`/events/${id}`}
            aria-label={`Buy tickets for ${name}`}
          >
            Buy Tickets!
          </Button>
        </VStack>
      </VStack>
    </LinkBox>
  );
}

export default EventCard;
