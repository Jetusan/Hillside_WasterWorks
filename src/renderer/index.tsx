import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import './styles/global.css';  

import '@fontsource/fraunces/700.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);