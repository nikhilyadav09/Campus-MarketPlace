"""
Seed script to populate the database with comprehensive demo data.
Run with: python seed.py
"""

import os
from datetime import datetime, timedelta, timezone
from flask import Flask
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from db import init_db_pool, get_db, close_pool

load_dotenv()

# Create a dummy app context to use the DB pool
app = Flask(__name__)
init_db_pool(app)

def reset_database():
    """Drop all tables to ensure clean slate."""
    print("Resetting database...")
    with app.app_context():
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("""
                DROP TABLE IF EXISTS notifications CASCADE;
                DROP TABLE IF EXISTS reservations CASCADE;
                DROP TABLE IF EXISTS items CASCADE;
                DROP TABLE IF EXISTS categories CASCADE;
                DROP TABLE IF EXISTS users CASCADE;
            """)
            conn.commit()

def run_sql_file(filename):
    print(f"Executing SQL from {filename}...")
    with open(filename, "r") as f:
        sql = f.read()
    
    with app.app_context():
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()

def seed_data():
    """Seed database with realistic demo data."""
    with app.app_context():
        conn = get_db()
        with conn.cursor() as cur:
            print("Clearing existing data...")
            cur.execute("TRUNCATE TABLE notifications, reservations, items, categories, users CASCADE;")
            conn.commit()
            
           
            # USERS - One seller, one buyer
            
            print("Creating users...")
            
            default_password_hash = generate_password_hash('campus123')

            # User 1: Ajay
            cur.execute("""
                INSERT INTO users (email, name, password_hash, mobile_number, year, hostel_name, room_number) VALUES 
                (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, ('ajay@campus.edu', 'Ajay', default_password_hash, '9798867386', '3rd Year', 'CV Raman', '229'))
            ajay_id = cur.fetchone()['id']
            
            # User 2: Ritik
            cur.execute("""
                INSERT INTO users (email, name, password_hash, mobile_number, year, hostel_name, room_number) VALUES 
                (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, ('ritik@campus.edu', 'Ritik', default_password_hash, '9798729015', '3rd Year', 'CV Raman', '256'))
            ritik_id = cur.fetchone()['id']
            
            # User 3: Manu
            cur.execute("""
                INSERT INTO users (email, name, password_hash, mobile_number, year, hostel_name, room_number) VALUES 
                (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, ('manu@campus.edu', 'Manu', default_password_hash, '8252126190', '3rd Year', 'CV Raman', '210'))
            manu_id = cur.fetchone()['id']
            
            conn.commit()
            print(f"  Created user: Ajay (ID: {ajay_id}) - 📱 9798867386")
            print(f"  Created user: Ritik (ID: {ritik_id}) - 📱 9798729015")
            print(f"  Created user: Manu (ID: {manu_id}) - 📱 8252126190")
            print("  Default password for seeded users: campus123")

       
            # CATEGORIES
       
            print("Creating categories...")
            categories = {}
            for cat_name in ['Electronics', 'Books','Accessories', 'Furniture','Sports', 'Clothing', 'Other']:
                cur.execute("""
                    INSERT INTO categories (name) VALUES (%s) RETURNING id
                """, (cat_name,))
                categories[cat_name] = cur.fetchone()['id']
            conn.commit()
            print(f"  Created {len(categories)} categories")

           
            # ITEMS - Realistic marketplace items with placeholder images
            
            print("Creating items...")

            items_data = [
                # Ajay's items (CSE student)
                {
                    'title': 'HP Pavilion 15 Laptop',
                    'description': 'Intel i5, 16GB RAM, 512GB SSD. Ideal for coding, DSA, and projects.',
                    'image_url': None,
                    'original_price': 1800.00,
                    'sell_price': 720.00,
                    'allow_purchase': True,
                    'allow_lease': True,
                    'lease_price_per_day': 90.00,
                    'max_lease_days': 10,
                    'status': 'available',
                    'category': 'Electronics',
                    'seller': ajay_id
                },
                {
                    'title': 'CSE Textbook Set (DSA + OS)',
                    'description': 'CLRS Data Structures + Operating System Concepts. Lightly used.',
                    'image_url': None,
                    'original_price': 150.00,
                    'sell_price': 55.00,
                    'allow_purchase': True,
                    'allow_lease': False,
                    'lease_price_per_day': None,
                    'max_lease_days': None,
                    'status': 'available',
                    'category': 'Books',
                    'seller': ajay_id
                },

                # Ritik's items (hostel essentials)
                {
                    'title': 'Winter Hoodie (Size L)',
                    'description': 'Warm cotton hoodie, perfect for hostel winters. Worn twice.',
                    'image_url': None,
                    'original_price': 50.00,
                    'sell_price': 18.00,
                    'allow_purchase': True,
                    'allow_lease': True,
                    'lease_price_per_day': 3.00,
                    'max_lease_days': 7,
                    'status': 'available',
                    'category': 'Clothing',
                    'seller': ritik_id
                },
                {
                    'title': 'Mechanical Keyboard (Red Switches)',
                    'description': 'Ant Esports mechanical keyboard. Smooth typing for coding.',
                    'image_url': None,
                    'original_price': 100.00,
                    'sell_price': 40.00,
                    'allow_purchase': False,
                    'allow_lease': True,
                    'lease_price_per_day': 5.00,
                    'max_lease_days': 10,
                    'status': 'available',
                    'category': 'Electronics',
                    'seller': ritik_id
                },

                # Manu's items (study + daily use)
                {
                    'title': 'Engineering Mathematics Book',
                    'description': 'Advanced Engineering Mathematics by Erwin Kreyszig. Good condition.',
                    'image_url': None,
                    'original_price': 60.00,
                    'sell_price': 22.00,
                    'allow_purchase': True,
                    'allow_lease': False,
                    'lease_price_per_day': None,
                    'max_lease_days': None,
                    'status': 'sold',
                    'category': 'Books',
                    'seller': manu_id
                },
                {
                    'title': 'Laptop Backpack (Water Resistant)',
                    'description': '15.6-inch laptop backpack with multiple compartments.',
                    'image_url': None,
                    'original_price': 70.00,
                    'sell_price': 25.00,
                    'allow_purchase': True,
                    'allow_lease': True,
                    'lease_price_per_day': 4.00,
                    'max_lease_days': 15,
                    'status': 'available',
                    'category': 'Accessories',
                    'seller': manu_id
                }
            ]

            created_items = {}

            for item in items_data:
                cur.execute("""
                    INSERT INTO items (
                        title,
                        description,
                        image_url,
                        original_price,
                        sell_price,
                        allow_purchase,
                        allow_lease,
                        lease_price_per_day,
                        max_lease_days,
                        status,
                        seller_id,
                        category_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    item['title'],
                    item['description'],
                    item['image_url'],
                    item['original_price'],
                    item['sell_price'],
                    item['allow_purchase'],
                    item['allow_lease'],
                    item['lease_price_per_day'],
                    item['max_lease_days'],
                    item['status'],
                    item['seller'],
                    categories[item['category']]
                ))

                created_items[item['title']] = cur.fetchone()['id']

            
            print("Creating reservations...")
            now = datetime.now(timezone.utc)

            # 1. COMPLETED reservation (Engineering Mathematics Book - already sold)
            cur.execute("""
                INSERT INTO reservations (item_id, buyer_id, status, expires_at, created_at)
                VALUES (%s, %s, 'completed', %s, %s)
            """, (
                created_items['Engineering Mathematics Book'],
                ritik_id,  # Ritik bought from Manu
                now - timedelta(days=5),  # Expired 5 days ago
                now - timedelta(days=7)   # Created 7 days ago
            ))
            print("  Created COMPLETED reservation (Engineering Mathematics Book)")

            # 2. EXPIRED reservation (Mechanical Keyboard)
            cur.execute("""
                INSERT INTO reservations (item_id, buyer_id, transaction_type, lease_amount, initial_amount, final_amount_due, status, expires_at, created_at)
                VALUES (%s, %s, 'purchase', NULL, 0, 0, 'completed', %s, %s)
            """, (
                created_items['Mechanical Keyboard (Red Switches)'],
                ajay_id,  # Ajay tried to reserve Ritik's keyboard but didn't complete
                now - timedelta(hours=12),  # Expired 12 hours ago
                now - timedelta(days=2)     # Created 2 days ago
            ))
            print("  Created EXPIRED reservation (Mechanical Keyboard)")

            # 3. CANCELLED reservation (Laptop Backpack)
            cur.execute("""
                INSERT INTO reservations (item_id, buyer_id, transaction_type, lease_days, lease_amount, initial_amount, final_amount_due, status, expires_at, created_at)
                VALUES (%s, %s, 'lease', %s, %s, %s, %s, 'cancelled', %s, %s)
            """, (
                created_items['Laptop Backpack (Water Resistant)'],
                ajay_id,  # Ajay cancelled his reservation on Manu's backpack
                2,
                1.25,
                1.00,
                0.25,
                now + timedelta(hours=20),  # Would have expired later
                now - timedelta(days=1)     # Created yesterday
            ))
            print("  Created CANCELLED reservation (Laptop Backpack)")

            # 4. ACTIVE reservation (HP Laptop) - for testing Confirm Sale
            cur.execute("""
                INSERT INTO reservations (item_id, buyer_id, transaction_type, lease_amount, initial_amount, final_amount_due, status, expires_at, created_at)
                VALUES (%s, %s, 'purchase', NULL, %s, %s, 'awaiting_seller_confirmation', %s, %s)
            """, (
                created_items['HP Pavilion 15 Laptop'],
                manu_id,  # Manu is reserving Ajay's laptop
                14.40,
                705.60,
                now + timedelta(hours=23),  # Expires in 23 hours
                now - timedelta(hours=1)    # Created 1 hour ago
            ))
            # Update item status to reserved
            cur.execute("""
                UPDATE items SET status = 'reserved' WHERE id = %s
            """, (created_items['HP Pavilion 15 Laptop'],))
            print("  Created ACTIVE reservation (HP Laptop)")

            conn.commit()
            print("\nDemo data summary:")
            print(f"  Users: 3 (Ajay, Ritik, Manu)")
            print(f"  Categories: 7")
            print(f"  Items: 6 (4 available, 1 reserved, 1 sold)")
            print(f"  Reservations: 4 (1 active, 1 completed, 1 expired, 1 cancelled)")

if __name__ == "__main__":
    reset_database()
    
    schema_path = "schema.sql"
    if os.path.exists(schema_path):
        run_sql_file(schema_path)
    
    seed_data()
    close_pool()
    print("\n✓ Seeding complete!")