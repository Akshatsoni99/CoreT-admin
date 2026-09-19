/**
 * CoreT - Bank Admin Dashboard Application
 * Dedicated portal for Branch Officers, Cashiers, and Verifiers.
 * Optimized for both Mobile Phone and Desktop terminal displays.
 */

import { AdminView } from './views/AdminView';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] text-gray-900 font-sans antialiased">
      <AdminView />
    </div>
  );
}
