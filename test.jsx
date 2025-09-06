// CharacterController.jsx
import { useKeyboardControls, Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { Character } from "./Character";

const normalizeAngle = (angle) => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};
const lerpAngle = (start, end, t) => {
  start = normalizeAngle(start);
  end = normalizeAngle(end);
  if (Math.abs(end - start) > Math.PI) {
    if (end > start) start += 2 * Math.PI;
    else end += 2 * Math.PI;
  }
  return normalizeAngle(start + (end - start) * t);
};

const GARBAGE_POSITIONS = [
  [2, -0.5, 1],
  [-4, -0.4, -2],
  [1, -0.4, -5],
  [-6, -0.5, 2],
  [3, -0.8, -4],
  [0, -0.1, 0],
];
const DUSTBIN_POSITIONS = [
  [5, -1.2, 5],
  [-3, -0.1, -5],
];

export const CharacterController = ({
  garbageRefs,
  dustbinRefs,
  onGarbageRemoved,
  removedGarbage = [],
}) => {
  const spawnRef = useRef(new Vector3(0, 1.5, 0));

  const { WALK_SPEED, RUN_SPEED, ROTATION_SPEED, JUMP_FORCE } = useControls(
    "Character Control",
    {
      WALK_SPEED: 2,
      RUN_SPEED: 3.2,
      ROTATION_SPEED: degToRad(1),
      JUMP_FORCE: 0.5, // make adjustable
    }
  );

  const rb = useRef();
  const container = useRef();
  const character = useRef();
  const [animation, setAnimation] = useState("idle");
  const characterRotationTarget = useRef(0);
  const rotationTarget = useRef(0);

  const [, get] = useKeyboardControls();

  // camera orbit state
  const cameraAngles = useRef({ yaw: Math.PI, pitch: -0.2, distance: 8 });
  const isDragging = useRef(false);
  const mousePrev = useRef({ x: 0, y: 0 });

  const [carriedIdx, setCarriedIdx] = useState(null);
  const garbageModel = useGLTF("/models/oil.glb");

  const [nearestGarbage, setNearestGarbage] = useState({ idx: null, dist: 999 });
  const [nearestDustbin, setNearestDustbin] = useState({ idx: null, dist: 999 });

  // mouse orbit controls
  useEffect(() => {
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      mousePrev.current.x = e.clientX;
      mousePrev.current.y = e.clientY;
    };
    const onMouseUp = () => (isDragging.current = false);
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - mousePrev.current.x;
      const dy = e.clientY - mousePrev.current.y;
      mousePrev.current.x = e.clientX;
      mousePrev.current.y = e.clientY;

      cameraAngles.current.yaw -= dx * 0.005;
      cameraAngles.current.pitch -= dy * 0.003;
      const maxPitch = Math.PI / 2 - 0.05;
      cameraAngles.current.pitch = Math.max(
        -maxPitch,
        Math.min(maxPitch, cameraAngles.current.pitch)
      );
    };
    const onWheel = (e) => {
      cameraAngles.current.distance = Math.min(
        15,
        Math.max(3, cameraAngles.current.distance + e.deltaY * 0.01)
      );
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);

  // E key pick/drop logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== "KeyE" || !rb.current) return;
      const pos = rb.current.translation();

      if (carriedIdx !== null) {
        if (nearestDustbin.dist < 2) {
          onGarbageRemoved(carriedIdx);
          setCarriedIdx(null);
        } else {
          const gRef = garbageRefs.current[carriedIdx];
          if (gRef) {
            gRef.setTranslation(
              { x: pos.x + 0.5, y: pos.y + 0.3, z: pos.z + 0.2 },
              true
            );
            gRef.setEnabled(true);
          }
          setCarriedIdx(null);
        }
        return;
      }

      if (nearestGarbage.idx !== null && nearestGarbage.dist < 1.5) {
        const idx = nearestGarbage.idx;
        const gRef = garbageRefs.current[idx];
        if (gRef) {
          gRef.setEnabled(false);
          gRef.setTranslation({ x: 0, y: -1000, z: 0 }, true);
          setCarriedIdx(idx);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [carriedIdx, nearestGarbage, nearestDustbin, onGarbageRemoved]);

  // main frame loop
  useFrame(({ camera }) => {
    if (!rb.current) return;

    const prevLin = rb.current.linvel();
    const movementInput = { x: 0, z: 0 };
    if (get().forward) movementInput.z = 1;
    if (get().backward) movementInput.z = -1;
    if (get().left) movementInput.x = 1;
    if (get().right) movementInput.x = -1;

    const sprint = get().run;
    const speed = sprint ? RUN_SPEED : WALK_SPEED;

    // ground check (improved)
    const isGrounded = rb.current.translation().y <= 1.51; // close to floor
    if (get().jump && isGrounded) {
      rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
    }

    // camera forward/right
    const camForward = new Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();
    const camRight = new Vector3().crossVectors(new Vector3(0, 1, 0), camForward).normalize();

    const moveWorld = new Vector3();
    if (movementInput.z) moveWorld.addScaledVector(camForward, movementInput.z);
    if (movementInput.x) moveWorld.addScaledVector(camRight, movementInput.x);

    // animation
    if (!isGrounded) setAnimation("idle");
    else if (moveWorld.lengthSq() > 0.0001)
      setAnimation(speed === RUN_SPEED ? "run" : "walk");
    else setAnimation("idle");

    if (moveWorld.lengthSq() > 0.0001) {
      moveWorld.normalize();
      rb.current.setLinvel(
        { x: moveWorld.x * speed, y: prevLin.y, z: moveWorld.z * speed },
        true
      );
      characterRotationTarget.current = Math.atan2(moveWorld.x, moveWorld.z);
    } else {
      rb.current.setLinvel({ x: 0, y: prevLin.y, z: 0 }, true);
      const camFaceAngle = Math.atan2(camForward.x, camForward.z);
      characterRotationTarget.current = camFaceAngle;
    }

    if (character.current) {
      character.current.rotation.y = lerpAngle(
        character.current.rotation.y,
        characterRotationTarget.current,
        0.12
      );
    }

    // nearest objects
    const cPos = rb.current.translation();
    let bestG = { idx: null, dist: 999 };
    GARBAGE_POSITIONS.forEach((gp, idx) => {
      if (removedGarbage.includes(idx)) return;
      const d = Math.hypot(gp[0] - cPos.x, gp[1] - cPos.y, gp[2] - cPos.z);
      if (d < bestG.dist) bestG = { idx, dist: d };
    });
    setNearestGarbage(bestG);

    let bestD = { idx: null, dist: 999 };
    DUSTBIN_POSITIONS.forEach((dp, idx) => {
      const d = Math.hypot(dp[0] - cPos.x, dp[1] - cPos.y, dp[2] - cPos.z);
      if (d < bestD.dist) bestD = { idx, dist: d };
    });
    setNearestDustbin(bestD);

    // respawn if fall
    if (cPos.y < -5) {
      const s = spawnRef.current;
      rb.current.setTranslation({ x: s.x, y: s.y + 1, z: s.z }, true);
      rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    container.current.rotation.y = MathUtils.lerp(
      container.current.rotation.y,
      rotationTarget.current,
      0.08
    );

    // orbit camera
    const targetPos = new Vector3(cPos.x, cPos.y + 1.5, cPos.z);
    const { yaw, pitch, distance } = cameraAngles.current;
    const camOffset = new Vector3(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance
    );
    const desiredCamPos = targetPos.clone().add(camOffset);
    camera.position.lerp(desiredCamPos, 0.12);
    camera.lookAt(targetPos);
  });

  const labelStyle = {
    width: 150,
    padding: "6px 10px",
    background: "rgba(0,0,0,0.75)",
    color: "white",
    fontSize: 15,
    borderRadius: 6,
  };

  return (
    <RigidBody colliders={false} lockRotations ref={rb}>
      <group ref={container}>
        <group ref={character}>
          <Character scale={0.19} position-y={-0.25} animation={animation} />
          {carriedIdx !== null && (
            <group position={[-0.3, 0, 0]} scale={[0.8, 0.8, 0.8]}>
              <primitive object={garbageModel.scene.clone()} />
            </group>
          )}
        </group>

        <Html position={[0, 2.2, 0]} center>
          <div style={labelStyle}>
            {carriedIdx !== null
              ? nearestDustbin.dist < 2
                ? "Press E — throw in dustbin"
                : "Press E — drop"
              : nearestGarbage.dist < 1.5
              ? "Press E — pick up"
              : ""}
          </div>
        </Html>
      </group>
      <CapsuleCollider args={[0.08, 0.15]} />
    </RigidBody>
  );
};
