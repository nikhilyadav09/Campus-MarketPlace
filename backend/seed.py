"""
Seed script to populate the database with comprehensive demo data.
Run with: python seed.py
"""

import os
from datetime import datetime, timedelta, timezone
from flask import Flask
from dotenv import load_dotenv
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
            cur.execute("TRUNCATE TABLE reservations, items, categories, users CASCADE;")
            conn.commit()
            
           
            # USERS - One seller, one buyer
            
            print("Creating users...")
            
            # User 1: Ajay
            cur.execute("""
                INSERT INTO users (email, name, mobile_number, year, hostel_name, room_number) VALUES 
                (%s, %s, %s, %s, %s, %s) RETURNING id
            """, ('ajay@campus.edu', 'Ajay', '9798867386', '3rd Year', 'CV Raman', '229'))
            ajay_id = cur.fetchone()['id']
            
            # User 2: Ritik
            cur.execute("""
                INSERT INTO users (email, name, mobile_number, year, hostel_name, room_number) VALUES 
                (%s, %s, %s, %s, %s, %s) RETURNING id
            """, ('ritik@campus.edu', 'Ritik', '9798729015', '3rd Year', 'CV Raman', '256'))
            ritik_id = cur.fetchone()['id']
            
            # User 3: Manu
            cur.execute("""
                INSERT INTO users (email, name, mobile_number, year, hostel_name, room_number) VALUES 
                (%s, %s, %s, %s, %s, %s) RETURNING id
            """, ('manu@campus.edu', 'Manu', '8252126190', '3rd Year', 'CV Raman', '210'))
            manu_id = cur.fetchone()['id']
            
            conn.commit()
            print(f"  Created user: Ajay (ID: {ajay_id}) - 📱 9798867386")
            print(f"  Created user: Ritik (ID: {ritik_id}) - 📱 9798729015")
            print(f"  Created user: Manu (ID: {manu_id}) - 📱 8252126190")

       
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
                    'image_url': None,  # Will use category image
                    'price': 720.00,
                    'status': 'available',
                    'category': 'Electronics',
                    'seller': ajay_id
                },
                {
                    'title': 'CSE Textbook Set (DSA + OS)',
                    'description': 'CLRS Data Structures + Operating System Concepts. Lightly used.',
                    'image_url': None,  # Will use category image
                    'price': 55.00,
                    'status': 'available',
                    'category': 'Books',
                    'seller': ajay_id
                },

                # Ritik's items (hostel essentials)
                {
                    'title': 'Winter Hoodie (Size L)',
                    'description': 'Warm cotton hoodie, perfect for hostel winters. Worn twice.',
                    'image_url': None,  # Will use category image
                    'price': 18.00,
                    'status': 'available',
                    'category': 'Clothing',
                    'seller': ritik_id
                },
                {
                    'title': 'Mechanical Keyboard (Red Switches)',
                    'description': 'Ant Esports mechanical keyboard. Smooth typing for coding.',
                    'image_url': None,  # Will use category image
                    'price': 40.00,
                    'status': 'available',
                    'category': 'Electronics',
                    'seller': ritik_id
                },

                # Manu's items (study + daily use)
                {
                    'title': 'Engineering Mathematics Book',
                    'description': 'Advanced Engineering Mathematics by Erwin Kreyszig. Good condition.',
                    'image_url': None,  # Will use category image
                    'price': 22.00,
                    'status': 'sold',
                    'category': 'Books',
                    'seller': manu_id
                },
                {
                    'title': 'Laptop Backpack (Water Resistant)',
                    'description': '15.6-inch laptop backpack with multiple compartments.',
                    'image_url': None,  # Will use category image
                    'price': 25.00,
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
                        price,
                        status,
                        seller_id,
                        category_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    item['title'],
                    item['description'],
                    item['image_url'],
                    item['price'],
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
                INSERT INTO reservations (item_id, buyer_id, status, expires_at, created_at)
                VALUES (%s, %s, 'expired', %s, %s)
            """, (
                created_items['Mechanical Keyboard (Red Switches)'],
                ajay_id,  # Ajay tried to reserve Ritik's keyboard but didn't complete
                now - timedelta(hours=12),  # Expired 12 hours ago
                now - timedelta(days=2)     # Created 2 days ago
            ))
            print("  Created EXPIRED reservation (Mechanical Keyboard)")

            # 3. CANCELLED reservation (Laptop Backpack)
            cur.execute("""
                INSERT INTO reservations (item_id, buyer_id, status, expires_at, created_at)
                VALUES (%s, %s, 'cancelled', %s, %s)
            """, (
                created_items['Laptop Backpack (Water Resistant)'],
                ajay_id,  # Ajay cancelled his reservation on Manu's backpack
                now + timedelta(hours=20),  # Would have expired later
                now - timedelta(days=1)     # Created yesterday
            ))
            print("  Created CANCELLED reservation (Laptop Backpack)")

            # 4. ACTIVE reservation (HP Laptop) - for testing Confirm Sale
            cur.execute("""
                INSERT INTO reservations (item_id, buyer_id, status, expires_at, created_at)
                VALUES (%s, %s, 'active', %s, %s)
            """, (
                created_items['HP Pavilion 15 Laptop'],
                manu_id,  # Manu is reserving Ajay's laptop
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
