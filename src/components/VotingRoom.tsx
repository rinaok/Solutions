import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { CHARACTERS, DEFAULT_PROMPTS, PROMPT_IMAGES } from '../constants';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { playSwipe, playClick } from '../utils/sounds';


export function VotingRoom() {
  const { room, players, user } = useGame();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const isHost = room?.hostId === user?.uid;

  if (!isHost) {
    const host = players.find(p => p.id === room?.hostId);
    const hostCharacter = CHARACTERS.find(c => c.id === host?.avatar);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-transparent overflow-hidden">
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
    playSwipe();
    setDirection(newDirection);
    setIndex((prev) => (prev + newDirection + DEFAULT_PROMPTS.length) % DEFAULT_PROMPTS.length);
  };

  const finishSelection = async () => {
    if (!room) return;
    playClick();
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        selectedPrompt: DEFAULT_PROMPTS[index],
        status: 'creating',
        timerStartedAt: serverTimestamp()
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
    <div className="h-full min-h-screen flex flex-col items-center justify-between py-8 px-4 bg-transparent overflow-hidden">
      <div className="w-full max-w-[320px] text-left pt-4">
        <h2 className="text-[#433C34] text-sm font-black uppercase tracking-wider">
          Swipe to see all
        </h2>
      </div>

      <div className="relative w-full max-w-[320px] aspect-[3/4] my-auto flex items-center justify-center">
        {/* Background stack visual effect matching the mockup */}
        <div className="absolute inset-0 bg-white rounded-2xl shadow-xl -rotate-12 -translate-x-6 translate-y-3 opacity-90 scale-[0.96] border border-black/5" />
        <div className="absolute inset-0 bg-white rounded-2xl shadow-xl rotate-12 translate-x-6 translate-y-3 opacity-90 scale-[0.96] border border-black/5" />

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
            className="absolute inset-0 bg-white rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.15)] p-4 flex flex-col cursor-grab active:cursor-grabbing border border-black/5"
          >
            <div className="flex-1 bg-[#D1D1D1] rounded-xl overflow-hidden relative group">
              <img 
                src={PROMPT_IMAGES[index]} 
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                alt="Prompt visual"
                style={{ marginLeft: '0px', marginRight: '50px' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
            <div className="h-[100px] flex items-center justify-center p-3 text-center">
              <h3 className="text-[22px] font-black leading-tight tracking-tight text-[#433C34] max-w-[240px]">
                {DEFAULT_PROMPTS[index]}
              </h3>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pb-8 w-full flex justify-center">
        {isHost ? (
          <button
            onClick={finishSelection}
            className="bg-[#ED5F69] text-white py-3 px-8 text-xl font-black uppercase rounded-[4px] shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            That's the one!
          </button>
        ) : (
          <div className="bg-black/20 text-white px-12 py-3 text-lg font-black uppercase rounded-lg shadow-xl animate-pulse">
            Editor is choosing...
          </div>
        )}
      </div>
    </div>
  );
}

