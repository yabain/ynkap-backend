# Guide d'intégration Y-Nkap

Ce guide explique comment intégrer Y-Nkap comme moyen de paiement dans votre application.

## Prérequis

Pour intégrer Y-Nkap, vous aurez besoin de:
1. Un compte sur la plateforme Y-Nkap
2. Une application enregistrée sur Y-Nkap
3. Les clés d'API (Client ID et Private Key) pour votre application

## Obtenir vos clés d'API

1. Connectez-vous à votre compte Y-Nkap
2. Accédez à la section "Applications"
3. Créez une nouvelle application ou sélectionnez une application existante
4. Dans les détails de l'application, vous trouverez vos clés d'API pour les environnements de test et de production

## Authentification

Y-Nkap utilise l'authentification Basic pour valider vos clés d'API et vous fournir un token JWT.

### Obtenir un token JWT

```http
POST /application-auth/login
Authorization: Basic {base64(clientId:privateKey)}
```

Exemple avec cURL:

```bash
curl -X POST https://api.y-nkap.com/application-auth/login \
  -H "Authorization: Basic $(echo -n 'your-client-id:your-private-key' | base64)"
```

Réponse:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Utiliser le token JWT

Pour toutes les requêtes suivantes, incluez le token JWT dans l'en-tête Authorization:

```http
Authorization: Bearer {your-jwt-token}
```

## Initier un paiement

Pour initier un paiement, envoyez une requête POST à l'endpoint de paiement:

```http
POST /payment/pay
Authorization: Bearer {your-jwt-token}
Content-Type: application/json

{
  "amount": 1000,
  "currency": "XAF",
  "paymentMethod": "mtn-money",
  "userRef": {
    "account": "237600000000",
    "name": "John Doe"
  },
  "raison": "Achat de produit",
  "callbackUrl": "https://your-app.com/payment-callback"
}
```

Réponse:

```json
{
  "transactionId": "6123456789abcdef12345678",
  "status": "pending",
  "paymentUrl": "https://payment.y-nkap.com/pay/6123456789abcdef12345678"
}
```

## Recevoir les notifications de paiement

Y-Nkap enverra des notifications de paiement à l'URL de callback que vous avez spécifiée lors de la création de votre application.

Format de la notification:

```json
{
  "transactionId": "6123456789abcdef12345678",
  "status": "success",
  "amount": 1000,
  "currency": "XAF",
  "paymentMethod": "mtn-money",
  "timestamp": "2023-01-01T12:00:00Z"
}
```

Votre serveur doit répondre avec un code HTTP 200 pour confirmer la réception de la notification.

## Environnements

Y-Nkap fournit deux environnements:

1. **Test**: Utilisez vos clés de test pour effectuer des paiements simulés
2. **Production**: Utilisez vos clés de production pour effectuer des paiements réels

## Support

Pour toute question ou problème, contactez notre équipe de support à support@y-nkap.com