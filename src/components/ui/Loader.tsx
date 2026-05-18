import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  fullScreen?: boolean;
  text?: string;
}

export function Loader({ fullScreen, text }: LoaderProps) {
  return (
    <div className={`${styles.loaderContainer} ${fullScreen ? styles.fullScreen : ''}`}>
      <div className={styles.spinner} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
}
