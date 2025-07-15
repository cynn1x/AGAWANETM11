from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

DB_FILE = 'tessera.db'  # Adjust to your SQLite file

def create_event(cursor, event_name):
    cursor.execute('INSERT INTO events (eventName) VALUES (?)', (event_name,))
    cursor.execute('SELECT eventId FROM events WHERE eventName = ? ORDER BY eventId DESC LIMIT 1', (event_name,))
    result = cursor.fetchone()
    if result:
        return result[0], None
    else:
        return None, f"Could not get eventId for event '{event_name}'"

def get_zone_id(cursor, zone_name):
    cursor.execute('SELECT zoneId FROM zones WHERE name = ?', (zone_name,))
    result = cursor.fetchone()
    if result:
        return result[0], None
    else:
        return None, f"Zone '{zone_name}' not found."

def generate_tickets(cursor, event_id, zones_config):
    total_inserted = 0
    for zone in zones_config:
        zone_name = zone.get('zone_name')
        rows = zone.get('rows')
        seats_per_row = zone.get('seats_per_row')

        if not zone_name or not rows or not seats_per_row:
            return None, f"Invalid zone config: {zone}"

        zone_id, error = get_zone_id(cursor, zone_name)
        if error:
            return None, error

        for row in rows:
            for seat in range(1, seats_per_row + 1):
                cursor.execute(
                    '''
                    INSERT INTO tickets (eventId, zoneId, rowName, seatNumber, status)
                    VALUES (?, ?, ?, ?, 'AVAILABLE')
                    ''',
                    (event_id, zone_id, row, seat)
                )
                total_inserted += 1

    return total_inserted, None

@app.route('/create_event_with_tickets', methods=['POST'])
def create_event_with_tickets():
    data = request.get_json()

    event_name = data.get('event_name')
    zones_config = data.get('zones_config')

    if not event_name or not zones_config:
        return jsonify({"error": "Missing required fields: 'event_name' and 'zones_config'"}), 400

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        event_id, error = create_event(cursor, event_name)
        if error:
            conn.rollback()
            return jsonify({"error": error}), 400

        total_tickets, error = generate_tickets(cursor, event_id, zones_config)
        if error:
            conn.rollback()
            return jsonify({"error": error}), 400

        conn.commit()

        return jsonify({
            "message": "Event and tickets created successfully.",
            "event_id": event_id,
            "total_tickets_created": total_tickets
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)
