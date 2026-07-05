// React — the core library. We need it to use JSX syntax.
import React from 'react'

// ReactDOM — the bridge between React and the actual browser DOM.
// "DOM" = the browser's representation of your HTML.
import ReactDOM from 'react-dom/client'

// Our root component — the App is the entire application.
import App from './App.jsx'

// Our global CSS — loaded once here, applies everywhere.
import './index.css'

// ReactDOM.createRoot finds the <div id="root"> in index.html
// and tells React: "take control of this element".
// .render(<App />) tells it: "put the App component inside it".
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode doesn't change visible behavior — it adds
  // extra warnings in development to catch bad patterns early.
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
