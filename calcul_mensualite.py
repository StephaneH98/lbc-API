#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Calculateur de mensualités de prêt immobilier

Ce script permet de calculer les mensualités d'un prêt immobilier en fonction :
- du montant emprunté
- du taux d'emprunt annuel
- de la durée de remboursement en années
"""

import math

def calculer_mensualite(montant, taux_annuel, duree_annees):
    """
    Calcule la mensualité d'un prêt immobilier
    
    Args:
        montant (float): Montant total du prêt en euros
        taux_annuel (float): Taux d'intérêt annuel en pourcentage (ex: 1.5 pour 1.5%)
        duree_annees (int): Durée du prêt en années
        
    Returns:
        float: Montant de la mensualité
    """
    # Conversion du taux annuel en taux mensuel et en décimal
    taux_mensuel = (taux_annuel / 100) / 12
    
    # Calcul du nombre de mensualités
    nb_mensualites = duree_annees * 12
    
    # Calcul de la mensualité avec la formule des intérêts composés
    if taux_mensuel == 0:  # Cas particulier : taux à 0%
        mensualite = montant / nb_mensualites
    else:
        mensualite = (montant * taux_mensuel * (1 + taux_mensuel)**nb_mensualites) / ((1 + taux_mensuel)**nb_mensualites - 1)
    
    return mensualite

def afficher_plan_remboursement(montant, taux_annuel, duree_annees, mensualite):
    """
    Affiche un tableau d'amortissement simplifié du prêt
    """
    print("\n" + "="*80)
    print("TABLEAU D'AMORTISSEMENT DU PRÊT")
    print("="*80)
    print(f"{'Mois':<8} | {'Capital restant dû':<20} | {'Intérêts':<15} | {'Capital remboursé':<20}")
    print("-"*80)
    
    capital_restant = montant
    taux_mensuel = (taux_annuel / 100) / 12
    
    for mois in range(1, duree_annees * 12 + 1):
        interets_mois = capital_restant * taux_mensuel
        capital_rembourse = mensualite - interets_mois
        
        # Afficher uniquement la première année et la dernière année
        if mois <= 12 or mois > (duree_annees * 12 - 12) or mois % 48 == 0:
            print(f"{mois:<8} | {capital_restant:>18.2f} € | {interets_mois:>13.2f} € | {capital_rembourse:>18.2f} €")
            
            # Afficher une ligne de séparation après la première année
            if mois == 12 and duree_annees > 1:
                print("-"*80)
                print("...")
        
        capital_restant -= capital_rembourse
        
        # Éviter les valeurs négatives à la fin
        if capital_restant < 0.01:
            capital_restant = 0
    
    print("-"*80)

def main():
    print("="*80)
    print("CALCULATEUR DE MENSUALITÉS DE PRÊT IMMOBILIER")
    print("="*80)
    
    while True:
        try:
            # Saisie des données
            montant = float(input("\nMontant du prêt (en euros) : "))
            taux_annuel = float(input("Taux d'intérêt annuel (ex: 1.5 pour 1.5%) : "))
            duree_annees = int(input("Durée du prêt (en années) : "))
            
            if montant <= 0 or taux_annuel < 0 or duree_annees <= 0:
                print("Erreur : Tous les champs doivent être positifs.")
                continue
                
            # Calcul de la mensualité
            mensualite = calculer_mensualite(montant, taux_annuel, duree_annees)
            cout_total = mensualite * duree_annees * 12
            cout_interets = cout_total - montant
            
            # Affichage des résultats
            print("\n" + "="*80)
            print("RÉSULTATS")
            print("="*80)
            print(f"Mensualité : {mensualite:.2f} €")
            print(f"Coût total du crédit : {cout_total:,.2f} €".replace(',', ' '))
            print(f"Dont intérêts : {cout_interets:,.2f} €".replace(',', ' '))
            
            # Affichage du tableau d'amortissement
            afficher_plan_remboursement(montant, taux_annuel, duree_annees, mensualite)
            
            # Proposition de recommencer
            if input("\nVoulez-vous faire un autre calcul ? (o/n) : ").lower() != 'o':
                print("\nMerci d'avoir utilisé le calculateur de prêt immobilier !")
                break
                
        except ValueError:
            print("Erreur : Veuillez entrer des valeurs numériques valides.")
            continue
        except Exception as e:
            print(f"Une erreur est survenue : {str(e)}")
            break

if __name__ == "__main__":
    main()
