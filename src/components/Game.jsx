//Game component managing character and garbage interactions in a React Three Fiber scene.

import { useRef, useState } from "react";
import { CharacterController } from "./CharacterController";
import { GarbageManager } from "./GarbageManager";

export const Game = () => {
  const garbageRefs = useRef([]);
  const dustbinRefs = useRef([]);
  const [removedGarbage, setRemovedGarbage] = useState([]);

  const handleGarbageRemoved = (idx) => {
    setRemovedGarbage((prev) => [...prev, idx]);
  };

  return (
    <>
      <CharacterController
        garbageRefs={garbageRefs}
        dustbinRefs={dustbinRefs}
        onGarbageRemoved={handleGarbageRemoved}
      />
      <GarbageManager
        garbageRefs={garbageRefs}
        dustbinRefs={dustbinRefs}
        removedGarbage={removedGarbage}
      />
    </>
  );
};
