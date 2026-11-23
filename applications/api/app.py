import hashlib
import os
import re
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg.rows import dict_row
from pydantic import BaseModel, StringConstraints

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
bearer = HTTPBearer(auto_error=False)
public = Path(__file__).parent / "public"
token_pattern = re.compile(r"[A-Za-z0-9_-]{43}")
Text160 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
Text500 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Text5000 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
Severity = Literal["critical", "high", "medium", "low", "info"]
FindingStatus = Literal["open", "in_progress", "resolved", "accepted"]


class Engagement(BaseModel):
    name: Text160
    scope: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=3000)]
    authorization_reference: Text500


class Finding(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=180)]
    severity: Severity
    detail: Text5000
    remediation: Text5000
    evidence_reference: Text500 | None = None


class FindingUpdate(BaseModel):
    status: FindingStatus


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; connect-src 'self'; style-src 'self'; script-src 'self'; "
        "base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Robots-Tag"] = "noindex"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


def connect():
    return psycopg.connect(
        host=os.environ.get("PGHOST", "localhost"),
        dbname=os.environ.get("PGDATABASE", "raksent"),
        user="portal_app",
        password=os.environ["PORTAL_DB_PASSWORD"],
        connect_timeout=3,
        options="-c statement_timeout=5000",
        row_factory=dict_row,
    )


def require_session(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Iterator[tuple]:
    if credentials is None or not token_pattern.fullmatch(credentials.credentials):
        raise HTTPException(401, "Invalid credentials", {"WWW-Authenticate": "Bearer"})
    digest = hashlib.sha256(credentials.credentials.encode()).digest()
    with connect() as db:
        member = db.execute("SELECT * FROM portal.authenticate(%s)", (digest,)).fetchone()
        if member is None:
            raise HTTPException(401, "Invalid credentials", {"WWW-Authenticate": "Bearer"})
        db.execute(
            "SELECT set_config('raksent.client_id', %s, true), set_config('raksent.actor_id', %s, true)",
            (str(member["client_id"]), str(member["actor_id"])),
        )
        yield db, member


Session = Annotated[tuple, Depends(require_session, scope="function")]


def audit(db, member, action, object_id=None):
    db.execute(
        "INSERT INTO portal.audit_events (client_id, actor_id, action, object_id) VALUES (%s,%s,%s,%s)",
        (member["client_id"], member["actor_id"], action, object_id),
    )


def require_operator(member):
    if member["role"] != "operator":
        raise HTTPException(403, "Operator role required")


@app.get("/")
def index():
    return FileResponse(public / "index.html")


@app.get("/portal.js")
def javascript():
    return FileResponse(public / "portal.js", media_type="text/javascript")


@app.get("/portal.css")
def stylesheet():
    return FileResponse(public / "portal.css", media_type="text/css")


@app.get("/healthz")
def health():
    try:
        with connect() as db:
            db.execute("SELECT 1 FROM portal.engagements LIMIT 1")
    except (psycopg.Error, KeyError):
        return Response(status_code=503)
    return Response(status_code=204)


@app.get("/api/dashboard")
def dashboard(session: Session):
    db, member = session
    records = db.execute(
        "SELECT id, name, created_at FROM portal.engagements ORDER BY created_at DESC, id LIMIT 100"
    ).fetchall()
    return {"client": member["client_name"], "role": member["role"], "engagements": records}


@app.post("/api/engagements", status_code=201)
def create_engagement(engagement: Engagement, session: Session):
    db, member = session
    require_operator(member)
    record = db.execute(
        """INSERT INTO portal.engagements (client_id, name, scope, authorization_reference)
        VALUES (%s,%s,%s,%s) RETURNING id""",
        (member["client_id"], engagement.name, engagement.scope, engagement.authorization_reference),
    ).fetchone()
    audit(db, member, "engagement.created", record["id"])
    return record


def engagement_report(db, engagement_id):
    engagement = db.execute(
        "SELECT id, name, scope, authorization_reference, created_at FROM portal.engagements WHERE id = %s",
        (engagement_id,),
    ).fetchone()
    if engagement is None:
        raise HTTPException(404, "Engagement not found")
    findings = db.execute(
        """SELECT id, title, severity, detail, remediation, evidence_reference, status, updated_at
        FROM portal.findings WHERE engagement_id = %s ORDER BY id LIMIT 1001""",
        (engagement_id,),
    ).fetchall()
    if len(findings) > 1000:
        raise HTTPException(409, "Report exceeds the 1,000 finding staging limit")
    return {**engagement, "findings": findings}


@app.get("/api/engagements/{engagement_id}")
def get_engagement(engagement_id: UUID, session: Session):
    db, member = session
    report = engagement_report(db, engagement_id)
    audit(db, member, "engagement.viewed", engagement_id)
    return report


@app.get("/api/engagements/{engagement_id}/report")
def export_report(engagement_id: UUID, session: Session):
    db, member = session
    report = engagement_report(db, engagement_id)
    audit(db, member, "engagement.report_exported", engagement_id)
    return JSONResponse(jsonable_encoder(report), headers={
        "Content-Disposition": f'attachment; filename="assessment-{engagement_id}.json"',
    })


@app.post("/api/engagements/{engagement_id}/findings", status_code=201)
def create_finding(engagement_id: UUID, finding: Finding, session: Session):
    db, member = session
    require_operator(member)
    if not db.execute("SELECT id FROM portal.engagements WHERE id = %s", (engagement_id,)).fetchone():
        raise HTTPException(404, "Engagement not found")
    record = db.execute(
        """INSERT INTO portal.findings
        (client_id, engagement_id, title, severity, detail, remediation, evidence_reference)
        VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (member["client_id"], engagement_id, finding.title, finding.severity,
         finding.detail, finding.remediation, finding.evidence_reference),
    ).fetchone()
    audit(db, member, "finding.created", record["id"])
    return record


@app.patch("/api/findings/{finding_id}")
def update_finding(finding_id: UUID, update: FindingUpdate, session: Session):
    db, member = session
    require_operator(member)
    record = db.execute(
        "UPDATE portal.findings SET status = %s, updated_at = now() WHERE id = %s RETURNING id, status",
        (update.status, finding_id),
    ).fetchone()
    if record is None:
        raise HTTPException(404, "Finding not found")
    audit(db, member, f"finding.status.{update.status}", finding_id)
    return record


@app.get("/api/audit")
def get_audit(session: Session):
    db, member = session
    require_operator(member)
    return db.execute(
        """SELECT actor_id, action, object_id, occurred_at FROM portal.audit_events
        ORDER BY occurred_at DESC, id DESC LIMIT 100"""
    ).fetchall()
