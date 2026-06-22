/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameProvider, useGame } from './GameContext';
import { Landing } from './components/Landing';
import { WaitingRoom } from './components/WaitingRoom';
import { VotingRoom } from './components/VotingRoom';
import { CreatorRoom } from './components/CreatorRoom';
import { PresentationRoom } from './components/PresentationRoom';
import { AwardRoom } from './components/AwardRoom';
import { FinaleRoom } from './components/FinaleRoom';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

function GameRouter() {
  const { room, user, loading, error } = useGame();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <Loader2 className="w-12 h-12 animate-spin text-[#000000]" />
      </div>
    );
  }

  if (!user || !room) {
    return <Landing />;
  }

  const renderStage = () => {
    switch (room.status) {
      case 'waiting': return <WaitingRoom />;
      case 'voting': return <VotingRoom />;
      case 'creating': return <CreatorRoom />;
      case 'presenting': return <PresentationRoom />;
      case 'awarding': return <AwardRoom />;
      case 'finale': return <FinaleRoom />;
      default: return <WaitingRoom />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#4A4139] selection:bg-[#E9535E] selection:text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={room.status}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {renderStage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}

