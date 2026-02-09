import { useState, useRef, useEffect, useMemo } from 'react';
import type { TeamMember, SessionMetadata } from '../../shared/ipc-types';
import { useMessageStream } from '../hooks/useMessageStream';

interface MessageStreamProps {
  teamName: string;
  members: TeamMember[];
  sessions: SessionMetadata[];
}

// Generate consistent color from agent name
function agentColor(name: string): string {
  const colors = ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#f7768e', '#7dcfff', '#2ac3de', '#ff9e64'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function MessageStream({ sessions }: MessageStreamProps) {
  const sessionIds = useMemo(() => sessions.map(s => s.id), [sessions]);
  const { messages } = useMessageStream(sessionIds);

  const [search, setSearch] = useState('');
  const [filterSender, setFilterSender] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filteredMessages = useMemo(() => {
    let result = messages;
    if (filterSender) {
      result = result.filter(m => m.sender === filterSender || m.receiver === filterSender);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.content.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        (m.receiver && m.receiver.toLowerCase().includes(q))
      );
    }
    return result;
  }, [messages, search, filterSender]);

  const uniqueSenders = useMemo(() => {
    const senders = new Set<string>();
    messages.forEach(m => {
      senders.add(m.sender);
      if (m.receiver) senders.add(m.receiver);
    });
    return Array.from(senders).sort();
  }, [messages]);

  return (
    <div className="message-stream">
      <div className="message-stream-filters">
        <input
          className="message-search"
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="message-filter-select"
          value={filterSender}
          onChange={e => setFilterSender(e.target.value)}
        >
          <option value="">All agents</option>
          {uniqueSenders.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="message-timeline">
        {filteredMessages.length === 0 ? (
          <div className="message-empty">
            {messages.length === 0
              ? 'No messages yet. Messages appear as agents communicate.'
              : 'No messages match filters.'}
          </div>
        ) : (
          filteredMessages.map(msg => (
            <div
              key={msg.id}
              className={`message-item ${expandedId === msg.id ? 'expanded' : ''}`}
              onClick={() => setExpandedId(prev => prev === msg.id ? null : msg.id)}
            >
              <div className="message-header">
                <span className="message-sender" style={{ color: agentColor(msg.sender) }}>
                  {msg.sender}
                </span>
                {msg.receiver && (
                  <>
                    <span className="message-arrow">→</span>
                    <span className="message-receiver" style={{ color: agentColor(msg.receiver) }}>
                      {msg.receiver}
                    </span>
                  </>
                )}
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="message-content">{msg.content}</div>
              {expandedId === msg.id && (
                <div className="message-details">
                  <div className="message-detail-row">
                    <span className="message-detail-label">ID:</span>
                    <span className="message-detail-value">{msg.id}</span>
                  </div>
                  <div className="message-detail-row">
                    <span className="message-detail-label">Session:</span>
                    <span className="message-detail-value">{msg.sessionId.slice(0, 8)}...</span>
                  </div>
                  <div className="message-raw">{msg.raw}</div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <style>{messageStreamStyles}</style>
    </div>
  );
}

const messageStreamStyles = `
  .message-stream {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }

  .message-stream-filters {
    display: flex;
    gap: 6px;
  }

  .message-search {
    flex: 1;
    height: 30px;
    padding: 0 8px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    color: #a9b1d6;
    font-size: 11px;
    font-family: inherit;
  }

  .message-search::placeholder { color: #3b4261; }
  .message-search:focus { outline: none; border-color: #7aa2f7; }

  .message-filter-select {
    width: 100px;
    height: 30px;
    padding: 0 6px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    color: #a9b1d6;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    appearance: none;
  }

  .message-timeline {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .message-empty {
    padding: 24px;
    text-align: center;
    font-size: 11px;
    color: #3b4261;
  }

  .message-item {
    padding: 8px 10px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .message-item:hover { border-color: #3b4261; }

  .message-header {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 3px;
  }

  .message-sender, .message-receiver {
    font-size: 11px;
    font-weight: 600;
  }

  .message-arrow {
    font-size: 10px;
    color: #565f89;
  }

  .message-time {
    margin-left: auto;
    font-size: 10px;
    color: #3b4261;
  }

  .message-content {
    font-size: 11px;
    color: #a9b1d6;
    line-height: 1.4;
    word-break: break-word;
  }

  .message-details {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #292e42;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .message-detail-row {
    display: flex;
    gap: 6px;
    font-size: 10px;
  }

  .message-detail-label { color: #565f89; }
  .message-detail-value { color: #7aa2f7; font-family: 'JetBrains Mono', monospace; }

  .message-raw {
    margin-top: 4px;
    padding: 6px;
    background: #1a1b26;
    border-radius: 4px;
    font-size: 10px;
    color: #565f89;
    font-family: 'JetBrains Mono', monospace;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;
