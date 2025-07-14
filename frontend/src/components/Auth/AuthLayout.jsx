import React from 'react';
import styles from './Auth.module.css';

function AuthLayout({ children }) {
  return (
    <div className={styles.authLayout}>
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <h1 className={styles.brandName}>Shopify SEO Analyzer</h1>
          <p className={styles.brandTagline}>Optimize your store's search visibility</p>
        </div>
        <div className={styles.authContent}>
          {children}
        </div>
        <div className={styles.authFooter}>
          <p>&copy; 2024 Shopify SEO Analyzer. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;