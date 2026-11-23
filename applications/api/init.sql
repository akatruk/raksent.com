\set ON_ERROR_STOP on
\getenv portal_password PORTAL_DB_PASSWORD
CREATE ROLE portal_app WITH LOGIN PASSWORD :'portal_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
\ir schema/schema.sql
