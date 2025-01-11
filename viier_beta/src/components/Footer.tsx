// src/components/Footer.tsx
import React from 'react';
import { IonFooter, IonToolbar, IonTitle } from '@ionic/react';
import './Footer.css';

interface FooterProps {
  text: string; // Ermöglicht die Anpassung des Textes
}

const Footer: React.FC<FooterProps> = ({ text }) => {
  return (
    <IonFooter>
      <IonToolbar color="primary">
        <IonTitle size="small" className="ion-text-center">
          {text}
        </IonTitle>
      </IonToolbar>
    </IonFooter>
  );
};

export default Footer;
