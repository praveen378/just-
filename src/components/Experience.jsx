// Experience.jsx file
import { Environment, OrthographicCamera } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useControls } from "leva";
import { useRef, useState } from "react";
import { CharacterController } from "./CharacterController";
import { Map } from "./Map";
import { GarbageManager } from "./GarbageManager";

const maps = {
  castle_on_hills: {
    scale: 3,
    position: [-6, -7, 0],
  },
  animal_crossing_map: {
    scale: 20,
    position: [-15, -1, 10],
  },
  city_scene_tokyo: {
    scale: 0.72,
    position: [0, -1, -3.5],
  },
  de_dust_2_with_real_light: {
    scale: 0.3,
    position: [-5, -3, 13],
  },
  medieval_fantasy_book: {
    scale: 0.4,
    position: [-5, 0, -4],
  },
};

export const Experience = () => {
  const garbageRefs = useRef([]);
  const dustbinRefs = useRef([]);
  const [removedGarbage, setRemovedGarbage] = useState([]);

  const handleGarbageRemoved = (idx) => {
    setRemovedGarbage((prev) => [...prev, idx]);
  };

  const shadowCameraRef = useRef();
  const { map } = useControls("Map", {
    map: {
      value: "medieval_fantasy_book",
      options: Object.keys(maps),
    },
  });

  return (
    <>
      {/* <OrbitControls /> */}
      <Environment preset="sunset" />
      <directionalLight
        intensity={0.65}
        castShadow
        position={[-15, 10, 15]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00005}
      >
        <OrthographicCamera
          left={-22}
          right={15}
          top={10}
          bottom={-20}
          ref={shadowCameraRef}
          attach={"shadow-camera"}
        />
      </directionalLight>
      <Physics key={map}>
        <Map
          scale={maps[map].scale}
          position={maps[map].position}
          model={`models/${map}.glb`}
        />
        <GarbageManager
          garbageRefs={garbageRefs}
          dustbinRefs={dustbinRefs}
          removedGarbage={removedGarbage}
        />

        <CharacterController
          garbageRefs={garbageRefs}
          dustbinRefs={dustbinRefs}
          onGarbageRemoved={handleGarbageRemoved}
          removedGarbage={removedGarbage}
        />
      </Physics>
    </>
  );
};
