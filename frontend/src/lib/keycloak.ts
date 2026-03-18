import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'https://plateform-auth.konitys.fr',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'konitys',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'plateform-frontend',
});

export default keycloak;
