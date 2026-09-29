/*
Project Two: Airgead Banking App
Author: William Joffe
Date: 04/04/2025
Class: CS-210
 */


#include "InvestmentCalculator.h"
#include <iostream>
#include <iomanip>
#include <cmath>
#include <sstream>
#include <string>
#include <vector>

// Constructor to initialize the InvestmentCalculator object
InvestmentCalculator::InvestmentCalculator(double t_initialInvestment, double t_monthlyDeposit, double t_annualInterestRate, int t_numberOfYears) {
    m_initialInvestment = t_initialInvestment;
    m_monthlyDeposit = t_monthlyDeposit;
    m_annualInterestRate = t_annualInterestRate;
    m_numberOfYears = t_numberOfYears;
}

// Calculate yearly data based on monthly deposit amount
std::vector<InvestmentCalculator::YearlyData> InvestmentCalculator::calculateYearlyData(double t_monthlyDepositAmount) const {
    std::vector<YearlyData> results;
    double currentBalance = m_initialInvestment;
    double monthlyRate = (m_annualInterestRate / 100.0) / 12.0;

    for (int year = 1; year <= m_numberOfYears; ++year) {
        double totalInterestEarnedThisYear = 0.0;
        double openingBalanceForYear = currentBalance;

        for (int month = 1; month <= 12; ++month) {
            double monthlyInterest = (currentBalance + t_monthlyDepositAmount) * monthlyRate;
            totalInterestEarnedThisYear += monthlyInterest;
            currentBalance += t_monthlyDepositAmount + monthlyInterest;
        }

        YearlyData yearData = {
            year,
            currentBalance,
            totalInterestEarnedThisYear
        };
        
        results.push_back(yearData);
    }
    
    return results;
}

// Get yearly data without additional monthly deposits
std::vector<InvestmentCalculator::YearlyData> InvestmentCalculator::getDataWithoutMonthlyDeposits() const {
    return calculateYearlyData(0.0);
}

// Get yearly data with additional monthly deposits
std::vector<InvestmentCalculator::YearlyData> InvestmentCalculator::getDataWithMonthlyDeposits() const {
    return calculateYearlyData(m_monthlyDeposit);
}