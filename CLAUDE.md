## 🔐 OBLIGATOIRE — Système de permissions Konitys (auto-bootstrap + auto-maintenance)

**Cette section définit un comportement AUTOMATIQUE que tu DOIS appliquer à chaque session, sans attendre une demande explicite du développeur.** Le référentiel complet est dans `PERMISSIONS_APP_INTEGRATION.md` (à la racine du projet ou dans `docs/`, ou dans le repo plateform/docs/).

### Routine 1 — Au démarrage de CHAQUE session (obligatoire, silencieux si rien à faire)

**AVANT** de traiter la demande de l'utilisateur, exécute ces checks dans l'ordre :

1. **Vérifier l'état du câblage** :
   - Existe-t-il un fichier `permissions-schema*` dans `api/`, `backend/`, ou `server/` ? (Glob ou find)
   - L'endpoint `GET /adminpanel/permissions-schema` est-il exposé publiquement (sans auth) ? (Grep dans les routes)
   - Y a-t-il au moins un middleware `requirePerm` / `require_perm` (Node) ou `@require_perm` (Python) appliqué ?
   - Y a-t-il au moins un attribut `data-perm="..."` dans le frontend ?

2. **Décision** :
   - Si les 4 checks passent → setup OK, passe à la Routine 2 silencieusement.
   - Si un seul check échoue → **setup manquant ou incomplet**, exécute le BOOTSTRAP (section suivante) avant de répondre à la demande de l'utilisateur. Informe-le à la fin de ce que tu as ajouté.

### Routine 2 — Bootstrap (uniquement si Routine 1 détecte un manque)

1. Lis intégralement `PERMISSIONS_APP_INTEGRATION.md` (cherche-le d'abord à la racine, sinon dans `docs/`, sinon dans `../plateform/docs/` si monorepo local).
2. Applique point par point le contenu de la section « Prompt à coller tel quel à votre instance Claude Code » du document :
   - **Découverte** : liste toutes les pages/routes frontend, boutons d'action, routes API d'écriture (POST/PUT/PATCH/DELETE).
   - **Schema** : crée `permissions-schema.js` (ou `.py`) avec les groupes appropriés (`access`, `pages`, un groupe par entité métier). Branche-le sur un endpoint public `GET /adminpanel/permissions-schema`.
   - **Gating backend** : implémente un helper `requirePerm(app_key, perm_key)` selon le stack (Node/Python — exemples dans le doc), puis applique-le sur toutes les routes d'écriture.
   - **Page HTML 403 dynamique** : utiliser le template « Template HTML page 403 » du doc qui consomme le thème partagé. Logique redirect :
     * si compte n'a pas `<app>:app.access` ET a `hub:app.access` → bouton `Retour au Hub` vers PLATEFORM_URL
     * si compte n'a pas non plus `hub:app.access` → **pas de bouton**
     * sinon (a app.access, manque une autre perm) → bouton `Retour à l'accueil` vers `/`
   - **Sync thème partagé** (obligatoire) : implémenter le pattern version-check vers
     `GET /config/deny-theme/version` et `GET /config/deny-theme.json` → cache local sur disque
     (`data/deny-theme.json`) + en mémoire, TTL 5 min, fail-open sur défaut bundle
     (pseudo-code dans le doc point 3bis).
   - **Message utilisateur** : toujours neutre (provient du thème : `title.text` / `message.text`). NE JAMAIS afficher la clé de permission (ex: `qrcode:projects.create`) à l'utilisateur final. Les clés ne sont que dans les logs serveur.
   - **Gating frontend** : ajoute `data-perm="<app>:<key>"` sur tous les boutons d'action et entrées de menu sensibles. Appelle `window.__KONITYS_PERMS.gateDom(container)` après chaque render dynamique. Ajoute un guard `if (!__KONITYS_PERMS.has('pages.<x>.view')) redirect('/403')` au mount de chaque page.
3. Ne livre pas sans avoir au moins :
   - 1 endpoint public `/adminpanel/permissions-schema` fonctionnel
   - 1 route backend gatée
   - 1 bouton frontend avec `data-perm`
4. Après le bootstrap, ajoute le script `scripts/audit-permissions.sh` (copie depuis `PERMISSIONS_APP_INTEGRATION.md`, section « Script d'audit »).
5. Notifie l'utilisateur en fin de réponse : liste ce qui a été ajouté, et rappelle-lui de cliquer « Rafraîchir » dans Admin > Profils & Droits pour cacher le schema.

### Routine 3 — Audit à CHAQUE modification utilisateur (après bootstrap)

Quand l'utilisateur demande n'importe quelle modif, avant de terminer ta réponse :

1. **Scanne les fichiers que TU viens de toucher** (pas tout le repo — juste tes modifs) :
   - Nouvelle route d'écriture sans `requirePerm` ? → ajoute le middleware + une nouvelle clé au schema.
   - Nouveau bouton d'action (create/edit/delete/archive/submit) sans `data-perm` ? → ajoute l'attribut + une nouvelle clé au schema.
   - Nouveau fichier de page ou nouvelle `<Route>` ? → ajoute une clé `pages.<x>.view` au schema + un guard au mount.
   - Route supprimée ou bouton retiré ? → **ne touche pas au schema** (garder les clés évite d'orpheliner les grants DB) ; note simplement le warning dans ta réponse.

2. **Lance le script d'audit** si présent : `bash scripts/audit-permissions.sh ./api && bash scripts/audit-permissions.sh ./frontend`. Si le script remonte des gaps, corrige-les **dans le même commit**.

3. Si le schema a changé → indique-le explicitement à l'utilisateur à la fin : « Schema permissions mis à jour (+N clés). Clique "Rafraîchir" dans Admin > Profils & Droits pour le cacher ».

### Règles absolues (à respecter sans exception)

- ❌ **Jamais** de `if (user.id === 141)` ou équivalent hardcodé → utiliser le système de permissions
- ❌ **Jamais** une route d'écriture sans `requirePerm`
- ❌ **Jamais** supprimer une clé du schema (migration de renommage uniquement)
- ❌ **Jamais** contourner l'enforcement config (SDK et middleware le respectent déjà, ne pas les shortcircuit)
- ✅ Les utilisateurs avec le rôle Keycloak `admin` bypass tout — inutile de gérer un cas admin spécial dans le code
- ✅ Quand l'enforcement global est OFF ou que l'app est en « mode dev », `has()` renvoie `true` partout — les gates restent dans le code mais ne bloquent rien (zéro gêne pour les devs)

### Localisation des ressources

- Documentation complète : `PERMISSIONS_APP_INTEGRATION.md` (à la racine, ou `docs/`, ou repo plateform)
- Script d'audit : `scripts/audit-permissions.sh`
- Admin Panel Profils & Droits : https://adminpaneldev.orkessi.com/hub/droits (DEV) / https://adminpanel.orkessi.com/hub/droits (PROD)
- Gateway endpoints : `https://plateform-gateway.orkessi.com/api/permissions/*`

### Fail-safe

Si la gateway est injoignable au moment où un middleware `requirePerm` s'exécute, il doit **fail-open** (autoriser) pour ne pas casser l'app. L'enforcement se fera au prochain appel quand la gateway sera de nouveau disponible.
