"""Run against the ephemeral CI Compose environment."""
import hashlib
import json
import secrets
import subprocess
import urllib.error
import urllib.request

COMPOSE = [
    "docker", "compose", "-f", "infrastructure/docker/compose.yaml",
    "-f", "infrastructure/docker/portal.compose.yaml",
]
BASE_URL = "http://127.0.0.1:18081"


def provision():
    tokens = [secrets.token_urlsafe(32) for _ in range(3)]
    digests = [hashlib.sha256(token.encode()).hexdigest() for token in tokens]
    sql = """
    insert into portal.clients (id, name)
    values ('00000000-0000-4000-8000-000000000001', 'Tenant A'),
           ('00000000-0000-4000-8000-000000000002', 'Tenant B');
    """
    for tenant, role, digest in zip([1, 1, 2], ["operator", "viewer", "operator"], digests):
        sql += f"""
        insert into portal.memberships (client_id, token_hash, role, expires_at)
        values ('00000000-0000-4000-8000-00000000000{tenant}', decode('{digest}', 'hex'),
                '{role}', now() + interval '1 hour');
        """
    subprocess.run([
        *COMPOSE, "exec", "-T", "postgres", "psql", "-X", "-U", "postgres",
        "-d", "raksent", "-v", "ON_ERROR_STOP=1",
    ], input=sql, text=True, check=True, stdout=subprocess.DEVNULL)
    return tokens


def request(path, expected, token=None, method="GET", payload=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        BASE_URL + path, method=method, headers=headers,
        data=None if payload is None else json.dumps(payload).encode(),
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            assert response.status == expected, (path, response.status, expected)
            if response.headers.get("Content-Type", "").startswith("application/json"):
                return json.load(response)
    except urllib.error.HTTPError as error:
        assert error.code == expected, (path, error.code, expected)
    return None


def main():
    operator, viewer, other = provision()
    request("/api/dashboard", 401)
    info = {"name": "CI assessment", "scope": "CI synthetic assets", "authorization_reference": "CI fixture"}
    engagement_id = request("/api/engagements", 201, operator, "POST", info)["id"]
    request("/api/engagements", 403, viewer, "POST", info)
    assert request("/api/dashboard", 200, viewer)["engagements"][0]["id"] == engagement_id
    assert request("/api/dashboard", 200, other)["engagements"] == []
    path = f"/api/engagements/{engagement_id}"
    request(path, 404, other)
    finding = {"title": "Regression fixture", "severity": "low", "detail": "CI test finding", "remediation": "Review the fixture"}
    finding_id = request(path + "/findings", 201, operator, "POST", finding)["id"]
    request(f"/api/findings/{finding_id}", 404, other, "PATCH", {"status": "resolved"})
    request(f"/api/findings/{finding_id}", 200, operator, "PATCH", {"status": "resolved"})
    assert request(path + "/report", 200, viewer)["findings"][0]["status"] == "resolved"
    request("/api/audit", 403, viewer)
    assert any(event["action"] == "engagement.report_exported" for event in request("/api/audit", 200, operator))
    print("Portal smoke checks passed")


if __name__ == "__main__":
    main()
