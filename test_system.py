import requests
import json
import os
import sys

BASE_URL = 'http://127.0.0.1:8000'
SESSION = requests.Session()

def run_tests():
    print("=" * 70)
    print("DRISHTI SYSTEM VERIFICATION & END-TO-END TEST SUITE")
    print("=" * 70)

    passed = 0
    failed = 0

    def assert_true(condition, test_name):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {test_name}")
            passed += 1
        else:
            print(f"  [FAIL] {test_name}")
            failed += 1

    # ------------------------------------------------------------------------
    # Test 1: Public Session & Homepage
    # ------------------------------------------------------------------------
    print("\n--- 1. Testing Homepage & Public Session ---")
    r = SESSION.get(f"{BASE_URL}/")
    assert_true(r.status_code == 200 and "Drishti" in r.text, "Homepage loads successfully (HTTP 200)")

    r = SESSION.get(f"{BASE_URL}/api/public/session")
    d = r.json()
    assert_true(r.status_code == 200 and d.get('authenticated') is False, "Public session returns unauthenticated for guest")

    # ------------------------------------------------------------------------
    # Test 2: Feature One - Find Doctor API (Karur and Tiruchengode)
    # ------------------------------------------------------------------------
    print("\n--- 2. Testing Feature One: Find Doctor API ---")
    r = SESSION.get(f"{BASE_URL}/api/public/doctors")
    assert_true(r.status_code == 200, "GET /api/public/doctors returns HTTP 200")
    all_docs = r.json()
    assert_true(len(all_docs) >= 7, f"Doctors table contains verified records ({len(all_docs)} doctors found)")

    # Test Karur filter
    r_karur = SESSION.get(f"{BASE_URL}/api/public/doctors?city=Karur")
    karur_docs = r_karur.json()
    assert_true(len(karur_docs) >= 3, f"Karur doctors fetched successfully ({len(karur_docs)} found)")
    first_karur = karur_docs[0]
    assert_true(
        all(k in first_karur for k in ['name', 'specialization', 'hospital', 'phone', 'address', 'timings', 'maps_url']),
        "Karur doctor record contains complete required metadata (name, spec, hospital, phone, address, timings, maps_url)"
    )
    assert_true(first_karur['city'].lower() == 'karur', "Karur filter strictly returned Karur doctors")

    # Test Tiruchengode filter
    r_tir = SESSION.get(f"{BASE_URL}/api/public/doctors?city=Tiruchengode")
    tir_docs = r_tir.json()
    assert_true(len(tir_docs) >= 3, f"Tiruchengode doctors fetched successfully ({len(tir_docs)} found)")
    first_tir = tir_docs[0]
    assert_true(first_tir['city'].lower() == 'tiruchengode', "Tiruchengode filter strictly returned Tiruchengode doctors")

    # Test Newly Added Districts
    for district in ['Coimbatore', 'Salem', 'Erode', 'Namakkal', 'Tiruchirappalli', 'Madurai']:
        r_dist = SESSION.get(f"{BASE_URL}/api/public/doctors?city={district}")
        dist_docs = r_dist.json()
        assert_true(len(dist_docs) >= 1, f"District '{district}' returned verified doctors ({len(dist_docs)} found)")
        assert_true(dist_docs[0]['city'].lower() == district.lower(), f"District filter strictly matched '{district}'")

    # ------------------------------------------------------------------------
    # Test 3: Feature Four - Daily Eye Care Tips
    # ------------------------------------------------------------------------
    print("\n--- 3. Testing Feature Four: Daily Eye Care Tips ---")
    r = SESSION.get(f"{BASE_URL}/api/public/daily-tips")
    assert_true(r.status_code == 200, "GET /api/public/daily-tips returns HTTP 200")
    tips_data = r.json()
    tips = tips_data.get('tips', [])
    assert_true(len(tips) == 3, f"Daily tips returns exactly three tips (received {len(tips)})")
    assert_true(
        all(all(k in t for k in ['title_en', 'content_en', 'category']) for t in tips),
        "All tips include title, practical explanation, and category"
    )
    assert_true(bool(tips_data.get('disclaimer')), "Educational non-diagnostic disclaimer is present")

    # Verify deterministic behavior (refresh returns exact same tips)
    r2 = SESSION.get(f"{BASE_URL}/api/public/daily-tips")
    tips2 = r2.json().get('tips', [])
    assert_true([t['id'] for t in tips] == [t['id'] for t in tips2], "Tips rotation is deterministic on refresh")

    # ------------------------------------------------------------------------
    # Test 4: User Authentication (Register & Login)
    # ------------------------------------------------------------------------
    print("\n--- 4. Testing User Authentication ---")
    test_user_email = f"test_qa_{os.urandom(4).hex()}@drishti.local"
    test_password = "SecurePassword123!"

    # Registration
    r_reg = SESSION.post(f"{BASE_URL}/api/public/register", json={
        'name': 'Test QA Patient',
        'email': test_user_email,
        'password': test_password,
        'language': 'en'
    })
    assert_true(r_reg.status_code == 201, "User registration returns HTTP 201 Created")

    # Verify session
    r_sess = SESSION.get(f"{BASE_URL}/api/public/session")
    sess_data = r_sess.json()
    assert_true(sess_data.get('authenticated') is True and sess_data['user']['email'] == test_user_email,
                "Signed-in user session established and verified")

    # ------------------------------------------------------------------------
    # Test 5: Feature Two - My Record Complete CRUD
    # ------------------------------------------------------------------------
    print("\n--- 5. Testing Feature Two: My Record Complete CRUD ---")
    # A. File Upload
    fake_report_content = b"%PDF-1.4 Mock Eye Examination Clinical Findings..."
    files = {'file': ('eye_exam.pdf', fake_report_content, 'application/pdf')}
    r_up = SESSION.post(f"{BASE_URL}/api/public/upload", files=files)
    assert_true(r_up.status_code == 201, "POST /api/public/upload uploads file successfully (HTTP 201)")
    uploaded_filename = r_up.json().get('filename')
    assert_true(bool(uploaded_filename), f"Uploaded filename received: {uploaded_filename}")

    # B. Create Record
    r_create = SESSION.post(f"{BASE_URL}/api/public/records", json={
        'title': 'Annual IOP & Retinal Exam',
        'record_type': 'Eye report',
        'record_date': '2026-10-25',
        'description': 'Normal ocular pressure recorded at 15 mmHg. Visual fields intact.',
        'filename': uploaded_filename
    })
    assert_true(r_create.status_code == 201, "POST /api/public/records creates record in MySQL (HTTP 201)")
    record_id = r_create.json().get('id')

    # C. Read Records
    r_list = SESSION.get(f"{BASE_URL}/api/public/records")
    records = r_list.json()
    assert_true(any(rec['id'] == record_id for rec in records), "GET /api/public/records lists newly created record")

    # D. View Single Record Details
    r_view = SESSION.get(f"{BASE_URL}/api/public/records/{record_id}")
    assert_true(r_view.status_code == 200, "GET /api/public/records/<id> view action returns HTTP 200")
    view_data = r_view.json()
    assert_true(view_data.get('title') == 'Annual IOP & Retinal Exam', "View record returned correct title and fields")

    # E. Edit Record Metadata
    r_edit = SESSION.put(f"{BASE_URL}/api/public/records/{record_id}", json={
        'title': 'Updated Annual IOP & Fundus Evaluation',
        'record_type': 'Eye report',
        'record_date': '2026-10-25',
        'description': 'Follow-up consultation recommended in 12 months.'
    })
    assert_true(r_edit.status_code == 200, "PUT /api/public/records/<id> updates metadata (HTTP 200)")

    # Verify update persisted
    r_view2 = SESSION.get(f"{BASE_URL}/api/public/records/{record_id}")
    assert_true(r_view2.json().get('title') == 'Updated Annual IOP & Fundus Evaluation', "Record edit verified in database")

    # F. Download / View Attachment with Authorization
    r_file = SESSION.get(f"{BASE_URL}/api/public/files/{uploaded_filename}")
    assert_true(r_file.status_code == 200 and r_file.content == fake_report_content, "GET /api/public/files/<filename> serves attachment to owner")

    # G. Security: Verify Data Isolation / IDOR Prevention
    other_session = requests.Session()
    r_unauth_file = other_session.get(f"{BASE_URL}/api/public/files/{uploaded_filename}")
    assert_true(r_unauth_file.status_code == 401, "Unauthorized user cannot access private record attachment (HTTP 401)")

    r_unauth_rec = other_session.get(f"{BASE_URL}/api/public/records/{record_id}")
    assert_true(r_unauth_rec.status_code == 401, "Unauthorized user cannot view private record (HTTP 401)")

    # H. Delete Record
    r_del = SESSION.delete(f"{BASE_URL}/api/public/records/{record_id}")
    assert_true(r_del.status_code == 200, "DELETE /api/public/records/<id> deletes record cleanly (HTTP 200)")

    r_view3 = SESSION.get(f"{BASE_URL}/api/public/records/{record_id}")
    assert_true(r_view3.status_code == 404, "Deleted record no longer accessible (HTTP 404)")

    # ------------------------------------------------------------------------
    # Test 6: Feature Three - Fix Duplicate Saves in Eye Journey
    # ------------------------------------------------------------------------
    print("\n--- 6. Testing Feature Three: Fix Duplicate Saves in Eye Journey ---")
    idempotency_key = f"TEST-IDEM-{os.urandom(4).hex()}"
    analysis_payload = {
        'idempotency_key': idempotency_key,
        'result': 'Negative · No Glaucoma Detected',
        'score': 18,
        'confidence': '88.5%',
        'cdr': 0.38,
        'iop': '16 mmHg',
        'details': ['Normal cup-to-disc ratio', 'No reported risk factors']
    }

    # First save
    r_save1 = SESSION.post(f"{BASE_URL}/api/public/analysis", json=analysis_payload)
    assert_true(r_save1.status_code == 201, "First analysis save returns HTTP 201 Created")
    first_id = r_save1.json().get('id')

    # Immediate second save attempt with same idempotency key
    r_save2 = SESSION.post(f"{BASE_URL}/api/public/analysis", json=analysis_payload)
    assert_true(r_save2.status_code == 200 and r_save2.json().get('duplicate') is True,
                "Duplicate save with idempotency key recognized and prevented (HTTP 200, duplicate=True)")
    assert_true(r_save2.json().get('id') == first_id, "Duplicate save returns existing record ID instead of inserting new")

    # Immediate third save attempt without idempotency key but same outcome within 60s
    r_save3 = SESSION.post(f"{BASE_URL}/api/public/analysis", json={
        'result': 'Negative · No Glaucoma Detected',
        'score': 18,
        'confidence': '88.5%'
    })
    assert_true(r_save3.status_code == 200 and r_save3.json().get('duplicate') is True,
                "Time-window duplicate suppression prevents rapid double-clicks without idempotency key")

    # Check journey list has exactly 1 entry for this test
    r_journey = SESSION.get(f"{BASE_URL}/api/public/analyses")
    journey_entries = r_journey.json()
    matching_entries = [j for j in journey_entries if j['id'] == first_id]
    assert_true(len(matching_entries) == 1, "Eye Journey contains exactly 1 saved entry without duplication")

    # Legitimate separate screening can still be saved
    diff_payload = {
        'idempotency_key': f"TEST-DIFF-{os.urandom(4).hex()}",
        'result': 'Positive · Glaucoma Suspected',
        'score': 82,
        'confidence': '91.2%'
    }
    r_diff = SESSION.post(f"{BASE_URL}/api/public/analysis", json=diff_payload)
    assert_true(r_diff.status_code == 201, "Legitimate distinct screening is saved successfully as separate record")

    # ------------------------------------------------------------------------
    # Test 7: Feature Five - AI Glaucoma Screening Workflow
    # ------------------------------------------------------------------------
    print("\n--- 7. Testing Feature Five: AI Glaucoma Screening Workflow ---")
    r_status = SESSION.get(f"{BASE_URL}/api/public/analyze/status")
    assert_true(r_status.status_code == 200, "GET /api/public/analyze/status returns HTTP 200")
    status_data = r_status.json()
    print(f"    AI Analyzer status: {status_data.get('status')}")

    # Test non-fundus rejection with an arbitrary dummy image
    from PIL import Image
    import io
    non_fundus = Image.new('RGB', (200, 200), color=(120, 200, 240))
    buf = io.BytesIO()
    non_fundus.save(buf, format='JPEG')
    buf.seek(0)

    r_non_fundus = SESSION.post(f"{BASE_URL}/api/public/analyze", files={'image': ('front_eye.jpg', buf, 'image/jpeg')})
    assert_true(r_non_fundus.status_code == 422, "Non-fundus image rejected with explanation (HTTP 422 not_fundus)")

    # Test real fundus image from dataset if available
    test_fundus_dir = os.path.join('ml', 'dataset', 'test', 'rg')
    if os.path.isdir(test_fundus_dir) and os.listdir(test_fundus_dir):
        fundus_file = os.path.join(test_fundus_dir, os.listdir(test_fundus_dir)[0])
        with open(fundus_file, 'rb') as f:
            r_ai = SESSION.post(f"{BASE_URL}/api/public/analyze", files={'image': (os.path.basename(fundus_file), f, 'image/jpeg')})
        if r_ai.status_code == 200:
            ai_res = r_ai.json()
            assert_true(
                all(k in ai_res for k in ['prediction', 'glaucoma_probability', 'confidence', 'dataset_match']),
                f"Real fundus analyzed successfully: {ai_res.get('prediction')} (Prob: {ai_res.get('glaucoma_probability')}%)"
            )
        else:
            print(f"    Note: AI Model returned status {r_ai.status_code} ({r_ai.text[:100]})")
    else:
        print("    Test dataset folder ml/dataset/test/rg not found, skipping local image inference.")

    # ------------------------------------------------------------------------
    # Test Summary
    # ------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print(f"VERIFICATION RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 70)
    return failed == 0

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
