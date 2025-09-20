import React, { useState, useEffect } from 'react';

interface CognitiveGamesProps {
  onBack: () => void;
}

interface Card {
  id: number;
  value: string;
  isMatched: boolean;
}

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

const createShuffledDeck = (): Card[] => {
  const duplicatedEmojis = [...EMOJIS, ...EMOJIS];
  const shuffled = duplicatedEmojis
    .map((value, index) => ({ value, sort: Math.random(), id: index }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value, id }) => ({ value, id, isMatched: false }));
  return shuffled;
};

const CognitiveGames: React.FC<CognitiveGamesProps> = ({ onBack }) => {
  const [cards, setCards] = useState<Card[]>(createShuffledDeck());
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  
  const resetGame = () => {
    setCards(createShuffledDeck());
    setFlippedCards([]);
    setMoves(0);
    setIsGameOver(false);
    setIsChecking(false);
  };

  useEffect(() => {
    if (flippedCards.length === 2) {
      setIsChecking(true);
      setMoves(moves + 1);
      const [firstCardIndex, secondCardIndex] = flippedCards;
      const firstCard = cards.find(c => c.id === firstCardIndex);
      const secondCard = cards.find(c => c.id === secondCardIndex);

      if (firstCard && secondCard && firstCard.value === secondCard.value) {
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === firstCard.id || card.id === secondCard.id
              ? { ...card, isMatched: true }
              : card
          )
        );
        setFlippedCards([]);
        setIsChecking(false);
      } else {
        setTimeout(() => {
          setFlippedCards([]);
          setIsChecking(false);
        }, 1200);
      }
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    const allMatched = cards.every(card => card.isMatched);
    if (allMatched && cards.length > 0) {
      setTimeout(() => setIsGameOver(true), 500);
    }
  }, [cards]);

  const handleCardClick = (cardId: number) => {
    const selectedCard = cards.find(c => c.id === cardId);
    if (isChecking || !selectedCard || selectedCard.isMatched || flippedCards.includes(cardId)) {
      return;
    }
    setFlippedCards(prev => [...prev, cardId]);
  };

  return (
    <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
       {/* Decorative screws */}
       <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
       <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>

      <header className="flex items-center justify-between pb-4 border-b border-slate-700/50">
        <button onClick={onBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
          <span className='text-lg'>&larr;</span> Back
        </button>
        <h2 className="text-2xl font-bold text-white">Memory Game</h2>
        <div className="text-lg font-semibold text-slate-400">Moves: <span className="font-bold text-white">{moves}</span></div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        {isGameOver ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-3xl font-bold text-green-400">You Won!</h3>
            <p className="text-lg text-slate-400 mb-6">Total moves: {moves}</p>
            <button onClick={resetGame} className="px-8 py-4 bg-slate-700 text-white font-bold text-xl rounded-full shadow-lg hover:bg-slate-600 active:scale-95 transition-all">
              Play Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 sm:gap-4 w-full max-w-md">
            {cards.map(card => (
              <div
                key={card.id}
                className="aspect-square perspective"
                onClick={() => handleCardClick(card.id)}
              >
                <div
                  className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                    flippedCards.includes(card.id) || card.isMatched ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Card Back */}
                  <div className="absolute w-full h-full backface-hidden flex items-center justify-center bg-slate-800/80 rounded-lg cursor-pointer shadow-lg border border-slate-700/50 hover:bg-slate-700/80">
                    <span className="text-3xl text-slate-400 font-bold">?</span>
                  </div>
                  {/* Card Front */}
                  <div className={`absolute w-full h-full backface-hidden flex items-center justify-center rounded-lg rotate-y-180 transition-all duration-300 ${card.isMatched ? 'bg-green-800/70 border border-green-600' : 'bg-slate-600/90'}`}>
                    <span className="text-4xl sm:text-5xl">{card.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* CSS for 3D flip effect */}
      <style>{`
        .perspective { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default CognitiveGames;