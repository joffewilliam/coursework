Summary:
This project used OOP principles to construct a simple banking application. The use-case for this application is calculating earned interest over periods of time while either having monthly deposits or not. 

Strengths: 
In this application I seperated the UI and the Calculation into two seperate classes. We instantiate our program through an extremely concise main.cpp.

Weaknesses and how to fix: 
I could of put variables outside of loops so we don't have to recalculate. 
There is always room for more error handling. 
I could of instroduced multiple currencies

Challenges and Resolutions:
calculateYearlyData() required me to compute the compound interest over time whilst handling some edge cases. 
I broke the task down into steps and tested as I went to not overcomplicate anything. 
I also used std::cin to reprompt the user to enter valid input as I thought it was ineffecient to have them go through the menu system again.
During this assignment I had not yet learned about this from the material, but I gathered the information from Stackoverflow in bits and pieces. 

What skills from this project will be particularly transferable to other projects or course work?
The calculation methods done in this program give me a good prefab for future projects that require me to calculate and output results. 
It's clean and repeatable and I don't see a reason why I couldn't use it for something for complicated down the road. 

How did you make this program maintainable, readable, and adaptable?
First off, I made the entire output green to follow the output we were given as an example. 
I tried to write methods for everything and commented them all for clarity to outside readers.
I followed OOP principles and because of that, my calculation logic could remain the same, but my code that displays straight to terminal ...
could be replaced by a full fledge UI because it's modular.  
