-- ====================================================================
-- Fizzy's Butter Chicken — Supabase Database Setup Schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Create the reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    reservation_date DATE NOT NULL,
    reservation_time TEXT NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'checked_in'
    remarks TEXT,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Index for fast date & search lookups
CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations (reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations (status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow public (anon key) to read reservation details (e.g. for card-viewer and staff check-in)
CREATE POLICY "Allow public select on reservations" 
ON public.reservations 
FOR SELECT 
USING (true);

-- Allow public (anon key) to insert reservations from index.html / reserve.html
CREATE POLICY "Allow public insert on reservations" 
ON public.reservations 
FOR INSERT 
WITH CHECK (true);

-- Allow public / staff update on reservations (e.g. status changes during checkin or admin review)
CREATE POLICY "Allow public update on reservations" 
ON public.reservations 
FOR UPDATE 
USING (true);
