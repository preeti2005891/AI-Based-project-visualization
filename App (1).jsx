import { useEffect, useState } from 'react';
import Dashboard from './Dashboard.jsx';
import Project from './Project.jsx';

export default function App() {
  const read = () => Number(location.hash.slice(1)) || null;
  const [pid, setPid] = useState(read);
  useEffect(() => {
    const h = () => setPid(read());
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);
  return (
    <div className="wrap">
      <header>
        <a href="#" className="brand">ProjectPulse</a>
        <span className="mut">AI-based project tracking</span>
      </header>
      {pid ? <Project id={pid} /> : <Dashboard />}
    </div>
  );
}
