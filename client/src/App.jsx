import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Libraries from './pages/Libraries';
import Library from './pages/Library';
import Chat from './pages/Chat';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Libraries />
          </PrivateRoute>
        }
      />
      <Route
        path="/libraries/:libraryId"
        element={
          <PrivateRoute>
            <Library />
          </PrivateRoute>
        }
      />
      <Route
        path="/libraries/:libraryId/chat/:conversationId"
        element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-paper text-ink font-body">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}
