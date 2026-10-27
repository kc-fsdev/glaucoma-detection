import os
import pymysql
import pymysql.cursors
from contextlib import contextmanager
from datetime import datetime
import json
import sqlite3
import uuid
from werkzeug.security import generate_password_hash

MYSQL_HOST = os.environ.get('MYSQL_HOST', '127.0.0.1')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', '3306'))
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'drishti_db')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB = os.path.join(BASE_DIR, 'drishti.db')

def get_db_connection(database=MYSQL_DATABASE):
    """Establish and return a PyMySQL connection."""
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=database,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

@contextmanager
def db_cursor(commit=True):
    """Context manager for MySQL queries with automatic commit/rollback and connection cleanup."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def ensure_database_exists():
    """Create the target MySQL database if it does not already exist."""
    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        charset='utf8mb4',
        autocommit=True
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
    finally:
        conn.close()

def init_mysql_tables():
    """Create all necessary application tables with proper types, keys, and indexes."""
    ensure_database_exists()
    with db_cursor() as cur:
        # 1. Admins
        cur.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
            created_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 2. Users
        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL DEFAULT '',
            phone VARCHAR(50) DEFAULT '',
            language VARCHAR(10) DEFAULT 'en',
            active TINYINT DEFAULT 1,
            created_at VARCHAR(50) NOT NULL,
            INDEX idx_users_active (active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 3. Doctors
        cur.execute("""
        CREATE TABLE IF NOT EXISTS doctors (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            specialization VARCHAR(255) DEFAULT 'Ophthalmologist',
            hospital VARCHAR(255) DEFAULT '',
            phone VARCHAR(50) DEFAULT '',
            address TEXT,
            state VARCHAR(100) DEFAULT 'Tamil Nadu',
            city VARCHAR(100) NOT NULL,
            area VARCHAR(100) DEFAULT '',
            timings VARCHAR(255) DEFAULT '',
            appointment_info VARCHAR(255) DEFAULT 'Direct walk-in / Contact clinic to schedule',
            maps_url TEXT,
            search_url TEXT,
            latitude DOUBLE DEFAULT NULL,
            longitude DOUBLE DEFAULT NULL,
            verified TINYINT DEFAULT 1,
            active TINYINT DEFAULT 1,
            created_at VARCHAR(50) NOT NULL,
            INDEX idx_doctors_city (city),
            INDEX idx_doctors_active (active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 4. Hospitals
        cur.execute("""
        CREATE TABLE IF NOT EXISTS hospitals (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address TEXT,
            phone VARCHAR(50) DEFAULT '',
            state VARCHAR(100) DEFAULT 'Tamil Nadu',
            city VARCHAR(100) NOT NULL,
            latitude DOUBLE DEFAULT NULL,
            longitude DOUBLE DEFAULT NULL,
            verified TINYINT DEFAULT 1,
            active TINYINT DEFAULT 1,
            created_at VARCHAR(50) NOT NULL,
            INDEX idx_hospitals_city (city)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 5. Analyses (Glaucoma screening results)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id VARCHAR(64) PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            result VARCHAR(100) NOT NULL,
            score INT NOT NULL,
            confidence VARCHAR(20) DEFAULT '',
            cdr DOUBLE DEFAULT NULL,
            iop VARCHAR(50) DEFAULT '',
            idempotency_key VARCHAR(128) DEFAULT NULL,
            record_id VARCHAR(64) DEFAULT NULL,
            details LONGTEXT,
            model_version VARCHAR(50) DEFAULT 'glaucoma-match-v1',
            created_at VARCHAR(50) NOT NULL,
            INDEX idx_analyses_user (user_email),
            INDEX idx_analyses_created (created_at),
            UNIQUE INDEX idx_analyses_idempotency (user_email, idempotency_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 6. Records (Eye health records)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS records (
            id VARCHAR(64) PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            record_type VARCHAR(80) DEFAULT 'Eye report',
            description TEXT,
            filename VARCHAR(255) DEFAULT '',
            record_date VARCHAR(50) DEFAULT '',
            analysis_id VARCHAR(64) DEFAULT NULL,
            analysis_status VARCHAR(50) DEFAULT 'None',
            created_at VARCHAR(50) NOT NULL,
            updated_at VARCHAR(50) NOT NULL,
            INDEX idx_records_user (user_email),
            INDEX idx_records_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 7. Articles
        cur.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id VARCHAR(64) PRIMARY KEY,
            category VARCHAR(100) DEFAULT 'Eye care',
            title_en VARCHAR(255) NOT NULL,
            title_ta VARCHAR(255) DEFAULT '',
            title_hi VARCHAR(255) DEFAULT '',
            content_en TEXT,
            content_ta TEXT,
            content_hi TEXT,
            image VARCHAR(255) DEFAULT '',
            published TINYINT DEFAULT 1,
            created_at VARCHAR(50) NOT NULL,
            updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 8. Daily Eye Care Tips
        cur.execute("""
        CREATE TABLE IF NOT EXISTS daily_tips (
            id VARCHAR(64) PRIMARY KEY,
            tip_index INT NOT NULL UNIQUE,
            category VARCHAR(100) NOT NULL,
            title_en VARCHAR(255) NOT NULL,
            title_ta VARCHAR(255) DEFAULT '',
            title_hi VARCHAR(255) DEFAULT '',
            content_en TEXT NOT NULL,
            content_ta TEXT,
            content_hi TEXT,
            source VARCHAR(255) DEFAULT 'Medically Reviewed General Eye Care Guidance',
            active TINYINT DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 9. Translations
        cur.execute("""
        CREATE TABLE IF NOT EXISTS translations (
            `key` VARCHAR(191) PRIMARY KEY,
            english TEXT,
            tamil TEXT,
            hindi TEXT,
            updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 10. Announcements
        cur.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            language VARCHAR(10) DEFAULT 'en',
            kind VARCHAR(50) DEFAULT 'info',
            start_date VARCHAR(50) DEFAULT '',
            end_date VARCHAR(50) DEFAULT '',
            active TINYINT DEFAULT 1,
            created_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 11. Reminders
        cur.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id VARCHAR(64) PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100) DEFAULT 'General eye care',
            reminder_date VARCHAR(50) DEFAULT '',
            reminder_time VARCHAR(50) DEFAULT '',
            completed TINYINT DEFAULT 0,
            created_at VARCHAR(50) NOT NULL,
            INDEX idx_reminders_user (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 12. Appointments
        cur.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id VARCHAR(64) PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            doctor_id VARCHAR(64) DEFAULT '',
            doctor_name VARCHAR(255) NOT NULL,
            specialization VARCHAR(255) DEFAULT '',
            hospital_name VARCHAR(255) DEFAULT '',
            city VARCHAR(100) NOT NULL,
            appointment_date VARCHAR(50) NOT NULL,
            appointment_time VARCHAR(50) NOT NULL,
            patient_name VARCHAR(100) DEFAULT '',
            patient_phone VARCHAR(50) DEFAULT '',
            reason TEXT,
            status VARCHAR(50) DEFAULT 'Requested',
            created_at VARCHAR(50) NOT NULL,
            updated_at VARCHAR(50) NOT NULL,
            INDEX idx_appointments_user (user_email),
            INDEX idx_appointments_date (appointment_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 13. Settings
        cur.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            `key` VARCHAR(191) PRIMARY KEY,
            value TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 13. Audit logs
        cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_email VARCHAR(255) NOT NULL,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(100) NOT NULL,
            entity_id VARCHAR(255) DEFAULT '',
            old_value LONGTEXT,
            new_value LONGTEXT,
            created_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

def seed_doctors():
    """Seed verified eye doctors for Karur and Tiruchengode."""
    doctors = [
        # Karur Doctors
        {
            'id': 'doc-karur-01',
            'name': 'Dr. Nelson Joseph, MS, DO',
            'specialization': 'Ophthalmologist & Glaucoma Specialist',
            'hospital': 'Joseph Eye Hospital',
            'phone': '+91 4324 260341',
            'address': '52, North Pradhakshanam Road, Near Old Bus Stand, Karur, Tamil Nadu 639001',
            'state': 'Tamil Nadu',
            'city': 'Karur',
            'area': 'North Pradhakshanam Road',
            'timings': 'Mon - Sat: 9:00 AM - 7:00 PM, Sun: Closed',
            'appointment_info': 'Walk-in accepted / Call clinic to confirm daily doctor availability',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Joseph+Eye+Hospital+Karur',
            'search_url': 'https://www.google.com/search?q=Joseph+Eye+Hospital+Karur',
            'latitude': 10.9601,
            'longitude': 78.0766,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-karur-02',
            'name': 'Dr. K. Senthil Kumar, MBBS, MS (Ophth)',
            'specialization': 'Consultant Eye Surgeon & Glaucoma Care',
            'hospital': "Dr. Agarwal's Eye Hospital",
            'phone': '+91 4324 230005',
            'address': '11/1, Covai Road, Near Sengunthapuram 1st Cross, Karur, Tamil Nadu 639002',
            'state': 'Tamil Nadu',
            'city': 'Karur',
            'area': 'Sengunthapuram / Covai Road',
            'timings': 'Mon - Sat: 9:00 AM - 8:00 PM, Sun: 9:00 AM - 1:00 PM',
            'appointment_info': 'Prior appointment recommended; call hospital desk',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Dr+Agarwals+Eye+Hospital+Karur',
            'search_url': 'https://www.google.com/search?q=Dr+Agarwals+Eye+Hospital+Karur',
            'latitude': 10.9574,
            'longitude': 78.0722,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-karur-03',
            'name': 'Dr. V. Rajesh, MBBS, DO, DNB',
            'specialization': 'Comprehensive Ophthalmology & Optic Nerve Screening',
            'hospital': 'Aravind Eye Centre - Karur',
            'phone': '+91 4324 240088',
            'address': '145/2, Jawahar Bazaar, Karur, Tamil Nadu 639001',
            'state': 'Tamil Nadu',
            'city': 'Karur',
            'area': 'Jawahar Bazaar',
            'timings': 'Mon - Sat: 8:30 AM - 5:30 PM, Sun: Emergency Care Only',
            'appointment_info': 'Token registration available on arrival; call for specialist hours',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Karur',
            'search_url': 'https://www.google.com/search?q=Aravind+Eye+Hospital+Karur',
            'latitude': 10.9610,
            'longitude': 78.0792,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-karur-04',
            'name': 'Dr. P. Meenakshi, MS (Ophthalmology)',
            'specialization': 'Glaucoma, Cataract & Anterior Segment Specialist',
            'hospital': 'Lotus Eye Care Hospital',
            'phone': '+91 4324 223555',
            'address': '48, 80 Feet Road, Gandhigramam South, Karur, Tamil Nadu 639004',
            'state': 'Tamil Nadu',
            'city': 'Karur',
            'area': 'Gandhigramam',
            'timings': 'Mon - Sat: 9:00 AM - 7:30 PM, Sun: 9:00 AM - 12:30 PM',
            'appointment_info': 'Consultation via front-desk registration or telephone booking',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Lotus+Eye+Hospital+Karur',
            'search_url': 'https://www.google.com/search?q=Lotus+Eye+Hospital+Karur',
            'latitude': 10.9485,
            'longitude': 78.0831,
            'verified': 1,
            'active': 1
        },

        # Tiruchengode Doctors
        {
            'id': 'doc-tiruchengode-01',
            'name': 'Dr. S. Kavitha, MBBS, DO',
            'specialization': 'Ophthalmologist & Vision Screening Specialist',
            'hospital': 'Aravind Vision Centre',
            'phone': '+91 4288 252100',
            'address': 'Sankari Main Road, Near Old Bus Stand, Tiruchengode, Tamil Nadu 637211',
            'state': 'Tamil Nadu',
            'city': 'Tiruchengode',
            'area': 'Sankari Main Road',
            'timings': 'Mon - Sat: 8:30 AM - 5:00 PM, Sun: Closed',
            'appointment_info': 'Walk-in outpatient registration available during operating hours',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Tiruchengode',
            'search_url': 'https://www.google.com/search?q=Aravind+Eye+Hospital+Tiruchengode',
            'latitude': 11.3802,
            'longitude': 77.8953,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-tiruchengode-02',
            'name': 'Dr. M. Anand, MBBS, MS (Ophthalmology)',
            'specialization': 'Glaucoma & Cataract Surgeon',
            'hospital': 'Thulasi Eye Care Centre',
            'phone': '+91 4288 255440',
            'address': '82/1, Velur Road, Opp. Government Hospital, Tiruchengode, Tamil Nadu 637211',
            'state': 'Tamil Nadu',
            'city': 'Tiruchengode',
            'area': 'Velur Road',
            'timings': 'Mon - Sat: 9:00 AM - 8:00 PM, Sun: 9:00 AM - 1:00 PM',
            'appointment_info': 'Direct registration / telephone consultation scheduling',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Thulasi+Eye+Hospital+Tiruchengode',
            'search_url': 'https://www.google.com/search?q=Thulasi+Eye+Hospital+Tiruchengode',
            'latitude': 11.3768,
            'longitude': 77.8920,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-tiruchengode-03',
            'name': 'Dr. K. Sivakumar, MBBS, DO, DNB',
            'specialization': 'Senior Consultant Eye Surgeon & Retina-Glaucoma Clinic',
            'hospital': 'Siva Eye Hospital & Laser Centre',
            'phone': '+91 4288 251670',
            'address': '14, Rajaji Street, Near Gandhi Statue, Tiruchengode, Tamil Nadu 637211',
            'state': 'Tamil Nadu',
            'city': 'Tiruchengode',
            'area': 'Rajaji Street',
            'timings': 'Mon - Sat: 9:30 AM - 7:00 PM, Sun: Closed',
            'appointment_info': 'Call clinic to confirm specialist slot',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Siva+Eye+Hospital+Tiruchengode',
            'search_url': 'https://www.google.com/search?q=Siva+Eye+Hospital+Tiruchengode',
            'latitude': 11.3815,
            'longitude': 77.8974,
            'verified': 1,
            'active': 1
        },

        # Coimbatore Doctors
        {
            'id': 'doc-cbe-01',
            'name': 'Dr. R. Revathi, MS, DNB (Ophthalmology)',
            'specialization': 'Chief Glaucoma & Cornea Specialist',
            'hospital': 'Aravind Eye Hospital Coimbatore',
            'phone': '+91 422 436 0400',
            'address': 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641014',
            'state': 'Tamil Nadu',
            'city': 'Coimbatore',
            'area': 'Peelamedu',
            'timings': 'Mon - Sat: 7:30 AM - 6:00 PM, Sun: 8:00 AM - 12:00 PM',
            'appointment_info': 'Direct outpatient registration and telephone appointments available',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Coimbatore',
            'search_url': 'https://www.google.com/search?q=Aravind+Eye+Hospital+Coimbatore',
            'latitude': 11.0284,
            'longitude': 77.0036,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-cbe-02',
            'name': 'Dr. P. Rajasekar, MBBS, MS (Ophthalmology)',
            'specialization': 'Glaucoma Consultant & Micro-Invasive Glaucoma Surgeon',
            'hospital': 'Sankara Eye Hospital Coimbatore',
            'phone': '+91 422 266 6450',
            'address': 'Sivanandapuram, Saravanampatti Post, Coimbatore, Tamil Nadu 641035',
            'state': 'Tamil Nadu',
            'city': 'Coimbatore',
            'area': 'Saravanampatti',
            'timings': 'Mon - Sat: 8:30 AM - 5:30 PM, Sun: Closed',
            'appointment_info': 'Specialist consultation slots bookable by phone or reception',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Sankara+Eye+Hospital+Coimbatore',
            'search_url': 'https://www.google.com/search?q=Sankara+Eye+Hospital+Coimbatore',
            'latitude': 11.0664,
            'longitude': 76.9946,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-cbe-03',
            'name': 'Dr. D. Ramamurthy, MD (AIIMS), FRCS',
            'specialization': 'Senior Ophthalmologist & Glaucoma Care Director',
            'hospital': 'The Eye Foundation Coimbatore',
            'phone': '+91 422 424 2000',
            'address': '582A, D.B. Road, R.S. Puram, Coimbatore, Tamil Nadu 641002',
            'state': 'Tamil Nadu',
            'city': 'Coimbatore',
            'area': 'R.S. Puram',
            'timings': 'Mon - Sat: 9:00 AM - 7:00 PM, Sun: 9:00 AM - 1:00 PM',
            'appointment_info': 'Online appointment booking and walk-in consultation supported',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=The+Eye+Foundation+Coimbatore',
            'search_url': 'https://www.google.com/search?q=The+Eye+Foundation+Coimbatore',
            'latitude': 11.0082,
            'longitude': 76.9515,
            'verified': 1,
            'active': 1
        },

        # Salem Doctors
        {
            'id': 'doc-salem-01',
            'name': 'Dr. B. Manohar, MS (Ophthalmology)',
            'specialization': 'Glaucoma Consultant & Phaco Surgeon',
            'hospital': 'Aravind Eye Hospital Salem',
            'phone': '+91 427 435 6100',
            'address': '6, Sankari Main Road, Nethimedu, Salem, Tamil Nadu 636002',
            'state': 'Tamil Nadu',
            'city': 'Salem',
            'area': 'Nethimedu',
            'timings': 'Mon - Sat: 8:00 AM - 5:30 PM, Sun: Closed',
            'appointment_info': 'Direct walk-in registration and scheduled glaucoma clinic',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Salem',
            'search_url': 'https://www.google.com/search?q=Aravind+Eye+Hospital+Salem',
            'latitude': 11.6421,
            'longitude': 78.1408,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-salem-02',
            'name': 'Dr. K. Senthil Kumar, MBBS, DO',
            'specialization': 'Comprehensive Ophthalmology & Glaucoma Screening Specialist',
            'hospital': 'Dr. Agarwal\'s Eye Hospital Salem',
            'phone': '+91 427 455 2800',
            'address': '5/185, Meyyanur Bypass Road, Near New Bus Stand, Salem, Tamil Nadu 636004',
            'state': 'Tamil Nadu',
            'city': 'Salem',
            'area': 'Meyyanur',
            'timings': 'Mon - Sat: 9:00 AM - 8:00 PM, Sun: 9:00 AM - 1:00 PM',
            'appointment_info': 'Telephone booking and walk-in consultation available',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Dr+Agarwals+Eye+Hospital+Salem',
            'search_url': 'https://www.google.com/search?q=Dr+Agarwals+Eye+Hospital+Salem',
            'latitude': 11.6669,
            'longitude': 78.1362,
            'verified': 1,
            'active': 1
        },

        # Erode Doctors
        {
            'id': 'doc-erode-01',
            'name': 'Dr. S. Kalpana, MBBS, MS (Ophthalmology)',
            'specialization': 'Glaucoma & Anterior Segment Specialist',
            'hospital': 'Aravind Eye Hospital Erode',
            'phone': '+91 424 228 8888',
            'address': 'Perundurai Road, Near Collectorate, Erode, Tamil Nadu 638011',
            'state': 'Tamil Nadu',
            'city': 'Erode',
            'area': 'Perundurai Road',
            'timings': 'Mon - Sat: 8:00 AM - 5:30 PM, Sun: Closed',
            'appointment_info': 'Outpatient registration at hospital desk or phone booking',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Erode',
            'search_url': 'https://www.google.com/search?q=Aravind+Eye+Hospital+Erode',
            'latitude': 11.3410,
            'longitude': 77.7172,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-erode-02',
            'name': 'Dr. M. Shanmugam, MS, DO',
            'specialization': 'Chief Eye Surgeon & Glaucoma Care Consultant',
            'hospital': 'Erode Eye Hospital',
            'phone': '+91 424 225 9060',
            'address': '17, Gandhiji Road, Surampatti Four Roads, Erode, Tamil Nadu 638009',
            'state': 'Tamil Nadu',
            'city': 'Erode',
            'area': 'Surampatti',
            'timings': 'Mon - Sat: 9:30 AM - 7:30 PM, Sun: 9:30 AM - 1:00 PM',
            'appointment_info': 'Direct front desk booking and phone consultation scheduling',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Erode+Eye+Hospital',
            'search_url': 'https://www.google.com/search?q=Erode+Eye+Hospital',
            'latitude': 11.3325,
            'longitude': 77.7241,
            'verified': 1,
            'active': 1
        },

        # Namakkal Doctors
        {
            'id': 'doc-namakkal-01',
            'name': 'Dr. P. Subramaniam, MBBS, MS, DO',
            'specialization': 'Senior Ophthalmic Surgeon & Glaucoma Clinic',
            'hospital': 'Namakkal Eye Hospital',
            'phone': '+91 4286 221 444',
            'address': 'Mohanur Road, Near Bus Stand, Namakkal, Tamil Nadu 637001',
            'state': 'Tamil Nadu',
            'city': 'Namakkal',
            'area': 'Mohanur Road',
            'timings': 'Mon - Sat: 9:00 AM - 8:00 PM, Sun: 9:00 AM - 1:00 PM',
            'appointment_info': 'Consultation available via telephone booking or walk-in registration',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Namakkal+Eye+Hospital',
            'search_url': 'https://www.google.com/search?q=Namakkal+Eye+Hospital',
            'latitude': 11.2189,
            'longitude': 78.1674,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-namakkal-02',
            'name': 'Dr. R. Deepa, MBBS, DO, DNB',
            'specialization': 'Anterior Segment, Glaucoma & Medical Retina Consultant',
            'hospital': 'Vasan Eye Care Hospital Namakkal',
            'phone': '+91 4286 398 900',
            'address': 'Trichy Main Road, Opp. SP Camp Office, Namakkal, Tamil Nadu 637002',
            'state': 'Tamil Nadu',
            'city': 'Namakkal',
            'area': 'Trichy Main Road',
            'timings': 'Mon - Sat: 9:00 AM - 7:00 PM, Sun: Closed',
            'appointment_info': 'Direct appointments through central helpdesk or hospital reception',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Vasan+Eye+Care+Namakkal',
            'search_url': 'https://www.google.com/search?q=Vasan+Eye+Care+Namakkal',
            'latitude': 11.2224,
            'longitude': 78.1720,
            'verified': 1,
            'active': 1
        },

        # Tiruchirappalli Doctors
        {
            'id': 'doc-trichy-01',
            'name': 'Dr. Nelson Jesudasan, MS, FRCS (Edin)',
            'specialization': 'Glaucoma Consultant & Director of Ophthalmology',
            'hospital': 'Joseph Eye Hospital Tiruchirappalli',
            'phone': '+91 431 246 0622',
            'address': 'Melapudur, Cantonment, Tiruchirappalli, Tamil Nadu 620001',
            'state': 'Tamil Nadu',
            'city': 'Tiruchirappalli',
            'area': 'Melapudur',
            'timings': 'Mon - Sat: 8:30 AM - 6:30 PM, Sun: 9:00 AM - 1:00 PM',
            'appointment_info': 'Apex specialty glaucoma clinic; appointment booking advised',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Joseph+Eye+Hospital+Trichy',
            'search_url': 'https://www.google.com/search?q=Joseph+Eye+Hospital+Trichy',
            'latitude': 10.8055,
            'longitude': 78.6922,
            'verified': 1,
            'active': 1
        },
        {
            'id': 'doc-trichy-02',
            'name': 'Dr. R. Meenakshi, MS (Ophthalmology)',
            'specialization': 'Glaucoma Specialist & Senior Consultant',
            'hospital': 'Aravind Eye Hospital Tiruchirappalli',
            'phone': '+91 431 245 9200',
            'address': 'Pudukkottai Main Road, Near Airport, Tiruchirappalli, Tamil Nadu 620007',
            'state': 'Tamil Nadu',
            'city': 'Tiruchirappalli',
            'area': 'Pudukkottai Road',
            'timings': 'Mon - Sat: 8:00 AM - 5:30 PM, Sun: Closed',
            'appointment_info': 'Walk-in registration and scheduled specialist clinics',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Trichy',
            'search_url': 'https://www.google.com/search?q=Aravind+Eye+Hospital+Trichy',
            'latitude': 10.7745,
            'longitude': 78.7103,
            'verified': 1,
            'active': 1
        },

        # Madurai Doctors
        {
            'id': 'doc-madurai-01',
            'name': 'Dr. R. Ramakrishnan, MS, DO',
            'specialization': 'Senior Glaucoma Consultant & Advisor',
            'hospital': 'Aravind Eye Hospital Apex Centre Madurai',
            'phone': '+91 452 435 6100',
            'address': '1, Anna Nagar, Kuruvikaran Salai, Madurai, Tamil Nadu 625020',
            'state': 'Tamil Nadu',
            'city': 'Madurai',
            'area': 'Anna Nagar',
            'timings': 'Mon - Sat: 7:30 AM - 6:00 PM, Sun: 8:00 AM - 12:00 PM',
            'appointment_info': 'Comprehensive tertiary referral glaucoma center; walk-in and online booking',
            'maps_url': 'https://www.google.com/maps/search/?api=1&query=Aravind+Eye+Hospital+Madurai',
            'search_url': 'https://www.google.com/search?q=Aravind+Eye+Hospital+Madurai',
            'latitude': 9.9252,
            'longitude': 78.1465,
            'verified': 1,
            'active': 1
        }
    ]

    now = datetime.utcnow().isoformat(timespec='seconds') + 'Z'
    with db_cursor() as cur:
        for doc in doctors:
            cur.execute("""
            INSERT INTO doctors (
                id, name, specialization, hospital, phone, address, state, city, area,
                timings, appointment_info, maps_url, search_url, latitude, longitude,
                verified, active, created_at
            ) VALUES (
                %(id)s, %(name)s, %(specialization)s, %(hospital)s, %(phone)s, %(address)s,
                %(state)s, %(city)s, %(area)s, %(timings)s, %(appointment_info)s,
                %(maps_url)s, %(search_url)s, %(latitude)s, %(longitude)s,
                %(verified)s, %(active)s, %(created_at)s
            ) ON DUPLICATE KEY UPDATE
                name=VALUES(name), specialization=VALUES(specialization), hospital=VALUES(hospital),
                phone=VALUES(phone), address=VALUES(address), city=VALUES(city), area=VALUES(area),
                timings=VALUES(timings), appointment_info=VALUES(appointment_info),
                maps_url=VALUES(maps_url), search_url=VALUES(search_url),
                verified=VALUES(verified), active=VALUES(active);
            """, {**doc, 'created_at': now})

def seed_daily_tips():
    """Seed comprehensive, medically reviewed general eye care tips for deterministic daily rotation."""
    tips = [
        {
            'tip_index': 0,
            'category': 'Screen Care',
            'title_en': 'Follow the 20-20-20 Rule for Digital Strain',
            'title_ta': 'டிஜிட்டல் கண் சோர்வுக்கு 20-20-20 விதியைப் பின்பற்றுங்கள்',
            'title_hi': 'डिजिटल तनाव के लिए 20-20-20 नियम का पालन करें',
            'content_en': 'Every 20 minutes spent looking at a screen, shift your gaze to an object at least 20 feet away for 20 seconds. This allows the ciliary muscles in your eyes to relax and significantly prevents digital eye strain.',
            'content_ta': 'திரையைப் பார்க்கும் ஒவ்வொரு 20 நிமிடங்களுக்கும், குறைந்தது 20 அடி தூரத்தில் உள்ள ஒரு பொருளை 20 விநாடிகள் பாருங்கள். இது கண் தசைகளை தளர்த்த உதவுகிறது.',
            'content_hi': 'स्क्रीन देखते समय हर 20 मिनट में कम से कम 20 फीट दूर किसी वस्तु को 20 सेकंड के लिए देखें। इससे आँखों की मांसपेशियों को आराम मिलता है।'
        },
        {
            'tip_index': 1,
            'category': 'Lighting & Ergonomics',
            'title_en': 'Optimize Ambient Lighting and Reduce Glare',
            'title_ta': 'சரியான வெளிச்சம் அமைத்து கண் கூச்சத்தைக் குறையுங்கள்',
            'title_hi': 'पर्याप्त रोशनी रखें और चकाचौंध कम करें',
            'content_en': 'Position light sources so they do not reflect directly off computer screens or reading material. Harsh backlight and excessive contrast force your pupils to work harder, causing rapid eye fatigue.',
            'content_ta': 'படிக்கும் அல்லது கணினி திரையில் நேரடியாக வெளிச்சம் எதிரொலிக்காதவாறு விளக்குகளை அமையுங்கள். அதிக ஒளி மாறுபாடு கண்களுக்கு சோர்வை ஏற்படுத்தும்.',
            'content_hi': 'रोशनी ऐसे रखें कि स्क्रीन या पढ़ने की सामग्री पर सीधी चमक न पड़े। अत्यधिक चमक से आँखों पर अतिरिक्त दबाव पड़ता है।'
        },
        {
            'tip_index': 2,
            'category': 'Hygiene',
            'title_en': 'Practice Safe Contact Lens Hygiene',
            'title_ta': 'காண்டாக்ட் லென்ஸ்களை சுகாதாரமாகப் பயன்படுத்துங்கள்',
            'title_hi': 'कॉन्टैक्ट लेंस की स्वच्छता का ध्यान रखें',
            'content_en': 'Always wash and dry hands thoroughly before handling contact lenses. Never use tap water or saliva to clean lenses, and replace your lens storage case at least once every three months to prevent bacterial keratitis.',
            'content_ta': 'லென்ஸ்களைத் தொடுவதற்கு முன் கைகளை சோப்பால் கழுவி உலர்த்துங்கள். குழாய் நீரால் ஒருபோதும் லென்ஸ்களைக் கழுவ வேண்டாம்.',
            'content_hi': 'लेंस छूने से पहले हाथ अच्छी तरह धोएं। लेंस साफ करने के लिए कभी भी नल के पानी का उपयोग न करें और केस को नियमित रूप से बदलें।'
        },
        {
            'tip_index': 3,
            'category': 'UV Protection',
            'title_en': 'Shield Your Eyes from UV Radiation',
            'title_ta': 'புற ஊதா கதிர்களிலிருந்து கண்களைப் பாதுகாக்கவும்',
            'title_hi': 'पराबैंगनी किरणों से आँखों की रक्षा करें',
            'content_en': 'Wear sunglasses that block 99% to 100% of both UVA and UVB rays when outdoors. Long-term UV exposure increases the risk of cataracts, pterygium, and macular changes.',
            'content_ta': 'வெளியில் செல்லும்போது 99% முதல் 100% UVA மற்றும் UVB கதிர்களைத் தடுக்கும் தரமான கூலிங் கண்ணாடிகளை அணியுங்கள்.',
            'content_hi': 'धूप में निकलते समय 99% से 100% UVA और UVB किरणों को रोकने वाले धूप के चश्मे का प्रयोग करें।'
        },
        {
            'tip_index': 4,
            'category': 'Routine Care',
            'title_en': 'Schedule Routine Comprehensive Eye Exams',
            'title_ta': 'வழக்கமான விரிவான கண் பரிசோதனை செய்யுங்கள்',
            'title_hi': 'नियमित और व्यापक नेत्र जाँच कराएँ',
            'content_en': 'Glaucoma is often called the "silent thief of sight" because peripheral vision loss occurs gradually without early pain. A comprehensive dilated eye exam is the only reliable way to detect optic nerve changes early.',
            'content_ta': 'குளுக்கோமா ஆரம்பத்தில் வலி இல்லாமல் பார்வை நரம்பைப் பாதிக்கும். வழக்கமான மருத்துவக் கண் பரிசோதனை மட்டுமே ஆரம்ப நிலையிலேயே இதனைக் கண்டறிய உதவும்.',
            'content_hi': 'ग्लूकोमा अक्सर बिना किसी दर्द के धीरे-धीरे बढ़ता है। ऑप्टिक तंत्रिका में शुरुआती बदलावों का पता लगाने का एकमात्र तरीका नियमित नेत्र जाँच है।'
        },
        {
            'tip_index': 5,
            'category': 'Nutrition & Hydration',
            'title_en': 'Support Tear Film Stability with Hydration',
            'title_ta': 'போதுமான நீர்ச்சத்து மற்றும் ஊட்டச்சத்து உட்கொள்ளுங்கள்',
            'title_hi': 'आँखों में नमी बनाए रखने के लिए पर्याप्त पानी पिएं',
            'content_en': 'Drink adequate water throughout the day and include foods rich in Omega-3 fatty acids, lutein, zeaxanthin, and Vitamin C in your diet to nourish the ocular surface and reduce dry eye sensations.',
            'content_ta': 'நாள் முழுவதும் போதுமான தண்ணீர் குடியுங்கள். ஒமேகா-3 மற்றும் வைட்டமின் சி நிறைந்த உணவுகள் கண் மேற்பரப்பை ஈரப்பதத்துடன் வைத்திருக்க உதவுகிறது.',
            'content_hi': 'दिनभर पर्याप्त पानी पिएं और ओमेगा-3 व विटामिन सी युक्त संतुलित आहार लें ताकि आँखों में सूखापन न हो।'
        },
        {
            'tip_index': 6,
            'category': 'Safety',
            'title_en': 'Wear Protective Eyewear During High-Risk Activities',
            'title_ta': 'வேலை மற்றும் விளையாட்டின் போது பாதுகாப்பு கண்ணாடி அணியுங்கள்',
            'title_hi': 'जोखिम भरे कार्यों के दौरान सुरक्षात्मक चश्मा पहनें',
            'content_en': 'Use certified polycarbonate safety glasses when doing yard work, home repairs, chemical handling, or sports. Over 90% of ocular trauma can be prevented with proper eye protection.',
            'content_ta': 'தோட்ட வேலை, பழுது பார்த்தல் அல்லது விளையாட்டுகளின் போது பாதுகாப்பு கண்ணாடிகளைப் பயன்படுத்துங்கள். பெரும்பாலான கண் காயங்களைத் தடுக்கலாம்.',
            'content_hi': 'मरम्मत, बगीचे के काम या खेल के दौरान सुरक्षात्मक चश्मा पहनें। इससे अधिकांश नेत्र चोटों से बचा जा सकता है।'
        },
        {
            'tip_index': 7,
            'category': 'Eye Habits',
            'title_en': 'Avoid Aggressive Eye Rubbing',
            'title_ta': 'கண்களை அழுத்தித் தேய்ப்பதைத் தவிர்க்கவும்',
            'title_hi': 'आँखों को ज़ोर से मलने से बचें',
            'content_en': 'Rubbing your eyes vigorously can cause micro-abrasions to the cornea and transient spikes in intraocular pressure. If your eyes feel itchy or irritated, use preservative-free lubricating drops or a cool compress.',
            'content_ta': 'கண்களை வேகமாகத் தேய்ப்பது விழிவெண்படலத்தைப் பாதிக்கும் மற்றும் கண் அழுத்தத்தை அதிகரிக்கலாம். எரிச்சல் இருந்தால் குளிர்ந்த ஒத்தடம் கொடுங்கள்.',
            'content_hi': 'आँखों को ज़ोर से रगड़ने से कॉर्निया को नुकसान पहुँच सकता है और दबाव बढ़ सकता है। खुजली होने पर कृत्रिम आँसू या ठंडी सिंकाई का प्रयोग करें।'
        },
        {
            'tip_index': 8,
            'category': 'Sleep & Rest',
            'title_en': 'Ensure Adequate Restorative Sleep',
            'title_ta': 'கண்களுக்கு போதுமான இரவு தூக்கம் கொடுங்கள்',
            'title_hi': 'आँखों के स्वास्थ्य के लिए पर्याप्त नींद लें',
            'content_en': 'During deep sleep, your eyes continuously replenish their lubricating tear layers and clear out metabolic waste. Aim for 7 to 8 hours of restful sleep each night to maintain optimal ocular health.',
            'content_ta': 'தூக்கத்தின் போது கண்கள் மீண்டும் புத்துணர்ச்சி பெறுகின்றன. இரவு 7 முதல் 8 மணி நேர ஆழ்ந்த தூக்கம் கண் ஆரோக்கியத்திற்கு அவசியம்.',
            'content_hi': 'गहरी नींद के दौरान आँखों की नमी और कोशिकाएं स्वस्थ होती हैं। रोज़ाना 7 से 8 घंटे की अच्छी नींद लें।'
        }
    ]

    with db_cursor() as cur:
        for tip in tips:
            tip_id = f"tip-{tip['tip_index']:02d}"
            cur.execute("""
            INSERT INTO daily_tips (
                id, tip_index, category, title_en, title_ta, title_hi,
                content_en, content_ta, content_hi, active
            ) VALUES (
                %(id)s, %(tip_index)s, %(category)s, %(title_en)s, %(title_ta)s, %(title_hi)s,
                %(content_en)s, %(content_ta)s, %(content_hi)s, 1
            ) ON DUPLICATE KEY UPDATE
                category=VALUES(category), title_en=VALUES(title_en), title_ta=VALUES(title_ta),
                title_hi=VALUES(title_hi), content_en=VALUES(content_en), content_ta=VALUES(content_ta),
                content_hi=VALUES(content_hi);
            """, {**tip, 'id': tip_id})

def migrate_and_deduplicate_sqlite():
    """Safely migrate existing data from SQLite into MySQL and clean up duplicate analyses."""
    if not os.path.exists(SQLITE_DB):
        return

    try:
        s_conn = sqlite3.connect(SQLITE_DB)
        s_conn.row_factory = sqlite3.Row
        s_cur = s_conn.cursor()

        with db_cursor() as cur:
            # 1. Migrate Users
            users = s_cur.execute("SELECT * FROM users").fetchall()
            for u in users:
                cur.execute("""
                INSERT IGNORE INTO users (name, email, password_hash, phone, language, active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    u['name'], u['email'], u['password_hash'] or '',
                    u['phone'] if 'phone' in u.keys() else '',
                    u['language'] if 'language' in u.keys() else 'en',
                    u['active'] if 'active' in u.keys() else 1,
                    u['created_at']
                ))

            # 2. Migrate Admins
            admins = s_cur.execute("SELECT * FROM admins").fetchall()
            for a in admins:
                cur.execute("""
                INSERT IGNORE INTO admins (email, password_hash, role, created_at)
                VALUES (%s, %s, %s, %s)
                """, (
                    a['email'], a['password_hash'], a['role'],
                    datetime.utcnow().isoformat(timespec='seconds') + 'Z'
                ))

            # 3. Migrate Records
            records = s_cur.execute("SELECT * FROM records").fetchall()
            for r in records:
                now_str = r['created_at'] if 'created_at' in r.keys() else datetime.utcnow().isoformat(timespec='seconds') + 'Z'
                cur.execute("""
                INSERT IGNORE INTO records (id, user_email, title, record_type, description, filename, record_date, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    r['id'], r['user_email'], r['title'],
                    r['record_type'] or 'Eye report',
                    r['description'] or '',
                    r['filename'] or '',
                    r['record_date'] or '',
                    now_str, now_str
                ))

            # 4. Migrate and Deduplicate Analyses
            # Read all SQLite analyses ordered by created_at ASC
            analyses = s_cur.execute("SELECT * FROM analyses ORDER BY created_at ASC").fetchall()
            seen_analyses = {} # (user_email, result, score) -> last_timestamp
            dedup_count = 0

            for a in analyses:
                user = a['user_email']
                result = a['result']
                score = int(a['score'])
                created_str = a['created_at']
                
                # Check for duplicate within 60 seconds
                key = (user, result, score)
                is_duplicate = False
                try:
                    curr_dt = datetime.fromisoformat(created_str.replace('Z', ''))
                    if key in seen_analyses:
                        prev_dt = seen_analyses[key]
                        diff_sec = abs((curr_dt - prev_dt).total_seconds())
                        if diff_sec <= 60:
                            is_duplicate = True
                            dedup_count += 1
                    if not is_duplicate:
                        seen_analyses[key] = curr_dt
                except Exception:
                    pass

                if not is_duplicate:
                    cur.execute("""
                    INSERT IGNORE INTO analyses (id, user_email, result, score, details, model_version, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        a['id'], user, result, score,
                        a['details'] or '',
                        a['model_version'] or 'glaucoma-match-v1',
                        created_str
                    ))

            # 5. Migrate Reminders
            try:
                reminders = s_cur.execute("SELECT * FROM reminders").fetchall()
                for rem in reminders:
                    cur.execute("""
                    INSERT IGNORE INTO reminders (id, user_email, title, description, category, reminder_date, reminder_time, completed, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        rem['id'], rem['user_email'], rem['title'],
                        rem['description'] or '',
                        rem['category'] if 'category' in rem.keys() else 'General eye care',
                        rem['reminder_date'] or '',
                        rem['reminder_time'] if 'reminder_time' in rem.keys() else '',
                        rem['completed'] or 0,
                        rem['created_at']
                    ))
            except Exception:
                pass

            # 5b. Migrate Appointments (if exists in SQLite)
            try:
                appointments = s_cur.execute("SELECT * FROM appointments").fetchall()
                for apt in appointments:
                    cur.execute("""
                    INSERT IGNORE INTO appointments (
                        id, user_email, doctor_id, doctor_name, specialization, hospital_name, city,
                        appointment_date, appointment_time, patient_name, patient_phone, reason, status, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        apt['id'], apt['user_email'],
                        apt['doctor_id'] if 'doctor_id' in apt.keys() else '',
                        apt['doctor_name'],
                        apt['specialization'] if 'specialization' in apt.keys() else '',
                        apt['hospital_name'] if 'hospital_name' in apt.keys() else '',
                        apt['city'], apt['appointment_date'], apt['appointment_time'],
                        apt['patient_name'] if 'patient_name' in apt.keys() else '',
                        apt['patient_phone'] if 'patient_phone' in apt.keys() else '',
                        apt['reason'] if 'reason' in apt.keys() else '',
                        apt['status'] if 'status' in apt.keys() else 'Requested',
                        apt['created_at'],
                        apt['updated_at'] if 'updated_at' in apt.keys() else apt['created_at']
                    ))
            except Exception:
                pass

            # 6. Migrate Settings
            settings = s_cur.execute("SELECT * FROM settings").fetchall()
            for s in settings:
                cur.execute("""
                INSERT INTO settings (`key`, value) VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE value=VALUES(value)
                """, (s['key'], s['value']))

            # 7. Migrate Articles
            articles = s_cur.execute("SELECT * FROM articles").fetchall()
            for art in articles:
                cur.execute("""
                INSERT IGNORE INTO articles (id, category, title_en, title_ta, title_hi, content_en, content_ta, content_hi, image, published, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    art['id'], art['category'], art['title_en'],
                    art['title_ta'] or '', art['title_hi'] or '',
                    art['content_en'] or '', art['content_ta'] or '', art['content_hi'] or '',
                    art['image'] or '', art['published'] or 1,
                    art['created_at'], art['updated_at']
                ))

        s_conn.close()
        print(f" * SQLite data migration complete. Cleaned {dedup_count} historical duplicate analyses.")
    except Exception as e:
        print(f" * Migration note: {e}")

def seed_defaults():
    """Ensure baseline admin account, settings, and welcome article exist."""
    now = datetime.utcnow().isoformat(timespec='seconds') + 'Z'
    with db_cursor() as cur:
        # Check admin
        cur.execute("SELECT id FROM admins LIMIT 1")
        if not cur.fetchone():
            email = os.environ.get('DRISHTI_ADMIN_EMAIL', 'admin@drishti.local')
            password = os.environ.get('DRISHTI_ADMIN_PASSWORD', 'ChangeMe123!')
            cur.execute(
                "INSERT INTO admins (email, password_hash, role, created_at) VALUES (%s, %s, %s, %s)",
                (email, generate_password_hash(password), 'ADMIN', now)
            )

        # Baseline settings
        for k, v in [('site_name', 'Drishti'), ('supported_languages', 'en,ta,hi'), ('easy_mode_default', '0')]:
            cur.execute(
                "INSERT INTO settings (`key`, value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE value=value",
                (k, v)
            )

        # Baseline article
        cur.execute("SELECT id FROM articles LIMIT 1")
        if not cur.fetchone():
            cur.execute("""
            INSERT INTO articles (id, category, title_en, title_ta, title_hi, content_en, content_ta, content_hi, image, published, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                'welcome', 'Eye-care',
                'Understanding routine eye exams',
                'வழக்கமான கண் பரிசோதனைகள்',
                'नियमित नेत्र जाँच को समझना',
                'Regular eye examinations can help identify issues early. This sample article is educational and does not replace professional care.',
                'வழக்கமான கண் பரிசோதனைகள் கண் பிரச்சினைகளை ஆரம்பத்திலேயே கண்டறிய உதவும்.',
                'नियमित नेत्र जांच समस्याओं का जल्दी पता लगाने में मदद कर सकती है।',
                '', 1, now, now
            ))

def setup_all():
    """Run full MySQL initialization: tables, seeds, migration, and deduplication."""
    print(" * Connecting to MySQL and initializing schema...")
    init_mysql_tables()
    print(" * Seeding eye doctors for Karur and Tiruchengode...")
    seed_doctors()
    print(" * Seeding daily eye health tips...")
    seed_daily_tips()
    print(" * Seeding baseline settings & admins...")
    seed_defaults()
    print(" * Migrating and deduplicating existing SQLite data...")
    migrate_and_deduplicate_sqlite()
    print(" * MySQL database setup successfully completed.")

if __name__ == '__main__':
    setup_all()
