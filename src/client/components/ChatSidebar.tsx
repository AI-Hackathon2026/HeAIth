import type { ChatSummary } from "../types";

interface ChatSidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  username: string;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatSidebar({
  chats,
  activeChatId,
  username,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
}: ChatSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>대화 목록</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={onCreateChat}
          title="새 대화"
        >
          +
        </button>
      </div>

      <div className="sidebar-user">
        <span className="user-avatar">{username.charAt(0).toUpperCase()}</span>
        <span className="user-name">{username}</span>
      </div>

      <nav className="chat-list">
        {chats.length === 0 ? (
          <p className="empty-hint">새 대화를 시작해 보세요.</p>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${activeChatId === chat.id ? "active" : ""}`}
            >
              <button
                type="button"
                className="chat-item-btn"
                onClick={() => onSelectChat(chat.id)}
              >
                {chat.title}
              </button>
              <button
                type="button"
                className="chat-delete-btn"
                onClick={() => onDeleteChat(chat.id)}
                title="대화 삭제"
              >
                ×
              </button>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
