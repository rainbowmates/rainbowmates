import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import SplashScreen from "./pages/SplashScreen";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import CreateAvatar from "./pages/CreateAvatar";
import CreateBestie from "./pages/CreateBestie";
import PlayScreen from "./pages/PlayScreen";
import ChatScreen from "./pages/ChatScreen";
import VoiceScreen from "./pages/VoiceScreen";
import DanceScreen from "./pages/DanceScreen";
import DateOrMateScreen from "./pages/DateOrMateScreen";
import ShoppingScreen from "./pages/ShoppingScreen";
import SubscriptionScreen from "./pages/SubscriptionScreen";
import SettingsScreen from "./pages/SettingsScreen";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [user, setUser] = useState(null);
  const [bestie, setBestie] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user
    const savedUser = localStorage.getItem("rainbow_mates_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Check for saved bestie
    const savedBestie = localStorage.getItem("rainbow_mates_bestie");
    if (savedBestie) {
      setBestie(JSON.parse(savedBestie));
    }
    
    setLoading(false);

    // Show splash for 3 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Refresh user data from localStorage periodically (for avatar updates)
  useEffect(() => {
    const refreshUser = () => {
      const savedUser = localStorage.getItem("rainbow_mates_user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        // Only update if data has changed
        if (JSON.stringify(parsedUser) !== JSON.stringify(user)) {
          setUser(parsedUser);
        }
      }
    };

    // Check for updates every second when page is visible
    const interval = setInterval(refreshUser, 1000);
    
    // Also refresh on focus
    window.addEventListener('focus', refreshUser);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshUser);
    };
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("rainbow_mates_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("rainbow_mates_user");
  };

  if (loading) {
    return <div className="min-h-screen bg-white" />;
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />
            }
          />
          <Route
            path="/auth"
            element={
              user ? (
                <Navigate to="/dashboard" />
              ) : (
                <AuthPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/auth/callback"
            element={<AuthCallback onLogin={handleLogin} />}
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/create-avatar"
            element={user ? <CreateAvatar user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/create-bestie"
            element={user ? <CreateBestie user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/play"
            element={user ? <PlayScreen user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/chat"
            element={user ? <ChatScreen user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/voice"
            element={user ? <VoiceScreen user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/dance"
            element={user ? <DanceScreen user={user} bestie={bestie} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/date-or-mate"
            element={user ? <DateOrMateScreen user={user} bestie={bestie} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/shopping"
            element={user ? <ShoppingScreen user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/subscription"
            element={user ? <SubscriptionScreen user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/subscription/success"
            element={user ? <SubscriptionScreen user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/settings"
            element={user ? <SettingsScreen user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
