// DOM Element References
const newMealInput = document.getElementById('new-meal-input');
const addMealBtn = document.getElementById('add-meal-btn');
const mealListUl = document.getElementById('meal-list-ul');
const pickMealBtn = document.getElementById('pick-meal-btn');
const resultArea = document.getElementById('result-area');
const chosenMealDisplay = document.getElementById('chosen-meal');
const confirmMealBtn = document.getElementById('confirm-meal-btn');
const cancelPickBtn = document.getElementById('cancel-pick-btn');
const pickerMessage = document.getElementById('picker-message');
const historyUl = document.getElementById('history-ul');

// Local Storage Keys
const MEAL_LIST_KEY = 'dinnerPicker_mealList';
const HISTORY_KEY = 'dinnerPicker_history';

// Global state for the currently picked meal
let currentPickedMeal = null;

// --- Data Management Functions ---

/**
 * Loads the meal list from localStorage or initializes with defaults.
 * @returns {string[]} The array of meal names.
 */
function loadMeals() {
    const mealsJSON = localStorage.getItem(MEAL_LIST_KEY);
    return mealsJSON ? JSON.parse(mealsJSON) : ["Tacos", "Spaghetti", "Chicken Stir-Fry", "Sushi", "Steak"];
}

/**
 * Loads the meal history from localStorage.
 * History is an array of objects: { meal: string, date: number (timestamp) }
 * @returns {Array<{meal: string, date: number}>} The array of history objects.
 */
function loadHistory() {
    const historyJSON = localStorage.getItem(HISTORY_KEY);
    return historyJSON ? JSON.parse(historyJSON) : [];
}

/**
 * Saves the meal list to localStorage.
 * @param {string[]} meals - The array of meal names.
 */
function saveMeals(meals) {
    localStorage.setItem(MEAL_LIST_KEY, JSON.stringify(meals));
}

/**
 * Saves the history array to localStorage.
 * @param {Array<{meal: string, date: number}>} history - The array of history objects.
 */
function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- Meal List Rendering and Interaction ---

/**
 * Renders the meal list to the DOM.
 * @param {string[]} meals - The array of meal names.
 */
function renderMealList(meals) {
    mealListUl.innerHTML = '';
    meals.forEach(meal => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${meal}</span>
            <button class="delete-btn" data-meal="${meal}">Delete</button>
        `;
        mealListUl.appendChild(li);
    });
    addDeleteListeners();
}

/**
 * Adds event listeners to all delete buttons.
 */
function addDeleteListeners() {
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const mealToDelete = e.target.dataset.meal;
            deleteMeal(mealToDelete);
        });
    });
}

/**
 * Handles adding a new meal.
 */
function addMeal() {
    const newMeal = newMealInput.value.trim();
    if (newMeal) {
        let meals = loadMeals();
        if (!meals.includes(newMeal)) {
            meals.push(newMeal);
            saveMeals(meals);
            renderMealList(meals);
            newMealInput.value = '';
        } else {
            alert("This meal is already on the list!");
        }
    }
}

/**
 * Handles deleting a meal.
 * @param {string} mealName - The name of the meal to delete.
 */
function deleteMeal(mealName) {
    let meals = loadMeals();
    meals = meals.filter(meal => meal !== mealName);
    saveMeals(meals);
    renderMealList(meals);
}

// --- Weighted Random Picker Logic (The Core Requirement 3) ---

/**
 * Renders the meal history and weighting debug info.
 */
function renderHistory(history) {
    historyUl.innerHTML = '';
    const now = Date.now();
    const cutoffDate = now - (30 * 24 * 60 * 60 * 1000); // 30 days ago

    const recentHistory = history.filter(item => item.date > cutoffDate)
        .sort((a, b) => b.date - a.date) // Sort by most recent
        .slice(0, 10); // Show max 10 recent items

    if (recentHistory.length === 0) {
        historyUl.innerHTML = '<li>No meals eaten in the last 30 days. All meals have default weight.</li>';
        return;
    }

    recentHistory.forEach(item => {
        const dateString = new Date(item.date).toLocaleDateString();
        historyUl.innerHTML += `<li>${item.meal} - Eaten on ${dateString}</li>`;
    });
}

/**
 * Chooses a meal randomly, applying a reduced probability (weight) 
 * for meals eaten in the last 30 days.
 * @returns {string|null} The chosen meal name, or null if list is empty.
 */
function pickWeightedMeal() {
    const meals = loadMeals();
    const history = loadHistory();
    pickerMessage.textContent = ''; // Clear previous message
    
    if (meals.length === 0) {
        pickerMessage.textContent = "Please add some meals first!";
        return null;
    }

    const now = Date.now();
    // 30 days in milliseconds
    const RECENT_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    
    // 1. Assign Weights
    // Meals get a default weight of 10.
    // Meals eaten in the last 30 days get a reduced weight of 1.
    const mealWeights = meals.map(meal => {
        // Find the last time this meal was eaten
        const lastEaten = history
            .filter(item => item.meal === meal)
            .reduce((latest, item) => Math.max(latest, item.date), 0);
            
        // Check if it was eaten in the last 30 days
        const isRecent = (now - lastEaten) < RECENT_DAYS_MS;
        
        // Assign weight: 1 (recent) or 10 (not recent)
        const weight = isRecent ? 1 : 10;
        
        return { meal, weight };
    });

    // 2. Create the Weighted Selection Array
    // e.g., if "Pizza" has weight 10, it's added 10 times.
    const weightedList = [];
    mealWeights.forEach(item => {
        for (let i = 0; i < item.weight; i++) {
            weightedList.push(item.meal);
        }
    });

    // 3. Randomly Select from the Weighted List
    const randomIndex = Math.floor(Math.random() * weightedList.length);
    const chosenMeal = weightedList[randomIndex];
    
    // Display the debug info to the user
    const weightInfo = mealWeights.find(item => item.meal === chosenMeal);
    if (weightInfo.weight === 1) {
        pickerMessage.textContent = `Note: ${chosenMeal} had a reduced chance (weight: 1) as it was eaten recently.`;
    }

    return chosenMeal;
}

/**
 * Displays the chosen meal and the confirmation buttons.
 */
function displayPickedMeal() {
    currentPickedMeal = pickWeightedMeal();
    
    // Hide picker button and show result area
    pickMealBtn.classList.add('hidden');
    
    if (currentPickedMeal) {
        chosenMealDisplay.textContent = currentPickedMeal;
        resultArea.classList.remove('hidden');
    } else {
        resultArea.classList.add('hidden');
        pickMealBtn.classList.remove('hidden'); // Show button if list was empty
    }
}

/**
 * Confirms the meal, records it in history, and resets the display.
 */
function confirmMeal() {
    if (!currentPickedMeal) return;

    // 1. Record the history
    let history = loadHistory();
    history.push({
        meal: currentPickedMeal,
        date: Date.now()
    });
    saveHistory(history);

    // 2. Display success message
    pickerMessage.textContent = `Confirmed! You are making ${currentPickedMeal} tonight. History updated!`;
    
    // 3. Reset the UI
    resetPickerUI();
    
    // 4. Update the history display
    renderHistory(history);
}

/**
 * Resets the meal picker UI to its initial state.
 */
function resetPickerUI() {
    currentPickedMeal = null;
    resultArea.classList.add('hidden');
    pickMealBtn.classList.remove('hidden');
    chosenMealDisplay.textContent = '';
}

// --- Event Listeners and Initialization ---

addMealBtn.addEventListener('click', addMeal);
newMealInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addMeal();
});

pickMealBtn.addEventListener('click', displayPickedMeal);
confirmMealBtn.addEventListener('click', confirmMeal);
cancelPickBtn.addEventListener('click', () => {
    pickerMessage.textContent = 'Meal choice canceled. Pick again!';
    resetPickerUI();
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load and render meals
    renderMealList(loadMeals()); 
    // Load and render history
    renderHistory(loadHistory());
});