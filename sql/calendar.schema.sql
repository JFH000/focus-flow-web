-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE calendar.attendees (
  event_id uuid NOT NULL,
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'TENTATIVE'::text,
  is_organizer boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT attendees_pkey PRIMARY KEY (event_id, email),
  CONSTRAINT attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES calendar.events(id),
  CONSTRAINT attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE calendar.calendars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  is_primary boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  external_provider text,
  external_sync_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT calendars_pkey PRIMARY KEY (id),
  CONSTRAINT calendars_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE calendar.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_all_day boolean NOT NULL DEFAULT false,
  timezone text NOT NULL,
  recurrence_rule text,
  external_event_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES calendar.calendars(id)
);
CREATE TABLE calendar.reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  method text NOT NULL,
  value integer NOT NULL,
  unit text NOT NULL,
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_event_id_fkey FOREIGN KEY (event_id) REFERENCES calendar.events(id)
);