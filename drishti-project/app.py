import os
import json
import uuid
from datetime import datetime, timezone
from flask import Flask, render_template, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import urllib.request
import urllib.parse

from db import (
    db_cursor, setup_all, seed_doctors, seed_daily_tips,
    MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER
)

BASE = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.secret_key = os.environ.get('DRISHTI_SECRET_KEY', 'dev-only-change-this-before-deployment')
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
ALLOWED_RECORD_EXTS = {'png', 'jpg', 'jpeg', 'webp', 'pdf'}
ALLOWED_IMAGE_EXTS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_ANALYZE_BYTES = 5 * 1024 * 1024

@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY') or os.environ.get('GOOGLE_PLACES_API_KEY')

def get_utc_now_iso():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')

def admin_required():
    return session.get('admin_role') == 'ADMIN'

def audit(action, entity, entity_id='', old=None, new=None):
    now = get_utc_now_iso()
    with db_cursor() as cur:
        cur.execute("""
        INSERT INTO audit_logs (admin_email, action, entity_type, entity_id, old_value, new_value, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            session.get('admin_email', 'unknown'),
            action, entity, str(entity_id),
            json.dumps(old, ensure_ascii=False) if old else '',
            json.dumps(new, ensure_ascii=False) if new else '',
            now
        ))

# ============================================================================
# Page Routes
# ============================================================================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# ============================================================================
# Admin Authentication & Management
# ============================================================================
@app.route('/api/admin/session')
def admin_session():
    return jsonify({
        'authenticated': admin_required(),
        'email': session.get('admin_email')
    })

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    with db_cursor() as cur:
        cur.execute("SELECT * FROM admins WHERE email = %s", (email,))
        admin_row = cur.fetchone()
    if not admin_row or not check_password_hash(admin_row['password_hash'], password):
        return jsonify({'error': 'Email or password is incorrect.'}), 401

    session.clear()
    session['admin_email'] = admin_row['email']
    session['admin_role'] = admin_row['role']
    return jsonify({'ok': True})

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.clear()
    return jsonify({'ok': True})

@app.route('/api/admin/change-password', methods=['POST'])
def change_password():
    if not admin_required():
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json(silent=True) or {}
    pw = str(data.get('password', ''))
    if len(pw) < 12:
        return jsonify({'error': 'Use at least 12 characters.'}), 400
    with db_cursor() as cur:
        cur.execute(
            "UPDATE admins SET password_hash = %s WHERE email = %s",
            (generate_password_hash(pw), session['admin_email'])
        )
    audit('changed password', 'admin', session['admin_email'])
    return jsonify({'ok': True})

# ============================================================================
# User Authentication & Public Session
# ============================================================================
@app.route('/api/public/session')
def public_session():
    email = session.get('user_email')
    if not email:
        return jsonify({'authenticated': False})
    with db_cursor() as cur:
        cur.execute("SELECT name, email, language FROM users WHERE email = %s AND active = 1", (email,))
        user = cur.fetchone()
    if not user:
        session.pop('user_email', None)
        session.pop('user_name', None)
        return jsonify({'authenticated': False})
    return jsonify({'authenticated': True, 'user': dict(user)})

@app.route('/api/public/register', methods=['POST'])
def public_register():
    d = request.get_json(silent=True) or {}
    name = str(d.get('name', '')).strip()[:100]
    email = str(d.get('email', '')).strip().lower()[:254]
    password = str(d.get('password', ''))
    language = str(d.get('language', 'en'))

    if not name or '@' not in email or '.' not in email.rsplit('@', 1)[-1]:
        return jsonify({'error': 'Enter your name and a valid email address.'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Use a password with at least 8 characters.'}), 400

    now = get_utc_now_iso()
    with db_cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'An account with this email already exists. Please sign in.'}), 409
        cur.execute("""
        INSERT INTO users (name, email, password_hash, language, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """, (name, email, generate_password_hash(password), language, now))

    session.pop('admin_email', None)
    session.pop('admin_role', None)
    session['user_email'] = email
    session['user_name'] = name
    return jsonify({'ok': True, 'user': {'name': name, 'email': email, 'language': language}}), 201

@app.route('/api/public/login', methods=['POST'])
def public_login():
    d = request.get_json(silent=True) or {}
    email = str(d.get('email', '')).strip().lower()
    password = str(d.get('password', ''))
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE email = %s AND active = 1", (email,))
        user = cur.fetchone()

    if not user or not user['password_hash'] or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Email or password is incorrect.'}), 401

    session.pop('admin_email', None)
    session.pop('admin_role', None)
    session['user_email'] = user['email']
    session['user_name'] = user['name']
    return jsonify({'ok': True, 'user': {'name': user['name'], 'email': user['email'], 'language': user['language']}})

@app.route('/api/public/logout', methods=['POST'])
def public_logout():
    session.pop('user_email', None)
    session.pop('user_name', None)
    return jsonify({'ok': True})

# ============================================================================
# Feature One: Find Doctor API
# ============================================================================
@app.route('/api/public/doctors')
def get_doctors():
    city = request.args.get('city', '').strip()
    with db_cursor() as cur:
        if city:
            cur.execute(
                "SELECT * FROM doctors WHERE active = 1 AND LOWER(city) = LOWER(%s) ORDER BY verified DESC, name ASC",
                (city,)
            )
        else:
            cur.execute("SELECT * FROM doctors WHERE active = 1 ORDER BY city ASC, verified DESC, name ASC")
        rows = cur.fetchall()

    # Optional Google Places integration if key is configured
    if GOOGLE_MAPS_API_KEY and city and len(rows) < 3:
        try:
            query = urllib.parse.quote(f"eye hospital doctor in {city} Tamil Nadu")
            url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={query}&key={GOOGLE_MAPS_API_KEY}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Drishti-EyeHealth/1.0'})
            with urllib.request.urlopen(req, timeout=4) as response:
                place_data = json.loads(response.read().decode('utf-8'))
                if place_data.get('results'):
                    for place in place_data['results'][:3]:
                        rows.append({
                            'id': f"place-{place.get('place_id', str(uuid.uuid4()))}",
                            'name': place.get('name', 'Eye Specialist Clinic'),
                            'specialization': 'Ophthalmology & Vision Care',
                            'hospital': place.get('name', ''),
                            'phone': 'Contact directly on location',
                            'address': place.get('formatted_address', f"{city}, Tamil Nadu"),
                            'city': city,
                            'state': 'Tamil Nadu',
                            'timings': 'Check Google Maps listing for live operating hours',
                            'appointment_info': 'Please call or visit clinic to confirm availability',
                            'maps_url': f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(place.get('name', city))}",
                            'search_url': f"https://www.google.com/search?q={urllib.parse.quote(place.get('name', city))}",
                            'verified': 1 if place.get('rating', 0) >= 4.0 else 0,
                            'active': 1
                        })
        except Exception:
            # Graceful fallback to verified database records on any external API failure
            pass

    return jsonify([dict(r) for r in rows])

# ============================================================================
# Feature Four: Eye Health — Daily Eye Care Tips
# ============================================================================
@app.route('/api/public/daily-tips')
def get_daily_tips():
    """
    Returns exactly three deterministic eye care tips for the selected date.
    Refreshing or revisiting the site on the same day always returns the same 3 tips.
    """
    date_param = request.args.get('date', '').strip()
    if date_param:
        try:
            target_date = datetime.strptime(date_param, '%Y-%m-%d')
        except ValueError:
            target_date = datetime.now()
    else:
        target_date = datetime.now()

    with db_cursor() as cur:
        cur.execute("SELECT * FROM daily_tips WHERE active = 1 ORDER BY tip_index ASC")
        all_tips = cur.fetchall()

    if not all_tips:
        seed_daily_tips()
        with db_cursor() as cur:
            cur.execute("SELECT * FROM daily_tips WHERE active = 1 ORDER BY tip_index ASC")
            all_tips = cur.fetchall()

    total_tips = len(all_tips)
    if total_tips == 0:
        return jsonify({'tips': [], 'date': target_date.strftime('%Y-%m-%d')})

    # Deterministic rotational offset based on the day
    # Day-of-year + year seed ensures consistent daily cycling
    day_seed = target_date.timetuple().tm_yday + (target_date.year * 365)
    start_index = day_seed % total_tips

    selected_tips = []
    for i in range(3):
        idx = (start_index + i) % total_tips
        selected_tips.append(dict(all_tips[idx]))

    return jsonify({
        'date': target_date.strftime('%Y-%m-%d'),
        'display_date': target_date.strftime('%B %d, %Y'),
        'tips': selected_tips,
        'disclaimer': 'Educational eye care tips only. General eye health tips do not diagnose, treat, or cure glaucoma. Always consult an eye care specialist for personalized medical advice.'
    })

# ============================================================================
# Feature Three & Five: AI Glaucoma Screening Persistence (with Idempotency)
# ============================================================================
@app.route('/api/public/analysis', methods=['POST'])
def save_analysis():
    """
    Persist screening result associated with the signed-in user.
    Prevents duplicate saves using:
    1. Optional client idempotency key (unique per screening instance)
    2. 60-second time-window check for identical (user, result, score)
    """
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to save screening results to your personal journey.'}), 401

    d = request.get_json(silent=True) or {}
    result = str(d.get('result', 'Glaucoma screening result'))[:80]
    score = max(0, min(100, int(d.get('score', 0))))
    confidence = str(d.get('confidence', ''))[:20]
    cdr = d.get('cdr')
    cdr_val = float(cdr) if cdr is not None and str(cdr).replace('.', '', 1).isdigit() else None
    iop = str(d.get('iop', ''))[:50]
    model_version = str(d.get('model_version', 'glaucoma-match-v1'))[:50]
    idempotency_key = str(d.get('idempotency_key') or d.get('id') or '').strip()[:128]
    details_json = json.dumps(d.get('details', []), ensure_ascii=False)
    now = get_utc_now_iso()

    with db_cursor() as cur:
        # 1. Idempotency Key check: if already saved with this key for this user, return existing
        if idempotency_key:
            cur.execute("""
            SELECT id, user_email, result, score, confidence, cdr, iop, model_version, created_at
            FROM analyses
            WHERE user_email = %s AND idempotency_key = %s
            LIMIT 1
            """, (user_email, idempotency_key))
            existing = cur.fetchone()
            if existing:
                return jsonify({'id': existing['id'], 'created_at': existing['created_at'], 'duplicate': True}), 200

        # 2. Window check: prevent duplicate requests sent within 60 seconds with identical outcome
        cur.execute("""
        SELECT id, created_at
        FROM analyses
        WHERE user_email = %s AND result = %s AND score = %s
        ORDER BY created_at DESC
        LIMIT 1
        """, (user_email, result, score))
        recent = cur.fetchone()
        if recent:
            try:
                rec_dt = datetime.fromisoformat(recent['created_at'].replace('Z', ''))
                curr_dt = datetime.fromisoformat(now.replace('Z', ''))
                if abs((curr_dt - rec_dt).total_seconds()) <= 60:
                    return jsonify({'id': recent['id'], 'created_at': recent['created_at'], 'duplicate': True}), 200
            except Exception:
                pass

        # 3. Insert cleanly with new unique UUID
        new_id = str(uuid.uuid4())
        cur.execute("""
        INSERT INTO analyses (
            id, user_email, result, score, confidence, cdr, iop,
            idempotency_key, details, model_version, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            new_id, user_email, result, score, confidence, cdr_val, iop,
            idempotency_key or None, details_json, model_version, now
        ))

    return jsonify({'id': new_id, 'created_at': now}), 201

@app.route('/api/public/analyses')
def get_analyses():
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to view your personal journey.'}), 401

    with db_cursor() as cur:
        cur.execute("""
        SELECT id, user_email, result, score, confidence, cdr, iop, details, model_version, created_at
        FROM analyses
        WHERE user_email = %s
        ORDER BY created_at DESC
        """, (user_email,))
        rows = cur.fetchall()

    return jsonify([dict(r) for r in rows])

# ============================================================================
# Feature Two: My Record — Complete CRUD Functionality
# ============================================================================
@app.route('/api/public/upload', methods=['POST'])
def upload_file():
    """Upload eye report or photo attachment securely."""
    if not session.get('user_email'):
        return jsonify({'error': 'Please sign in before attaching a file to your records.'}), 401

    f = request.files.get('file')
    if not f or not f.filename:
        return jsonify({'error': 'Choose a file first.'}), 400

    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
    if ext not in ALLOWED_RECORD_EXTS:
        return jsonify({'error': 'Supported formats: JPG, PNG, WEBP and PDF.'}), 400

    stored_name = secure_filename(f"{uuid.uuid4()}.{ext}")
    f.save(os.path.join(UPLOAD_DIR, stored_name))
    return jsonify({
        'filename': stored_name,
        'message': 'File uploaded and saved successfully.'
    }), 201

@app.route('/api/public/records', methods=['GET', 'POST'])
def records_collection():
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to access personal records.'}), 401

    if request.method == 'GET':
        with db_cursor() as cur:
            cur.execute("""
            SELECT r.*, a.result as analysis_result, a.score as analysis_score, a.confidence as analysis_confidence
            FROM records r
            LEFT JOIN analyses a ON r.analysis_id = a.id
            WHERE r.user_email = %s
            ORDER BY r.created_at DESC
            """, (user_email,))
            rows = cur.fetchall()
        return jsonify([dict(r) for r in rows])

    # POST - Create Record
    d = request.get_json(silent=True) or {}
    title = str(d.get('title', '')).strip()[:160]
    if not title:
        return jsonify({'error': 'A record title is required.'}), 400

    record_id = str(uuid.uuid4())
    record_type = str(d.get('record_type', 'Eye report'))[:80]
    description = str(d.get('description', '')).strip()[:2000]
    filename = str(d.get('filename', '')).strip()[:255]
    record_date = str(d.get('record_date', '')).strip()[:30]
    analysis_id = str(d.get('analysis_id', '')).strip()[:64] or None
    analysis_status = 'Analyzed' if analysis_id else 'None'
    now = get_utc_now_iso()

    with db_cursor() as cur:
        cur.execute("""
        INSERT INTO records (
            id, user_email, title, record_type, description, filename,
            record_date, analysis_id, analysis_status, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            record_id, user_email, title, record_type, description,
            filename, record_date, analysis_id, analysis_status, now, now
        ))

    return jsonify({'id': record_id, 'created_at': now}), 201

@app.route('/api/public/records/<ident>', methods=['GET', 'PUT', 'DELETE'])
def record_item(ident):
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to manage personal records.'}), 401

    with db_cursor() as cur:
        cur.execute("""
        SELECT r.*, a.result as analysis_result, a.score as analysis_score,
               a.confidence as analysis_confidence, a.cdr as analysis_cdr, a.iop as analysis_iop
        FROM records r
        LEFT JOIN analyses a ON r.analysis_id = a.id
        WHERE r.id = %s AND r.user_email = %s
        """, (ident, user_email))
        record = cur.fetchone()

    if not record:
        return jsonify({'error': 'Record not found or access denied.'}), 404

    # GET - View record details
    if request.method == 'GET':
        return jsonify(dict(record))

    # PUT - Edit record metadata (Title, Type, Date, Description)
    if request.method == 'PUT':
        d = request.get_json(silent=True) or {}
        new_title = str(d.get('title', '')).strip()[:160]
        if not new_title:
            return jsonify({'error': 'A record title is required.'}), 400

        new_type = str(d.get('record_type', record['record_type']))[:80]
        new_date = str(d.get('record_date', record['record_date']))[:30]
        new_desc = str(d.get('description', record['description']))[:2000]
        now = get_utc_now_iso()

        with db_cursor() as cur:
            cur.execute("""
            UPDATE records
            SET title = %s, record_type = %s, record_date = %s, description = %s, updated_at = %s
            WHERE id = %s AND user_email = %s
            """, (new_title, new_type, new_date, new_desc, now, ident, user_email))

        return jsonify({'ok': True, 'message': 'Record updated successfully.'})

    # DELETE - Delete record and safely unlink file without orphans
    if request.method == 'DELETE':
        filename_to_clean = record['filename']
        with db_cursor() as cur:
            cur.execute("DELETE FROM records WHERE id = %s AND user_email = %s", (ident, user_email))
            # Check if any other record is referencing this file
            if filename_to_clean:
                cur.execute("SELECT COUNT(*) as cnt FROM records WHERE filename = %s", (filename_to_clean,))
                still_used = cur.fetchone()['cnt'] > 0
            else:
                still_used = True

        # Clean file on disk if no other record uses it
        if filename_to_clean and not still_used:
            file_path = os.path.join(UPLOAD_DIR, filename_to_clean)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass

        return jsonify({'ok': True, 'message': 'Record deleted successfully.'})

@app.route('/api/public/files/<filename>')
def get_user_file(filename):
    """Enforce backend authorization: only the owner of the record can open the file."""
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to open personal attachments.'}), 401

    safe = secure_filename(filename)
    if safe != filename:
        return jsonify({'error': 'Invalid file name.'}), 400

    with db_cursor() as cur:
        cur.execute(
            "SELECT 1 FROM records WHERE user_email = %s AND filename = %s LIMIT 1",
            (user_email, safe)
        )
        owned = cur.fetchone()

    if not owned:
        return jsonify({'error': 'Attachment not found in your authorized records.'}), 404

    return send_from_directory(UPLOAD_DIR, safe, as_attachment=False, conditional=True)

# ============================================================================
# Reminders API
# ============================================================================
# Reminders API (CRUD)
# ============================================================================
@app.route('/api/public/reminders', methods=['GET', 'POST'])
def user_reminders():
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to save and view personal reminders.'}), 401

    if request.method == 'GET':
        with db_cursor() as cur:
            cur.execute("""
            SELECT id, user_email, title, description, category, reminder_date, reminder_time, completed, created_at
            FROM reminders
            WHERE user_email = %s
            ORDER BY completed ASC, reminder_date ASC, created_at DESC
            """, (user_email,))
            rows = cur.fetchall()
        return jsonify([dict(r) for r in rows])

    d = request.get_json(silent=True) or {}
    title = str(d.get('title', '')).strip()[:200]
    if not title:
        return jsonify({'error': 'A reminder title is required.'}), 400

    ident = str(uuid.uuid4())
    now = get_utc_now_iso()
    category = str(d.get('category', 'General eye care')).strip()[:100] or 'General eye care'
    reminder_date = str(d.get('reminder_date', '')).strip()[:50]
    reminder_time = str(d.get('reminder_time', '')).strip()[:50]
    description = str(d.get('description', '')).strip()[:1000]
    completed = 1 if str(d.get('completed')).lower() in ('1', 'true', 'yes') else 0

    with db_cursor() as cur:
        cur.execute("""
        INSERT INTO reminders (id, user_email, title, description, category, reminder_date, reminder_time, completed, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            ident, user_email, title, description, category,
            reminder_date, reminder_time, completed, now
        ))

    return jsonify({
        'id': ident,
        'user_email': user_email,
        'title': title,
        'description': description,
        'category': category,
        'reminder_date': reminder_date,
        'reminder_time': reminder_time,
        'completed': completed,
        'created_at': now
    }), 201

@app.route('/api/public/reminders/<ident>', methods=['PUT', 'DELETE'])
def single_reminder(ident):
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to manage personal reminders.'}), 401

    ident = str(ident).strip()
    with db_cursor() as cur:
        cur.execute("SELECT * FROM reminders WHERE id = %s AND user_email = %s", (ident, user_email))
        existing = cur.fetchone()

    if not existing:
        return jsonify({'error': 'Reminder not found or unauthorized.'}), 404

    if request.method == 'DELETE':
        with db_cursor() as cur:
            cur.execute("DELETE FROM reminders WHERE id = %s AND user_email = %s", (ident, user_email))
        return jsonify({'ok': True, 'id': ident, 'message': 'Reminder deleted successfully.'})

    d = request.get_json(silent=True) or {}
    new_title = str(d.get('title', existing['title'])).strip()[:200]
    if not new_title:
        return jsonify({'error': 'Reminder title cannot be empty.'}), 400

    new_desc = str(d.get('description', existing.get('description') or '')).strip()[:1000]
    new_cat = str(d.get('category', existing.get('category') or 'General eye care')).strip()[:100]
    new_date = str(d.get('reminder_date', existing.get('reminder_date') or '')).strip()[:50]
    new_time = str(d.get('reminder_time', existing.get('reminder_time') or '')).strip()[:50]

    completed_val = d.get('completed')
    if completed_val is not None:
        new_completed = 1 if str(completed_val).lower() in ('1', 'true', 'yes') else 0
    else:
        new_completed = existing.get('completed', 0)

    with db_cursor() as cur:
        cur.execute("""
        UPDATE reminders
        SET title = %s, description = %s, category = %s, reminder_date = %s, reminder_time = %s, completed = %s
        WHERE id = %s AND user_email = %s
        """, (
            new_title, new_desc, new_cat, new_date, new_time, new_completed, ident, user_email
        ))

    return jsonify({
        'id': ident,
        'user_email': user_email,
        'title': new_title,
        'description': new_desc,
        'category': new_cat,
        'reminder_date': new_date,
        'reminder_time': new_time,
        'completed': new_completed
    })

# ============================================================================
# Appointments API (CRUD with Strict Data Accuracy)
# ============================================================================
@app.route('/api/public/appointments', methods=['GET', 'POST'])
def user_appointments():
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to access your appointments.'}), 401

    if request.method == 'GET':
        with db_cursor() as cur:
            cur.execute("""
            SELECT id, user_email, doctor_id, doctor_name, specialization, hospital_name, city,
                   appointment_date, appointment_time, patient_name, patient_phone, reason, status, created_at, updated_at
            FROM appointments
            WHERE user_email = %s
            ORDER BY appointment_date ASC, created_at DESC
            """, (user_email,))
            rows = cur.fetchall()
        return jsonify([dict(r) for r in rows])

    d = request.get_json(silent=True) or {}
    doctor_name = str(d.get('doctor_name', '')).strip()[:255]
    appointment_date = str(d.get('appointment_date', '')).strip()[:50]
    appointment_time = str(d.get('appointment_time', '')).strip()[:50]
    patient_name = str(d.get('patient_name', session.get('user_name', ''))).strip()[:100]
    patient_phone = str(d.get('patient_phone', '')).strip()[:50]

    if not doctor_name:
        return jsonify({'error': 'A doctor name is required for appointment booking.'}), 400
    if not appointment_date:
        return jsonify({'error': 'Appointment date is required.'}), 400
    if not appointment_time:
        return jsonify({'error': 'Appointment time is required.'}), 400
    if not patient_name:
        return jsonify({'error': 'Patient name is required.'}), 400
    if not patient_phone:
        return jsonify({'error': 'Patient contact phone is required.'}), 400

    ident = str(uuid.uuid4())
    now = get_utc_now_iso()
    doctor_id = str(d.get('doctor_id', '')).strip()[:64]
    specialization = str(d.get('specialization', '')).strip()[:255]
    hospital_name = str(d.get('hospital_name', '')).strip()[:255]
    city = str(d.get('city', 'Karur')).strip()[:100]
    reason = str(d.get('reason', '')).strip()[:1000]
    status = 'Requested'

    with db_cursor() as cur:
        cur.execute("""
        INSERT INTO appointments (
            id, user_email, doctor_id, doctor_name, specialization, hospital_name, city,
            appointment_date, appointment_time, patient_name, patient_phone, reason, status, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            ident, user_email, doctor_id, doctor_name, specialization, hospital_name, city,
            appointment_date, appointment_time, patient_name, patient_phone, reason, status, now, now
        ))

    return jsonify({
        'id': ident,
        'user_email': user_email,
        'doctor_id': doctor_id,
        'doctor_name': doctor_name,
        'specialization': specialization,
        'hospital_name': hospital_name,
        'city': city,
        'appointment_date': appointment_date,
        'appointment_time': appointment_time,
        'patient_name': patient_name,
        'patient_phone': patient_phone,
        'reason': reason,
        'status': status,
        'created_at': now,
        'updated_at': now
    }), 201

@app.route('/api/public/appointments/<ident>', methods=['PUT', 'DELETE'])
def single_appointment(ident):
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to manage appointments.'}), 401

    ident = str(ident).strip()
    with db_cursor() as cur:
        cur.execute("SELECT * FROM appointments WHERE id = %s AND user_email = %s", (ident, user_email))
        existing = cur.fetchone()

    if not existing:
        return jsonify({'error': 'Appointment record not found or unauthorized.'}), 404

    if request.method == 'DELETE':
        with db_cursor() as cur:
            cur.execute("DELETE FROM appointments WHERE id = %s AND user_email = %s", (ident, user_email))
        return jsonify({'ok': True, 'id': ident, 'message': 'Appointment record deleted successfully.'})

    d = request.get_json(silent=True) or {}
    now = get_utc_now_iso()
    new_status = str(d.get('status', existing['status'])).strip()[:50]
    new_reason = str(d.get('reason', existing.get('reason') or '')).strip()[:1000]

    with db_cursor() as cur:
        cur.execute("""
        UPDATE appointments
        SET status = %s, reason = %s, updated_at = %s
        WHERE id = %s AND user_email = %s
        """, (new_status, new_reason, now, ident, user_email))

    return jsonify({
        'id': ident,
        'status': new_status,
        'reason': new_reason,
        'updated_at': now
    })

# ============================================================================
# Dashboard API (Feature 1: Accurate My Eye Health Dashboard)
# ============================================================================
@app.route('/api/public/dashboard')
def public_dashboard():
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({'error': 'Sign in to access your personal eye health dashboard.'}), 401

    with db_cursor() as cur:
        # 1. Analyses (Real Glaucoma Screening Results)
        cur.execute("""
        SELECT id, user_email, result, score, confidence, cdr, iop, details, model_version, created_at
        FROM analyses
        WHERE user_email = %s
        ORDER BY created_at DESC
        """, (user_email,))
        raw_analyses = cur.fetchall()

        analyses = []
        for a in raw_analyses:
            item = dict(a)
            if item.get('details'):
                try:
                    item['details'] = json.loads(item['details'])
                except Exception:
                    pass
            analyses.append(item)

        latest_analysis = analyses[0] if analyses else None
        analyses_count = len(analyses)
        recent_analyses = analyses[:5]

        # 2. Medical Records
        cur.execute("SELECT COUNT(*) as count FROM records WHERE user_email = %s", (user_email,))
        rec_count_row = cur.fetchone()
        records_count = rec_count_row['count'] if rec_count_row else 0

        # 3. Reminders
        cur.execute("""
        SELECT id, user_email, title, description, category, reminder_date, reminder_time, completed, created_at
        FROM reminders
        WHERE user_email = %s
        ORDER BY completed ASC, reminder_date ASC, created_at DESC
        """, (user_email,))
        reminders = [dict(r) for r in cur.fetchall()]
        pending_reminders = [r for r in reminders if not r.get('completed')]
        reminders_count = len(pending_reminders)

        # 4. Appointments
        cur.execute("""
        SELECT id, user_email, doctor_id, doctor_name, specialization, hospital_name, city,
               appointment_date, appointment_time, patient_name, patient_phone, reason, status, created_at, updated_at
        FROM appointments
        WHERE user_email = %s
        ORDER BY appointment_date ASC, created_at DESC
        """, (user_email,))
        appointments = [dict(a) for a in cur.fetchall()]
        upcoming_appointments = [a for a in appointments if a.get('status') != 'Cancelled'][:5]

    return jsonify({
        'authenticated': True,
        'user': {
            'email': user_email,
            'name': session.get('user_name', '')
        },
        'latest_analysis': latest_analysis,
        'analyses_count': analyses_count,
        'recent_analyses': recent_analyses,
        'records_count': records_count,
        'reminders_count': reminders_count,
        'pending_reminders': pending_reminders[:5],
        'all_reminders': reminders,
        'upcoming_appointments': upcoming_appointments,
        'all_appointments': appointments
    })

# ============================================================================
# Public Content Collections (Articles, Translations, Announcements, Settings)
# ============================================================================
COLLECTIONS = {
    'doctors': ('doctors', ['name', 'specialization', 'hospital', 'phone', 'address', 'state', 'city', 'area', 'timings', 'appointment_info', 'maps_url', 'search_url', 'latitude', 'longitude', 'verified', 'active']),
    'hospitals': ('hospitals', ['name', 'address', 'phone', 'state', 'city', 'latitude', 'longitude', 'verified', 'active']),
    'articles': ('articles', ['category', 'title_en', 'title_ta', 'title_hi', 'content_en', 'content_ta', 'content_hi', 'image', 'published']),
    'translations': ('translations', ['key', 'english', 'tamil', 'hindi']),
    'announcements': ('announcements', ['title', 'message', 'language', 'kind', 'start_date', 'end_date', 'active']),
    'reminders': ('reminders', ['user_email', 'title', 'description', 'category', 'reminder_date', 'reminder_time', 'completed']),
    'appointments': ('appointments', ['user_email', 'doctor_id', 'doctor_name', 'specialization', 'hospital_name', 'city', 'appointment_date', 'appointment_time', 'patient_name', 'patient_phone', 'reason', 'status']),
    'records': ('records', ['user_email', 'title', 'record_type', 'description', 'filename', 'record_date']),
    'settings': ('settings', ['key', 'value'])
}

@app.route('/api/public/<name>')
def public_collection(name):
    if name not in ('doctors', 'hospitals', 'articles', 'translations', 'announcements', 'settings'):
        return jsonify({'error': 'Not found'}), 404

    with db_cursor() as cur:
        if name in ('doctors', 'hospitals'):
            cur.execute(f"SELECT * FROM {name} WHERE active = 1")
        elif name == 'articles':
            cur.execute("SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC")
        elif name == 'announcements':
            cur.execute("SELECT * FROM announcements WHERE active = 1 ORDER BY created_at DESC")
        elif name == 'translations':
            cur.execute("SELECT `key`, english, tamil, hindi FROM translations")
        elif name == 'settings':
            cur.execute("SELECT `key`, value FROM settings")
        else:
            cur.execute(f"SELECT * FROM {name}")
        rows = cur.fetchall()

    return jsonify([dict(x) for x in rows])

# ============================================================================
# Admin Collections & Dashboard API
# ============================================================================
@app.route('/api/admin/<name>', methods=['GET', 'POST'])
def admin_collection(name):
    if not admin_required():
        return jsonify({'error': 'Please sign in as an administrator.'}), 401
    if name not in COLLECTIONS:
        return jsonify({'error': 'Unknown collection'}), 404

    table, fields = COLLECTIONS[name]
    if request.method == 'GET':
        with db_cursor() as cur:
            cur.execute(f"SELECT * FROM {table} ORDER BY created_at DESC" if 'created_at' in fields else f"SELECT * FROM {table}")
            rows = cur.fetchall()
        return jsonify([dict(x) for x in rows])

    d = request.get_json(silent=True) or {}
    now = get_utc_now_iso()

    if name == 'settings':
        k = d.get('key')
        if not k:
            return jsonify({'error': 'Setting key required'}), 400
        with db_cursor() as cur:
            cur.execute("SELECT * FROM settings WHERE `key` = %s", (k,))
            old = cur.fetchone()
            cur.execute("""
            INSERT INTO settings (`key`, value) VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE value = VALUES(value)
            """, (k, str(d.get('value', ''))))
        audit('saved setting', name, k, dict(old) if old else None, d)
        return jsonify({'ok': True})

    ident = str(d.get('id') or uuid.uuid4())
    allowed = {k: d.get(k, '') for k in fields}
    for b in ('verified', 'active', 'published', 'completed'):
        if b in allowed:
            allowed[b] = 1 if str(allowed[b]).lower() in ('1', 'true', 'yes', 'on') else 0

    if name in ('doctors', 'hospitals', 'articles', 'announcements', 'reminders', 'records'):
        allowed['created_at'] = now
        if name == 'articles' or name == 'records':
            allowed['updated_at'] = now
        cols = list(allowed.keys())
        placeholders = ', '.join(['%s'] * (len(cols) + 1))
        with db_cursor() as cur:
            cur.execute(
                f"INSERT INTO {table} (id, {', '.join(cols)}) VALUES ({placeholders})",
                [ident] + [allowed[k] for k in cols]
            )
    else:
        allowed['updated_at'] = now
        with db_cursor() as cur:
            cur.execute("""
            INSERT INTO translations (`key`, english, tamil, hindi, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                english = VALUES(english),
                tamil = VALUES(tamil),
                hindi = VALUES(hindi),
                updated_at = VALUES(updated_at)
            """, (allowed.get('key', ''), allowed.get('english', ''), allowed.get('tamil', ''), allowed.get('hindi', ''), now))
        ident = allowed.get('key', '')

    audit('created', name, ident, None, allowed)
    return jsonify({'id': ident}), 201

@app.route('/api/admin/<name>/<ident>', methods=['PUT', 'DELETE'])
def admin_item(name, ident):
    if not admin_required():
        return jsonify({'error': 'Please sign in as an administrator.'}), 401
    if name not in COLLECTIONS:
        return jsonify({'error': 'Unknown collection'}), 404

    table, fields = COLLECTIONS[name]
    key_col = '`key`' if name in ('translations', 'settings') else 'id'

    with db_cursor() as cur:
        cur.execute(f"SELECT * FROM {table} WHERE {key_col} = %s", (ident,))
        old = cur.fetchone()

    if not old:
        return jsonify({'error': 'Record not found'}), 404
    old = dict(old)

    if request.method == 'DELETE':
        with db_cursor() as cur:
            cur.execute(f"DELETE FROM {table} WHERE {key_col} = %s", (ident,))
        audit('deleted', name, ident, old, None)
        return jsonify({'ok': True})

    d = request.get_json(silent=True) or {}
    allowed = {k: d[k] for k in fields if k in d}
    for b in ('verified', 'active', 'published', 'completed'):
        if b in allowed:
            allowed[b] = 1 if str(allowed[b]).lower() in ('1', 'true', 'yes', 'on') else 0
    if name in ('articles', 'records'):
        allowed['updated_at'] = get_utc_now_iso()

    if allowed:
        set_clauses = ', '.join([f"`{k}` = %s" for k in allowed.keys()])
        with db_cursor() as cur:
            cur.execute(f"UPDATE {table} SET {set_clauses} WHERE {key_col} = %s", list(allowed.values()) + [ident])

    audit('updated', name, ident, old, allowed)
    return jsonify({'ok': True})

@app.route('/api/admin/dashboard')
def dashboard():
    if not admin_required():
        return jsonify({'error': 'Unauthorized'}), 401

    with db_cursor() as cur:
        counts = {}
        for k, t in [('doctors', 'doctors'), ('hospitals', 'hospitals'), ('articles', 'articles'), ('users', 'users'), ('analyses', 'analyses'), ('records', 'records')]:
            cur.execute(f"SELECT COUNT(*) as c FROM {t}")
            counts[k] = cur.fetchone()['c']

        cur.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 12")
        logs = [dict(x) for x in cur.fetchall()]

    return jsonify({'counts': counts, 'logs': logs})

@app.route('/api/admin/logs')
def logs():
    if not admin_required():
        return jsonify({'error': 'Unauthorized'}), 401
    with db_cursor() as cur:
        cur.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200")
        rows = cur.fetchall()
    return jsonify([dict(x) for x in rows])

# ============================================================================
# Glaucoma AI Screening Engine Workflow
# ============================================================================
def _model_status():
    try:
        import glaucoma_model
    except ImportError:
        return 'unavailable', 'AI libraries are not installed. Run: pip install -r requirements-ml.txt'
    if glaucoma_model._analyzer is not None:
        return 'ready', ''
    if not glaucoma_model.index_ready():
        if glaucoma_model.preparation_running():
            progress = glaucoma_model.preparation_progress()
            return 'preparing', (
                'The AI model is being prepared for first use (one-time setup, about 40 minutes). '
                'Please try again later.' + (f' Progress: {progress}' if progress else '')
            )
        return 'unavailable', 'The AI model is not set up. Restart the app to start automatic setup, or run: py ml/setup_model.py'
    err = glaucoma_model.last_error()
    if err is not None:
        return 'unavailable', f'The AI model could not be loaded: {err}'
    return 'loading', 'The AI model is loading. Please try again in a few seconds.'

@app.route('/api/public/analyze/status')
def analyze_status():
    state, message = _model_status()
    data = {'status': state, 'message': message}
    if state == 'ready':
        import glaucoma_model
        glaucoma_model._analyzer.refresh()
        data['metrics'] = glaucoma_model._analyzer.metrics
    return jsonify(data)

@app.route('/api/public/analyze', methods=['POST'])
def analyze_image():
    f = request.files.get('image')
    if not f or not f.filename:
        return jsonify({'error': 'Please upload or capture an eye image first.'}), 400
    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
    if ext not in ALLOWED_IMAGE_EXTS:
        return jsonify({'error': 'Supported image formats: JPG, PNG and WEBP.'}), 400

    raw = f.read(MAX_ANALYZE_BYTES + 1)
    if len(raw) > MAX_ANALYZE_BYTES:
        return jsonify({'error': 'Image is larger than 5 MB. Please choose a smaller image.'}), 413

    try:
        import glaucoma_model
        from PIL import Image
        import io
    except ImportError:
        return jsonify({
            'error': 'The AI model is not installed on this server. Run: pip install -r requirements-ml.txt',
            'code': 'model_unavailable'
        }), 503

    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except Exception:
        return jsonify({'error': 'The file could not be read as an image. Please choose another photo.'}), 400

    if min(image.size) < 100:
        return jsonify({'error': 'Image is too small. Please use an image at least 100×100 pixels.'}), 400

    state, message = _model_status()
    if state in ('preparing', 'unavailable') and not glaucoma_model.index_ready():
        return jsonify({'error': message, 'code': 'model_' + state}), 503

    try:
        analyzer = glaucoma_model.get_analyzer()
        result = analyzer.analyze(image)
    except glaucoma_model.NotFundusImage as e:
        return jsonify({'error': str(e), 'code': 'not_fundus'}), 422
    except glaucoma_model.ModelUnavailable as e:
        return jsonify({'error': 'The AI model is not available: ' + str(e), 'code': 'model_unavailable'}), 503
    except Exception:
        app.logger.exception('Analysis failed')
        return jsonify({'error': 'The analysis failed unexpectedly. Please try again with another image.'}), 500

    return jsonify(result)

@app.route('/api/public/reference-image/<name>')
def reference_image(name):
    try:
        import glaucoma_model
    except ImportError:
        return jsonify({'error': 'Not found'}), 404
    path = glaucoma_model.reference_image_path(name)
    if not path:
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory(os.path.dirname(path), os.path.basename(path), max_age=86400)

def _warm_up_model():
    """Start the one-time AI setup if needed, wait for it, then load the model."""
    import time
    try:
        import glaucoma_model
    except ImportError:
        print(' * Glaucoma AI: libraries not installed. Run: pip install -r requirements-ml.txt')
        return
    if not glaucoma_model.index_ready():
        glaucoma_model.start_preparation()
        print(' * Glaucoma AI: first-time setup running in background.')
        while not glaucoma_model.index_ready():
            if not glaucoma_model.preparation_running():
                print(' * Glaucoma AI: setup stopped without building index.')
                return
            time.sleep(10)
    try:
        glaucoma_model.get_analyzer()
        print(' * Glaucoma AI model loaded and ready.')
    except Exception as e:
        print(' * Glaucoma AI model not available:', e)

if __name__ == '__main__':
    setup_all()
    import threading
    threading.Thread(target=_warm_up_model, daemon=True).start()
    port = int(os.environ.get('PORT', '8000'))
    print(f" * Drishti server starting on http://127.0.0.1:{port} (MySQL: {MYSQL_DATABASE}@{MYSQL_HOST}:{MYSQL_PORT})")
    app.run(host='127.0.0.1', port=port, debug=False)
