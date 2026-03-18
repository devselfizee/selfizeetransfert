#!/usr/bin/env bash
# ==============================================================================
# Selfizee Transfer - Script d'installation
# ==============================================================================

set -euo pipefail

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Pas de couleur

# Répertoire du projet (parent du répertoire scripts/)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  Selfizee Transfer - Installation${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[x]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

# ==============================================================================
# Vérification des prérequis
# ==============================================================================
check_prerequisites() {
    print_step "Vérification des prérequis..."

    local missing=0

    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé. Veuillez l'installer : https://docs.docker.com/get-docker/"
        missing=1
    else
        print_success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
    fi

    if docker compose version &> /dev/null; then
        print_success "Docker Compose (plugin) $(docker compose version --short)"
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        print_success "docker-compose $(docker-compose --version | awk '{print $4}' | tr -d ',')"
        COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose n'est pas installé. Veuillez l'installer : https://docs.docker.com/compose/install/"
        missing=1
    fi

    if [ "$missing" -eq 1 ]; then
        echo ""
        print_error "Des prérequis sont manquants. Veuillez les installer avant de continuer."
        exit 1
    fi

    echo ""
}

# ==============================================================================
# Configuration de l'environnement
# ==============================================================================
setup_env() {
    print_step "Configuration de l'environnement..."

    if [ ! -f "${PROJECT_DIR}/.env" ]; then
        cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/.env"
        print_success "Fichier .env créé à partir de .env.example"
    else
        print_warning "Le fichier .env existe déjà, il ne sera pas écrasé."
    fi

    # Génération d'une clé secrète aléatoire
    SECRET_KEY=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/SECRET_KEY=changez-moi-avec-une-vraie-cle-secrete/SECRET_KEY=${SECRET_KEY}/" "${PROJECT_DIR}/.env"
    else
        sed -i "s/SECRET_KEY=changez-moi-avec-une-vraie-cle-secrete/SECRET_KEY=${SECRET_KEY}/" "${PROJECT_DIR}/.env"
    fi
    print_success "Clé secrète générée et configurée"

    echo ""
}

# ==============================================================================
# Création des répertoires
# ==============================================================================
setup_directories() {
    print_step "Création des répertoires..."

    mkdir -p "${PROJECT_DIR}/storage/transfers"
    mkdir -p "${PROJECT_DIR}/backups"
    mkdir -p "${PROJECT_DIR}/nginx/ssl"

    print_success "Répertoires créés : storage/transfers, backups, nginx/ssl"
    echo ""
}

# ==============================================================================
# Génération des certificats SSL auto-signés
# ==============================================================================
setup_ssl() {
    print_step "Génération des certificats SSL auto-signés..."

    local SSL_DIR="${PROJECT_DIR}/nginx/ssl"

    if [ -f "${SSL_DIR}/selfsigned.crt" ] && [ -f "${SSL_DIR}/selfsigned.key" ]; then
        print_warning "Les certificats SSL existent déjà, ils ne seront pas écrasés."
    else
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${SSL_DIR}/selfsigned.key" \
            -out "${SSL_DIR}/selfsigned.crt" \
            -subj "/C=FR/ST=France/L=Paris/O=Selfizee/OU=Transfer/CN=transfer.selfizee.local" \
            2>/dev/null

        chmod 600 "${SSL_DIR}/selfsigned.key"
        chmod 644 "${SSL_DIR}/selfsigned.crt"

        print_success "Certificats SSL auto-signés générés dans nginx/ssl/"
    fi

    echo ""
}

# ==============================================================================
# Construction et démarrage des conteneurs
# ==============================================================================
build_and_start() {
    print_step "Construction des images Docker..."
    cd "${PROJECT_DIR}"
    ${COMPOSE_CMD} build
    print_success "Images construites avec succès"

    echo ""
    print_step "Démarrage des services..."
    ${COMPOSE_CMD} up -d
    print_success "Services démarrés"

    echo ""
}

# ==============================================================================
# Attente que les services soient prêts
# ==============================================================================
wait_for_services() {
    print_step "Attente que les services soient prêts..."

    local max_attempts=30
    local attempt=0

    # Attente de PostgreSQL
    echo -n "  PostgreSQL : "
    while [ $attempt -lt $max_attempts ]; do
        if docker exec selfizee-db pg_isready -U postgres &> /dev/null; then
            echo -e "${GREEN}prêt${NC}"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}échec (timeout)${NC}"
    fi

    # Attente de Redis
    attempt=0
    echo -n "  Redis      : "
    while [ $attempt -lt $max_attempts ]; do
        if docker exec selfizee-redis redis-cli ping &> /dev/null; then
            echo -e "${GREEN}prêt${NC}"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}échec (timeout)${NC}"
    fi

    # Attente du backend
    attempt=0
    echo -n "  Backend    : "
    while [ $attempt -lt $max_attempts ]; do
        if docker exec selfizee-backend curl -sf http://localhost:8000/api/health &> /dev/null 2>&1; then
            echo -e "${GREEN}prêt${NC}"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${YELLOW}en attente (le backend peut prendre plus de temps)${NC}"
    fi

    # Attente du frontend
    attempt=0
    echo -n "  Frontend   : "
    while [ $attempt -lt $max_attempts ]; do
        if docker exec selfizee-frontend curl -sf http://localhost:3000 &> /dev/null 2>&1; then
            echo -e "${GREEN}prêt${NC}"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${YELLOW}en attente (le frontend peut prendre plus de temps)${NC}"
    fi

    echo ""
}

# ==============================================================================
# Affichage du résumé
# ==============================================================================
print_summary() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  Installation terminée !${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
    echo -e "  ${GREEN}URL d'accès :${NC} https://transfer.selfizee.local"
    echo ""
    echo -e "  ${GREEN}Identifiants administrateur :${NC}"
    echo -e "    Email    : admin@selfizee.fr"
    echo -e "    Mot de passe : Admin123!"
    echo ""
    echo -e "  ${YELLOW}Note :${NC} Ajoutez l'entrée suivante dans votre fichier /etc/hosts :"
    echo -e "    127.0.0.1  transfer.selfizee.local"
    echo ""
    echo -e "  ${YELLOW}Note :${NC} Le certificat SSL est auto-signé. Votre navigateur"
    echo -e "  affichera un avertissement de sécurité que vous pouvez ignorer"
    echo -e "  en développement."
    echo ""
    echo -e "  ${GREEN}Commandes utiles :${NC}"
    echo -e "    Voir les logs       : ${COMPOSE_CMD} logs -f"
    echo -e "    Arrêter les services: ${COMPOSE_CMD} down"
    echo -e "    Redémarrer          : ${COMPOSE_CMD} restart"
    echo -e "    Sauvegarde          : bash scripts/backup.sh"
    echo ""
    echo -e "${BLUE}============================================================${NC}"
}

# ==============================================================================
# Exécution principale
# ==============================================================================
main() {
    print_header
    check_prerequisites
    setup_env
    setup_directories
    setup_ssl
    build_and_start
    wait_for_services
    print_summary
}

main "$@"
