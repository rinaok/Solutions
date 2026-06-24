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
  const Richmond = 'warm'; // style context helper
  const isHost = room?.hostId === user?.uid;

  const prizes = room?.prizes || AWARDS;

  const selfPlayer = players.find(p => p.id === user?.uid);

  // Track the local voting index so players can vote sequentially at their own pace
  const [localPrizeIndex, setLocalPrizeIndex] = useState(() => {
    if (!selfPlayer?.votes) return 0;
    const firstUnvoted = prizes.findIndex((_, idx) => selfPlayer.votes?.[idx] === undefined);
    return firstUnvoted === -1 ? prizes.length : firstUnvoted;
  });

  const hasFinishedAllVoting = localPrizeIndex >= prizes.length;

  // We should count votes of only players who have actually registered all votes
  const everyoneVoted = players.length > 0 && players.every(
    p => p.votes && Object.keys(p.votes).length >= prizes.length
  );

  const handleVote = async (solutionId: string) => {
    if (!user || !room) return;
    const voteIndex = localPrizeIndex;
    setLocalPrizeIndex(prev => prev + 1);
    try {
      const currentVotes = selfPlayer?.votes || {};
      await updateDoc(doc(db, 'rooms', room.id, 'players', user.uid), {
        votes: {
          ...currentVotes,
          [voteIndex]: solutionId
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${room.id}/players/${user.uid}`);
    }
  };

  const handleRevealResults = async () => {
    if (!room || !isHost) return;
    try {
      // 1. Tally votes for ALL prizes
      const solutionPrizeUpdates: { [solId: string]: any[] } = {};
      solutions.forEach(s => {
        solutionPrizeUpdates[s.id] = [];
      });

      prizes.forEach((prize: any, idx: number) => {
        const voteCounts: { [solId: string]: number } = {};
        players.forEach(p => {
          const chosen = p.votes?.[idx];
          if (chosen) {
            voteCounts[chosen] = (voteCounts[chosen] || 0) + 1;
          }
        });

        let winningSolutionId: string | null = null;
        let maxVotes = -1;

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

          const awardedPrize = {
            id: prize.id,
            name: prize.name,
            src: prize.src || '',
            fallbackEmoji: prize.fallbackEmoji || '🏆',
            winnerName: winnerPlayer?.name || 'Winner'
          };
          
          if (solutionPrizeUpdates[winningSolutionId]) {
            solutionPrizeUpdates[winningSolutionId].push(awardedPrize);
          }
        }
      });

      // 2. Perform updates to each solution doc in Firestore
      const updatePromises = Object.entries(solutionPrizeUpdates).map(([solId, wonPrizes]) => {
        if (wonPrizes.length === 0) return Promise.resolve();
        const sol = solutions.find(s => s.id === solId);
        const existingPrizesList = sol?.prizes || [];
        const combined = [...existingPrizesList, ...wonPrizes];
        return updateDoc(doc(db, 'rooms', room.id, 'solutions', solId), {
          prize: wonPrizes[0],
          prizes: combined
        });
      });

      await Promise.all(updatePromises);

      // 3. Set room status to finale and set revealIndex to 0
      await updateDoc(doc(db, 'rooms', room.id), {
        status: 'finale',
        revealIndex: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${room.id}`);
    }
  };

  const currentPrize = prizes[localPrizeIndex < prizes.length ? localPrizeIndex : prizes.length - 1] || AWARDS[0];

  if (hasFinishedAllVoting) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-start bg-transparent p-8 space-y-6 overflow-y-auto pb-16">
        {/* Progress header dots - all filled when finished */}
        <div className="flex gap-[6px] justify-center items-center mt-2">
          {prizes.map((_, idx) => (
            <div 
              key={idx} 
              className="h-[6px] w-6 bg-[#ED5F69] rounded-full transition-all duration-300" 
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-[#433D34]/60 font-black uppercase text-xs tracking-widest block mb-1">
            Voting Completed!
          </span>
          <h2 className="text-[#433D34] text-lg font-black uppercase tracking-tight">
            All Awards Voted
          </h2>
        </div>

        <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden p-4 relative flex-shrink-0">
          <Trophy className="w-24 h-24 text-amber-500 animate-bounce" />
        </div>
        
        <div className="text-center space-y-1">
          <h3 className="text-[#433D34] text-2xl font-black uppercase tracking-tight">Votes Submitted!</h3>
          <p className="text-[#433D34]/60 font-black uppercase text-xs tracking-wider">
            {everyoneVoted ? 'Everyone has finished voting!' : 'Waiting for other players to finish voting...'}
          </p>
        </div>

        {/* Real-time players list with checkmarks for voting */}
        <div className="flex justify-center gap-3 flex-wrap max-w-sm bg-[#433D34]/5 p-4 rounded-lg border border-[#433D34]/10">
          {players.map(p => {
            const finishedAll = p.votes && Object.keys(p.votes).length >= prizes.length;
            return (
              <div key={p.id} className="relative">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all bg-white shadow-lg border-2 ${finishedAll ? 'border-[#ED5F69] scale-105' : 'border-transparent opacity-40'}`}>
                  <img src={CHARACTERS.find(c => c.id === p.avatar)?.src} className="w-9 h-9 object-contain" />
                </div>
                {finishedAll && (
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
            onClick={handleRevealResults}
            className="w-full max-w-xs bg-[#433D34] text-white p-[12px] text-xl font-black uppercase rounded-[4px] shadow-2xl hover:brightness-110 active:scale-95 transition-all mt-4 animate-pulse"
          >
            Reveal Results!
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
