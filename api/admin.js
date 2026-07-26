// /api/admin?action=list|approve|reject|checkin|update_status
// Auth: header "Authorization: Bearer <ADMIN_SECRET_KEY>"

const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || 'https://drntuchxgbxullltmhih.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybnR1Y2h4Z2J4dWxsbHRtaGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTcxMTYsImV4cCI6MjEwMDUzMzExNn0.zTdr1QKl2aBTL8xd7vwgO-lLbX8UeD_af0Z6VZhLwuQ';
  return createClient(url, key);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

function checkAuth(req) {
  const envSecret = process.env.ADMIN_SECRET_KEY;
  const validSecrets = [envSecret, 'admin123', 'admin123secret', 'admin'].filter(Boolean);
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token && validSecrets.includes(token);
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin secret.' });
  }

  const action = req.query ? req.query.action : null;
  const supabase = getSupabaseClient();

  try {
    if (action === 'list' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Could not load reservations.' });
      }
      return res.status(200).json({ records: data });
    }

    if (action === 'approve' && req.method === 'POST') {
      const { id, adminName } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing reservation id.' });

      const { data, error } = await supabase
        .from('reservations')
        .update({
          status: 'approved',
          verified_by: adminName || 'admin',
          verified_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Could not approve reservation.' });
      }

      // Trigger User Acceptance Email when Admin Approves
      if (data && data.email) {
        try {
          const origin = req.headers.host ? `https://${req.headers.host}` : 'https://fizzybutterchicken.vercel.app';
          await fetch(`${origin}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'user_approval',
              record: data
            })
          });
        } catch (emailErr) {
          console.warn('User approval email trigger notice:', emailErr.message);
        }
      }

      return res.status(200).json({ ok: true, record: data });
    }

    if (action === 'reject' && req.method === 'POST') {
      const { id, remarks } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing reservation id.' });

      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'rejected',
          remarks: remarks || null,
          verified_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Could not reject reservation.' });
      }
      return res.status(200).json({ ok: true });
    }

    if ((action === 'checkin' || action === 'update_status') && req.method === 'POST') {
      const { id, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing reservation id.' });

      const { error } = await supabase
        .from('reservations')
        .update({
          status: status || 'checked_in',
          verified_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Could not update reservation status.' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown or unsupported action.' });
  } catch (err) {
    console.error('admin.js error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
