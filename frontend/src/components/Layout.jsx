import React from "react";
import { Outlet } from "react-router-dom"; // Import Outlet
import Navbar from "./Navbar";

function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {/* Outlet tells React Router where to render the child pages */}
        <Outlet /> 
      </main>
      <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-400 text-sm">
        © 2026 LUXE. All rights reserved.
      </footer>
    </div>
  );
}

export default Layout;