/*
Project Two: Airgead Banking App
Author: William Joffe
Date: 04/04/2025
Class: CS-210
 */

#ifndef AIRGEAD_BANKING_INVESTMENTCALCULATOR_H
#define AIRGEAD_BANKING_INVESTMENTCALCULATOR_H

#include <string>
#include <vector>
#include <utility> 

class InvestmentCalculator {
public:
    // Structure to hold yearly investment data
    struct YearlyData {
        int year; // The year number
        double yearEndBalance; // Balance at the end of the year
        double yearEndEarnedInterest; // Interest earned at the end of the year
    };

    // Constructor to initialize the InvestmentCalculator object
    InvestmentCalculator(double t_initialInvestment, double t_monthlyDeposit, double t_annualInterestRate, int t_numberOfYears);

    // Calculate yearly data based on monthly deposit amount
    std::vector<YearlyData> calculateYearlyData(double t_monthlyDepositAmount) const;

    // Get yearly data without additional monthly deposits
    std::vector<YearlyData> getDataWithoutMonthlyDeposits() const;

    // Get yearly data with additional monthly deposits
    std::vector<YearlyData> getDataWithMonthlyDeposits() const;

    // Get the initial investment amount
    double getInitialInvestment() const { return m_initialInvestment; }

    // Get the monthly deposit amount
    double getMonthlyDeposit() const { return m_monthlyDeposit; }

    // Get the annual interest rate
    double getAnnualInterestRate() const { return m_annualInterestRate; }

    // Get the number of years for the investment
    int getNumberOfYears() const { return m_numberOfYears; }

private:
    double m_initialInvestment; // Initial amount of money invested
    double m_monthlyDeposit; // Amount of money deposited every month
    double m_annualInterestRate; // Annual interest rate in percentage
    int m_numberOfYears; // Number of years the money is invested
};

#endif