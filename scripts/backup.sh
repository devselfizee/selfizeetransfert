#!/usr/bin/env bash
# ==============================================================================
# Selfizee Transfer - Script de sauvegarde
# ==============================================================================

set -euo pipefail

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Répertoire du projet (parent du répertoire scripts/)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Configuration
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="selfizee_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
RETENTION=7

# Charger les variables d'environnement si le fichier .env existe
if [ -f "${PROJECT_DIR}/.env" ]; then
    # Lire BACKUP_RETENTION depuis .env si défini
    RETENTION=$(grep -E "^BACKUP_RETENTION=" "${PROJECT_DIR}/.env" 2>/dev/null | cut -d'=' -f2 || echo "7")
    RETENTION=${RETENTION:-7}
fi

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
# Vérifications préalables
# ==============================================================================
check_services() {
    print_step "Vérification des services..."

    if ! docker ps --filter "name=selfizee-db" --format "{{.Names}}" | grep -q "selfizee-db"; then
        print_error "Le conteneur selfizee-db n'est pas en cours d'exécution."
        print_error "Démarrez les services avec : docker compose up -d"
        exit 1
    fi

    print_success "Le service de base de données est actif"
}

# ==============================================================================
# Création du répertoire de sauvegarde
# ==============================================================================
create_backup_dir() {
    mkdir -p "${BACKUP_PATH}"
    print_step "Répertoire de sauvegarde : ${BACKUP_PATH}"
}

# ==============================================================================
# Sauvegarde de la base de données PostgreSQL
# ==============================================================================
backup_database() {
    print_step "Sauvegarde de la base de données PostgreSQL..."

    docker exec selfizee-db pg_dump \
        -U postgres \
        -d selfizee_transfer \
        --format=custom \
        --compress=9 \
        > "${BACKUP_PATH}/database.dump"

    if [ $? -eq 0 ]; then
        local db_size
        db_size=$(du -sh "${BACKUP_PATH}/database.dump" | cut -f1)
        print_success "Base de données sauvegardée (${db_size})"
    else
        print_error "Échec de la sauvegarde de la base de données"
        exit 1
    fi
}

# ==============================================================================
# Sauvegarde du répertoire de stockage
# ==============================================================================
backup_storage() {
    print_step "Sauvegarde du répertoire de stockage..."

    local storage_dir="${PROJECT_DIR}/storage"

    if [ -d "${storage_dir}" ] && [ "$(ls -A "${storage_dir}" 2>/dev/null)" ]; then
        tar -czf "${BACKUP_PATH}/storage.tar.gz" \
            -C "${PROJECT_DIR}" \
            storage/

        local storage_size
        storage_size=$(du -sh "${BACKUP_PATH}/storage.tar.gz" | cut -f1)
        print_success "Stockage sauvegardé (${storage_size})"
    else
        print_warning "Le répertoire de stockage est vide, sauvegarde ignorée"
        touch "${BACKUP_PATH}/storage_empty.marker"
    fi
}

# ==============================================================================
# Création de l'archive finale
# ==============================================================================
create_archive() {
    print_step "Création de l'archive finale..."

    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"

    # Suppression du répertoire temporaire
    rm -rf "${BACKUP_PATH}"

    local archive_size
    archive_size=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    print_success "Archive créée : ${BACKUP_NAME}.tar.gz (${archive_size})"
}

# ==============================================================================
# Nettoyage des anciennes sauvegardes
# ==============================================================================
cleanup_old_backups() {
    print_step "Nettoyage des anciennes sauvegardes (conservation des ${RETENTION} dernières)..."

    local backup_count
    backup_count=$(ls -1 "${BACKUP_DIR}"/selfizee_backup_*.tar.gz 2>/dev/null | wc -l | tr -d ' ')

    if [ "${backup_count}" -gt "${RETENTION}" ]; then
        local to_delete=$((backup_count - RETENTION))
        ls -1t "${BACKUP_DIR}"/selfizee_backup_*.tar.gz | tail -n "${to_delete}" | while read -r old_backup; do
            rm -f "${old_backup}"
            print_warning "Supprimé : $(basename "${old_backup}")"
        done
        print_success "${to_delete} ancienne(s) sauvegarde(s) supprimée(s)"
    else
        print_success "Aucune ancienne sauvegarde à supprimer (${backup_count}/${RETENTION})"
    fi
}

# ==============================================================================
# Résumé
# ==============================================================================
print_summary() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  Sauvegarde terminée avec succès${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
    echo -e "  Archive : ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo ""

    echo -e "  Sauvegardes disponibles :"
    ls -1t "${BACKUP_DIR}"/selfizee_backup_*.tar.gz 2>/dev/null | while read -r f; do
        local size
        size=$(du -sh "${f}" | cut -f1)
        echo -e "    - $(basename "${f}") (${size})"
    done

    echo ""
    echo -e "  Pour restaurer la base de données :"
    echo -e "    tar -xzf ${BACKUP_NAME}.tar.gz"
    echo -e "    docker exec -i selfizee-db pg_restore -U postgres -d selfizee_transfer < database.dump"
    echo ""
    echo -e "${BLUE}============================================================${NC}"
}

# ==============================================================================
# Exécution principale
# ==============================================================================
main() {
    echo ""
    echo -e "${BLUE}Selfizee Transfer - Sauvegarde${NC}"
    echo -e "${BLUE}Date : $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""

    check_services
    create_backup_dir
    backup_database
    backup_storage
    create_archive
    cleanup_old_backups
    print_summary
}

main "$@"
