import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, setDoc, arrayUnion } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trophy, Gift, Star, Award, Heart, Zap, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS, AWARDS } from '../constants';

function AwardImage({ src, fallback, className }: { src: string; fallback: React.ReactNode; className?: string }) {
  const [hasError, setHasError] = useState(false);
  if (hasError || !src) {
    return <>{fallback}</>;
  }
  return (
    <img
      src={src}
      onError={() => setHasError(true)}
      className={className}
      referrerPolicy="no-referrer"
      alt="Award Photo"
    />
  );
}


export function AwardRoom() {
  const { room, players, solutions, user } = useGame();
  const isHost = room?.hostId === user?.uid;

  const prizes = room?.prizes || AWARDS;
  const currentPrizeIndex = room?.currentPrizeIndex || 0;
  const currentPrize = prizes[currentPrizeIndex] || AWARDS[0];

  const selfPlayer = players.find(p => p.id === user?.uid);
  const hasVotedCurrent = selfPlayer?.votes?.[currentPrizeIndex] !== undefined;

  // We should count votes of only players who have actually registered a vote for this round
  const everyoneVoted = players.length > 0 && players.every(p => p.votes?.[currentPrizeIndex] !== undefined);

  const handleVote = async (solutionId: string) => {
    if (!user || !room) return;
    try {
      const currentVotes = selfPlayer?.votes || {};
      await updateDoc(doc(db, 'rooms', room.id, 'players', user.uid), {
        votes: {
          ...currentVotes,
          [currentPrizeIndex]: solutionId
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${room.id}/players/${user.uid}`);
    }
  };

  const handleNextAward = async () => {
    if (!room || !isHost) return;
    try {
      // Tally votes for currentPrizeIndex
      const voteCounts: { [solId: string]: number } = {};
      players.forEach(p => {
        const chosen = p.votes?.[currentPrizeIndex];
        if (chosen) {
          voteCounts[chosen] = (voteCounts[chosen] || 0) + 1;
        }
      });

      // Find the winner solution (with max votes)
      let winningSolutionId: string | null = null;
      let maxVotes = -1;

      // Iterate solutions to count
      solutions.forEach(s => {
        const votesCount = voteCounts[s.id] || 0;
        if (votesCount > maxVotes) {
          maxVotes = votesCount;
          winningSolutionId = s.id;
        }
      });

      if (winningSolutionId) {
        const winnerSolution = solutions.find(s => s.id === winningSolutionId);
        const winnerPlayer = players.find(p => p.id === winnerSolution?.playerId);

        // Build the awarded prize metadata
        const awardedPrize = {
          id: currentPrize.id,
          name: currentPrize.name,
          src: currentPrize.src || '',
          fallbackEmoji: currentPrize.fallbackEmoji || '🏆',
          winnerName: winnerPlayer?.name || 'Winner'
        };

        const existingPrizesList = winnerSolution?.prizes || [];
        await updateDoc(doc(db, 'rooms', room.id, 'solutions', winningSolutionId), {
          // Update both fields for full backward/forward compatibility
          prize: awardedPrize,
          prizes: [...existingPrizesList, awardedPrize]
        });
      }

      // Check if there are more award rounds
      if (currentPrizeIndex + 1 < prizes.length) {
        await updateDoc(doc(db, 'rooms', room.id), {
          currentPrizeIndex: currentPrizeIndex + 1
        });
      } else {
        await updateDoc(doc(db, 'rooms', room.id), {
          status: 'finale'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${room.id}`);
    }
  };

  if (hasVotedCurrent) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-transparent p-8 space-y-8 min-h-screen">
        {/* Progress header dots */}
        <div className="flex gap-[6px] justify-center items-center">
          {prizes.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-[6px] rounded-full transition-all duration-300 ${idx === currentPrizeIndex ? 'w-6 bg-[#ED5F69]' : 'w-[6px] bg-white/20'}`} 
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-white/60 font-black uppercase text-xs tracking-widest block mb-1">
            Round {currentPrizeIndex + 1} of {prizes.length}
          </span>
          <h2 className="text-white text-lg font-black uppercase tracking-tight">
            {currentPrize.name}
          </h2>
        </div>

        <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden p-4 relative">
          <AwardImage 
            src={currentPrize.src}
            fallback={<Trophy className="w-24 h-24 text-[#ED5F69]" />}
            className="w-36 h-36 object-contain"
          />
          <div className="absolute top-2 right-2 bg-[#ED5F69] rounded-full p-1 border-2 border-white">
            <Star className="w-4 h-4 text-white fill-current" />
          </div>
        </div>
        
        <div className="text-center space-y-1">
          <h3 className="text-white text-2xl font-black uppercase tracking-tight">Vote Submitted!</h3>
          <p className="text-white/60 font-black uppercase text-xs tracking-wider">
            {everyoneVoted ? 'Everyone has voted!' : 'Waiting for other players to vote...'}
          </p>
        </div>

        {/* Real-time players list with checkmarks for voting */}
        <div className="flex justify-center gap-3 flex-wrap max-w-sm bg-black/10 p-4 rounded-lg border border-white/10">
          {players.map(p => {
            const hasPlayedVoted = p.votes?.[currentPrizeIndex] !== undefined;
            return (
              <div key={p.id} className="relative">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all bg-white shadow-lg border-2 ${hasPlayedVoted ? 'border-[#ED5F69] scale-105' : 'border-transparent opacity-40'}`}>
                  <img src={CHARACTERS.find(c => c.id === p.avatar)?.src} className="w-9 h-9 object-contain" />
                </div>
                {hasPlayedVoted && (
                  <div className="absolute -top-[2px] -right-[2px] bg-[#ED5F69] rounded-full p-[3px] border-2 border-white">
                    <Star className="w-2 h-2 text-white fill-current" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isHost && everyoneVoted && (
          <button
            onClick={handleNextAward}
            className="w-full max-w-xs bg-white text-[#4A4138] p-[12px] text-xl font-black uppercase rounded-[4px] shadow-2xl hover:bg-white/90 active:scale-95 transition-all mt-4"
          >
            {currentPrizeIndex + 1 === prizes.length ? 'Show Results!' : 'Next Award'}
          </button>
        )}
      </div>
    );
  }

  // Voting Choices Screen
  return (
    <div className="h-full flex flex-col bg-transparent min-h-screen overflow-x-hidden">
      <div className="flex-1 flex flex-col items-center p-8 space-y-6 overflow-y-auto">
        {/* Progress header dots */}
        <div className="flex gap-[6px] justify-center items-center mt-2">
          {prizes.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-[6px] rounded-full transition-all duration-300 ${idx === currentPrizeIndex ? 'w-6 bg-[#ED5F69]' : 'w-[6px] bg-white/20'}`} 
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-white/60 font-black uppercase text-xs tracking-widest block mb-1">
            Round {currentPrizeIndex + 1} of {prizes.length}
          </span>
          <h1 className="text-white text-2xl font-black uppercase tracking-tight">
            Awarding Phase
          </h1>
        </div>

        {/* Large Award Image display */}
        <div className="relative">
          <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl relative z-0 overflow-hidden p-4">
             <AwardImage 
               src={currentPrize.src}
               fallback={<Trophy className="w-24 h-24 text-amber-400" />}
               className="w-36 h-36 object-contain"
             />
             <div className="absolute top-0 right-0 translate-x-2 -translate-y-2">
                <div className="w-12 h-12 bg-white rounded-full p-2 shadow-lg flex items-center justify-center transform rotate-12">
                   <Zap className="w-6 h-6 text-yellow-500 fill-current" />
                </div>
             </div>
          </div>
        </div>

        {/* Award Title and Subtitle */}
        <div className="text-center space-y-2">
          <h2 className="text-[#ED5F69] text-3xl font-black uppercase leading-tight max-w-[280px] mx-auto">
            {currentPrize.name}
          </h2>
          <p className="text-white/70 text-sm font-black uppercase tracking-wide">
            Pick who to give this reward!
          </p>
        </div>

        {/* Solution Buttons */}
        <div className="w-full max-w-sm space-y-3 pb-8">
          {solutions.filter(s => s.playerId !== user?.uid).map(s => {
            const solutionPlayer = players.find(p => p.id === s.playerId);
            return (
              <button
                key={s.id}
                onClick={() => handleVote(s.id)}
                className="w-full bg-white p-[12px] rounded-[4px] shadow-xl text-lg font-black uppercase text-[#4A4138] hover:bg-white/95 active:scale-[0.98] transition-all text-left flex items-center justify-between gap-3 border-2 border-transparent hover:border-[#ED5F69]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#AE8166]/10 flex items-center justify-center overflow-hidden">
                    <img src={CHARACTERS.find(c => c.id === solutionPlayer?.avatar)?.src} className="w-7 h-7 object-contain" />
                  </div>
                  <div className="truncate">
                    <div className="font-extrabold truncate text-base leading-tight text-[#4A4138]">{s.name}</div>
                    <div className="text-xs text-black/40 font-bold lowercase">by {solutionPlayer?.name || 'player'}</div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center bg-black/5 text-xs text-[#ED5F69] font-black">
                  +1
                </div>
              </button>
            );
          })}
          
          {solutions.filter(s => s.playerId !== user?.uid).length === 0 && (
            <div className="text-center py-8 text-white/50 font-black uppercase text-sm">
              No solutions to vote on!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
