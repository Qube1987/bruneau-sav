import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enhanced error handling and debugging
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
} else {
  try {
    console.log('Initializing React app...');
    
    // Check environment variables
    const hasSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const hasSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('Environment check:', {
      VITE_SUPABASE_URL: hasSupabaseUrl ? 'Set' : 'Not set',
      VITE_SUPABASE_ANON_KEY: hasSupabaseKey ? 'Set' : 'Not set',
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD
    });
    
    if (!hasSupabaseUrl || !hasSupabaseKey) {
      console.warn('Supabase environment variables not set - some features may not work');
    }
    
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('React app initialized successfully');
  } catch (error) {
    console.error('Error initializing React app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
        <h2>Application Error</h2>
        <p>Failed to initialize the application.</p>
        <p>Please check the browser console for more details.</p>
        <details>
          <summary>Error details</summary>
          <pre style="white-space: pre-wrap; word-wrap: break-word;">${error instanceof Error ? error.message : String(error)}</pre>
        </details>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}
