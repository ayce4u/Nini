# Ɲini

**Ɲini** (« chercher » en bambara) met en relation les clients et les prestataires de services au Mali : coiffure, couture, plomberie, électricité, mécanique…

- Les **clients** trouvent les prestataires les plus proches (GPS ou quartier), voient les prix, écrivent sur WhatsApp, appellent ou réservent un créneau, puis laissent un avis.
- Les **prestataires** ont leur page, leur planning (jour, semaine, mois), leurs revenus en graphiques (jour, semaine, mois, année), partagent leurs disponibilités sur WhatsApp, Facebook, Instagram et TikTok, et relient leur Google Agenda.

L'app marche sur **iPhone** (App Store) et dans **n'importe quel navigateur** d'ordinateur.

---

## Comment l'app est construite

```
             iPhone (Capacitor)        Navigateur web
                     \                    /
                      \                  /
                  ┌─────────────────────────┐
                  │  web : nginx + Angular  │  ← le site (frontend/)
                  └────────────┬────────────┘
                               │ /api/
                  ┌────────────▼────────────┐
                  │  api : NestJS           │  ← comptes, prestataires, rendez-vous, stats (backend/api/)
                  └──┬──────────────────┬───┘
                     │                  │ file d'attente
          ┌──────────▼───┐        ┌─────▼──────┐      ┌───────────────────────────┐
          │ db : Postgres │        │ redis      │ ───▶ │ notifications (microservice)│ → iPhone, WhatsApp, SMS
          │ + PostGIS     │        └────────────┘      └───────────────────────────┘
          └───────────────┘
```

| Brique | Outil | Pourquoi |
|---|---|---|
| Front (site + app iPhone) | Angular 22, Ionic 9, Capacitor 8 | Un seul code pour le web et l'iPhone, avec un vrai look d'app |
| Back | NestJS 12 (Node 24, TypeScript) | Bien organisé en modules, documentation automatique sur `/docs` |
| Base de données | PostgreSQL 16 + PostGIS | Calcule les distances GPS (« à 600 m ») |
| Notifications | Microservice NestJS + Redis (BullMQ) | Si WhatsApp est lent, l'API ne bloque pas |
| Photos | Disque du serveur (volume Docker `uploads`) | Simple, sauvegardé chaque nuit |
| Carte | Leaflet + OpenStreetMap | Gratuit, pas de clé à payer |
| Mise en ligne | Docker, VPS + Coolify, GitHub Actions | Les 4 briques de la vidéo |

---

## 1. Lancer Ɲini sur ton ordinateur

### Avec Docker (le plus simple)

Il faut [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cp .env.example .env          # puis ouvre .env et change JWT_SECRET (et POSTGRES_PASSWORD si tu veux)
docker compose up --build
```

Ouvre **http://localhost:8080**. La documentation de l'API est sur **http://localhost:3000/docs**.

### Pour programmer (rechargement automatique)

Il faut Node 24.

```bash
# 1. La base de données et Redis
docker compose up db redis -d   # (ou tes propres Postgres/PostGIS et Redis)

# 2. L'API  → http://localhost:3000
cd backend/api
cp .env.example .env
npm install
npm run start:dev

# 3. Les notifications (dans un autre terminal)
cd backend/notifications && npm install && npm run start:dev

# 4. Le site  → http://localhost:8100
cd frontend && npm install && npx ng serve
```

Variables de l'API en local (`backend/api/.env`) :

```
DATABASE_URL=postgres://nini:nini@localhost:5432/nini
REDIS_URL=redis://localhost:6379
JWT_SECRET=une-longue-phrase-secrete
PUBLIC_API_URL=http://localhost:3000
PUBLIC_WEB_URL=http://localhost:8100
UPLOAD_DIR=./uploads
```

La base se crée toute seule au démarrage de l'API (migrations automatiques, 16 catégories déjà remplies).

### Tests

```bash
cd backend/api && npm run lint && npm test
cd frontend && npx ng test --watch=false
```

---

## 2. Mettre Ɲini en ligne sur un VPS avec Coolify

1. **Louer un VPS** (Hetzner, OVH…) : Ubuntu 24.04, 2 CPU et 4 Go de RAM suffisent pour commencer.
2. **Installer Coolify** sur le VPS (une seule commande, en SSH) :
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
   ```
   Puis ouvre `http://IP-DU-VPS:8000` et crée ton compte administrateur.
3. **Un nom de domaine** : chez ton registrar, crée un enregistrement `A` qui pointe vers l'IP du VPS (ex. `nini.ml` ou `app.nini.ml`).
4. Dans Coolify : **+ New → Project → Production → + New Resource → Private Repository (with GitHub App)**. Choisis le dépôt `ayce4u/nini`, branche `main`, et **Build Pack : Docker Compose** (fichier `docker-compose.yml`).
5. Dans **Environment Variables**, remplis au minimum :
   | Variable | Exemple |
   |---|---|
   | `POSTGRES_PASSWORD` | un mot de passe long et aléatoire |
   | `JWT_SECRET` | une phrase secrète de 40 caractères ou plus |
   | `PUBLIC_WEB_URL` | `https://nini.ml` |
6. Sur le service **web**, mets ton domaine (`https://nini.ml`). Coolify crée le certificat HTTPS tout seul.
7. Clique **Deploy**. Après quelques minutes, ton site est en ligne. Pas de `npm run dev` sur le serveur : tout tourne dans Docker.

Les **sauvegardes** (base + photos) se font chaque nuit à 2 h dans le volume `backups`, gardées 14 jours. Pense à les copier ailleurs de temps en temps (ou active les sauvegardes S3 de Coolify).

---

## 3. Le déploiement automatique (CI/CD avec GitHub Actions)

Chaque `git push` sur `main` déclenche :

1. **CI** (`.github/workflows/ci.yml`) : lint, tests, compilation du back et du front, puis construction des 3 images Docker.
2. **Déploiement** (`.github/workflows/deploy.yml`) : si la CI est verte, GitHub demande à Coolify de redéployer.

Pour relier GitHub à Coolify :

1. Dans Coolify : **Keys & Tokens → API tokens → Create** (cocher « deploy »). Copie le jeton.
2. Dans ta ressource Coolify : **Webhooks → Deploy Webhook**. Copie l'adresse.
3. Dans GitHub : **Settings → Secrets and variables → Actions → New repository secret** :
   - `COOLIFY_TOKEN` = le jeton
   - `COOLIFY_WEBHOOK` = l'adresse
4. Dans Coolify, désactive l'« Auto Deploy » de la ressource pour que seul GitHub Actions déploie (après les tests).

Si un test échoue, rien n'est déployé : le site en ligne reste sur la dernière version qui marchait.

---

## 4. Publier l'app sur l'App Store (iPhone)

Le projet iPhone est déjà prêt dans `frontend/ios` (identifiant `ml.nini.app`, nom « Ɲini », icône, textes d'autorisation en français).

1. **Compte Apple Developer** : https://developer.apple.com/programs/ (99 $ par an). Note ton **Team ID** (Membership).
2. Dans **App Store Connect** (https://appstoreconnect.apple.com) : **Mes apps → + → Nouvelle app**, plateforme iOS, nom « Ɲini », langue Français, identifiant `ml.nini.app`.
3. **Clé API** : App Store Connect → Utilisateurs et accès → Intégrations → Clés API App Store Connect → **+** (rôle « App Manager »). Télécharge le fichier `.p8` (une seule fois !), note le **Key ID** et l'**Issuer ID**.
4. Dans GitHub, ajoute les secrets : `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (le contenu du fichier .p8), `NATIVE_API_URL` (ex. `https://nini.ml/api`).
5. GitHub → **Actions → App iPhone (TestFlight) → Run workflow**, avec un numéro de build (1, puis 2, 3…). Pas besoin de Mac : GitHub prête un Mac.
6. L'app arrive dans **TestFlight** : installe-la sur ton iPhone avec l'app TestFlight pour l'essayer.
7. Quand tout va bien : dans App Store Connect, remplis la fiche (captures d'écran, description, politique de confidentialité), choisis le build et clique **Soumettre pour vérification**. Apple répond en général en 1 à 3 jours.

**Notifications iPhone** : dans developer.apple.com → Keys, crée une clé « Apple Push Notifications service », puis mets dans Coolify `APNS_KEY` (contenu du .p8), `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRODUCTION=true`. Dans Xcode (ou via le portail), active la capacité « Push Notifications » pour `ml.nini.app`.

Pour tester sur un Mac : `cd frontend && npm run build:ios && npx cap open ios`, puis ▶︎ dans Xcode.

---

## 5. Notifications WhatsApp et SMS (facultatif)

Sans réglage, les messages s'affichent dans les journaux du service `notifications`. Pour les envoyer vraiment :

- **WhatsApp** (Meta, WhatsApp Cloud API) : `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, et un modèle de message approuvé nommé `nini_notification` avec un paramètre `{{1}}` (le texte).
- **SMS Orange** (si WhatsApp échoue) : `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET`, `ORANGE_SENDER` (ex. `tel:+22300000000`).

Ordre d'envoi : notification iPhone si l'app est installée, sinon WhatsApp, sinon SMS.

---

## Organisation du code

```
backend/api/            API NestJS (modules : auth, providers, appointments, reviews, favorites, stats, calendar, files…)
backend/notifications/  Microservice d'envoi des notifications
frontend/               Angular + Ionic + Capacitor (src/app/pages : client, pro, auth, shared)
frontend/ios/           Projet Xcode de l'app iPhone
docker-compose.yml      Toute l'app pour Coolify
.github/workflows/      CI, déploiement Coolify, envoi TestFlight
```

## Pour plus tard

Paiement Orange Money / Moov Money, textes en bambara, app Android (Play Store) : le code est prêt à les accueillir.
