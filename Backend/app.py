from flask import Flask, render_template, request, session, jsonify
from pathlib import Path
from datetime import datetime, timezone
import json

app = Flask(__name__, 
            template_folder='../Frontend/templates',
            static_folder='../Frontend/static')
app.secret_key = 'michief-managed'
app.config['SESSION_PERMANENT'] = False

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
AGGREGATE_FILE = DATA_DIR / "all_user_inputs.json"

def _now_iso_utc():
    return datetime.now(timezone.utc).isoformat()

def _get_session_id():
    sid = session.get("session_id")
    if not sid:
        sid = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
        session["session_id"] = sid
    return sid

def _read_aggregate():
    if not AGGREGATE_FILE.exists():
        return {"sessions": {}}
    try:
        return json.loads(AGGREGATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"sessions": {}}

def _write_aggregate(payload):
    AGGREGATE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

def _persist_session_payload():
    sid = _get_session_id()
    aggregate = _read_aggregate()

    if "sessions" not in aggregate or not isinstance(aggregate["sessions"], dict):
        aggregate["sessions"] = {}

    current_entry = aggregate["sessions"].get(sid, {})
    current_entry["session_id"] = sid
    current_entry["updated_at"] = _now_iso_utc()
    current_entry["steps"] = session.get("form_steps", {})
    if "final_submission" in session:
        current_entry["final_submission"] = session.get("final_submission")

    aggregate["sessions"][sid] = current_entry
    _write_aggregate(aggregate)
    return str(AGGREGATE_FILE)

def _truthy_checked_ids(page):
    return [
        k for k, v in (page.get("checkboxes", {}) or {}).items()
        if bool(v) and k != "skipSection"
    ]

def _first_non_empty(mapping, default="Unsure"):
    for _, v in (mapping or {}).items():
        if isinstance(v, str) and v.strip():
            return v.strip()
        if v is not None and not isinstance(v, str):
            return str(v)
    return default

def _normalize_purpose(v):
    if not v:
        return "unsure"
    s = str(v).strip().lower()
    purpose_map = {
        "clinical care": "clinical care",
        "system management": "system management",
        "legal obligation": "legal obligation",
        "court order": "court order",
        "serious threat": "serious threat",
        "insurance / indemnity purpose": "insurance indemnity purpose",
        "insurance indemnity": "insurance indemnity purpose",
        "insurance indemnity purpose": "insurance indemnity purpose",
        "marketing": "marketing",
        "operational": "operational purpose",
        "operational purpose": "operational purpose",
        "human resource": "human resource purpose",
        "human resource purpose": "human resource purpose",
        "general insurance": "general insurance purpose",
        "general insurance purpose": "general insurance purpose",
        "unsure": "unsure",
    }
    return purpose_map.get(s, s)

def _normalize_consent(v):
    if not v:
        return "unsure"
    s = str(v).strip().lower()
    if s in {"yes", "no", "unsure"}:
        return s
    return "unsure"

def _normalize_retention(v):
    if not v:
        return "unsure"
    s = str(v).strip().lower()
    if "indefinite" in s or "indefinitely" in s:
        return "information is kept indefinitely"
    if s == "unsure":
        return "unsure"
    return str(v).strip()

def _normalize_enforcement_from_checked(checked):
    lowered = [c.lower() for c in checked]
    if any("automaticallydeleted" in c for c in lowered):
        return "automatically deleted"
    if any("securelydestroyed" in c for c in lowered):
        return "securely destroyed"
    if any("manualdeletion" in c for c in lowered):
        return "manually deleted"
    if any("uponpr" in c for c in lowered):
        return "upon patient request"
    if any("deidentified" in c for c in lowered):
        return "de-identified"
    return "unsure"

def _collect_mhr_from_steps(steps):
    for _, page in (steps or {}).items():
        checked = _truthy_checked_ids(page)
        if any("myhealthrecord" in c.lower() or "mhr" in c.lower() for c in checked):
            return "yes"
    return "unsure"

def _extract_purpose_from_checked(checked):
    # maps purpose checkbox IDs to canonical purpose values
    purpose_id_map = {
        "clinicalcare": "clinical care",
        "systemmanagement": "system management",
        "legalobligation": "legal obligation",
        "courtorder": "court order",
        "seriousthreat": "serious threat",
        "insuranceindemnity": "insurance indemnity purpose",
        "marketing": "marketing",
        "operational": "operational purpose",
        "humanresource": "human resource purpose",
        "generalinsurance": "general insurance purpose",
        "unsurepurpose": "unsure",
    }

    extracted = []
    for c in checked:
        key = c.lower().split("-")[0]  # e.g. ClinicalCare-1B -> clinicalcare
        mapped = purpose_id_map.get(key)
        if mapped and mapped not in extracted:
            extracted.append(mapped)

    if not extracted:
        return "unsure"

    # keep single string for compatibility with existing report logic
    return extracted[0]

def _extract_retention_fields(selects):
    # explicit retention selects used on questionnaire pages
    q1 = selects.get("Question1-1A") or selects.get("Question1-1B") or selects.get("Question1-2A") or selects.get("Question1-2B") or selects.get("Question1-3A") or selects.get("Question1-4A") or selects.get("Question1-5A")
    q2 = selects.get("Question2-1A") or selects.get("Question2-1B") or selects.get("Question2-2A") or selects.get("Question2-2B") or selects.get("Question2-3A") or selects.get("Question2-4A") or selects.get("Question2-5A")
    q3 = selects.get("Question3-1A") or selects.get("Question3-1B") or selects.get("Question3-2A") or selects.get("Question3-2B") or selects.get("Question3-3A") or selects.get("Question3-4A") or selects.get("Question3-5A")

    retention_period = q2 if q2 else (q1 if q1 else "Unsure")
    retention_exception = q3 if q3 else "Unsure"
    return retention_period, retention_exception

def _category_from_step(step_key, page):
    checked = _truthy_checked_ids(page)
    selects = page.get("selects", {}) or {}
    radios = page.get("radios", {}) or {}

    purpose_raw = _extract_purpose_from_checked(checked)
    consent_raw = _first_non_empty(radios, "Unsure")
    retention_raw, retention_exception_raw = _extract_retention_fields(selects)

    label_map = {
        "_DA1": "Personal Details",
        "_DA2": "Personal Sensitive Details",
        "_HA1": "Clinical Health Data",
        "_HA2": "Clinical Records & Prescriptions",
        "_GA1": "Government Health Data",
        "_CA1": "Consumer Contributed Data",
        "_CH1": "Child Health Data",
    }
    label = label_map.get(step_key, step_key)

    return {
        label: [
            {"attributeCollected": checked if checked else ["none selected"]},
            {"collectionPurpose": _normalize_purpose(purpose_raw)},
            {"consent": _normalize_consent(consent_raw)},
            {"lessDetailed": "unsure"},
            {"essential": "unsure"},
            {"retentionPeriod": _normalize_retention(retention_raw)},
            {"retentionException": _normalize_retention(retention_exception_raw)},
            {"enforcementMeasure": _normalize_enforcement_from_checked(checked)},
        ]
    }

def _build_report_schema_from_steps(steps):
    ordered_keys = ["_DA1", "_DA2", "_HA1", "_HA2", "_GA1", "_CA1", "_CH1"]
    categories = []

    for key in ordered_keys:
        if key in (steps or {}):
            categories.append(_category_from_step(key, steps.get(key, {}) or {}))

    # include any additional dynamic keys not in the known order
    for key, page in (steps or {}).items():
        if key not in ordered_keys:
            categories.append(_category_from_step(key, page or {}))

    return [
        {"collectMyHealthRecord": _collect_mhr_from_steps(steps)},
        [{"personalDataAsset": categories}]
    ]

@app.route('/')
def landing():
    """Landing page"""
    return render_template('pages/landing.html')

@app.route('/privacy')
def privacy():
    """Terms & Conditions"""
    return render_template('pages/privacy.html')

@app.route('/backgroundcheck')
def backgroundcheck():
    return render_template('pages/backgroundcheck.html')

@app.route('/sub_landing')
def sub_landing():
    """Sublanding"""
    return render_template('pages/0_Sublanding.html')

@app.route('/DA1')
def DA1():
    """Personal Data Asset Questionnaire (Part 1)"""
    return render_template('pages/1A_PersonalAssetQ.html')

@app.route('/DA2')
def DA2():
    """Personal Data Asset Questionnaire (Part 2)"""
    return render_template('pages/1B_PersonalAssetQ.html')

@app.route('/HA1')
def HA1():
    """Health Data Asset Questionnaire (Part 1)"""
    return render_template('pages/2A_HealthAssetQ.html')

@app.route('/HA2')
def HA2():
    """Health Data Asset Questionnaire (Part 2)"""
    return render_template('pages/2B_HealthAssetQ.html')

@app.route('/GA1')
def GA1():
    """Government Data Asset Questionnaire (Part 1)"""
    return render_template('pages/3A_GovAssetQ.html')

@app.route('/CA1')
def CA1():
    """Consumer-Contributed Health Data Assets"""
    return render_template('pages/4A_Consumer.html')

@app.route('/CH1')
def CH1():
    """Child Health Data Assets"""
    return render_template('pages/5A_ChildHealth.html')

@app.route('/report')
def report():
    """Report"""
    return render_template('pages/report.html')

@app.route('/test')
def test():
    """test"""
    return render_template('pages/test.html')

@app.route('/api/latest-submission', methods=['GET'])
def latest_submission():
    aggregate = _read_aggregate()
    sessions = aggregate.get("sessions", {})

    if not isinstance(sessions, dict) or not sessions:
        return jsonify({"ok": False, "error": "No submissions found"}), 404

    latest = None
    latest_ts = None
    for _, entry in sessions.items():
        ts = entry.get("updated_at")
        if latest is None or (ts and (latest_ts is None or ts > latest_ts)):
            latest = entry
            latest_ts = ts

    if not latest:
        return jsonify({"ok": False, "error": "No submissions found"}), 404

    raw = latest.get("final_submission")
    if raw is None:
        raw = latest.get("steps", {})

    if not raw:
        return jsonify({"ok": False, "error": "No submission payload found"}), 404

    if isinstance(raw, dict) and "form_steps" in raw:
        steps = raw.get("form_steps", {})
    elif isinstance(raw, dict) and any(k.startswith("_") for k in raw.keys()):
        steps = raw
    else:
        steps = latest.get("steps", {}) if isinstance(latest.get("steps", {}), dict) else {}

    transformed = _build_report_schema_from_steps(steps)

    return jsonify({
        "ok": True,
        "session_id": latest.get("session_id"),
        "updated_at": latest.get("updated_at"),
        "data": transformed
    }), 200

@app.route('/save-step', methods=['POST'])
def save_step():
    body = request.get_json(silent=True) or {}
    page_id = body.get("pageId")
    form_data = body.get("formData", {})

    if not page_id:
        return jsonify({"ok": False, "error": "pageId is required"}), 400

    steps = session.get("form_steps", {})
    steps[page_id] = form_data
    session["form_steps"] = steps

    file_path = _persist_session_payload()

    return jsonify({
        "ok": True,
        "message": "Step saved",
        "pageId": page_id,
        "file": file_path
    }), 200

@app.route('/submit-final', methods=['POST'])
def submit_final():
    body = request.get_json(silent=True) or {}
    final_data = body.get("finalData")

    if final_data is None:
        final_data = session.get("form_steps", {})

    session["final_submission"] = final_data
    file_path = _persist_session_payload()

    return jsonify({
        "ok": True,
        "message": "Final submission saved",
        "file": file_path
    }), 200


if __name__ == '__main__':
    app.run(debug=True, port=8000)
