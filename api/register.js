// POST /api/register
// Body: { name, email, phone, date, time, guests, notes }
// Inserts a new reservation row into Supabase with status "pending".

const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || 'https://drntuchxgbxullltmhih.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybnR1Y2h4Z2J4dWxsbHRtaGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTcxMTYsImV4cCI6MjEwMDUzMzExNn0.zTdr1QKl2aBTL8xd7vwgO-lLbX8UeD_af0Z6VZhLwuQ';
  return createClient(url, key);
}

function generateId() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return 'RES-' + n;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, date, time, guests, notes } = req.body || {};

    if (!name || !email || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields (name, email, date, time).' });
    }

    const supabase = getSupabaseClient();
    const id = generateId();
    const numGuests = isNaN(parseInt(guests, 10)) ? 1 : parseInt(guests, 10);

    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        id,
        name,
        email,
        phone: phone || null,
        reservation_date: date,
        reservation_time: time,
        guests: numGuests,
        notes: notes || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Could not save reservation to database: ' + error.message });
    }

    return res.status(200).json({
      ok: true,
      id: data.id,
      status: data.status,
      passUrl: `https://fuzzybutterchicken.vercel.app/card-viewer.html?id=${data.id}`
    });
  } catch (err) {
    console.error('register.js error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
