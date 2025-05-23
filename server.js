const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

let serverDeck = [];
let serverPlayerHand = [];
let serverDealerHand = [];
let serverPlayerScore = 0;
let serverDealerScore = 0;

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suits = ['♠', '♣', '♥', '♦'];

const createDeck = () => {
    let newDeck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            newDeck.push({ rank, suit });
        }
    }
    return newDeck;
};

const shuffleDeck = (currentDeck) => {
    for (let i = currentDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        let temp = currentDeck[i];
        currentDeck[i] = currentDeck[j];
        currentDeck[j] = temp;
    }
    return currentDeck;
};

const calculateHandValue = (hand) => {
    let value = 0;
    let numAces = 0;
    for (let card of hand) {
        if (card.rank === 'A') { numAces++; value += 11; }
        else if (['K', 'Q', 'J'].includes(card.rank)) { value += 10; }
        else { value += parseInt(card.rank); }
    }
    while (value > 21 && numAces > 0) { value -= 10; numAces--; }
    return value;
};

const determineWinner = (pScore, dScore) => {
    if (pScore > 21) return 'You busted! Dealer wins.';
    else if (dScore > 21) return 'Dealer busts! You win!';
    else if (pScore > dScore) return 'You win!';
    else if (dScore > pScore) return 'Dealer wins.';
    else return 'Push.';
};

app.post('/api/blackjack/new-game', (req, res) => {
    serverDeck = shuffleDeck(createDeck());
    serverPlayerHand = [];
    serverDealerHand = [];

    serverPlayerHand.push(serverDeck.pop());
    serverDealerHand.push(serverDeck.pop());
    serverPlayerHand.push(serverDeck.pop());
    serverDealerHand.push(serverDeck.pop());

    serverPlayerScore = calculateHandValue(serverPlayerHand);
    serverDealerScore = calculateHandValue(serverDealerHand);

    let gameMessage = 'Your turn.';
    let gameOver = false;

    if (serverPlayerScore === 21) {
        if (serverDealerScore === 21) {
            gameMessage = 'Push.';
        } else {
            gameMessage = 'Blackjack! You win.';
        }
        gameOver = true;
    }

    res.json({
        playerHand: serverPlayerHand,
        dealerHand: [serverDealerHand[0], { rank: '?', suit: '?' }],
        playerScore: serverPlayerScore,
        dealerScore: '??',
        message: gameMessage,
        gameOver: gameOver,
        dealerFullHand: serverDealerHand
    });
});

app.post('/api/blackjack/hit', (req, res) => {
    if (serverPlayerScore > 21) {
        return res.json({
            message: 'Game already over. You busted!',
            gameOver: true,
            dealerFullHand: serverDealerHand,
            dealerScore: serverDealerScore
        });
    }

    serverPlayerHand.push(serverDeck.pop());
    serverPlayerScore = calculateHandValue(serverPlayerHand);

    let gameMessage = 'Your turn.';
    let gameOver = false;

    if (serverPlayerScore > 21) {
        gameMessage = 'Bust! Dealer wins.';
        gameOver = true;
    } else if (serverPlayerScore === 21) {
        gameMessage = '21! Standing...';
    }

    if (gameOver) {
        return res.json({
            playerHand: serverPlayerHand,
            playerScore: serverPlayerScore,
            message: gameMessage,
            gameOver: gameOver,
            dealerFullHand: serverDealerHand,
            dealerScore: serverDealerScore
        });
    } else {
        res.json({
            playerHand: serverPlayerHand,
            playerScore: serverPlayerScore,
            message: gameMessage,
            gameOver: gameOver,
            dealerFullHand: null,
            dealerScore: '??'
        });
    }
});

app.post('/api/blackjack/stand', (req, res) => {
    while (serverDealerScore < 17) {
        serverDealerHand.push(serverDeck.pop());
        serverDealerScore = calculateHandValue(serverDealerHand);
    }

    const finalMessage = determineWinner(serverPlayerScore, serverDealerScore);

    res.json({
        playerHand: serverPlayerHand,
        dealerHand: serverDealerHand,
        playerScore: serverPlayerScore,
        dealerScore: serverDealerScore,
        message: finalMessage,
        gameOver: true
    });
});


