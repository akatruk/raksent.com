BEGIN;

CREATE SCHEMA portal;
REVOKE ALL ON SCHEMA portal FROM PUBLIC;

CREATE TABLE portal.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160)
);

CREATE TABLE portal.memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES portal.clients,
    token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    role text NOT NULL CHECK (role IN ('operator', 'viewer')),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
);

CREATE TABLE portal.engagements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES portal.clients,
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
    scope text NOT NULL CHECK (length(scope) BETWEEN 1 AND 3000),
    authorization_reference text NOT NULL CHECK (length(authorization_reference) BETWEEN 1 AND 500),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, id)
);

CREATE TABLE portal.findings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    engagement_id uuid NOT NULL,
    title text NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
    severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    detail text NOT NULL CHECK (length(detail) BETWEEN 1 AND 5000),
    remediation text NOT NULL CHECK (length(remediation) BETWEEN 1 AND 5000),
    evidence_reference text CHECK (length(evidence_reference) BETWEEN 1 AND 500),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted')),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (client_id, engagement_id) REFERENCES portal.engagements(client_id, id)
);

CREATE TABLE portal.audit_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES portal.clients,
    actor_id uuid NOT NULL REFERENCES portal.memberships,
    action text NOT NULL,
    object_id uuid,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX findings_engagement ON portal.findings (client_id, engagement_id, id);
CREATE INDEX engagements_client ON portal.engagements (client_id, created_at DESC, id);
CREATE INDEX audit_events_client ON portal.audit_events (client_id, occurred_at DESC, id);

CREATE FUNCTION portal.authenticate(p_digest bytea)
RETURNS TABLE(actor_id uuid, client_id uuid, role text, client_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $function$
    SELECT m.id, m.client_id, m.role, c.name
    FROM portal.memberships m JOIN portal.clients c ON c.id = m.client_id
    WHERE m.token_hash = p_digest AND m.expires_at > now() AND m.revoked_at IS NULL
$function$;

REVOKE ALL ON FUNCTION portal.authenticate(bytea) FROM PUBLIC;
GRANT USAGE ON SCHEMA portal TO portal_app;
GRANT EXECUTE ON FUNCTION portal.authenticate(bytea) TO portal_app;
GRANT SELECT, INSERT ON portal.engagements, portal.findings TO portal_app;
GRANT UPDATE(status, updated_at) ON portal.findings TO portal_app;
GRANT SELECT, INSERT ON portal.audit_events TO portal_app;

ALTER TABLE portal.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY engagement_tenant ON portal.engagements TO portal_app
    USING (client_id = nullif(current_setting('raksent.client_id', true), '')::uuid)
    WITH CHECK (client_id = nullif(current_setting('raksent.client_id', true), '')::uuid);
CREATE POLICY finding_tenant ON portal.findings TO portal_app
    USING (client_id = nullif(current_setting('raksent.client_id', true), '')::uuid)
    WITH CHECK (client_id = nullif(current_setting('raksent.client_id', true), '')::uuid);
CREATE POLICY audit_tenant ON portal.audit_events TO portal_app
    USING (client_id = nullif(current_setting('raksent.client_id', true), '')::uuid)
    WITH CHECK (client_id = nullif(current_setting('raksent.client_id', true), '')::uuid
                AND actor_id = nullif(current_setting('raksent.actor_id', true), '')::uuid);

COMMIT;
