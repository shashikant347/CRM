import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../api/client';

function MessageList({ messages, currentUserId, emptyText }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!messages.length) return <div className="chat-empty">{emptyText}</div>;

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <div
          key={message.id}
          className={'chat-message' + (message.senderId === currentUserId ? ' mine' : '')}
        >
          <div className="chat-message-meta">
            <strong>{message.senderName}</strong>
            <time dateTime={message.createdAt}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </time>
          </div>
          <p>{message.body}</p>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function MessageComposer({ onSend, disabled, placeholder }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const body = message.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    try {
      await onSend(body);
      setMessage('');
    } catch {
      // The parent displays the request error and the draft stays available.
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="chat-composer" onSubmit={submit}>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder}
        maxLength={3000}
        rows={2}
        disabled={disabled || sending}
        aria-label="Message"
      />
      <button className="btn-primary" type="submit" disabled={disabled || sending || !message.trim()}>
        <Send size={15} />
        Send
      </button>
    </form>
  );
}

function TeamRoom({ currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  async function loadMessages() {
    const { data } = await api.get('/chat/team/messages');
    setMessages(data.messages);
  }

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get('/chat/team/messages');
        if (active) {
          setMessages(data.messages);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Could not load team messages');
      }
    };
    load();
    const interval = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function sendMessage(message) {
    try {
      await api.post('/chat/team/messages', { message });
      await loadMessages();
      setError('');
    } catch (err) {
      const messageText = err.response?.data?.error || 'Could not send your message';
      setError(messageText);
      throw err;
    }
  }

  return (
    <section className="chat-panel">
      <div className="chat-panel-heading">
        <div>
          <h2><Users size={18} /> Team room</h2>
          <p>Share updates with everyone on your CRM team.</p>
        </div>
        <span className="chat-live-indicator">Updates every 5 seconds</span>
      </div>
      {error && <div className="alert">{error}</div>}
      <MessageList messages={messages} currentUserId={currentUserId} emptyText="Start the conversation with your team." />
      <MessageComposer onSend={sendMessage} placeholder="Write a message to your team…" />
    </section>
  );
}

function CustomerInbox({ currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [filter, setFilter] = useState('open');
  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadConversations() {
    const params = filter === 'open' ? { status: 'open' } : {};
    const { data } = await api.get('/chat/inbox', { params });
    setConversations(data);
    if (selectedId && !data.some((item) => item.id === selectedId)) {
      setSelectedId(data[0]?.id || null);
    } else if (!selectedId && data.length) {
      setSelectedId(data[0].id);
    }
  }

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const params = filter === 'open' ? { status: 'open' } : {};
        const { data } = await api.get('/chat/inbox', { params });
        if (!active) return;
        setConversations(data);
        setSelectedId((current) => (
          current && data.some((item) => item.id === current) ? current : data[0]?.id || null
        ));
        setError('');
        setLoading(false);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Could not load the customer inbox');
          setLoading(false);
        }
      }
    };
    load();
    const interval = window.setInterval(load, 7000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [filter]);

  useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      setMessages([]);
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get(`/chat/inbox/${selectedId}/messages`);
        if (active) {
          setConversation(data.conversation);
          setMessages(data.messages);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Could not load this conversation');
      }
    };
    load();
    const interval = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedId]);

  async function sendMessage(message) {
    try {
      await api.post(`/chat/inbox/${selectedId}/messages`, { message });
      const { data } = await api.get(`/chat/inbox/${selectedId}/messages`);
      setConversation(data.conversation);
      setMessages(data.messages);
      setError('');
    } catch (err) {
      const messageText = err.response?.data?.error || 'Could not send your reply';
      setError(messageText);
      throw err;
    }
  }

  async function updateStatus(status) {
    try {
      const { data } = await api.patch(`/chat/inbox/${selectedId}`, { status });
      setConversation(data);
      await loadConversations();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the conversation');
    }
  }

  return (
    <section className="inbox-layout">
      <aside className="inbox-list-panel">
        <div className="inbox-list-heading">
          <div className="inbox-filters">
            <button className={'chip' + (filter === 'open' ? ' active' : '')} onClick={() => setFilter('open')}>Open</button>
            <button className={'chip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>All</button>
          </div>
        </div>
        {loading ? <p className="muted inbox-placeholder">Loading conversations…</p> : conversations.length === 0 ? (
          <p className="muted inbox-placeholder">No conversations here yet.</p>
        ) : conversations.map((item) => (
          <button
            type="button"
            className={'inbox-conversation' + (selectedId === item.id ? ' active' : '')}
            key={item.id}
            onClick={() => setSelectedId(item.id)}
          >
            <span className="inbox-avatar">{item.visitorName?.[0]?.toUpperCase() || '?'}</span>
            <span className="inbox-conversation-text">
              <strong>{item.visitorName}</strong>
              <span>{item.visitorEmail || 'Website visitor'}</span>
            </span>
            <time>{item.lastMessageAt && new Date(item.lastMessageAt).toLocaleDateString()}</time>
          </button>
        ))}
      </aside>
      <div className="inbox-chat-panel">
        {error && <div className="alert">{error}</div>}
        {!selectedId || !conversation ? (
          <div className="chat-empty">Choose a conversation to view messages.</div>
        ) : (
          <>
            <div className="chat-panel-heading">
              <div>
                <h2><span className="inbox-avatar">{conversation.visitorName?.[0]?.toUpperCase() || '?'}</span> {conversation.visitorName}</h2>
                <p>{conversation.visitorEmail || 'Website visitor'} <span className={'status-badge ' + conversation.status}>{conversation.status}</span></p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => updateStatus(conversation.status === 'open' ? 'closed' : 'open')}
              >
                {conversation.status === 'open' ? 'Close conversation' : 'Reopen conversation'}
              </button>
            </div>
            <MessageList messages={messages} currentUserId={currentUserId} emptyText="No messages yet." />
            <MessageComposer
              onSend={sendMessage}
              disabled={conversation.status === 'closed'}
              placeholder={conversation.status === 'closed' ? 'Reopen this conversation to reply.' : 'Reply to the customer…'}
            />
          </>
        )}
      </div>
    </section>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [section, setSection] = useState('team');

  return (
    <Layout>
      <header className="page-header">
        <h1>Chat</h1>
        <p>Talk with your team or help customers from one inbox.</p>
      </header>
      <div className="chat-tabs" role="tablist" aria-label="Chat sections">
        <button
          className={'chip' + (section === 'team' ? ' active' : '')}
          onClick={() => setSection('team')}
          role="tab"
          aria-selected={section === 'team'}
        >
          <Users size={15} /> Team room
        </button>
        <button
          className={'chip' + (section === 'customers' ? ' active' : '')}
          onClick={() => setSection('customers')}
          role="tab"
          aria-selected={section === 'customers'}
        >
          <MessageCircle size={15} /> Customer inbox
        </button>
      </div>
      {section === 'team' ? <TeamRoom currentUserId={user?.id} /> : <CustomerInbox currentUserId={user?.id} />}
    </Layout>
  );
}
