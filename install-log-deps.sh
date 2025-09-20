#!/bin/bash

# Script pour installer les dépendances nécessaires au module de logs

echo "Installation des dépendances pour le module de logs..."

# Installer les dépendances npm
npm install --save csv-writer exceljs fs-extra pdfkit

echo "Dépendances installées avec succès!"
echo "Vous pouvez maintenant utiliser le système de logs."