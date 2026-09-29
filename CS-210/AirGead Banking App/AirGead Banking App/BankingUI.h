/*
Project Two: Airgead Banking App
Author: William Joffe
Date: 04/04/2025
Class: CS-210
 */


#ifndef AIRGEAD_BANKING_UI_H
#define AIRGEAD_BANKING_UI_H

#include <string>
#include <vector>
#include "InvestmentCalculator.h"

class BankingUI {
public:
    // Constructor to initialize the BankingUI object
    BankingUI();

    // Main function to start the application
    void run();

private:
    // Show the header for input prompts
    void displayInputPromptHeader();

    // Get a double value from the user
    double getUserInputDouble(const std::string& t_prompt);

    // Get an integer value from the user
    int getUserInputInteger(const std::string& t_prompt);

    // Wait for the user to press a key
    void waitForKeyPress();

    // Show the values entered by the user
    void displayEnteredValues(double t_initial, double t_monthly, double t_interest, int t_years);

    // Clear the console screen
    void clearScreen();

    // Ask the user if they want to continue
    bool getContinueChoice();

    // Perform the investment calculations
    void runCalculation();

    // Show the yearly investment data
    void displayYearlyData(const std::vector<InvestmentCalculator::YearlyData>& data, const std::string& title) const;

    // Format a number as currency
    std::string formatCurrency(double t_amount) const;

    // Set text color to green
    void setTextColorGreen() const;

    // Reset text color to default
    void resetTextColor() const;
};

#endif
