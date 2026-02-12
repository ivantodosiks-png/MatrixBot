/* eslint-disable @next/next/no-html-link-for-pages */
import Script from "next/script";
import BodyClass from "@/components/body-class";

export default function ChatPage() {
  return (
    <>
      <BodyClass classes="matrix chat-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />

      <div className="app">
        <aside className="sidebar" id="sidebar">
          <div className="sidebar-header">
            <div className="brand">MATRIX GPT</div>
            <button className="btn tiny" id="newChatBtn">
              Ny chat
            </button>
          </div>

          <div className="user-card">
            <div className="avatar" id="userAvatar">
              MG
            </div>
            <div className="user-info">
              <div className="user-name" id="userName">
                Gjest
              </div>
              <div className="user-email" id="userEmail" />
            </div>
            <button className="btn ghost tiny" id="logoutBtn">
              ⟲
            </button>
          </div>

          <div className="status-card">
            <div className="status-row">
              <span>Session</span>
              <span>secured</span>
            </div>
            <div className="status-row">
              <span>Model</span>
              <span>gpt-4o-mini</span>
            </div>
            <div className="status-row">
              <span>API</span>
              <span id="apiStatus">checking...</span>
            </div>
          </div>

          <div className="menu-section">
            <div className="section-title">Samtaler</div>
            <div className="chat-list" id="chatList" />
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <button className="btn ghost mobile-only" id="toggleSidebar">
              ☰
            </button>
            <div className="chat-title" id="chatTitle">
              -
            </div>
            <div className="spacer" />
            <a className="btn ghost" href="/">
              Til forsiden
            </a>
          </header>

          <section className="messages" id="messages" />

          <div className="typing" id="typing" hidden>
            Boten skriver...
          </div>

          <footer className="composer">
            <textarea
              id="messageInput"
              rows={2}
              placeholder="Skriv en melding..."
            />
            <button className="btn primary" id="sendBtn">
              Send
            </button>
          </footer>
        </main>
      </div>

      <Script src="/assets/js/config.js" strategy="afterInteractive" />
      <Script src="/assets/js/app.js" strategy="afterInteractive" />
    </>
  );
}



