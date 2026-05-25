import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, setDoc, arrayUnion } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trophy, Gift, Star, Award, Heart, Zap, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS } from '../constants';

const PRIZES = [
  { id: 'p1', name: 'Most Audacious', icon: <Zap className="text-yellow-500" /> },
  { id: 'p2', name: 'Genius Design', icon: <Trophy className="text-amber-500" /> },
  { id: 'p3', name: 'Pure Magic', icon: <Sparkles className="text-purple-500" /> },
  { id: 'p4', name: 'Most Helpful', icon: <Heart className="text-red-500" /> },
  { id: 'p5', name: 'Sticker Mastery', icon: <Star className="text-blue-500" /> },
  { id: 'p6', name: 'X-Factor Award', icon: <Award className="text-emerald-500" /> }
];

export function AwardRoom() {
  const { room, players, solutions, user } = useGame();
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [isAwarded, setIsAwarded] = useState(false);
  const isHost = room?.hostId === user?.uid;

  const currentPrize = PRIZES[0]; // For now, focus on one flagship reward

  const handleAward = async (solutionId: string) => {
    if (!user || !room) return;
    setSelectedSolution(solutionId);
    
    try {
      // Award the solution
      await updateDoc(doc(db, 'rooms', room.id, 'solutions', solutionId), {
        prize: {
          id: currentPrize.id,
          name: currentPrize.name,
          from: user.displayName || 'Researcher'
        }
      });

      // Mark self as ready (finished awarding)
      await updateDoc(doc(db, 'rooms', room.id, 'players', user.uid), {
        status: 'awarded'
      });

      setIsAwarded(true);
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `rooms/${room.id}/solutions/${solutionId}`);
    }
  };

  const finishAwards = async () => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      status: 'finale'
    });
  };

  const everyoneAwarded = players.every(p => p.status === 'awarded');

  if (isAwarded) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#DFDFDF] p-8 space-y-12">
        <div className="w-64 h-64 bg-white rounded-full flex items-center justify-center shadow-2xl">
          <Trophy className="w-40 h-40 text-[#ED5F69]" />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-[#ED5F69] text-3xl font-black uppercase tracking-tight">Reward given!</h2>
          <p className="text-[#A1A1A1] font-black uppercase text-sm">Waiting for other players...</p>
        </div>

        <div className="flex justify-center gap-4 flex-wrap max-w-sm">
          {players.map(p => (
            <div key={p.id} className="relative">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all bg-white shadow-lg border-4 ${p.status === 'awarded' ? 'border-[#ED5F69]' : 'border-transparent opacity-30'}`}>
                <img src={CHARACTERS.find(c => c.id === p.avatar)?.src} className="w-10 h-10 object-contain" />
              </div>
              {p.status === 'awarded' && (
                <div className="absolute -top-1 -right-1 bg-[#ED5F69] rounded-full p-1 border-2 border-white">
                  <Star className="w-3 h-3 text-white fill-current" />
                </div>
              )}
            </div>
          ))}
        </div>

        {isHost && everyoneAwarded && (
          <button
            onClick={finishAwards}
            className="bg-black text-white px-12 py-4 text-2xl font-black uppercase rounded-lg shadow-xl hover:brightness-105 active:scale-95 transition-all mt-8"
          >
            Go to Finale
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#DFDFDF] overflow-hidden">
      <div className="flex-1 flex flex-col items-center p-8 space-y-8 overflow-y-auto">
        {/* Trophy Illustration */}
        <div className="relative">
          <div className="w-56 h-56 bg-white rounded-full flex items-center justify-center shadow-2xl relative z-0">
             <Trophy className="w-32 h-32 text-amber-400" />
             <div className="absolute top-0 right-0 translate-x-4 -translate-y-4">
                <div className="w-16 h-16 bg-white rounded-full p-2 shadow-lg flex items-center justify-center transform rotate-12">
                   <Zap className="w-8 h-8 text-yellow-500 fill-current" />
                </div>
             </div>
          </div>
        </div>

        {/* Reward Title */}
        <div className="text-center">
          <h1 className="text-[#ED5F69] text-3xl font-black uppercase leading-tight max-w-[200px] mx-auto">
            The Most creative reward
          </h1>
        </div>

        {/* Subtitle */}
        <div className="text-center">
          <p className="text-[#ED5F69]/60 text-sm font-black uppercase">
            Pick who to give the Creative reward
          </p>
        </div>

        {/* Solution Buttons */}
        <div className="w-full max-w-sm space-y-3 pb-8">
          {solutions.filter(s => s.playerId !== user?.uid).map(s => (
            <button
              key={s.id}
              onClick={() => handleAward(s.id)}
              className="w-full bg-white py-4 px-6 rounded-sm shadow-xl text-2xl font-black uppercase text-[#333] hover:brightness-95 active:scale-[0.98] transition-all text-center"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
