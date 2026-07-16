import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Store from "./pages/Store.jsx";
import Vault from "./pages/Vault.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tax from "./pages/Tax.jsx";
import Account from "./pages/Account.jsx";
import Finder from "./pages/Finder.jsx";
import { RequireAuth } from "./lib/AuthContext.jsx";

// `/` and `/store` stay public — they're the top-of-funnel.
// `/vault`, `/dashboard`, `/tax` hold user data → protected.
// `/account` self-manages (it IS the sign-in surface).
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/store" element={<Store />} />
        <Route
          path="/vault"
          element={
            <RequireAuth>
              <Vault />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/tax"
          element={
            <RequireAuth>
              <Tax />
            </RequireAuth>
          }
        />
        <Route
          path="/finder"
          element={
            <RequireAuth>
              <Finder />
            </RequireAuth>
          }
        />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Landing />} />
      </Route>
    </Routes>
  );
}
