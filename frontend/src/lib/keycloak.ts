import Keycloak from 'keycloak-js';

let keycloak: Keycloak | null = null;

export function getKeycloak(): Keycloak {
  if (!keycloak) {
    keycloak = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'https://plateform-auth.konitys.fr',
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'konitys',
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'plateform-frontend',
    });
  }
  return keycloak;
}

export default getKeycloak;
