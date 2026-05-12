import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, setDoc, arrayUnion } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trophy, Gift, Star, Award, Heart, Zap, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';

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
  const [selectedPrize, setSelectedPrize] = useState<any | null>(null);
  const [isAwarded, setIsAwarded] = useState(false);
  const isHost = room?.hostId === user?.uid;

  const handleAward = async () => {
    if (!user || !room || !selectedSolution || !selectedPrize) return;
    
    try {
      // Award the solution
      await updateDoc(doc(db, 'rooms', room.id, 'solutions', selectedSolution), {
        prize: {
          ...selectedPrize,
          from: user.displayName || 'Researcher'
        }
      });

      // Mark self as ready (finished awarding)
      await updateDoc(doc(db, 'rooms', room.id, 'players', user.uid), {
        status: 'awarded'
      });

      setIsAwarded(true);
    } catch (error) {
      console.error(error);
    }
  };

  const finishAwards = async () => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      status: 'finale'
    });
  };

  const everyoneAwarded = players.every(p => p.status === 'awarded');

  return (
    <div className="min-h-screen flex flex-col p-8 border-8 border-black">
      <div className="mb-12">
        <h1 className="text-6xl font-black uppercase tracking-tighter mb-4">Awards Ceremony</h1>
        <p className="text-xl font-bold uppercase opacity-60">Grant a prestigious prize to your fellow researchers.</p>
      </div>

      {!isAwarded ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-6">
            <h3 className="text-2xl font-black uppercase">1. Select Candidate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solutions.filter(s => s.playerId !== user?.uid).map(s => (
                <div 
                  key={s.id}
                  onClick={() => setSelectedSolution(s.id)}
                  className={`cursor-pointer p-6 border-4 border-black transition-all ${
                    selectedSolution === s.id ? 'bg-[#00FF00] -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-[#E4E3E0]'
                  }`}
                >
                  <div className="text-2xl font-black uppercase">{s.name}</div>
                  <div className="text-sm font-bold opacity-60 uppercase">By {players.find(p => p.id === s.playerId)?.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-6">
             <h3 className="text-2xl font-black uppercase">2. Choose Prize</h3>
             <div className="grid grid-cols-2 gap-4">
               {PRIZES.map(prize => (
                 <div 
                   key={prize.id}
                   onClick={() => setSelectedPrize(prize)}
                   className={`cursor-pointer p-6 border-4 border-black flex items-center gap-4 transition-all ${
                     selectedPrize?.id === prize.id ? 'bg-[#00FF00] -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-[#E4E3E0]'
                   }`}
                 >
                   <div className="w-10 h-10 border-2 border-black flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                     {prize.icon}
                   </div>
                   <div className="text-xl font-black uppercase leading-tight">{prize.name}</div>
                 </div>
               ))}
             </div>
          </div>

          <div className="w-full lg:w-72 space-y-8 flex flex-col justify-end">
             <button
               onClick={handleAward}
               disabled={!selectedSolution || !selectedPrize}
               className="w-full bg-black text-[#00FF00] p-8 font-black uppercase border-4 border-black hover:bg-[#00FF00] hover:text-black transition-all disabled:opacity-20"
             >
               Grant Prize
             </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
           <div className="bg-[#00FF00] border-8 border-black p-12 text-center space-y-6">
              <Gift className="w-24 h-24 mx-auto" />
              <h2 className="text-5xl font-black uppercase">Medal Granted</h2>
              <p className="text-xl font-bold uppercase opacity-60">Waiting for other researchers to finish their evaluations...</p>
           </div>
           
           <div className="flex gap-4">
             {players.map(p => (
               <div key={p.id} className={`w-3 h-3 rounded-full border-2 border-black ${p.status === 'awarded' ? 'bg-[#00FF00]' : 'bg-white'}`} />
             ))}
           </div>
        </div>
      )}

      {isHost && (
        <div className="mt-12 pt-8 border-t-8 border-black flex justify-end">
           <button
             onClick={finishAwards}
             disabled={!everyoneAwarded}
             className="bg-black text-white px-12 py-4 font-black uppercase border-4 border-black hover:bg-[#00FF00] transition-colors disabled:opacity-30"
           >
             Commence Finale
           </button>
        </div>
      )}
    </div>
  );
}
