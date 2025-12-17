import React, { useState } from 'react';
const reasons = [
  { id: 'hate', label: 'Hate speech' },
  { id: 'spam', label: 'Spam' },
  { id: 'harm', label: 'Explicit harm' },
];
export default function ReportForm({ storyId, onReported }) {
  const [reason, setReason] = useState('hate');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true); setError('');
    const resp = await fetch('/admin/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInternalId: localStorage.getItem('internalId'),
        storyId, reason, details
      })
    });
    setSending(false);
    if (resp.ok) onReported();
    else setError('Error');
  }
  return <form style={{marginTop:30}} onSubmit={handleSubmit}>
    <div style={{marginBottom:4,fontSize:'.97em',opacity:.7}}>Report this story:</div>
    <select value={reason} onChange={e=>setReason(e.target.value)} style={{marginBottom:8}}>
      {reasons.map(r=> <option value={r.id} key={r.id}>{r.label}</option>)}
    </select>
    <div><textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Details (optional)" style={{width:'100%',height:40}} /></div>
    <button type="submit" disabled={sending} style={{marginTop:8}}>Send Report</button>
    {error && <span style={{color:'#d44',marginLeft:8}}>{error}</span>}
  </form>;
}
