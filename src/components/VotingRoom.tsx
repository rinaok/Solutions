import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { CHARACTERS } from '../constants';
import { handleFirestoreError, OperationType } from '../errorHandlers';

const DEFAULT_PROMPTS = [
  "How to stop socks from disappearing in the laundry?",
  "Design a vehicle for a world without gravity.",
  "Create a machine that turns bad moods into edible candy.",
  "How to commute across the ocean without using a boat or plane?",
  "A device that lets you speak to plants.",
  "A solution for people who always forget their keys.",
  "Everyone in my home...",
  "The secret life of garden gnomes.",
  "A restaurant where you pay with jokes.",
  "How to make homework do itself?",
];

const PROMPT_IMAGES = [
  'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1532499016263-f2c3e98df9cd?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1520110120385-45dc24a509ae?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1444491741275-3747c33cc99b?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1544640808-32ca72ac7f67?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1582234372722-50d4ccc30ef3?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1473177104440-3ecae047e3d2?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=400',
];

export function VotingRoom() {
  const { room, players, user } = useGame();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const isHost = room?.hostId === user?.uid;

  if (!isHost) {
    const host = players.find(p => p.id === room?.hostId);
    const hostCharacter = CHARACTERS.find(c => c.id === host?.avatar);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#DFDFDF] overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-8"
        >
          <div className="relative">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mx-auto ring-8 ring-white overflow-hidden p-4">
              {hostCharacter ? (
                <img src={hostCharacter.src} className="w-full h-full object-contain animate-bounce" alt="Host character" />
              ) : (
                <Sparkles className="w-12 h-12 text-[#ED5F69] animate-pulse" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#ED5F69] text-white p-2 rounded-full shadow-lg">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">
              {host?.name || 'Someone'}<br />is thinking...
            </h2>
            <p className="text-black/40 font-bold uppercase text-sm tracking-widest">Choosing the prompt</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setIndex((prev) => (prev + newDirection + DEFAULT_PROMPTS.length) % DEFAULT_PROMPTS.length);
  };

  const finishSelection = async () => {
    if (!room) return;
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        selectedPrompt: DEFAULT_PROMPTS[index],
        status: 'creating'
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      rotate: direction > 0 ? 15 : -15,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      rotate: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      rotate: direction < 0 ? 15 : -15,
    }),
  };

  return (
    <div className="h-full flex flex-col items-center justify-between p-4 md:p-8 bg-[#DFDFDF] overflow-hidden">
      <div className="pt-6 md:pt-12">
        <h2 className="text-[#A1A1A1] text-2xl font-black uppercase text-center tracking-tighter">
          Swipe to see all
        </h2>
      </div>

      <div className="relative w-full max-w-[320px] aspect-[3/4] flex items-center justify-center">
        {/* Background stack visual effect */}
        <div className="absolute inset-0 bg-white rounded-xl shadow-lg border-[12px] border-white -rotate-6 scale-95 opacity-40 translate-y-4" />
        <div className="absolute inset-0 bg-white rounded-xl shadow-lg border-[12px] border-white rotate-3 scale-100 opacity-60 translate-y-2" />

        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={isHost ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="absolute inset-0 bg-white rounded-xl shadow-2xl border-[12px] border-white flex flex-col cursor-grab active:cursor-grabbing"
          >
            <div className="flex-1 bg-[#D1D1D1] rounded-sm overflow-hidden relative group">
              <img 
                src={PROMPT_IMAGES[index]} 
                className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
                alt="Prompt visual"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="h-[120px] flex items-center justify-center p-4">
              <h3 className="text-2xl font-black text-center leading-none tracking-tighter text-[#333]">
                {DEFAULT_PROMPTS[index]}
              </h3>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pb-12 w-full flex justify-center">
        {isHost ? (
          <button
            onClick={finishSelection}
            className="bg-[#ED5F69] text-white px-12 py-4 text-2xl font-black uppercase rounded-lg shadow-xl hover:brightness-105 active:scale-95 transition-all"
          >
            That's the one!
          </button>
        ) : (
          <div className="bg-black text-white px-12 py-4 text-lg font-black uppercase rounded-lg shadow-xl animate-pulse">
            Editor is choosing...
          </div>
        )}
      </div>
    </div>
  );
}

