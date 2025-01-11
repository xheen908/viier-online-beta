// src/components/Header.tsx
import React from 'react';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon } from '@ionic/react';
import { home, menu } from 'ionicons/icons'; // Icons importieren
import slotHeavenLogo from '../assets/vierLogo.png'; // Importiere das Logo
import './Header.css';

interface HeaderProps {
  title: string;
  collapse?: boolean; // Optional: Unterstützt collapse-Einstellungen
}

const Header: React.FC<HeaderProps> = ({ title, collapse = false }) => {
  return (
    <>
      <IonHeader>
        <IonToolbar color="primary">
          {/* Linker Button */}
          <IonButtons slot="start">
            <IonButton routerLink="/viier-online"> {/* Navigiert zur Startseite */}
              <IonIcon icon={home} />
            </IonButton>
          </IonButtons>

          {/* Logo im Titel */}
          <IonTitle className="header-logo-container" style={{ textAlign: 'center' }}>
            <img src={slotHeavenLogo} alt="Slot Heaven Logo" style={{ maxHeight: '75px' }} />
          </IonTitle>

          {/* Rechter Button */}
          <IonButtons slot="end">
            <IonButton>
              <IonIcon icon={menu} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {/* Optional: Kollabierender Header */}
      {collapse && (
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
      )}
    </>
  );
};

export default Header;
