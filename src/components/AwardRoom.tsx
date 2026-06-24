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
      <div className="min-h-screen w-full flex flex-col items-center justify-start bg-transparent p-8 space-y-6 overflow-y-auto pb-16">
        {/* Progress header dots */}
        <div className="flex gap-[6px] justify-center items-center mt-2">
          {prizes.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-[6px] rounded-full transition-all duration-300 ${idx === currentPrizeIndex ? 'w-6 bg-[#ED5F69]' : 'w-[6px] bg-[#433D34]/20'}`} 
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-[#433D34]/60 font-black uppercase text-xs tracking-widest block mb-1">
            Round {currentPrizeIndex + 1} of {prizes.length}
          </span>
          <h2 className="text-[#433D34] text-lg font-black uppercase tracking-tight">
            {currentPrize.name}
          </h2>
        </div>

        <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden p-4 relative flex-shrink-0">
          <AwardImage 
            src={currentPrize.src}
            fallback={<Trophy className="w-24 h-24 text-[#ED5F69]" />}
            className="w-36 h-36 object-contain"
          />
        </div>
        
        <div className="text-center space-y-1">
          <h3 className="text-[#433D34] text-2xl font-black uppercase tracking-tight">Vote Submitted!</h3>
          <p className="text-[#433D34]/60 font-black uppercase text-xs tracking-wider">
            {everyoneVoted ? 'Everyone has voted!' : 'Waiting for other players to vote...'}
          </p>
        </div>

        {/* Real-time players list with checkmarks for voting */}
        <div className="flex justify-center gap-3 flex-wrap max-w-sm bg-[#433D34]/5 p-4 rounded-lg border border-[#433D34]/10">
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

        {isHost && (
          <button
            onClick={handleNextAward}
            className="w-full max-w-xs bg-[#433D34] text-white p-[12px] text-xl font-black uppercase rounded-[4px] shadow-2xl hover:brightness-110 active:scale-95 transition-all mt-4"
          >
            {currentPrizeIndex + 1 === prizes.length ? 'Show Results!' : 'Next Award'}
          </button>
        )}
      </div>
    );
  }

  const awardKeyword = currentPrize.name.replace(/^The\s+Most\s+/i, '').replace(/^The\s+Ultimate\s+/i, '');

  // Voting Choices Screen
  return (
    <div className="h-full flex flex-col bg-transparent min-h-screen overflow-x-hidden relative py-4 px-6 justify-between">
      <div className="flex-1 flex flex-col items-center space-y-4 overflow-y-auto pb-4">
        {/* Large Award Image display */}
        <div className="relative mt-4">
          <div className="w-[180px] h-[180px] bg-white rounded-full flex items-center justify-center shadow-lg relative z-0 overflow-hidden p-6">
             <AwardImage 
               src={currentPrize.src}
               fallback={<Trophy className="w-24 h-24 text-amber-500" />}
               className="w-28 h-28 object-contain"
             />
          </div>
        </div>

        {/* Award Title and Subtitle */}
        <div className="text-center">
          <h2 className="text-[#433D34] text-xl font-black uppercase tracking-tight leading-none mb-1">
            {currentPrize.name}
          </h2>
          <h2 className="text-[#433D34] text-xl font-black uppercase tracking-tight leading-none mb-4">
            reward
          </h2>
          <p className="text-[#433D34] text-[13px] font-black tracking-tight">
            Pick who to give the {awardKeyword} reward
          </p>
        </div>

        {/* Solution Buttons */}
        <div className="w-full max-w-[280px] space-y-3 pb-8">
          {solutions.filter(s => s.playerId !== user?.uid).map(s => {
             return (
              <button
                key={s.id}
                onClick={() => handleVote(s.id)}
                className="w-full bg-white py-3 px-6 rounded-[4px] shadow-md text-base font-black text-[#433D34] hover:bg-white/95 active:scale-[0.98] transition-all text-center border border-black/5"
              >
                {s.name}
              </button>
            );
          })}
          
          {solutions.filter(s => s.playerId !== user?.uid).length === 0 && (
            <div className="text-center py-8 text-[#433D34]/50 font-black uppercase text-sm">
              No solutions to vote on!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
