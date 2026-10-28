const $ = id => document.getElementById(id);

const dealerCards = $("dealer-cards");
const dealerScore = $("dealer-score");
const message = $("message");

const dealButton = $("deal");
const hitButton = $("hit");
const standButton = $("stand");
const resetButton = $("new-game");
const modeSelect = $("game-mode");
const playersContainer = $("players");

const players = [
    {
        name: "Player 1",
        balance: 1000,
        bet: 0,
        hand: [],
        active: false,
        cards: $("player1-cards"),
        score: $("player1-score"),
        balanceDisplay: $("balance1"),
        betInput: $("bet1"),
        panel: $("player1-panel")
    },
    {
        name: "Player 2",
        balance: 1000,
        bet: 0,
        hand: [],
        active: false,
        cards: $("player2-cards"),
        score: $("player2-score"),
        balanceDisplay: $("balance2"),
        betInput: $("bet2"),
        panel: $("player2-panel")
    }
];

let deck = [];
let dealerHand = [];
let currentPlayer = 0;
let gameActive = false;
let isDealing = false;
let gameToken = 0;
let nextCardId = 0;

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isTwoPlayer() {
    return modeSelect.value === "two";
}

function activePlayers() {
    return isTwoPlayer() ? players : [players[0]];
}

function createDeck() {
    const cards = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            cards.push({ suit, rank });
        }
    }

    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

function drawCard(hand) {
    if (deck.length === 0) deck = createDeck();

    const card = deck.pop();
    card.id = ++nextCardId;
    hand.push(card);
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
        if (card.rank === "A") aces++;
    }

    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function isBlackjack(hand) {
    return hand.length === 2 && calculateScore(hand) === 21;
}

// Create animated playing cards.
function createCardElement(card, hidden = false) {
    const element = document.createElement("div");
    element.className = "card animated-card";
    element.dataset.cardId = String(card.id);

    const top = document.createElement("span");
    top.className = "card-rank";
    top.textContent = card.rank;

    const suit = document.createElement("span");
    suit.className = "suit";
    suit.textContent = card.suit;

    element.append(top, suit);

    if (["♥", "♦"].includes(card.suit)) {
        element.classList.add("red");
    }

    if (hidden) {
        element.classList.add("hidden-card");
        element.textContent = "♠";
    }

    element.setAttribute(
        "aria-label",
        hidden ? "Face-down card" : `${card.rank} of ${card.suit}`
    );

    return element;
}

function renderCards(container, hand, hideHoleCard = false) {
    const existing = new Map();

    container.querySelectorAll(".card").forEach(card => {
        existing.set(card.dataset.cardId, card);
    });

    const needed = new Set(hand.map(card => String(card.id)));

    for (const [id, element] of existing) {
        if (!needed.has(id)) element.remove();
    }

    hand.forEach((card, index) => {
        const hidden = hideHoleCard && index === 1;
        let element = existing.get(String(card.id));

        if (!element) {
            element = createCardElement(card, hidden);
            element.style.animationDelay = `${index * 70}ms`;
            container.appendChild(element);
            return;
        }

        container.appendChild(element);

        const wasHidden = element.classList.contains("hidden-card");

        if (wasHidden !== hidden) {
            element.classList.add("card-flip");
            element.classList.toggle("hidden-card", hidden);

            element.innerHTML = "";

            if (hidden) {
                element.textContent = "♠";
            } else {
                const rank = document.createElement("span");
                rank.textContent = card.rank;

                const suit = document.createElement("span");
                suit.className = "suit";
                suit.textContent = card.suit;

                element.append(rank, suit);

                element.classList.toggle(
                    "red",
                    ["♥", "♦"].includes(card.suit)
                );
            }

            window.setTimeout(() => {
                element.classList.remove("card-flip");
            }, 650);
        }
    });
}

function renderGame(hideDealer = true) {
    playersContainer.classList.toggle("single-mode", !isTwoPlayer());

    players.forEach((player, index) => {
        player.panel.hidden = index === 1 && !isTwoPlayer();

        renderCards(player.cards, player.hand);

        const score = calculateScore(player.hand);
        player.score.textContent = player.hand.length ? score : "0";

        player.balanceDisplay.textContent = player.balance;

        player.panel.classList.toggle(
            "current-player",
            gameActive && index === currentPlayer && player.active
        );

        player.betInput.disabled = gameActive;
    });

    $("player1-title").textContent =
        isTwoPlayer() ? "PLAYER 1" : "YOUR HAND";

    renderCards(dealerCards, dealerHand, hideDealer);

    dealerScore.textContent = dealerHand.length
        ? hideDealer && dealerHand.length > 1
            ? `(${cardValue(dealerHand[0])} + ?)`
            : `(${calculateScore(dealerHand)})`
        : "";

    dealButton.disabled = gameActive;
}

function setMessage(text) {
    message.textContent = text;
    message.classList.remove("message-pop");
    void message.offsetWidth;
    message.classList.add("message-pop");
}

function setControls() {
    const list = activePlayers();
    const player = list[currentPlayer];
    const canPlay = gameActive && !isDealing && player && player.active;

    hitButton.disabled = !canPlay;
    standButton.disabled = !canPlay;
    dealButton.disabled = gameActive;
    modeSelect.disabled = gameActive;

    players.forEach(player => {
        player.betInput.disabled = gameActive;
    });
}

async function startGame() {
    if (gameActive || isDealing) return;

    const list = activePlayers();

    for (const player of list) {
        const amount = Number(player.betInput.value);

        if (
            !Number.isInteger(amount) ||
            amount < 10 ||
            amount > player.balance
        ) {
            setMessage(
                `${player.name}: enter a whole-number bet from $10 to $${player.balance}.`
            );
            return;
        }
    }

    const token = ++gameToken;

    players.forEach(player => {
        player.hand = [];
        player.bet = 0;
        player.active = false;
    });

    list.forEach(player => {
        player.bet = Number(player.betInput.value);
        player.balance -= player.bet;
        player.active = true;
    });

    deck = createDeck();
    dealerHand = [];
    gameActive = true;
    isDealing = true;
    currentPlayer = 0;

    renderGame(true);
    setControls();
    setMessage("Dealing cards...");

    const sequence = [
        () => drawCard(list[0].hand),
        () => { if (isTwoPlayer()) drawCard(list[1].hand); },
        () => drawCard(dealerHand),
        () => drawCard(list[0].hand),
        () => { if (isTwoPlayer()) drawCard(list[1].hand); },
        () => drawCard(dealerHand)
    ];

    for (const deal of sequence) {
        if (token !== gameToken) return;
        deal();
        renderGame(true);
        await delay(180);
    }

    if (token !== gameToken) return;

    isDealing = false;

    list.forEach(player => {
        if (isBlackjack(player.hand)) player.active = false;
    });

    renderGame(true);
    setControls();

    if (!list.some(player => player.active)) {
        await dealerTurn(token);
        return;
    }

    announceTurn();
}

function announceTurn() {
    if (!gameActive || isDealing) return;

    const list = activePlayers();

    while (
        currentPlayer < list.length &&
        !list[currentPlayer].active
    ) {
        currentPlayer++;
    }

    if (currentPlayer >= list.length) {
        dealerTurn(gameToken);
        return;
    }

    renderGame(true);
    setControls();

    const player = list[currentPlayer];

    setMessage(
        `${player.name}'s turn! Score: ${calculateScore(player.hand)}. Hit or stand?`
    );
}

function hit() {
    if (!gameActive || isDealing) return;

    const player = activePlayers()[currentPlayer];
    if (!player || !player.active) return;

    drawCard(player.hand);

    const score = calculateScore(player.hand);
    renderGame(true);

    if (score >= 21) {
        player.active = false;

        setMessage(
            score > 21
                ? `${player.name} busts with ${score}!`
                : `${player.name} has 21!`
        );

        currentPlayer++;
        announceTurn();
        return;
    }

    setMessage(`${player.name} has ${score}. Hit again or stand?`);
    setControls();
}

function stand() {
    if (!gameActive || isDealing) return;

    const player = activePlayers()[currentPlayer];
    if (!player || !player.active) return;

    player.active = false;

    setMessage(
        `${player.name} stands at ${calculateScore(player.hand)}.`
    );

    currentPlayer++;
    announceTurn();
} 
async function dealerTurn(token = gameToken) {
    if (!gameActive || isDealing || token !== gameToken) return;

    isDealing = true;
    setControls();

    renderGame(false);
    setMessage("Dealer reveals their cards...");

    await delay(650);

    if (token !== gameToken || !gameActive) return;

    while (calculateScore(dealerHand) < 17) {
        if (token !== gameToken || !gameActive) return;

        drawCard(dealerHand);
        renderGame(false);
        setMessage("Dealer draws a card...");

        await delay(450);
    }

    if (token !== gameToken || !gameActive) return;

    const dealerTotal = calculateScore(dealerHand);
    const dealerBlackjack = isBlackjack(dealerHand);
    const results = [];

    activePlayers().forEach(player => {
        const total = calculateScore(player.hand);

        let result;
        let payout = 0;

        if (total > 21) {
            result = "LOSE";
        } else if (isBlackjack(player.hand)) {
            if (dealerBlackjack) {
                result = "PUSH";
                payout = player.bet;
            } else {
                result = "BLACKJACK";
                payout = player.bet * 2.5;
            }
        } else if (dealerBlackjack) {
            result = "LOSE";
        } else if (dealerTotal > 21 || total > dealerTotal) {
            result = "WIN";
            payout = player.bet * 2;
        } else if (total === dealerTotal) {
            result = "PUSH";
            payout = player.bet;
        } else {
            result = "LOSE";
        }

        player.balance += payout;

        const profit = payout - player.bet;

        let detail;

        if (result === "WIN" || result === "BLACKJACK") {
            detail = ` (+$${profit})`;
        } else if (result === "PUSH") {
            detail = " (bet returned)";
        } else {
            detail = ` (-$${player.bet})`;
        }

        results.push(`${player.name}: ${result}${detail}`);

        player.panel.classList.remove(
            "result-win",
            "result-lose",
            "result-blackjack",
            "result-push"
        );

        const resultClass = {
            WIN: "result-win",
            LOSE: "result-lose",
            BLACKJACK: "result-blackjack",
            PUSH: "result-push"
        }[result];

        if (resultClass) {
            player.panel.classList.add(resultClass);
        }
    });

    gameActive = false;
    isDealing = false;

    renderGame(false);
    setControls();

    hitButton.disabled = true;
    standButton.disabled = true;
    dealButton.disabled = false;
    modeSelect.disabled = false;

    setMessage(`Dealer: ${dealerTotal}. ${results.join(" | ")}`);
}

function resetGame() {
    gameToken++;

    gameActive = false;
    isDealing = false;
    currentPlayer = 0;
    deck = [];
    dealerHand = [];

    players.forEach(player => {
        player.balance = 1000;
        player.bet = 0;
        player.hand = [];
        player.active = false;

        player.betInput.value = 100;
        player.cards.innerHTML = "";
        player.score.textContent = "0";
        player.balanceDisplay.textContent = "1000";

        player.panel.classList.remove(
            "result-win",
            "result-lose",
            "result-blackjack",
            "result-push"
        );
    });

    dealerCards.innerHTML = "";
    dealerScore.textContent = "";
    modeSelect.disabled = false;

    renderGame(false);
    setControls();

    setMessage(
        isTwoPlayer()
            ? "New game! Both players, place your bets."
            : "New game! Place your bet and deal."
    );
}

modeSelect.addEventListener("change", () => {
    renderGame(false);

    setMessage(
        isTwoPlayer()
            ? "Two-player mode selected. Place both bets!"
            : "Single-player mode selected. Place your bet!"
    );
});

dealButton.addEventListener("click", startGame);
hitButton.addEventListener("click", hit);
standButton.addEventListener("click", stand);
resetButton.addEventListener("click", resetGame);

resetGame();