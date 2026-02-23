import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Archive from './pages/Archive';
import TopicList from './pages/TopicList';
import TopicEditor from './pages/TopicEditor';
import BriefDetail from './pages/BriefDetail';
import Settings from './pages/Settings';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-600'}`;

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-blue-800 px-6 py-3 flex items-center gap-4">
          <span className="text-white font-bold text-lg mr-4">Research Assistant</span>
          <NavLink to="/" end className={navClass}>Dashboard</NavLink>
          <NavLink to="/archive" className={navClass}>Archive</NavLink>
          <NavLink to="/topics" className={navClass}>Topics</NavLink>
          <NavLink to="/settings" className={navClass}>Settings</NavLink>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/briefs/:id" element={<BriefDetail />} />
            <Route path="/topics" element={<TopicList />} />
            <Route path="/topics/:id" element={<TopicEditor />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
