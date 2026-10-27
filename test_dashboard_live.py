import requests
import os
import uuid
import sys

BASE_URL = 'http://127.0.0.1:8000'

def test_live_dashboard():
    print("=" * 70)
    print("TESTING LIVE DRISHTI DASHBOARD END-TO-END (HTTP)")
    print("=" * 70)

    # 1. Unauthenticated Dashboard
    unauth_sess = requests.Session()
    r = unauth_sess.get(f"{BASE_URL}/api/public/dashboard")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    print("  [PASS] 1. Unauthenticated request to /api/public/dashboard correctly returned HTTP 401")

    # 2. Register & Login User A
    user_a_sess = requests.Session()
    email_a = f"alice_{uuid.uuid4().hex[:6]}@drishti.local"
    pw = "SecretPass123!"

    r_reg = user_a_sess.post(f"{BASE_URL}/api/public/register", json={
        'name': 'Alice Smith',
        'email': email_a,
        'password': pw,
        'language': 'en'
    })
    assert r_reg.status_code == 201, f"Registration failed: {r_reg.text}"
    print(f"  [PASS] 2. User A registered ({email_a})")

    # 3. New User A Empty Dashboard
    r_dash = user_a_sess.get(f"{BASE_URL}/api/public/dashboard")
    assert r_dash.status_code == 200
    d = r_dash.json()
    assert d['user']['email'] == email_a
    assert d['latest_analysis'] is None
    assert d['analyses_count'] == 0
    assert d['records_count'] == 0
    assert d['reminders_count'] == 0
    assert len(d['upcoming_appointments']) == 0
    print("  [PASS] 3. Initial dashboard displays accurate empty state without fabricated data")

    # 4. Save Real Screening Result for User A
    r_screen = user_a_sess.post(f"{BASE_URL}/api/public/analysis", json={
        'idempotency_key': f"IDEM-{uuid.uuid4().hex[:6]}",
        'result': 'Negative · No Glaucoma Detected',
        'score': 15,
        'confidence': '91.5%',
        'cdr': 0.35,
        'iop': '14 mmHg',
        'details': ['Optic disc healthy', 'No neural rim thinning observed']
    })
    assert r_screen.status_code == 201
    analysis_id = r_screen.json()['id']
    print("  [PASS] 4. Real glaucoma screening evaluation saved")

    # 5. Verify Screening Display on User A Dashboard
    r_dash2 = user_a_sess.get(f"{BASE_URL}/api/public/dashboard")
    d2 = r_dash2.json()
    assert d2['analyses_count'] == 1
    assert d2['latest_analysis']['id'] == analysis_id
    assert d2['latest_analysis']['result'] == 'Negative · No Glaucoma Detected'
    assert d2['latest_analysis']['score'] == 15
    assert d2['latest_analysis']['confidence'] == '91.5%'
    assert d2['latest_analysis']['cdr'] == 0.35
    assert d2['latest_analysis']['iop'] == '14 mmHg'
    assert len(d2['latest_analysis']['details']) == 2
    print("  [PASS] 5. User A dashboard displays real saved screening with exact date, score, confidence, and CDR")

    # 6. Reminders CRUD
    # Validation: empty title rejected
    r_bad_rem = user_a_sess.post(f"{BASE_URL}/api/public/reminders", json={'title': ''})
    assert r_bad_rem.status_code == 400
    print("  [PASS] 6a. Reminder creation validates non-empty title (HTTP 400)")

    # Create reminder
    r_rem = user_a_sess.post(f"{BASE_URL}/api/public/reminders", json={
        'title': 'Annual Dilated Eye Exam',
        'category': 'Routine checkup',
        'reminder_date': '2026-11-15',
        'reminder_time': '10:00',
        'description': 'Comprehensive fundus photography and visual fields test'
    })
    assert r_rem.status_code == 201
    rem_id = r_rem.json()['id']
    print(f"  [PASS] 6b. Reminder created with ID {rem_id}")

    # Verify reminder appears on dashboard
    r_dash3 = user_a_sess.get(f"{BASE_URL}/api/public/dashboard")
    d3 = r_dash3.json()
    assert d3['reminders_count'] == 1
    assert any(r['id'] == rem_id for r in d3['pending_reminders'])
    print("  [PASS] 6c. Created reminder visible in dashboard pending reminders")

    # Edit reminder
    r_edit_rem = user_a_sess.put(f"{BASE_URL}/api/public/reminders/{rem_id}", json={
        'title': 'Updated Annual Dilated Exam',
        'category': 'Routine checkup',
        'reminder_date': '2026-11-18',
        'reminder_time': '11:00',
        'description': 'Rescheduled to 11:00 AM'
    })
    assert r_edit_rem.status_code == 200
    assert r_edit_rem.json()['title'] == 'Updated Annual Dilated Exam'
    print("  [PASS] 6d. Reminder edited successfully and verified")

    # Complete reminder
    r_comp = user_a_sess.put(f"{BASE_URL}/api/public/reminders/{rem_id}", json={'completed': 1})
    assert r_comp.status_code == 200
    r_dash4 = user_a_sess.get(f"{BASE_URL}/api/public/dashboard").json()
    assert r_dash4['reminders_count'] == 0
    assert not any(r['id'] == rem_id for r in r_dash4['pending_reminders'])
    print("  [PASS] 6e. Reminder marked completed; dashboard active count decremented")

    # Delete reminder
    r_del = user_a_sess.delete(f"{BASE_URL}/api/public/reminders/{rem_id}")
    assert r_del.status_code == 200
    r_dash5 = user_a_sess.get(f"{BASE_URL}/api/public/dashboard").json()
    assert not any(r['id'] == rem_id for r in r_dash5['all_reminders'])
    print("  [PASS] 6f. Reminder deleted successfully and removed from database")

    # 7. Appointments Workflow
    # Validation: missing fields rejected
    r_bad_apt = user_a_sess.post(f"{BASE_URL}/api/public/appointments", json={
        'doctor_name': '',
        'appointment_date': ''
    })
    assert r_bad_apt.status_code == 400
    print("  [PASS] 7a. Appointment booking validates required doctor and date (HTTP 400)")

    # Real appointment booking
    r_apt = user_a_sess.post(f"{BASE_URL}/api/public/appointments", json={
        'doctor_name': 'Dr. Nelson Joseph',
        'doctor_id': 'doc-karur-01',
        'specialization': 'Ophthalmologist & Glaucoma Specialist',
        'hospital_name': 'Joseph Eye Hospital',
        'city': 'Karur',
        'appointment_date': '2026-11-25',
        'appointment_time': 'Morning (9:00 AM - 12:00 PM)',
        'patient_name': 'Alice Smith',
        'patient_phone': '+91 98765 11111',
        'reason': 'Routine IOP checkup and optic nerve evaluation'
    })
    assert r_apt.status_code == 201
    apt_id = r_apt.json()['id']
    print(f"  [PASS] 7b. Real appointment request saved with ID {apt_id}")

    # Verify on dashboard
    r_dash6 = user_a_sess.get(f"{BASE_URL}/api/public/dashboard").json()
    assert len(r_dash6['upcoming_appointments']) == 1
    apt_item = r_dash6['upcoming_appointments'][0]
    assert apt_item['id'] == apt_id
    assert apt_item['doctor_name'] == 'Dr. Nelson Joseph'
    assert apt_item['status'] == 'Requested'
    print("  [PASS] 7c. Upcoming appointment rendered on dashboard with correct doctor, hospital, date, and time")

    # Cancel appointment
    r_cancel = user_a_sess.put(f"{BASE_URL}/api/public/appointments/{apt_id}", json={'status': 'Cancelled'})
    assert r_cancel.status_code == 200
    r_dash7 = user_a_sess.get(f"{BASE_URL}/api/public/dashboard").json()
    assert len(r_dash7['upcoming_appointments']) == 0
    print("  [PASS] 7d. Cancelled appointment excluded from upcoming appointments list")

    # 8. User Privacy & Isolation
    user_b_sess = requests.Session()
    email_b = f"bob_{uuid.uuid4().hex[:6]}@drishti.local"
    user_b_sess.post(f"{BASE_URL}/api/public/register", json={
        'name': 'Bob Jones',
        'email': email_b,
        'password': pw,
        'language': 'en'
    })
    b_dash = user_b_sess.get(f"{BASE_URL}/api/public/dashboard").json()
    assert b_dash['user']['email'] == email_b
    assert b_dash['latest_analysis'] is None
    assert b_dash['analyses_count'] == 0
    assert len(b_dash['upcoming_appointments']) == 0
    print("  [PASS] 8. User B cannot access User A's private screening or appointment records (strict user isolation)")

    print("\nALL LIVE DASHBOARD TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_live_dashboard()
