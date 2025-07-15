import React, { useState } from 'react';
import {
  Box, Heading, Input, Textarea, Button, VStack, HStack, Divider
} from '@chakra-ui/react';

export default function CreateFullEventPage() {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventImage, setEventImage] = useState('');

  const [zonesConfig, setZonesConfig] = useState([]);
  const [pricingConfig, setPricingConfig] = useState([]);

  const [newZone, setNewZone] = useState({ zone_name: '', rows: '', seats_per_row: 1 });
  const [newPricing, setNewPricing] = useState({ zone_name: '', start_row: '', end_row: '', price: '' });

  const handleAddZone = () => {
    setZonesConfig([...zonesConfig, {
      zone_name: newZone.zone_name,
      rows: newZone.rows.split(',').map(r => r.trim().toUpperCase()),
      seats_per_row: Number(newZone.seats_per_row)
    }]);
    setNewZone({ zone_name: '', rows: '', seats_per_row: 1 });
  };

  const handleAddPricing = () => {
    setPricingConfig([...pricingConfig, {
      zone_name: newPricing.zone_name,
      start_row: newPricing.start_row.toUpperCase(),
      end_row: newPricing.end_row.toUpperCase(),
      price: parseFloat(newPricing.price)
    }]);
    setNewPricing({ zone_name: '', start_row: '', end_row: '', price: '' });
  };

  const handleSubmit = async () => {
    const payload = {
      event_name: eventName,
      date: eventDate,
      time: eventTime,
      location: eventLocation,
      description: eventDesc,
      image_url: eventImage,
      zones_config: zonesConfig,
      pricing_config: pricingConfig
    };

    try {
      const res = await fetch('http://localhost:5000/create_full_event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Success: ${data.message}`);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Request failed.');
    }
  };

  return (
    <Box p={8} maxW="800px" mx="auto">
      <Heading mb={4}>Create Full Event</Heading>
      <VStack spacing={4} align="stretch">
        <Input placeholder="Event Name" value={eventName} onChange={e => setEventName(e.target.value)} />
        <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
        <Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} />
        <Input placeholder="Location" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
        <Textarea placeholder="Description" value={eventDesc} onChange={e => setEventDesc(e.target.value)} />
        <Input placeholder="Image URL" value={eventImage} onChange={e => setEventImage(e.target.value)} />

        <Divider />

        <Heading size="md">Add Zone</Heading>
        <HStack>
          <Input placeholder="Zone Name" value={newZone.zone_name} onChange={e => setNewZone({ ...newZone, zone_name: e.target.value })} />
          <Input placeholder="Rows (A,B,C)" value={newZone.rows} onChange={e => setNewZone({ ...newZone, rows: e.target.value })} />
          <Input type="number" placeholder="Seats Per Row" value={newZone.seats_per_row} onChange={e => setNewZone({ ...newZone, seats_per_row: e.target.value })} />
          <Button onClick={handleAddZone}>Add Zone</Button>
        </HStack>

        <Heading size="sm">Zones Config:</Heading>
        <pre>{JSON.stringify(zonesConfig, null, 2)}</pre>

        <Divider />

        <Heading size="md">Add Pricing</Heading>
        <HStack>
          <Input placeholder="Zone Name" value={newPricing.zone_name} onChange={e => setNewPricing({ ...newPricing, zone_name: e.target.value })} />
          <Input placeholder="Start Row" value={newPricing.start_row} onChange={e => setNewPricing({ ...newPricing, start_row: e.target.value })} />
          <Input placeholder="End Row" value={newPricing.end_row} onChange={e => setNewPricing({ ...newPricing, end_row: e.target.value })} />
          <Input type="number" placeholder="Price" value={newPricing.price} onChange={e => setNewPricing({ ...newPricing, price: e.target.value })} />
          <Button onClick={handleAddPricing}>Add Pricing</Button>
        </HStack>

        <Heading size="sm">Pricing Config:</Heading>
        <pre>{JSON.stringify(pricingConfig, null, 2)}</pre>

        <Button colorScheme="blue" onClick={handleSubmit}>Submit Full Event</Button>
      </VStack>
    </Box>
  );
}
