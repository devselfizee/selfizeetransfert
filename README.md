# Selfizee Transfer

Application interne de transfert de fichiers volumineux — équivalent WeTransfer pour Selfizee.

## Architecture

| Service | Technologie | Port |
|---------|------------|------|
| Frontend | Next.js 14 + TailwindCSS | 3000 |
| Backend | Python FastAPI | 8000 |
| Base de données | PostgreSQL 16 | 5432 |
| Cache/Broker | Redis 7 | 6379 |
| Worker | Celery (nettoyage auto) | — |
| Reverse Proxy | Nginx | 80/443 |

## Démarrage rapide

### Prérequis

- Docker et Docker Compose installés
- Ports 80 et 443 disponibles

### Installation

```bash
# Cloner le projet
cd selfizee-transfer

# Lancer le script d'installation automatique
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Le script va :
1. Créer le fichier `.env` avec une clé secrète générée
2. Générer les certificats SSL auto-signés
3. Construire et démarrer tous les conteneurs

### Ou manuellement

```bash
# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env selon votre configuration

# Construire et lancer
docker compose build
docker compose up -d
```

### Accès

- **Application** : https://localhost (ou https://transfer.selfizee.local)
- **API docs** : http://localhost:8000/docs
- **Compte par défaut** : `admin@selfizee.fr` / `Admin123!`

> Changez le mot de passe admin dès la première connexion.

## Structure du projet

```
selfizee-transfer/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── api/             # Endpoints (auth, transfers, downloads)
│   │   ├── core/            # Config, database, sécurité
│   │   ├── models/          # Modèles SQLAlchemy
│   │   ├── schemas/         # Schémas Pydantic
│   │   ├── services/        # Logique métier
│   │   ├── tasks/           # Celery (nettoyage automatique)
│   │   └── utils/           # Validateurs
│   ├── tests/               # Tests unitaires
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Interface Next.js
│   ├── src/
│   │   ├── app/             # Pages (App Router)
│   │   ├── components/      # Composants React
│   │   ├── hooks/           # Hooks personnalisés
│   │   ├── lib/             # API client, types, utils
│   │   └── store/           # État Zustand
│   ├── Dockerfile
│   └── package.json
├── nginx/                   # Configuration reverse proxy
├── scripts/                 # Scripts d'installation et backup
├── storage/                 # Fichiers uploadés (volume Docker)
├── docker-compose.yml
└── .env
```

## Fonctionnalités

- **Upload drag & drop** multi-fichiers avec barre de progression
- **Liens sécurisés** avec tokens cryptographiques
- **Expiration automatique** (24h, 3j, 7j, 14j) avec suppression fichiers
- **Email automatique** au destinataire avec branding Selfizee
- **Historique** des transferts avec statistiques de téléchargement
- **Téléchargement ZIP** ou fichier individuel
- **Authentification JWT** avec protection bruteforce
- **Rate limiting** et validation des fichiers
- **Responsive** mobile/desktop

## Configuration

Variables d'environnement principales (`.env`) :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SECRET_KEY` | Clé JWT | Générée automatiquement |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `postgres` |
| `MAX_UPLOAD_SIZE` | Taille max upload (octets) | `10737418240` (10 GB) |
| `SMTP_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Utilisateur SMTP | — |
| `SMTP_PASSWORD` | Mot de passe SMTP | — |
| `BASE_URL` | URL publique | `https://transfer.selfizee.local` |

## API

Documentation interactive disponible sur `/docs` (Swagger UI).

### Endpoints principaux

```
POST   /api/auth/login          # Connexion
POST   /api/auth/logout         # Déconnexion
GET    /api/auth/me             # Utilisateur courant

POST   /api/transfers/create    # Créer un transfert
GET    /api/transfers           # Lister ses transferts
GET    /api/transfers/{id}      # Détail d'un transfert
DELETE /api/transfers/{id}      # Supprimer un transfert

GET    /api/download/{token}           # Info transfert (public)
GET    /api/download/{token}/file/{id} # Télécharger un fichier
GET    /api/download/{token}/zip       # Télécharger tout en ZIP
```

## Sauvegarde

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

Les backups sont stockés dans `./backups/` (rétention 7 jours).

## Sécurité

- Mots de passe hashés avec bcrypt
- Tokens JWT avec blacklist Redis
- Rate limiting sur le login (5 tentatives/minute)
- Extensions dangereuses bloquées (.exe, .bat, .cmd, .sh, .ps1, .vbs)
- Protection path traversal sur les noms de fichiers
- Headers de sécurité Nginx (HSTS, X-Frame-Options, CSP)
- HTTPS obligatoire

## Tests

```bash
# Tests backend
docker compose exec backend pytest tests/ -v
```

## Production

Pour un déploiement production :

1. Remplacer les certificats SSL auto-signés par des vrais certificats
2. Configurer un vrai serveur SMTP
3. Changer le mot de passe admin par défaut
4. Configurer `BASE_URL` avec le vrai domaine
5. Configurer les CORS origins dans `.env`
6. Mettre en place les backups automatiques (cron)
