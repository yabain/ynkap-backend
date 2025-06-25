# API d'historique des paiements

## Récupérer toutes les transactions

Cet endpoint vous permet de récupérer toutes les transactions financières avec des options de filtrage.

### Requête

**URL** : `/payment-history/all`

**Méthode** : `GET`

**Authentification** : Publique (ne nécessite pas d'authentification)

### Paramètres de requête

| Paramètre | Type | Requis | Description | Exemple |
|-----------|------|--------|-------------|---------|
| appID | string | **Oui** | ID de l'application (ObjectID MongoDB) | `6749689642bafee2045b382c` |
| startDate | string (ISO date) | Non | Date de début pour filtrer les transactions | `2024-01-01T00:00:00.000Z` |
| endDate | string (ISO date) | Non | Date de fin pour filtrer les transactions | `2024-12-31T23:59:59.999Z` |
| status | string | Non | Statut de la transaction | `financial_transaction_success` |
| paymentMode | string | Non | Mode de paiement | `MTN` ou `ORANGE` |

### Statuts possibles

- `financial_transaction_success` : Transaction réussie
- `financial_transaction_pending` : Transaction en attente
- `financial_transaction_failed` : Transaction échouée

### Modes de paiement disponibles

- `MTN` : MTN Mobile Money
- `ORANGE` : Orange Money

### Exemple de requête

```http
GET /payment-history/all?appID=6749689642bafee2045b382c&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z&status=financial_transaction_success&paymentMode=MTN
```

### Réponse de succès

**Code** : `200 OK`

**Exemple de contenu** :

```json
[
  {
    "userRef": {
      "fullName": "Cédric Nguendap",
      "account": "698295368"
    },
    "_id": "67496c55e555b20e77d3d56a",
    "state": "financial_transaction_success",
    "amount": 25,
    "raison": "Paiement de frais de scolarité",
    "type": "deposit",
    "ref": "REF1732864911941",
    "token": "MP241129DD2D67ABACD8CC4D4496",
    "error": 0,
    "paymentMode": "ORANGE",
    "application": "6749689642bafee2045b382c",
    "moneyCode": "XAF",
    "wallet": "6749689642bafee2045b382e",
    "createdAt": "2024-11-29T07:21:51.941Z",
    "startDate": "2024-11-29T07:25:14.895Z",
    "endDate": "2024-11-29T07:25:14.895Z"
  },
  {
    "userRef": {
      "fullName": "Jean Dupont",
      "account": "677123456"
    },
    "_id": "67498d726ea207be4ee7e0dc",
    "state": "financial_transaction_success",
    "amount": 30,
    "raison": "Achat de crédit",
    "type": "deposit",
    "ref": "REF1732873412564",
    "token": "MP2411294652097496B00B0AA307",
    "error": 0,
    "paymentMode": "MTN",
    "application": "6749689642bafee2045b382c",
    "moneyCode": "XAF",
    "wallet": "6749689642bafee2045b382e",
    "createdAt": "2024-11-29T09:43:32.564Z",
    "startDate": "2024-11-29T09:46:29.877Z",
    "endDate": null
  }
]
```

### Réponses d'erreur

**Condition** : Si `appID` est manquant ou invalide.

**Code** : `400 BAD REQUEST`

**Contenu** :

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "appID must be a valid MongoDB ObjectID"
  ],
  "timestamp": "2025-06-25T09:25:19.737Z",
  "path": "/payment-history/all"
}
```

**Condition** : Si une erreur interne se produit.

**Code** : `500 INTERNAL SERVER ERROR`

**Contenu** :

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": [
    "Erreur lors de la récupération des transactions"
  ],
  "errors": [
    "transaction/fetch-error"
  ],
  "timestamp": "2025-06-25T09:25:19.737Z",
  "path": "/payment-history/all"
}
```

## Exemples d'utilisation

### Exemple avec cURL

```bash
# Récupérer toutes les transactions pour une application spécifique
curl -X GET "http://localhost:3000/payment-history/all?appID=6749689642bafee2045b382c" \
  -H "Content-Type: application/json"

# Récupérer les transactions avec filtres
curl -X GET "http://localhost:3000/payment-history/all?appID=6749689642bafee2045b382c&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z&status=financial_transaction_success&paymentMode=MTN" \
  -H "Content-Type: application/json"
```

### Exemple avec JavaScript (fetch)

```javascript
// Récupérer toutes les transactions pour une application spécifique
async function getAllTransactions(appID) {
  try {
    const url = new URL('http://localhost:3000/payment-history/all');
    url.searchParams.append('appID', appID);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erreur HTTP: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const transactions = await response.json();
    return transactions;
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
    throw error;
  }
}

// Exemple d'utilisation
const appID = '6749689642bafee2045b382c';
getAllTransactions(appID)
  .then(transactions => {
    console.log(`${transactions.length} transactions trouvées`);
  })
  .catch(error => {
    console.error('Échec de la récupération des transactions:', error);
  });
```