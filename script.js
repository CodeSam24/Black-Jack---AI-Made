
const balanceDisplay = document.getElementById("balance");
const dealerCards = document.getElementById("dealer-cards");
const playerCards = document.getElementById("player-cards");
const dealerScore = document.getElementById("dealer-score");
const playerScore = document.getElementById("player-score");
const message = document.getElementById("message");

const betInput = document.getElementById("bet");
const dealButton = document.getElementById("deal");
const hitButton = document.getElementById("hit");
const standButton = document.getElementById("stand");
const resetButton = document.getElementById("new-game");

let balance = 1000;
let bet = 0;
let deck = [];
let playerHand = [];
let dealerHand = [];
let gameActive = false;

const suits = ["♠", "♥", "♦", "♣"];
const ranks = [
    "A", "2", "3", "4", "5", "6", "7",
    "8", "9", "10", "J", "Q", "K"
];

function createDeck() {
    const cards = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            cards.push({ suit, rank });
        }
    }

    // Shuffle using Fisher-Yates
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

function drawCard(hand) {
    if (deck.length === 0) {
        deck = createDeck();
    }

    hand.push(deck.pop());
}

function cardValue(card) {
    if (card.rank === "A") return 11;
    if (["J", "Q", "K"].includes(card.rank)) return 10;
    return Number(card.rank);
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
        score += cardValue(card);

        if (card.rank === "A") {
            aces++;
        }
    }

    // Convert aces from 11 to 1 if necessary
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function renderCards(container, hand, hideHoleCard = false) {
    container.innerHTML = "";

    hand.forEach((card, index) => {
        const element = document.createElement("div");
        element.classList.add("card");

        if (hideHoleCard && index === 1) {
            element.classList.add("hidden-card");
            element.textContent = "♠";
        } else {
            const isRed = ["♥", "♦"].includes(card.suit);

            if (isRed) element.classList.add("red");

            element.innerHTML = `
                <span>${card.rank}</span>
                <span class="suit">${card.suit}</span>
            `;
        }

        container.appendChild(element);
    });
}

function renderGame(hideDealer = true) {
    renderCards(playerCards, playerHand);
    renderCards(dealerCards, dealerHand, hideDealer);

    playerScore.textContent = `(${calculateScore(playerHand)})`;

    dealerScore.textContent = hideDealer
        ? `(${cardValue(dealerHand[0])} + ?)`
        : `(${calculateScore(dealerHand)})`;

    balanceDisplay.textContent = balance;
}

function setMessage(text) {
    message.textContent = text;
}

function finishGame(result) {
    gameActive = false;

    hitButton.disabled = true;
    standButton.disabled = true;
    dealButton.disabled = false;
    betInput.disabled = false;

    if (result === "win") {
        balance += bet * 2;
        setMessage(`🎉 YOU WIN! +$${bet}`);
    } else if (result === "blackjack") {
        balance += bet * 2.5;
        setMessage(`🃏 BLACKJACK! +$${bet * 1.5}`);
    } else if (result === "push") {
        balance += bet;
        setMessage("🤝 PUSH! Your bet is returned.");
    } else {
        setMessage(`❌ YOU LOSE! -$${bet}`);
    }

    renderGame(false);
    balanceDisplay.textContent = balance;
}

function dealerTurn() {
    while (calculateScore(dealerHand) < 17) {
        drawCard(dealerHand);
    }

    const playerTotal = calculateScore(playerHand);
    const dealerTotal = calculateScore(dealerHand);

    if (dealerTotal > 21) {
        finishGame("win");
    } else if (dealerTotal > playerTotal) {
        finishGame("lose");
    } else if (dealerTotal < playerTotal) {
        finishGame("win");
    } else {
        finishGame("push");
    }
}

function startGame() {
    if (gameActive) return;

    const amount = Number(betInput.value);

    if (
        !Number.isFinite(amount) ||
        !Number.isInteger(amount) ||
        amount < 10 ||
        amount > balance
    ) {
        setMessage("Enter a valid bet between $10 and your balance.");
        return;
    }

    bet = amount;
    balance -= bet;

    deck = createDeck();
    playerHand = [];
    dealerHand = [];

    drawCard(playerHand);
    drawCard(dealerHand);
    drawCard(playerHand);
    drawCard(dealerHand);

    gameActive = true;

    dealButton.disabled = true;
    hitButton.disabled = false;
    standButton.disabled = false;
    betInput.disabled = true;

    renderGame(true);

    const playerTotal = calculateScore(playerHand);
    const dealerTotal = calculateScore(dealerHand);

    if (playerTotal === 21) {
        if (dealerTotal === 21) {
            finishGame("push");
        } else {
            finishGame("blackjack");
        }
        return;
    }

    setMessage("Your move! Hit or stand?");
}

function hit() {
    if (!gameActive) return;

    drawCard(playerHand);
    renderGame(true);

    const score = calculateScore(playerHand);

    if (score > 21) {
        finishGame("lose");
    } else if (score === 21) {
        dealerTurn();
    } else {
        setMessage("Hit again or stand?");
    }
}

function stand() {
    if (!gameActive) return;

    hitButton.disabled = true;
    standButton.disabled = true;

    dealerTurn();
}

function resetGame() {
    balance = 1000;
    bet = 0;
    deck = [];
    playerHand = [];
    dealerHand = [];
    gameActive = false;

    betInput.value = 100;
    betInput.disabled = false;

    dealButton.disabled = false;
    hitButton.disabled = true;
    standButton.disabled = true;

    dealerCards.innerHTML = "";
    playerCards.innerHTML = "";
    dealerScore.textContent = "";
    playerScore.textContent = "";

    balanceDisplay.textContent = balance;
    setMessage("Game reset! Place your bet and deal.");
}

dealButton.addEventListener("click", startGame);
hitButton.addEventListener("click", hit);
standButton.addEventListener("click", stand);
resetButton.addEventListener("click", resetGame);
