// src/components/SplashScreen.tsx
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import './SplashScreen.css'; // Optional: eigene CSS für Styling
import slotHeavenLogo from '../assets/vierLogo.png'; // Importiere das Logo

const SplashScreen: React.FC = () => {
  const history = useHistory();
  const aktuellesJahr = new Date().getFullYear();

  useEffect(() => {
    const timer = setTimeout(() => {
      history.push('/viier-online'); // Navigiert zur Hauptseite nach 3 Sekunden
    }, 3000); // 3000 ms = 3 Sekunden

    return () => clearTimeout(timer); // Cleanup der Komponente
  }, [history]);

  return (
    <div className="splash-screen">
      <img src={slotHeavenLogo} alt="Logo" className="splash-logo"/>
      <div className="footer-text">© 2024-{aktuellesJahr} GloveLab</div> {/* Footer text added here */}
    </div>
  );
};

export default SplashScreen;
