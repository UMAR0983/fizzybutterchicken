// GET /api/get-card?id=RES-1234
// Returns the reservation details needed to render the reservation pass.

const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || 'https://drntuchxgbxullltmhih.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybnR1Y2h4Z2J4dWxsbHRtaGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTcxMTYsImV4cCI6MjEwMDUzMzExNn0.zTdr1QKl2aBTL8xd7vwgO-lLbX8UeD_af0Z6VZhLwuQ';
  return createClient(url, key);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Missing reservation id.' });

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .select('id, name, email, phone, reservation_date, reservation_time, guests, notes, status, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('get-card.js error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
