-- Esho Arbi Shikhi: initial schema for real accounts + server-side progress
-- Run this once against the Postgres database created in the Vercel dashboard
-- (Storage tab -> Create Database -> Postgres). Any Postgres client works,
-- e.g. paste it into the "Query" tab Vercel's Storage UI provides for the DB.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
