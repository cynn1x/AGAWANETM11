from flask import Flask, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime
from datetime import date
import random
import traceback
from flask_cors import CORS
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import jwt_required
from flask_jwt_extended import get_jwt

from flask_jwt_extended import JWTManager
import threading
from flask_socketio import SocketIO
import stripe
import ssl
import certifi




app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
stripe.api_key = 'sk_test_51RiFwE018awpSg5seKq3P9tXMwSCCbK1GCncgsVf0L9YOxZsNYf4slYGUJe7SikU4fF4Pn6IeUaMbiu8DieiWPqD00EPFdHUpH'
CORS(app, supports_credentials=True)
ssl_context = ssl.create_default_context(cafile=certifi.where())

# Setup the Flask-JWT-Extended extension
app.config["JWT_SECRET_KEY"] = "ayush-secret"  # Change this!
jwt = JWTManager(app)

CORS(app, supports_credentials=True)

@jwt.unauthorized_loader
def custom_unauthorized(err):
    response = jsonify({'error': 'Missing or invalid JWT'})
    response.status_code = 401
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@jwt.invalid_token_loader
def custom_invalid_token(err):
    response = jsonify({'error': 'Invalid JWT'})
    response.status_code = 422
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


def get_db_connection():
    conn = sqlite3.connect('../database/tessera.db')
    conn.row_factory = sqlite3.Row
    return conn


import schedule
import time

def cleanup_expired_reservations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE Tickets
        SET status = 'AVAILABLE', reserved_until = NULL, reserved_by = NULL
        WHERE status = 'RESERVED' AND reserved_until < datetime('now')
    ''')
    conn.commit()
    conn.close()
    print("[Background] Expired reservations cleaned up!")

def run_scheduler():
    schedule.every(5).minutes.do(cleanup_expired_reservations)
    while True:
        schedule.run_pending()
        time.sleep(1)


@app.route('/events', methods=['GET'])
def get_events():
  conn = get_db_connection()
  cursor = conn.cursor()
  
  #Start with the base SQL query
  query = 'SELECT * FROM Events'
  params = []
  query_conditions = []
  
  #Check for the 'afterDate' filter
  after_date = request.args.get('afterDate')
  if after_date:
      query_conditions.append('date > ?')
      params.append(after_date)
  
  #Check for the 'location' filter
  location = request.args.get('location')
  if location:
      query_conditions.append('location = ?')
      params.append(location)
    
  img_url = request.args.get('img_url')  


  #Add WHERE clause if conditions are present
  if query_conditions:
      query += ' WHERE ' + ' AND '.join(query_conditions)
  
  #Execute the query with the specified conditions
  cursor.execute(query, params)
  events = cursor.fetchall()
  
  #Convert the rows to dictionaries to make them serializable
  events_list = [dict(event) for event in events]
  
  conn.close()
  
  return jsonify(events_list)


from flask_jwt_extended import create_access_token, get_jwt_identity

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing credentials'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT password_hash, is_admin FROM Users WHERE username = ?', (username,))
    user = cursor.fetchone()

    if user and check_password_hash(user['password_hash'], password):
        claims = {'is_admin': bool(user['is_admin'])}
        access_token = create_access_token(identity=username, additional_claims=claims)
        return jsonify({'access_token': access_token}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401



@app.route('/changePWD', methods=['PUT'])
def changePWD():
    #get the data needed from the JSON
    username = request.json.get('username')
    old_password = request.json.get('old_password')
    new_password = request.json.get('new_password')

    #make asure that the user provides everything
    if not username or not old_password or not new_password:
        return jsonify({'error': 'All fields are required.'}), 400


    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT password_hash FROM Users WHERE username = ?', (username,))
        
        #fetch the results from the query 
        user = cursor.fetchone()

        #in case the user doesn't exist
        if user is None:
            return jsonify({'error': 'User not found.'}), 404

        #now check if the old password matches the stored password that we had (the hashed pwd is what we stored)
        if not check_password_hash(user['password_hash'], old_password):
            return jsonify({'error': 'Old password is incorrect.'}), 401

        #make a hash of the new password so we can store it
        new_hashed_password = generate_password_hash(new_password)
        #update the new password
        cursor.execute('UPDATE Users SET password_hash = ? WHERE username = ?', (new_hashed_password, username))
        
        #make the changes needed to the db
        conn.commit()
        

        #return success
        return jsonify({'message': 'Password updated successfully.'}), 200

    #handle any exceptions that occur during the process assuming this is internal errors only so 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()


@app.route('/purchaseTick', methods=['POST'])
@jwt_required()
def purchase_ticket():
    try:
        current_user = get_jwt_identity()
        print(f'[DEBUG] Authenticated user: {current_user}')
        print(f'[DEBUG] Incoming request: {request.json}')

        event_id = request.json.get('event_id')
        ticket_ids = request.json.get('ticket_ids')  

        if not event_id or not ticket_ids:
            print('[ERROR] Missing event_id or ticket_ids')
            return jsonify({'error': 'Missing required fields'}), 400

        if not isinstance(ticket_ids, list):
            return jsonify({'error': 'ticket_ids must be a list'}), 400

        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM Users WHERE username = ?', (current_user,))
        user = cursor.fetchone()
        if not user:
            print('[ERROR] User not found')
            return jsonify({'error': 'User not found'}), 404

        user_id = user['user_id']
        purchase_date = datetime.now().strftime('%Y-%m-%d')

        for ticket_id in ticket_ids:
            cursor.execute('SELECT status FROM tickets WHERE eventId = ? AND ticketId = ?', (event_id, ticket_id))
            ticket = cursor.fetchone()
            if not ticket:
                print(f'[ERROR] Ticket {ticket_id} not found')
                conn.rollback()
                return jsonify({'error': f'Ticket {ticket_id} not found'}), 404

            if ticket['status'] == 'SOLD':
                print(f'[ERROR] Ticket {ticket_id} already sold')
                conn.rollback()
                return jsonify({'error': f'Ticket {ticket_id} is already sold'}), 409

            barcode = random.randint(1000000, 9999999)
            cursor.execute(
                'INSERT INTO ticket_assignments (ticketId, userId, barcode, assignedAt) VALUES (?, ?, ?, ?)',
                (ticket_id, user_id, barcode, purchase_date)
            )
            cursor.execute('UPDATE tickets SET status = ? WHERE ticketId = ?', ('SOLD', ticket_id))

        conn.commit()
        print('[INFO] Purchase completed successfully')
        return jsonify({'message': 'Tickets successfully purchased'}), 200

    except sqlite3.IntegrityError:
        traceback.print_exc()
        return jsonify({'error': 'One or more tickets already purchased'}), 409

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()



    
@app.route('/create_full_event', methods=['POST'])
@jwt_required()
def create_full_event():
    claims = get_jwt()
    if not claims.get('is_admin', False):
        return jsonify({'error': 'Admin privileges required'}), 403

    current_user = get_jwt_identity()
    data = request.get_json()

    event_name = data.get('event_name')
    event_date = data.get('date')
    event_time = data.get('time')
    event_location = data.get('location')
    event_desc = data.get('description')
    event_image = data.get('image_url')
    perk_description = data.get('perk_description')  # 🔧 New field

    zones_config = data.get('zones_config')
    pricing_config = data.get('pricing_config')

    if not all([event_name, event_date, event_time, event_location, event_desc, event_image, zones_config, pricing_config]):
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check for duplicates
        cursor.execute('SELECT * FROM Events WHERE name = ?', (event_name,))
        existing_event = cursor.fetchall()
        for row in existing_event:
            if row['date'] == event_date:
                return jsonify({'error': 'Event with this name and date already exists'}), 400

        # 🔧 Insert Event with perk_description
        cursor.execute(
            '''
            INSERT INTO Events (name, description, date, time, location, img_url, perk_description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''',
            (event_name, event_desc, event_date, event_time, event_location, event_image, perk_description)
        )

        cursor.execute('SELECT event_id FROM Events WHERE name = ? ORDER BY event_id DESC LIMIT 1', (event_name,))
        result = cursor.fetchone()
        event_id = result[0] if result else None

        if not event_id:
            conn.rollback()
            return jsonify({"error": "Could not create event"}), 400

        total_inserted = 0

        for zone in zones_config:
            zone_name = zone.get('zone_name')
            rows = zone.get('rows')
            seats_per_row = zone.get('seats_per_row')

            if not zone_name or not rows or not seats_per_row:
                conn.rollback()
                return jsonify({"error": f"Invalid zone config: {zone}"}), 400

            cursor.execute('SELECT zoneId FROM zones WHERE name = ?', (zone_name,))
            zone_result = cursor.fetchone()
            if not zone_result:
                conn.rollback()
                return jsonify({"error": f"Zone '{zone_name}' not found."}), 400

            zone_id = zone_result[0]

            for row in rows:
                price_entry = next(
                    (p for p in pricing_config if p['zone_name'] == zone_name and p['start_row'] <= row <= p['end_row']),
                    None
                )
                if not price_entry:
                    conn.rollback()
                    return jsonify({"error": f"No pricing for zone '{zone_name}' row '{row}'"}), 400

                price_code = f"{zone_name}-{row}"

                for seat in range(1, seats_per_row + 1):
                    cursor.execute(
                        '''
                        INSERT INTO tickets (eventId, zoneId, rowName, seatNumber, status, price)
                        VALUES (?, ?, ?, ?, 'AVAILABLE', ?)
                        ''',
                        (event_id, zone_id, row, seat, price_code)
                    )
                    total_inserted += 1

        for price_entry in pricing_config:
            zone_name = price_entry.get('zone_name')
            start_row = price_entry.get('start_row').upper()
            end_row = price_entry.get('end_row').upper()
            amount = price_entry.get('price')

            cursor.execute('SELECT zoneId FROM zones WHERE name = ?', (zone_name,))
            zone_result = cursor.fetchone()
            if not zone_result:
                conn.rollback()
                return jsonify({"error": f"Zone '{zone_name}' not found for pricing."}), 400

            for row_letter in range(ord(start_row), ord(end_row) + 1):
                row_name = chr(row_letter)
                price_code = f"{zone_name}-{row_name}"

                cursor.execute(
                    'INSERT OR REPLACE INTO Pricing (priceCode, amount) VALUES (?, ?)',
                    (price_code, amount)
                )

        conn.commit()
        return jsonify({
            "message": "Event, tickets, and pricing created successfully.",
            "event_id": event_id,
            "total_tickets_created": total_inserted
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


@app.route('/getUserTicks', methods=['GET'])
def getUserTicks():
    username = request.args.get('username')
    event_date = request.args.get('date_of_event')

    if not username:
        return jsonify({'error': 'You need to provide a username'}), 400

    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        #Get user_id from username
        cursor.execute('SELECT user_id FROM Users WHERE username = ?', (username,))
        user = cursor.fetchone()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_id = user['user_id']

        #get all tickets for the user
        cursor.execute('SELECT * FROM Tickets WHERE user_id = ?', (user_id,))
        tickets = [dict(ticket) for ticket in cursor.fetchall()]
        
        #if event_date is provided, filter tickets
        if event_date:
            tickets = [ticket for ticket in tickets if ticket['purchase_date'] == event_date]
           
        
        final_price = 0
        float(final_price)
        count = 0
        for ticket in tickets:
            if tickets[count]['price'] is not None:
                final_price = final_price + tickets[count]['price']
            count = count + 1

                
        #Otherwise, return all tickets
        return jsonify({'total amount spent': final_price, 'tickets bought': tickets}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
            conn.close()

@app.route('/transferTickets', methods=["PUT"])
@jwt_required()
def transferTick():
    current_user = get_jwt_identity()
    ticket_id = request.json.get('ticket_id')
    transfer_username = request.json.get('transfer_username')

    if not ticket_id or not transfer_username:
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get sender user
        cursor.execute('SELECT * FROM Users WHERE username = ?', (current_user,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found.'}), 404
        user_id = user['user_id']

        # Get recipient user
        cursor.execute('SELECT * FROM Users WHERE username = ?', (transfer_username,))
        recipient = cursor.fetchone()
        if not recipient:
            return jsonify({'error': 'Recipient user does not exist'}), 404
        recipient_id = recipient['user_id']

        # Check ticket ownership
        cursor.execute('''
            SELECT * FROM ticket_assignments
            WHERE ticketId = ? AND userId = ?
        ''', (ticket_id, user_id))
        assignment = cursor.fetchone()
        if not assignment:
            return jsonify({'error': 'You do not own this ticket.'}), 403

        # Transfer the ticket
        cursor.execute('''
            UPDATE ticket_assignments
            SET userId = ?
            WHERE ticketId = ?
        ''', (recipient_id, ticket_id))

        conn.commit()
        return jsonify({'message': 'Ticket transferred successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()




from datetime import datetime


@app.route('/getAvailTicks', methods=['GET'])
@jwt_required()
def getAvailTicks():
    current_user = get_jwt_identity()
    event_id = request.args.get('event_id')
    if not event_id:
        return jsonify({"error": "Missing required field: event_id"}), 400

    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Count user's reserved tickets for this event
        cursor.execute('''
            SELECT COUNT(*) FROM tickets
            WHERE status = 'RESERVED' AND reserved_by = ? AND eventId = ?
        ''', (current_user, event_id))
        user_reserved_count = cursor.fetchone()[0]

        # Get available seats, include perk_description
        cursor.execute('''
            SELECT t.*, p.amount AS amount, t.perk_description
            FROM Tickets t
            LEFT JOIN Pricing p ON t.price = p.priceCode
            WHERE t.eventId = ? AND t.status = 'AVAILABLE'
        ''', (event_id,))
        avail_seats = [dict(seat) for seat in cursor.fetchall()]

        # Get taken seats, include perk_description
        cursor.execute('''
            SELECT t.*, p.amount AS price, t.perk_description
            FROM Tickets t
            LEFT JOIN Pricing p ON t.price = p.priceCode
            WHERE t.eventId = ? AND (t.status = 'RESERVED' OR t.status = 'SOLD')
        ''', (event_id,))
        taken_seats = [dict(seat) for seat in cursor.fetchall()]

        return jsonify({
            "event_id": event_id,
            "available_seats": avail_seats,
            "taken_seats": taken_seats,
            "user_reserved_count": user_reserved_count
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()  # <-- This will print the real error in your terminal
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()




from flask import current_app
import traceback

@app.route('/reserveTickets', methods=['POST'])
@jwt_required()
def reserveTickets():
    data = request.get_json()
    event_id = data.get('event_id')
    seats = data.get('seats')

    if not event_id or not seats:
        return jsonify({"error": "Missing required fields"}), 400

    current_user = get_jwt_identity()
    print(f"[DEBUG] reserveTickets called by user: {current_user}")
    print(f"[DEBUG] Incoming data: {data}")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT COUNT(*) FROM tickets
            WHERE status = 'RESERVED' AND reserved_by = ? AND eventId = ?
        ''', (current_user, event_id))
        current_reserved_count = cursor.fetchone()[0]

        print(f"[DEBUG] User already reserved {current_reserved_count} seats for event {event_id}")

        if current_reserved_count + len(seats) > 5:
            conn.rollback()
            return jsonify({"error": "You cannot reserve more than 5 seats for this event."}), 403

        hold_until = datetime.now() + timedelta(minutes=10)  # hold for 10 mins
        hold_until_str = hold_until.strftime('%Y-%m-%d %H:%M:%S')

        for seat in seats:
            row_name = seat['rowName']
            seat_number = seat['seatNumber']
            print(f"[DEBUG] Checking seat {row_name}-{seat_number}")

            cursor.execute(
                'SELECT status FROM tickets WHERE eventId = ? AND rowName = ? AND seatNumber = ?',
                (event_id, row_name, seat_number)
            )
            result = cursor.fetchone()
            print(f"[DEBUG] Seat query result: {result}")

            if not result:
                conn.rollback()
                return jsonify({"error": f"Seat {row_name}{seat_number} does not exist."}), 404

            if result[0] != 'AVAILABLE':
                conn.rollback()
                return jsonify({"error": f"Seat {row_name}{seat_number} is not available."}), 409

            cursor.execute(
                '''
                UPDATE tickets 
                SET status = ?, reserved_until = ?, reserved_by = ?
                WHERE eventId = ? AND rowName = ? AND seatNumber = ?
                ''',
                ('RESERVED', hold_until_str, current_user, event_id, row_name, seat_number)
            )
            print(f"[DEBUG] Seat {row_name}{seat_number} reserved by {current_user}")

        conn.commit()

        socketio.emit('seat_reserved', {
            'event_id': event_id,
            'seats': seats,
            'status': 'RESERVED'
        })

        return jsonify({"message": "Seats reserved successfully."}), 200

    except Exception as e:
        conn.rollback()
        print("[ERROR] Exception in /reserveTickets:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


@app.route('/unreserveTickets', methods=['POST'])
@jwt_required()
def unreserveTickets():
    data = request.get_json()
    event_id = data.get('event_id')
    seats = data.get('seats')  #[{ "rowName": "...", "seatNumber": ... }] this format to  the call

    if not event_id or not seats:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        for seat in seats:
            row_name = seat['rowName']
            seat_number = seat['seatNumber']

            cursor.execute('UPDATE tickets SET status = ? WHERE eventId = ? AND rowName = ? AND seatNumber = ? AND status = ?', ('AVAILABLE', event_id, row_name, seat_number, 'RESERVED'))

        conn.commit()
        return jsonify({"message": "Seats un-reserved successfully."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

@app.route('/create-payment-intent', methods=['POST'])
@jwt_required()  # require JWT so you know which user is paying
def create_payment_intent():
    try:
        data = request.json
        amount = data.get('amount')  # amount in cents, required!

        if not amount:
            return jsonify({"error": "Missing amount"}), 400

        # You could also do a sanity check here: amount > 0

        # (Optional) Get the user identity if you want to associate the intent
        current_user = get_jwt_identity()
        print(f"[DEBUG] Creating payment intent for user: {current_user}")

        # Create the PaymentIntent on Stripe's server
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            # You can attach metadata for tracking
            metadata={'user': current_user}
        )
        print(payment_intent)
        # Return the clientSecret to the frontend
        return jsonify({
            'clientSecret': payment_intent.client_secret
        }), 200

    except Exception as e:
        print("[ERROR] /create-payment-intent failed:", e)
        return jsonify({"error": str(e)}), 500



@app.route('/complete-purchase', methods=['POST'])
@jwt_required()
def complete_purchase():
    try:
        data = request.json
        payment_intent_id = data['paymentIntentId']
        seats = data['seats']

        print('[DEBUG] seats:', seats)
        print('[DEBUG] type(seats[0]):', type(seats[0]))

        current_user = get_jwt_identity()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT user_id, email FROM Users WHERE username = ?', (current_user,))
        user_row = cursor.fetchone()
        user_id = user_row['user_id']
        user_email = user_row['email']
        print(f'[DEBUG] Completing purchase for user: {current_user} ({user_email})')

        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if payment_intent.status != 'succeeded':
            return jsonify({"error": "Payment not successful"}), 400

        purchase_date = datetime.now().strftime('%Y-%m-%d')

        for seat in seats:
            ticket_id = seat['ticketId']  # Make sure your frontend sends ticketId!
            cursor.execute('SELECT status FROM Tickets WHERE ticketId = ?', (ticket_id,))
            ticket = cursor.fetchone()
            if not ticket or ticket['status'] == 'SOLD':
                conn.rollback()
                return jsonify({"error": f"Ticket {ticket_id} not available"}), 400

            # Mark ticket as SOLD
            cursor.execute('UPDATE Tickets SET status = ? WHERE ticketId = ?', ('SOLD', ticket_id))

            # Insert into ticket_assignments table
            barcode = random.randint(1000000, 9999999)
            cursor.execute(
                '''
                INSERT INTO ticket_assignments (ticketId, userId, barcode, assignedAt)
                VALUES (?, ?, ?, ?)
                ''',
                (ticket_id, user_id, barcode, purchase_date)
            )

        conn.commit()

        # Optional: Send confirmation email
        send_ticket_email(
            to_email=user_email,
            subject="Your Tessera Tickets Confirmation",
            html_content="<strong>Your tickets are booked! Check your account for details.</strong>"
        )

        return jsonify({"message": "Purchase completed successfully"})

    except Exception as e:
        traceback.print_exc()
        return jsonify(error=str(e)), 500

    finally:
        conn.close()


    
    
@app.route('/getUserProfile', methods=['GET'])
@jwt_required()
def get_user_profile():
    current_user = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get user info
    cursor.execute('SELECT username, email FROM Users WHERE username = ?', (current_user,))
    user = cursor.fetchone()

    # Get their tickets
    cursor.execute('''
        SELECT e.name as event_name, t.rowName, t.seatNumber
        FROM Tickets t
        JOIN Events e ON t.eventId = e.event_id
        JOIN ticket_assignments ta ON ta.ticketId = t.ticketId
        JOIN Users u ON ta.userId = u.user_id
        WHERE u.username = ?
    ''', (current_user,))
    tickets = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return jsonify({
        "profile": {"username": user['username'], "email": user['email']},
        "tickets": tickets
    })
    
    
import requests
import os
import certifi

def send_ticket_email(to_email, subject, html_content):
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {os.environ['SENDGRID_API_KEY']}",
        "Content-Type": "application/json"
    }
    payload = {
        "personalizations": [{
            "to": [{"email": to_email}],
            "subject": subject
        }],
        "from": {"email": "ayush.gawane@ticketmaster.com"},
        "content": [{
            "type": "text/html",
            "value": html_content
        }]
    }

    response = requests.post(url, headers=headers, json=payload, verify=certifi.where())
    print("[DEBUG] Response:", response.status_code, response.text)



    
    
if __name__ == '__main__':
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.daemon = True  # Daemon means it stops when Flask stops
    scheduler_thread.start()
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)

    


    