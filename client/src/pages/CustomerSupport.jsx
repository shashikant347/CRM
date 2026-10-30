import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { customerChatApi } from '../api/customerChat';

const STORAGE_KEY = 'crm_customer_chat';

function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return session?.id && session?.token ? session : null;
  } catch {
    return null;
  }
}

function CustomerMessages({ messages }) {
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  return (
    <div className="customer-chat-messages">
      {messages.map((message) => (
        <div key={message.id} className={'customer-chat-message ' + message.senderType}>
          <span>{message.senderType === 'visitor' ? 'You' : message.senderName}</span>
          <p>{message.body}</p>
          <time dateTime={message.createdAt}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </time>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

export default function CustomerSupport() {
  const [session, setSession] = useState(readStoredSession);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(Boolean(readStoredSession()));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const conversationClosed = session?.status === 'closed';

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const { data } = await customerChatApi.get(
          `/chat/customer/conversations/${session.id}/messages`,
          { headers: { 'X-Chat-Token': session.token } }
        );
        if (active) {
          setSession((current) => ({ ...current, ...data.conversation }));
          setMessages(data.messages);
          setError('');
          setLoading(false);
        }
      } catch (err) {
        if (!active) return;
        if (err.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
          setMessages([]);
          setError('Your saved chat session could not be restored. Start a new chat below.');
        } else {
          setError(err.response?.data?.error || 'Could not load your conversation');
        }
        setLoading(false);
      }
    };
    load();
    const interval = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [session?.id, session?.token]);

  async function submit(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      if (!session) {
        const { data } = await customerChatApi.post('/chat/customer/conversations', {
          name,
          email,
          message: text,
        });
        const newSession = { ...data.conversation, token: data.token };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        setMessages(data.messages);
        setMessage('');
      } else {
        await customerChatApi.post(
          `/chat/customer/conversations/${session.id}/messages`,
          { message: text },
          { headers: { 'X-Chat-Token': session.token } }
        );
        setMessage('');
        const { data } = await customerChatApi.get(
          `/chat/customer/conversations/${session.id}/messages`,
          { headers: { 'X-Chat-Token': session.token } }
        );
        setSession((current) => ({ ...current, ...data.conversation }));
        setMessages(data.messages);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function startNewChat() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setMessages([]);
    setMessage('');
    setError('');
  }

  return (
    <main className="support-page">
      <header className="support-header">
        <Link to="/login" className="support-back"><ArrowLeft size={16} /> Back to sign in</Link>
        <span className="brand-mark">W</span>
      </header>
      <section className="support-card">
        <div className="support-card-heading">
          <span className="support-icon"><Send size={19} /></span>
          <div>
            <h1>Chat with our team</h1>
            <p>Send us a message and a team member will get back to you.</p>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
        {loading ? <p className="muted support-loading">Loading your conversation…</p> : session ? (
          <>
            <CustomerMessages messages={messages} />
            {conversationClosed ? (
              <div className="support-closed">
                <p>This conversation has been closed.</p>
                <button className="btn-secondary" onClick={startNewChat}>Start a new chat</button>
              </div>
            ) : (
              <form className="support-reply-form" onSubmit={submit}>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Type your message…"
                  maxLength={3000}
                  rows={2}
                  aria-label="Your message"
                />
                <button className="btn-primary" type="submit" disabled={sending || !message.trim()}>
                  <Send size={15} /> {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </>
        ) : (
          <form className="support-start-form" onSubmit={submit}>
            <label>
              Your name
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} />
            </label>
            <label>
              Email <span className="muted">(optional)</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} />
            </label>
            <label>
              How can we help?
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us what you need help with…"
                required
                maxLength={3000}
                rows={4}
              />
            </label>
            <button className="btn-primary" type="submit" disabled={sending || !message.trim()}>
              <Send size={15} /> {sending ? 'Starting chat…' : 'Start chat'}
            </button>
          </form>
        )}
        <p className="support-privacy"><ShieldCheck size={14} /> Your conversation is only visible to you and our support team.</p>
      </section>
    </main>
  );
}
