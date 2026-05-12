import React, { useEffect, useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Trophy } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';

const DEFAULT_PROMPTS = [
  "How to stop socks from disappearing in the laundry?",
  "Design a vehicle for a world without gravity.",
  "Create a machine that turns bad moods into edible candy.",
  "How to commute across the ocean without using a boat or plane?",
  "A device that lets you speak to plants.",
  "A solution for people who always forget their keys."
];

export function VotingRoom() {
  const { room, players, user } = useGame();
  const [votedId, setVotedId] = useState<number | null>(null);
  const isHost = room?.hostId === user?.uid;

  useEffect(() => {
    if (isHost && !room.prompts) {
      // Pick 3 random prompts
      const shuffled = [...DEFAULT_PROMPTS].sort(() => 0.5 - Math.random());
      updateDoc(doc(db, 'rooms', room.id), {
        prompts: shuffled.slice(0, 3)
      });
    }
  }, [isHost, room?.prompts]);

  const handleVote = async (index: number) => {
    if (!user || !room) return;
    setVotedId(index);
    try {
      await updateDoc(doc(db, 'rooms', room.id, 'players', user.uid), {
        vote: room.prompts[index]
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getVoteCount = (prompt: string) => {
    return players.filter(p => p.vote === prompt).length;
  };

  const finishVoting = async () => {
    if (!room) return;
    // Find the winner
    const counts = room.prompts.map((p: string) => getVoteCount(p));
    const max = Math.max(...counts);
    const winnerIndex = counts.indexOf(max);
    const winner = room.prompts[winnerIndex];

    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        selectedPrompt: winner,
        status: 'creating'
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const everyoneVoted = players.every(p => p.vote);

  return (
    <div className="min-h-screen flex flex-col p-8 bg-[#FDFCF0]">
      <div className="mb-12">
        <h1 className="text-6xl font-black uppercase tracking-tighter mb-2">The Essay</h1>
        <p className="text-xl font-bold uppercase opacity-60">Choose the topic for today's entry.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {room?.prompts?.map((prompt: string, i: number) => (
          <motion.div
            key={i}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleVote(i)}
            className={`cursor-pointer rounded-[40px] p-8 flex flex-col gap-6 transition-all relative ${
              votedId === i ? 'bg-[#E9535E] text-white shadow-xl translate-y-[-4px]' : 'bg-white hover:bg-[#E4E3E0] shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-5xl font-black ${votedId === i ? 'text-white/20' : 'text-black/10'}`}>0{i+1}</span>
              {votedId === i && <CheckCircle2 className="w-10 h-10 text-white" />}
            </div>
            <h3 className="text-3xl font-black uppercase leading-tight mb-8">{prompt}</h3>
            <div className={`mt-auto pt-6 font-bold uppercase text-sm ${votedId === i ? 'text-white/80' : 'text-black/40'}`}>
               {getVoteCount(prompt)} Votes
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between items-center bg-white p-8 rounded-[40px] shadow-2xl">
         <div className="flex items-center gap-4">
           <div className="w-4 h-4 bg-[#E9535E] rounded-full animate-pulse" />
           <p className="font-bold uppercase tracking-tight text-black">
             {everyoneVoted ? 'Topic Selected' : `${players.filter(p => p.vote).length}/${players.length} Contributors Voted`}
           </p>
         </div>

         {isHost && (
           <button
             onClick={finishVoting}
             disabled={!everyoneVoted}
             className="bg-[#E9535E] text-white px-12 py-4 font-bold uppercase rounded-full hover:opacity-90 transition-all disabled:opacity-30 active:scale-95"
           >
             Lock Entry
           </button>
         )}
      </div>
    </div>
  );
}
