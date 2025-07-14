import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import styles from './Common.module.css';

function MainLayout() {
  return (
    <div className={styles.mainLayout}>
      <Header />
      <div className={styles.layoutContent}>
        <Sidebar />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;