import os
import json
import uuid
import unittest
from app import app
from db import db_cursor

class TestDashboardFeature(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

        # Generate unique test users
        self.user1_email = f"test_dash_u1_{uuid.uuid4().hex[:8]}@drishti.local"
        self.user2_email = f"test_dash_u2_{uuid.uuid4().hex[:8]}@drishti.local"
        self.password = "SecurePassword123!"

    def test_01_unauthenticated_dashboard(self):
        """Dashboard must return 401 when accessed without an authenticated session."""
        res = self.app.get('/api/public/dashboard')
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn('error', data)

    def test_02_empty_dashboard_for_new_user(self):
        """Dashboard should handle new users with zero records accurately without inventing fake data."""
        # Register user 1
        reg_res = self.app.post('/api/public/register', json={
            'name': 'Priya Sharma',
            'email': self.user1_email,
            'password': self.password,
            'language': 'en'
        })
        self.assertEqual(reg_res.status_code, 201)

        # Login
        log_res = self.app.post('/api/public/login', json={
            'email': self.user1_email,
            'password': self.password
        })
        self.assertEqual(log_res.status_code, 200)

        # Fetch dashboard
        dash_res = self.app.get('/api/public/dashboard')
        self.assertEqual(dash_res.status_code, 200)
        d = dash_res.get_json()

        self.assertTrue(d.get('authenticated'))
        self.assertEqual(d['user']['email'], self.user1_email)
        self.assertIsNone(d.get('latest_analysis'))
        self.assertEqual(d.get('analyses_count'), 0)
        self.assertEqual(d.get('records_count'), 0)
        self.assertEqual(d.get('reminders_count'), 0)
        self.assertEqual(len(d.get('pending_reminders', [])), 0)
        self.assertEqual(len(d.get('upcoming_appointments', [])), 0)

    def test_03_screening_results_display_accurately(self):
        """Dashboard must display real saved glaucoma screening evaluations without fabricating values."""
        # Register and login
        self.app.post('/api/public/register', json={
            'name': 'Karthik Raja',
            'email': self.user1_email,
            'password': self.password
        })
        self.app.post('/api/public/login', json={
            'email': self.user1_email,
            'password': self.password
        })

        # Save actual glaucoma screening result
        screening_payload = {
            'idempotency_key': f"TEST-SCREEN-{uuid.uuid4().hex[:8]}",
            'result': 'Negative · No Glaucoma Detected',
            'score': 16,
            'confidence': '89.4%',
            'cdr': 0.36,
            'iop': '15 mmHg',
            'details': ['Optic disc margin distinct', 'Cup-to-disc ratio within normal limits']
        }
        save_res = self.app.post('/api/public/analysis', json=screening_payload)
        self.assertEqual(save_res.status_code, 201)

        # Check dashboard
        dash_res = self.app.get('/api/public/dashboard')
        self.assertEqual(dash_res.status_code, 200)
        d = dash_res.get_json()

        latest = d.get('latest_analysis')
        self.assertIsNotNone(latest)
        self.assertEqual(latest['result'], 'Negative · No Glaucoma Detected')
        self.assertEqual(latest['score'], 16)
        self.assertEqual(latest['confidence'], '89.4%')
        self.assertAlmostEqual(float(latest['cdr']), 0.36, places=2)
        self.assertEqual(latest['iop'], '15 mmHg')
        self.assertEqual(d['analyses_count'], 1)
        self.assertEqual(len(d['recent_analyses']), 1)

    def test_04_user_isolation_and_privacy(self):
        """User A must NEVER see User B's screening records, reminders, or appointments."""
        # User 1 registers and adds screening
        self.app.post('/api/public/register', json={
            'name': 'User One',
            'email': self.user1_email,
            'password': self.password
        })
        self.app.post('/api/public/login', json={
            'email': self.user1_email,
            'password': self.password
        })
        self.app.post('/api/public/analysis', json={
            'result': 'Positive · Glaucoma Suspected',
            'score': 84,
            'confidence': '92.0%'
        })

        # User 1 creates a reminder
        rem_res = self.app.post('/api/public/reminders', json={
            'title': 'User 1 Private IOP Checkup',
            'category': 'Routine checkup',
            'reminder_date': '2026-11-20'
        })
        u1_reminder_id = rem_res.get_json()['id']

        # User 1 creates an appointment
        apt_res = self.app.post('/api/public/appointments', json={
            'doctor_name': 'Dr. Nelson Joseph',
            'appointment_date': '2026-11-12',
            'appointment_time': '10:00 AM',
            'patient_name': 'User One',
            'patient_phone': '+91 98765 00001',
            'city': 'Karur'
        })
        u1_apt_id = apt_res.get_json()['id']

        # Switch to User 2
        user2_client = app.test_client()
        user2_client.post('/api/public/register', json={
            'name': 'User Two',
            'email': self.user2_email,
            'password': self.password
        })
        user2_client.post('/api/public/login', json={
            'email': self.user2_email,
            'password': self.password
        })

        # User 2 dashboard check: should have zero records
        u2_dash = user2_client.get('/api/public/dashboard').get_json()
        self.assertEqual(u2_dash['user']['email'], self.user2_email)
        self.assertIsNone(u2_dash['latest_analysis'])
        self.assertEqual(u2_dash['analyses_count'], 0)
        self.assertEqual(u2_dash['reminders_count'], 0)
        self.assertEqual(len(u2_dash['upcoming_appointments']), 0)

        # IDOR protection: User 2 cannot edit or delete User 1's reminder
        idor_rem_put = user2_client.put(f'/api/public/reminders/{u1_reminder_id}', json={'title': 'Hacked Title'})
        self.assertEqual(idor_rem_put.status_code, 404)

        idor_rem_del = user2_client.delete(f'/api/public/reminders/{u1_reminder_id}')
        self.assertEqual(idor_rem_del.status_code, 404)

        # IDOR protection: User 2 cannot cancel or delete User 1's appointment
        idor_apt_put = user2_client.put(f'/api/public/appointments/{u1_apt_id}', json={'status': 'Cancelled'})
        self.assertEqual(idor_apt_put.status_code, 404)

        idor_apt_del = user2_client.delete(f'/api/public/appointments/{u1_apt_id}')
        self.assertEqual(idor_apt_del.status_code, 404)

    def test_05_reminders_complete_crud(self):
        """Reminders can be created, viewed, edited, completed, and deleted with validation."""
        self.app.post('/api/public/register', json={
            'name': 'Suresh Kumar',
            'email': self.user1_email,
            'password': self.password
        })
        self.app.post('/api/public/login', json={
            'email': self.user1_email,
            'password': self.password
        })

        # 1. Validation: Empty title rejected
        err_res = self.app.post('/api/public/reminders', json={'title': '   '})
        self.assertEqual(err_res.status_code, 400)

        # 2. Create valid reminder
        create_res = self.app.post('/api/public/reminders', json={
            'title': 'Evening Eye Drops (Latanoprost)',
            'category': 'Prescribed medication reminder',
            'reminder_date': '2026-10-30',
            'reminder_time': '21:00',
            'description': '1 drop in both eyes before bedtime'
        })
        self.assertEqual(create_res.status_code, 201)
        rem_id = create_res.get_json()['id']

        # 3. View on Dashboard
        dash = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(dash['reminders_count'], 1)
        self.assertEqual(len(dash['pending_reminders']), 1)
        self.assertEqual(dash['pending_reminders'][0]['title'], 'Evening Eye Drops (Latanoprost)')

        # 4. Edit reminder
        edit_res = self.app.put(f'/api/public/reminders/{rem_id}', json={
            'title': 'Updated Eye Drops Schedule',
            'category': 'Prescribed medication reminder',
            'reminder_date': '2026-11-01',
            'reminder_time': '21:30',
            'description': 'Updated timing: 9:30 PM'
        })
        self.assertEqual(edit_res.status_code, 200)

        # Verify update on dashboard
        dash2 = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(dash2['pending_reminders'][0]['title'], 'Updated Eye Drops Schedule')
        self.assertEqual(dash2['pending_reminders'][0]['reminder_time'], '21:30')

        # 5. Complete reminder
        comp_res = self.app.put(f'/api/public/reminders/{rem_id}', json={'completed': 1})
        self.assertEqual(comp_res.status_code, 200)

        # Pending reminders count should drop to 0
        dash3 = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(dash3['reminders_count'], 0)
        self.assertEqual(len(dash3['pending_reminders']), 0)
        self.assertEqual(len(dash3['all_reminders']), 1)
        self.assertEqual(dash3['all_reminders'][0]['completed'], 1)

        # 6. Delete reminder
        del_res = self.app.delete(f'/api/public/reminders/{rem_id}')
        self.assertEqual(del_res.status_code, 200)

        dash4 = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(len(dash4['all_reminders']), 0)

    def test_06_appointments_workflow(self):
        """Appointments are saved and displayed accurately, and cancelled properly."""
        self.app.post('/api/public/register', json={
            'name': 'Ananya Sen',
            'email': self.user1_email,
            'password': self.password
        })
        self.app.post('/api/public/login', json={
            'email': self.user1_email,
            'password': self.password
        })

        # 1. Validation: Missing doctor or date rejected
        bad_apt = self.app.post('/api/public/appointments', json={
            'doctor_name': '',
            'appointment_date': ''
        })
        self.assertEqual(bad_apt.status_code, 400)

        # 2. Valid appointment booking
        apt_res = self.app.post('/api/public/appointments', json={
            'doctor_name': 'Dr. Nelson Joseph',
            'doctor_id': 'doc-karur-01',
            'specialization': 'Glaucoma Specialist',
            'hospital_name': 'Joseph Eye Hospital',
            'city': 'Karur',
            'appointment_date': '2026-11-10',
            'appointment_time': 'Morning (9:00 AM - 12:00 PM)',
            'patient_name': 'Ananya Sen',
            'patient_phone': '+91 94433 12345',
            'reason': 'Glaucoma follow-up evaluation'
        })
        self.assertEqual(apt_res.status_code, 201)
        apt_id = apt_res.get_json()['id']

        # 3. Check Dashboard Upcoming Appointments
        dash = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(len(dash['upcoming_appointments']), 1)
        a = dash['upcoming_appointments'][0]
        self.assertEqual(a['doctor_name'], 'Dr. Nelson Joseph')
        self.assertEqual(a['hospital_name'], 'Joseph Eye Hospital')
        self.assertEqual(a['status'], 'Requested')

        # 4. Cancel appointment
        cancel_res = self.app.put(f'/api/public/appointments/{apt_id}', json={'status': 'Cancelled'})
        self.assertEqual(cancel_res.status_code, 200)

        # Cancelled appointment should no longer be in upcoming_appointments
        dash2 = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(len(dash2['upcoming_appointments']), 0)
        self.assertEqual(len(dash2['all_appointments']), 1)
        self.assertEqual(dash2['all_appointments'][0]['status'], 'Cancelled')

    def test_07_medical_records_count(self):
        """Medical records vault count accurately reflects saved clinical reports."""
        self.app.post('/api/public/register', json={
            'name': 'Ramesh Iyer',
            'email': self.user1_email,
            'password': self.password
        })
        self.app.post('/api/public/login', json={
            'email': self.user1_email,
            'password': self.password
        })

        dash_before = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(dash_before['records_count'], 0)

        # Add a record
        self.app.post('/api/public/records', json={
            'title': 'Visual Field Analysis 2026',
            'record_type': 'Visual field test',
            'record_date': '2026-10-20',
            'description': 'Normal mean deviation'
        })

        dash_after = self.app.get('/api/public/dashboard').get_json()
        self.assertEqual(dash_after['records_count'], 1)

if __name__ == '__main__':
    unittest.main()
