import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

/**
 * Every route renders inside this layout, so Header and Footer stay
 * mounted while only the page content (via <Outlet />) swaps out.
 */
function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

export default Layout;