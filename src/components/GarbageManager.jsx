//GarbageManager component to handle garbage and dustbin objects in a React Three Fiber scene.

import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useEffect, useState } from "react";

export const GarbageManager = ({
  garbageRefs,
  dustbinRefs,
  removedGarbage = [], // default
}) => {
  const garbageModel = useGLTF("/models/oil.glb");
  const dustbinModel = useGLTF("/models/dustbin.glb");

  const [garbageList] = useState([
    [2, -0.5, 1],
    [-4, -0.4, -2],
    [1, -0.4, -5],
    [-6, -0.5, 2],
    [3, -0.8, -3],
    [0, -0.1, 0],
  ]);

  useEffect(() => {
    garbageModel.scene.traverse((c) => {
      if (c.isMesh) c.castShadow = c.receiveShadow = true;
    });
    dustbinModel.scene.traverse((c) => {
      if (c.isMesh) c.castShadow = c.receiveShadow = true;
    });
  }, [garbageModel, dustbinModel]);

  // ...rest of your code

  const dustbinPositions = [
    [5, -1.2, 5],
    [-3, -0.1, -5],
  ];

  return (
    <>
      {/* DUSTBINS */}
      {dustbinPositions.map((pos, i) => (
        <RigidBody
          key={i}
          type="fixed"
          colliders="trimesh"
          ref={(el) => (dustbinRefs.current[i] = el)}
        >
          <primitive
            object={dustbinModel.scene.clone()}
            position={pos}
            scale={0.1}
          />
        </RigidBody>
      ))}

      {/* GARBAGE */}
      {garbageList.map((pos, idx) =>
        removedGarbage.includes(idx) ? null : (
          <RigidBody
            key={idx}
            type="dynamic"
            colliders="hull"
            mass={0.1}
            ref={(el) => (garbageRefs.current[idx] = el)}
          >
            <primitive
              object={garbageModel.scene.clone()}
              position={pos}
              scale={1}
            />
          </RigidBody>
        )
      )}
    </>
  );
};
