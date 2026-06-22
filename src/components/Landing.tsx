import React, { useState } from 'react';
import { signIn, db, auth } from '../firebase';
import { useGame } from '../GameContext';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, Plus, Users, Zap } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS } from '../constants';

export function Landing() {
  const { user, joinRoom } = useGame();
  const [view, setView] = useState<'landing' | 'join-code' | 'profile'>('landing');
  const [action, setAction] = useState<'create' | 'join' | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedChar, setSelectedChar] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const handleCreateRequest = async () => {
    setAction('create');
    if (!user) {
      setIsLoading(true);
      try {
        const signedInUser = await signIn();
        if (!signedInUser) {
          setIsLoading(false);
          setAction(null);
          return;
        }
      } catch (err) {
        setIsLoading(false);
        setAction(null);
        return;
      }
      setIsLoading(false);
    }
    setView('profile');
  };

  const handleJoinRequest = async () => {
    setAction('join');
    if (!user) {
      setIsLoading(true);
      try {
        const signedInUser = await signIn();
        if (!signedInUser) {
          setIsLoading(false);
          setAction(null);
          return;
        }
      } catch (err) {
        setIsLoading(false);
        setAction(null);
        return;
      }
      setIsLoading(false);
    }
    setView('join-code');
  };

  const handleCodeSubmit = async () => {
    if (!code) return;
    setIsLoading(true);
    try {
      const roomId = code.toUpperCase();
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        alert('Room not found!');
        setIsLoading(false);
        return;
      }
      setView('profile');
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `rooms/${code}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!user || !name) return;
    setIsLoading(true);
    
    if (action === 'create') {
      const roomCode = generateCode();
      const roomId = roomCode;
      try {
        await setDoc(doc(db, 'rooms', roomId), {
          roomCode,
          status: 'waiting',
          hostId: user.uid,
          createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'rooms', roomId, 'players', user.uid), {
          name,
          avatar: CHARACTERS[selectedChar].id,
          isReady: false,
          joinedAt: serverTimestamp(),
        });

        joinRoom(roomId);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      const roomId = code.toUpperCase();
      try {
        await setDoc(doc(db, 'rooms', roomId, 'players', user.uid), {
          name,
          avatar: CHARACTERS[selectedChar].id,
          isReady: false,
          joinedAt: serverTimestamp(),
        });

        joinRoom(roomId);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}/players/${user.uid}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-end p-4 md:p-8 bg-transparent overflow-hidden relative">

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-sm pb-16"
      >
        <div className="flex flex-col">
          {(view === 'landing' || view === 'join-code') && (
            <div className="mb-8">
              <h1 className="text-6xl font-black tracking-tighter leading-none mb-2">
                Solutions
              </h1>
              <p className="text-lg font-medium tracking-tight opacity-60">A game about creating</p>
            </div>
          )}

          {view === 'landing' && (
            <div className="flex gap-[10px]">
              <button
                onClick={handleJoinRequest}
                disabled={isLoading}
                className="bg-[#4A4138] text-white p-[10px] text-lg font-bold rounded-[4px] active:scale-95 flex-1 transition-transform whitespace-nowrap disabled:opacity-70 disabled:scale-100"
              >
                {isLoading && action === 'join' ? 'Connecting...' : 'Join'}
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={isLoading}
                className="bg-white text-black p-[10px] text-lg font-bold rounded-[4px] active:scale-95 flex-1 transition-transform whitespace-nowrap disabled:opacity-70 disabled:scale-100"
              >
                {isLoading && action === 'create' ? 'Connecting...' : 'New game'}
              </button>
            </div>
          )}

          {view === 'join-code' && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-4"
            >
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="####"
                maxLength={4}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                className="w-full bg-white border-none rounded-xl p-6 text-3xl font-bold uppercase focus:ring-2 focus:ring-black/5 outline-none shadow-sm text-center tracking-[0.5em]"
                autoFocus
              />
              <div className="flex gap-[10px]">
                <button
                  onClick={handleCodeSubmit}
                  disabled={code.length < 4 || isLoading}
                  className="p-[10px] bg-[#4A4138] text-white font-bold uppercase rounded-[4px] transition-all disabled:opacity-50 active:scale-95 flex-1"
                >
                  {isLoading ? '...' : 'Join'}
                </button>
                <button
                  onClick={() => setView('landing')}
                  className="bg-white/50 text-black p-[10px] font-bold uppercase rounded-[4px] active:scale-95"
                >
                  Back
                </button>
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-full bg-white px-2 py-1 shadow-sm">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Daniel"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-white border-none rounded-none py-1 px-4 text-3xl font-black text-[#E9535E] outline-none shadow-none text-center placeholder:opacity-20"
                  autoFocus
                />
              </div>

              <div className="relative w-56 h-56 flex items-center justify-center">
                <div className="absolute inset-0 bg-white rounded-full shadow-lg" />
                <img 
                  src={CHARACTERS[selectedChar].src} 
                  alt="Avatar"
                  className="w-40 h-40 object-contain relative z-10 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.fallback-emoji');
                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                <div className="fallback-emoji absolute inset-0 flex items-center justify-center text-7xl hidden">
                  {CHARACTERS[selectedChar].emoji}
                </div>
              </div>

              <button
                onClick={handleFinalSubmit}
                disabled={!name || isLoading}
                className="bg-[#ED5F69] text-white p-[10px] text-2xl font-black uppercase rounded-[4px] shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? '...' : (action === 'create' ? 'Create' : 'Join')}
              </button>

              <button
                onClick={() => setView(action === 'create' ? 'landing' : 'join-code')}
                className="text-black/40 font-bold uppercase text-xs hover:text-black/60 transition-colors"
              >
                Go Back
              </button>

              <div className="grid grid-cols-3 gap-3 pt-4">
                {CHARACTERS.map((char, index) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedChar(index)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all transform active:scale-90 ${
                      selectedChar === index ? 'ring-4 ring-black/10 scale-110' : 'bg-[#737373] hover:bg-[#525252]'
                    }`}
                  >
                    <div className={`w-full h-full flex items-center justify-center ${selectedChar === index ? 'bg-white' : ''}`}>
                      <img 
                        src={char.src} 
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.mini-fallback');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      <div className="mini-fallback text-2xl hidden flex items-center justify-center">
                        {char.emoji}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
