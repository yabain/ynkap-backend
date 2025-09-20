# Configuration des Variables d'Environnement

## 🚀 Configuration Rapide

1. **Copiez le fichier d'exemple :**
   ```bash
   cp .env.example .env.dev
   cp .env.example .env.prod
   ```

2. **Modifiez les fichiers avec vos vraies valeurs :**
   - `.env.dev` pour le développement
   - `.env.prod` pour la production

3. **Vérifiez votre configuration :**
   ```bash
   npm run check:env
   ```

## 📋 Variables Requises

### Base de données
- `MONGO_DATABASE_URL` : URI de connexion MongoDB

### Keycloak
- `KEYCLOAK_SERVER_URI` : URL du serveur Keycloak

### MTN Money
- `MOMO_API_PRIMARY_KEY` : Clé primaire MTN Money

### Sécurité
- `SECRET_ENCRIPTION_KEY` : Clé de chiffrement (32 caractères)

## 🔧 Variables Optionnelles

### Keycloak (recommandées)
- `KEYCLOAK_SERVER_REALM`
- `KEYCLOAK_SERVER_CLIENTID`
- `KEYCLOAK_SERVER_SECRET`

### MTN Money (pour les paiements)
- `MOMO_API_DEFAULT_UUID`
- `MOMO_API_KEY`
- `MOMO_API_SECONDARY_KEY`

### Orange Money
- `OM_API_PATH`
- `OM_API_MERCHANT_KEY`
- `OM_API_USERNAME`
- `OM_API_PASSWORD`

## 🛡️ Sécurité

⚠️ **IMPORTANT** : 
- Ne jamais commiter les fichiers `.env*`
- Utiliser des valeurs différentes entre dev et prod
- Changer les clés régulièrement
- Utiliser des mots de passe forts

## 🔍 Vérification

```bash
# Vérifier les variables d'environnement
npm run check:env

# Diagnostic complet du système
npm run diagnostic
```