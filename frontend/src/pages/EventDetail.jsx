import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TesseraSeatPicker from 'tessera-seat-picker';
import io from 'socket.io-client';
import { useDisclosure, Button, Flex } from '@chakra-ui/react';
import TicketPurchaseModal from '../pages/PurchasePage'; 



function EventDetailPage() {
  const { eventId } = useParams(); 
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [maxSeats, setMaxSeats] = useState(5);
  const [selectedSeats, setSelectedSeats] = useState([]);  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [availableSeats, setAvailableSeats] = useState([]);
  const [filterOption, setFilterOption] = useState('none');
  const [priceRange, setPriceRange] = useState([0, 500]); // [min, max]
  const [filterTab, setFilterTab] = useState('lowest');   // 'lowest' or 'best'



  useEffect(() => {
  const socket = io('http://localhost:5000');


  socket.on('seat_reserved', (data) => {
    console.log('Received seat_reserved event:', data);

    if (data.event_id !== eventId) return;

    const updatedSeats = data.seats;

    setRows(prevRows =>
      prevRows.map(row =>
        row.map(seat => {
          const matched = updatedSeats.find(
            s => `${s.rowName}-${s.seatNumber}` === seat.id
          );
          if (matched) {
            const iReservedIt = selected.includes(seat.id);
            return { ...seat, isReserved: !iReservedIt };
          }
          return seat;
        })
      )
    );
  });

  return () => socket.disconnect();
}, [eventId, selected]); // <-- add `selected` so you have latest state

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const result = await fetch(`http://localhost:5000/getAvailTicks?event_id=${eventId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          credentials: 'include'
        });
        
        const data = await result.json();
        const { available_seats, taken_seats } = data;
        const reservedCount = data.user_reserved_count || 0;
        setMaxSeats(5 - reservedCount >= 0 ? 5 - reservedCount : 0);

        const allSeats = [
          ...available_seats.map(seat => ({ ...seat, isReserved: false })),
          ...taken_seats.map(seat => ({ ...seat, isReserved: seat.status !== 'AVAILABLE' }))
        ];
        setAvailableSeats(allSeats.filter(seat => !seat.isReserved));

        const rowMap = {};
        allSeats.forEach(seat => {
          const row = seat.rowName || seat.row_name;
          if (!rowMap[row]) rowMap[row] = [];
          rowMap[row].push({
            id: `${row}-${seat.seatNumber}`,
            number: seat.seatNumber,
            isReserved: seat.isReserved,
            price: seat.amount,
            tooltip: seat.amount ? `$${seat.amount}` : 'N/A',
            ticketId: seat.ticketId
          });
        });

        const rowsArray = Object.keys(rowMap)
          .sort()
          .map(rowName => rowMap[rowName].sort((a, b) => a.number - b.number));

        setRows(rowsArray);
        setLoadingRows(false);

      } catch (error) {
        console.error('Error fetching seats:', error);
        setLoadingRows(false);
      }
    };
    fetchSeats();
  }, [eventId]);

  const addSeatCallback = async ({ row, number, id }, addCb) => {
  setLoading(true);
  try {
    const seat = rows.flat().find(seat => seat.id === id);
    if (!seat) throw new Error('Seat not found');

  await fetch('http://localhost:5000/reserveTickets', {
  method: 'POST', // ✅ must match your @app.route(..., methods=['POST'])
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('access_token')}`
  },
  body: JSON.stringify({
    event_id: eventId,
    seats: [{ rowName: row, seatNumber: number }]
  })
});

    setSelected(prev => [...prev, id]);        
    setSelectedSeats(prev => [...prev, seat]);  

    setTotalPrice(prev => prev + seat.price);
    addCb(row, number, id, 'Added to cart');
  } catch (error) {
    console.error('Error reserving seat:', error);
  } finally {
    setLoading(false);
  }
};

const removeSeatCallback = async ({ row, number, id }, removeCb) => {
  setLoading(true);
  try {
    const seat = rows.flat().find(seat => seat.id === id);
    if (!seat) throw new Error('Seat not found');

    await fetch('http://localhost:5000/unreserveTickets'); // your unreserve API

    setSelected(list => list.filter(item => item !== id));
    setSelectedSeats(list => list.filter(s => s.id !== id)); // ✅ remove seat object

    setTotalPrice(prev => prev - seat.price);
    removeCb(row, number);
  } catch (error) {
    console.error('Error unreserving seat:', error);
  } finally {
    setLoading(false);
  }
};
  const handleCheckout = () => {
    const selectedTicks = rows.flat().filter(seat => selected.includes(seat.id));
    const ticketIds = selectedTicks.map(seat => seat.ticketId);

    alert(`Checked out! Total: $${totalPrice}`);

    fetch('http://localhost:5000/purchaseTick', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        event_id: eventId,
        ticket_ids: ticketIds
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Purchase failed');
        return res.json();
      })
      .then(data => {
        alert(data.message);
      })
      .catch(err => {
        console.error(err);
        alert('Failed to checkout');
      });
  };

  const displayRows = rows.map(row =>
  row.map(seat => {
    if (selected.includes(seat.id)) {
      // If I selected it, I want it to show as NOT reserved
      return { ...seat, isReserved: false };
    }
    return seat;
  })
);

const filteredSeats = availableSeats
  .filter(seat => seat.amount >= priceRange[0] && seat.amount <= priceRange[1])
  .sort((a, b) => {
    if (filterTab === 'lowest') return a.amount - b.amount;
    if (filterTab === 'best') {
      // Example best: closest to front (row A better than Z)
      return a.rowName.localeCompare(b.rowName);
    }
    return 0;
  });

  


return (
  loadingRows ? (
    <div>Loading seat map...</div>
  ) : (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      {/* ---- Sidebar ---- */}
      <div style={{ width: '300px', flexShrink: 0 }}>
        {/* Filters Box */}
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Filters</h4>

          {/* Price Range */}
          <label>Price Range:</label>
          <div style={{ margin: '0.5rem 0' }}>
            <input
              type="range"
              min="0"
              max="500"
              value={priceRange[0]}
              onChange={e => setPriceRange([+e.target.value, priceRange[1]])}
            />
            <input
              type="range"
              min="0"
              max="500"
              value={priceRange[1]}
              onChange={e => setPriceRange([priceRange[0], +e.target.value])}
            />
            <div>${priceRange[0]} — ${priceRange[1]}+</div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginTop: '1rem' }}>
            <div
              onClick={() => setFilterTab('lowest')}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.5rem',
                cursor: 'pointer',
                borderBottom: filterTab === 'lowest' ? '2px solid blue' : 'none',
                fontWeight: filterTab === 'lowest' ? 'bold' : 'normal'
              }}
            >
              LOWEST PRICE
            </div>
            <div
              onClick={() => setFilterTab('best')}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.5rem',
                cursor: 'pointer',
                borderBottom: filterTab === 'best' ? '2px solid blue' : 'none',
                fontWeight: filterTab === 'best' ? 'bold' : 'normal'
              }}
            >
              BEST SEATS
            </div>
          </div>
        </div>

        {/* Available Seats List */}
<div style={{ maxHeight: '600px', overflowY: 'auto', marginTop: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}>
  <h4>Available Seats ({filteredSeats.length}):</h4>
{filteredSeats.map(seat => {
  const isSelected = selectedSeats.some(s => s.ticketId === seat.ticketId);
  return (
    <div
      key={seat.ticketId}
      onClick={() => {
        const isAlreadySelected = selectedSeats.some(s => s.ticketId === seat.ticketId);
        if (isAlreadySelected) return; // ✅ do not add again!

        const found = rows.flat().find(s => s.ticketId === seat.ticketId);
        if (found) {
          const payload = {
            row: found.id.split('-')[0],
            number: found.number,
            id: found.id
          };
          addSeatCallback(payload, () => {});
        }
      }}
      style={{
        marginBottom: '0.5rem',
        borderBottom: '1px solid #eee',
        paddingBottom: '0.5rem',
        cursor: isSelected ? 'default' : 'pointer', // pointer only if not selected
        background: isSelected ? '#d4edda' : '#f9f9f9', // ✅ highlight green if selected
        borderRadius: '4px',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => {
        if (!isSelected) e.currentTarget.style.background = '#e6f7ff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isSelected ? '#d4edda' : '#f9f9f9';
      }}
    >
      <div style={{ fontWeight: 'bold' }}>
        Sec {seat.section || 'GA'} · Row {seat.rowName} · Seat {seat.seatNumber}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#555' }}>Standard Adult</div>
      <div style={{ fontWeight: 'bold', color: '#0056b3' }}>${seat.amount.toFixed(2)}</div>
    </div>
  );
})}

</div>
</div>
{/* ---- Your Cart ---- */}
<div style={{ marginTop: '2rem', border: '1px solid #ddd', borderRadius: '8px', padding: '1rem' }}>
  <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Your Selected Tickets ({selectedSeats.length}):</h4>
  {selectedSeats.length === 0 ? (
    <div>No seats selected yet.</div>
  ) : (
    selectedSeats.map(seat => (
      <div key={seat.ticketId} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
        <div style={{ fontWeight: 'bold' }}>
          Sec {seat.section || 'GA'} · Row {seat.rowName} · Seat {seat.seatNumber}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#555' }}>${seat.price.toFixed(2)}</div>
      </div>
    ))
  )}
</div>

      {/* ---- Seat Picker ---- */}
      <div style={{ flex: 1 }}>
        <TesseraSeatPicker
          addSeatCallback={addSeatCallback}
          removeSeatCallback={removeSeatCallback}
          rows={displayRows}
          maxReservableSeats={maxSeats}
          alpha
          visible
          loading={loading}
        />

        <div style={{ marginTop: '20px', padding: '40px'}}>
           <Flex justifyContent="flex-end">
        
          <Button colorScheme="teal" onClick={onOpen} disabled={selected.length === 0}>
            Checkout
          </Button>
          </Flex>

          <TicketPurchaseModal
            isOpen={isOpen}
            onClose={onClose}
            selectedSeats={selectedSeats}
            totalAmount={totalPrice}
          />
        </div>
      </div>
    </div>
  )
);

}

export default EventDetailPage;
