import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './assets/CSS/style.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Main from './components/Main';
import Messages from './components/Messages';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import LoginPage from './pages/Login';
import PlaceholderPage from './pages/PlaceholderPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Main />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/students" element={<Students />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route
              path="*"
              element={<PlaceholderPage title="Page not found" description="The page you're looking for doesn't exist." />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;