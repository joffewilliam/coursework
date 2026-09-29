/*
Project Two: Airgead Banking App
Author: William Joffe
Date: 04/04/2025
Class: CS-210
 */

#include "BankingUI.h"
#include "InvestmentCalculator.h"
#include <iostream>
#include <limits>
#include <stdexcept>
#include <iomanip>
#include <sstream>

 // Constructor to initialize the BankingUI object
BankingUI::BankingUI() {
}

// Main function to start the application
void BankingUI::run() {
    setTextColorGreen(); // Set text color to green
    do {
        runCalculation(); // Perform the investment calculations
    } while (getContinueChoice()); // Ask the user if they want to continue

    std::cout << "\nExiting program. Thank you!" << std::endl;
    resetTextColor(); // Reset text color to default
}

// Set text color to green
void BankingUI::setTextColorGreen() const {
    std::cout << "\033[32m"; // ANSI escape code for green text
}

// Reset text color to default
void BankingUI::resetTextColor() const {
    std::cout << "\033[0m"; // ANSI escape code to reset text color
}

// Perform the investment calculations
void BankingUI::runCalculation() {
    double initialInvestment = 0.0; // Initial amount of money invested
    double monthlyDeposit = 0.0; // Amount of money deposited every month
    double annualInterestRate = 0.0; // Annual interest rate in percentage
    int numberOfYears = 0; // Number of years the money is invested

    displayInputPromptHeader(); // Show the header for input prompts

    // Get user inputs for the investment details
    initialInvestment = getUserInputDouble("Initial Investment Amount: $");
    monthlyDeposit = getUserInputDouble("Monthly Deposit: $");
    annualInterestRate = getUserInputDouble("Annual Interest (%): ");
    numberOfYears = getUserInputInteger("Number of Years: ");

    waitForKeyPress(); // Wait for the user to press a key

    // Show the values entered by the user
    displayEnteredValues(initialInvestment, monthlyDeposit, annualInterestRate, numberOfYears);
    waitForKeyPress(); // Wait for the user to press a key

    try {
        // Create an InvestmentCalculator object with the user inputs
        InvestmentCalculator calculator(initialInvestment, monthlyDeposit, annualInterestRate, numberOfYears);

        // Get and display the yearly data without additional monthly deposits
        auto dataWithoutDeposits = calculator.getDataWithoutMonthlyDeposits();
        displayYearlyData(dataWithoutDeposits, "Balance and Interest Without Additional Monthly Deposits");

        // Get and display the yearly data with additional monthly deposits
        auto dataWithDeposits = calculator.getDataWithMonthlyDeposits();
        displayYearlyData(dataWithDeposits, "Balance and Interest With Additional Monthly Deposits");
    }
    catch (const std::exception& e) {
        // Handle any errors that occur during the calculation
        std::cerr << "Error during calculation: " << e.what() << std::endl;
    }
}

// Ask the user if they want to continue
bool BankingUI::getContinueChoice() {
    char continueCalculation;
    std::cout << "\n\nRun another calculation? (y/n): ";
    std::cin >> continueCalculation;

    // Validate the user's input
    while (tolower(continueCalculation) != 'y' && tolower(continueCalculation) != 'n') {
        std::cout << "Invalid input. Please enter 'y' or 'n': ";
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cin >> continueCalculation;
    }
    
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    return tolower(continueCalculation) == 'y'; // Return true if the user wants to continue
}

// Show the header for input prompts
void BankingUI::displayInputPromptHeader() {
    std::cout << std::string(34, '*') << std::endl;
    std::cout << std::string(10, '*') << " Data Input " << std::string(10, '*') << std::endl;
}

// Get a double value from the user
double BankingUI::getUserInputDouble(const std::string& t_prompt) {
    double value = 0.0;
    bool validInput = false;

    while (!validInput) {
        std::cout << t_prompt;
        std::cin >> value;

        // Validate the user's input
        if (std::cin.fail() || value < 0.0) {
            std::cerr << "\nError: Please enter a valid non-negative number." << std::endl;
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            validInput = false;
        }
        else {
            if (std::cin.peek() != '\n') {
                std::cerr << "\nError: Invalid characters entered after the number." << std::endl;
                std::cin.clear();
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
                validInput = false;
            }
            else {
                validInput = true;
            }
        }
    }
    
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    return value; // Return the valid double value
}

// Get an integer value from the user
int BankingUI::getUserInputInteger(const std::string& t_prompt) {
    int value = 0;
    bool validInput = false;

    while (!validInput) {
        std::cout << t_prompt;
        std::cin >> value;

        // Validate the user's input
        if (std::cin.fail() || value <= 0) {
            std::cerr << "\nError: Please enter a valid positive whole number." << std::endl;
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            validInput = false;
        }
        else {
            if (std::cin.peek() != '\n') {
                std::cerr << "\nError: Invalid characters entered after the number." << std::endl;
                std::cin.clear();
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
                validInput = false;
            }
            else {
                validInput = true;
            }
        }
    }
    
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    return value; // Return the valid integer value
}

// Wait for the user to press a key
void BankingUI::waitForKeyPress() {
    std::cout << "\nPress Enter to continue..." << std::endl;
    std::cin.get();
}

// Show the values entered by the user
void BankingUI::displayEnteredValues(double t_initial, double t_monthly, double t_interest, int t_years) {
    std::cout << "\n" << std::string(34, '*') << std::endl;
    std::cout << std::string(10, '*') << " User Input " << std::string(10, '*') << std::endl;
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Initial Investment Amount: $" << t_initial << std::endl;
    std::cout << "Monthly Deposit: $" << t_monthly << std::endl;
    std::cout << std::fixed << std::setprecision(1);
    std::cout << "Annual Interest: %" << t_interest << std::endl;
    std::cout << std::fixed << std::setprecision(0);
    std::cout << "Number of Years: " << t_years << std::endl;
    std::cout << std::string(34, '*') << std::endl;
    std::cout << std::fixed << std::setprecision(2);
}

// Clear the console screen
void BankingUI::clearScreen() {
    std::cout << std::string(50, '\n');
}

// Format a number as currency
std::string BankingUI::formatCurrency(double t_amount) const {
    std::stringstream ss;
    ss << std::fixed << std::setprecision(2) << t_amount;
    return "$" + ss.str();
}

// Show the yearly investment data
void BankingUI::displayYearlyData(const std::vector<InvestmentCalculator::YearlyData>& data, const std::string& title) const {
    std::cout << "\n\n";
    std::cout << "      " << title << std::endl;
    std::cout << "==================================================================" << std::endl;
    
    std::cout << std::setw(10) << std::left << "Year"
              << std::setw(20) << std::right << "Year End Balance"
              << std::setw(30) << std::right << "Year End Earned Interest" << std::endl;
    std::cout << std::string(60, '-') << std::endl;
    
    for (const auto& yearData : data) {
        std::cout << std::setw(10) << std::left << yearData.year
                  << std::setw(20) << std::right << formatCurrency(yearData.yearEndBalance)
                  << std::setw(30) << std::right << formatCurrency(yearData.yearEndEarnedInterest) << std::endl;
    }
}
