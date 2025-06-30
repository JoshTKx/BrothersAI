import React, { useEffect, useState } from 'react';
const baseURL = 'http://127.0.0.1:8000/';

export default function SharedTimetables() {
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchShared() {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${baseURL}timetableapi/timetable/shared-with-me/`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setError('Failed to fetch shared timetables');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setShared(data.shared || []);
      } catch (e) {
        setError('Network error');
      }
      setLoading(false);
    }
    fetchShared();
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h2>Timetables Shared With Me</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {shared.length === 0 && !loading && <div>No timetables shared with you yet.</div>}
      {shared.map((item) => (
        <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '16px 0', padding: 16 }}>
          <div><strong>From:</strong> {item.owner}</div>
          <div><strong>Shared at:</strong> {new Date(item.created_at).toLocaleString()}</div>
          <div style={{ marginTop: 8 }}>
            <pre style={{ background: '#f8f8f8', padding: 8, borderRadius: 4, overflowX: 'auto' }}>{JSON.stringify(item.timetable_data, null, 2)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}
