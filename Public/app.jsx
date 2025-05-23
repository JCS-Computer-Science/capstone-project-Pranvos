
function App() {

    const [playerHand, setPlayerHand] = React.useState([]);
    const [dealerHand, setDealerHand] = React.useState([]); 
    const [playerScore, setPlayerScore] = React.useState(0);
    const [dealerScoreDisplay, setDealerScoreDisplay] = React.useState('??'); 
    const [message, setMessage] = React.useState('');
    const [isGameOver, setIsGameOver] = React.useState(false);
    const [dealerFullHand, setDealerFullHand] = React.useState([]); 


    const Card = ({ card, hidden = false }) => {
        const cardClasses = ['card'];
        if (hidden) {
            cardClasses.push('card-hidden');
        } else {
            const isRed = card.suit === '♥' || card.suit === '♦';
            if (isRed) cardClasses.push('card-red');
        }
        return (
            <div className={cardClasses.join(' ')}>
                {hidden ? '?' : `${card.rank}${card.suit}`}
            </div>
        );
    };

    const startGame = async () => {
        setMessage('Dealing...');
        setIsGameOver(false);
        setDealerScoreDisplay('??'); 

        try {
            const response = await fetch('http://localhost:3000/api/blackjack/new-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();

            setPlayerHand(data.playerHand);
            setDealerHand(data.dealerHand); 
            setPlayerScore(data.playerScore);
            setDealerScoreDisplay(data.dealerScore);
            setMessage(data.message);
            setIsGameOver(data.gameOver);
            setDealerFullHand(data.dealerFullHand); 

        } catch (error) {
            console.error('Error starting game:', error);
            setMessage('Error starting game. Check server.');
        }
    };

    const hit = async () => {
        if (isGameOver) return; 

        try {
            const response = await fetch('http://localhost:3000/api/blackjack/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();

            setPlayerHand(data.playerHand);
            setPlayerScore(data.playerScore);
            setMessage(data.message);
            setIsGameOver(data.gameOver);
            if (data.gameOver) {
                setDealerHand(data.dealerFullHand);
                setDealerScoreDisplay(data.dealerScore);
            }

        } catch (error) {
            console.error('Error hitting:', error);
            setMessage('Error during hit. Check server.');
        }
    };

    const stand = async () => {
        if (isGameOver) return; 

        setMessage('Standing...');
        try {
            const response = await fetch('http://localhost:3000/api/blackjack/stand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();

            setDealerHand(data.dealerHand); 
            setPlayerScore(data.playerScore);
            setDealerScoreDisplay(data.dealerScore);
            setMessage(data.message);
            setIsGameOver(data.gameOver);

        } catch (error) {
            console.error('Error standing:', error);
            setMessage('Error during stand. Check server.');
        }
    };


    React.useEffect(() => {
        setMessage('Click New Game to begin.');
    }, []);

    return (
        <div className="game-container">
            <h1>Blackjack</h1>

            <p id="message">{message}</p>

            <div className="hand-section">
                <h2 className="hand-title">
                    Dealer (<span id="dealerScoreDisplay">{dealerScoreDisplay}</span>):
                </h2>
                <div id="dealerCards" className="cards-container">
                    {}
                    {dealerHand.map((card, index) => (
                        <Card key={index} card={card} hidden={!isGameOver && index === 1 && card.rank === '?' && card.suit === '?'} />
                    ))}
                </div>
            </div>

            <div className="hand-section">
                <h2 className="hand-title">
                    Player (<span id="playerScoreDisplay">{playerScore}</span>):
                </h2>
                <div id="playerCards" className="cards-container">
                    {playerHand.map((card, index) => (
                        <Card key={index} card={card} />
                    ))}
                </div>
            </div>

            <div className="game-controls">
                <button id="newGameBtn" className="game-button" onClick={startGame}>New Game</button>
                <button id="hitBtn" className="game-button" onClick={hit} disabled={isGameOver}>Hit</button>
                <button id="standBtn" className="game-button" onClick={stand} disabled={isGameOver}>Stand</button>
            </div>
        </div>
    );
}

