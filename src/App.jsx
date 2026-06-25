import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Store from "./pages/Store.jsx";
import Vault from "./pages/Vault.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tax from "./pages/Tax.jsx";
import Account from "./pages/Account.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/store" element={<Store />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tax" element={<Tax />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Landing />} />
      </Route>
    </Routes>
  );
}
