// DOM Elements
const counterDOM = document.getElementById("counter");
const endDOM = document.getElementById("end");
const finalScoreDOM = document.getElementById("finalScore");

// Three.js Setup
let hemiLight, dirLight, backLight;
const scene = new THREE.Scene();
const distance = 500;
const zoom = 2;
const girlSize = 15;
const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth * columns;
const stepTime = 200; // ms per step

// Camera
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2, window.innerWidth / 2,
  window.innerHeight / 2, window.innerHeight / -2,
  0.1, 10000
);
camera.rotation.x = (50 * Math.PI) / 180;
camera.rotation.y = (20 * Math.PI) / 180;
camera.rotation.z = (10 * Math.PI) / 180;
const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
const initialCameraPositionX = Math.tan(camera.rotation.y) * Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

// Variables
let lanes, currentLane, currentColumn;
let previousTimestamp, startMoving, moves, stepStartTimestamp;

// Vehicle Textures
function Texture(width, height, rects) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(0,0,0,0.6)";
  rects.forEach((rect) => context.fillRect(rect.x, rect.y, rect.w, rect.h));
  return new THREE.CanvasTexture(canvas);
}

const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110, 40, [{ x: 10, y: 0, w: 50, h: 30 }, { x: 70, y: 0, w: 30, h: 30 }]);
const carLeftSideTexture = new Texture(110, 40, [{ x: 10, y: 10, w: 50, h: 30 }, { x: 70, y: 10, w: 30, h: 30 }]);
const truckFrontTexture = new Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25, 30, [{ x: 0, y: 15, w: 10, h: 10 }]);
const truckLeftSideTexture = new Texture(25, 30, [{ x: 0, y: 5, w: 10, h: 10 }]);

const laneTypes = ["car", "truck", "forest"];
const laneSpeeds = [2, 2.5, 3];
const vehicleColors = [0xa52523, 0xbdb638, 0x78b14b];
const treeHeights = [20, 45, 60];

// ---------- Helper Functions ----------
function Wheel() {
  const wheel = new THREE.Mesh(
    new THREE.BoxBufferGeometry(12 * zoom, 33 * zoom, 12 * zoom),
    new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
  );
  wheel.position.z = 6 * zoom;
  return wheel;
}

function Car() {
  const car = new THREE.Group();
  const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)];

  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60 * zoom, 30 * zoom, 15 * zoom),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  main.position.z = 12 * zoom;
  car.add(main);

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry(33 * zoom, 24 * zoom, 12 * zoom),
    [
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true })
    ]
  );
  cabin.position.x = 6 * zoom;
  cabin.position.z = 25.5 * zoom;
  car.add(cabin);

  const frontWheel = new Wheel(); frontWheel.position.x = -18 * zoom; car.add(frontWheel);
  const backWheel = new Wheel(); backWheel.position.x = 18 * zoom; car.add(backWheel);

  return car;
}

function Truck() {
  const truck = new THREE.Group();
  const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxBufferGeometry(100 * zoom, 25 * zoom, 5 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  base.position.z = 10 * zoom; truck.add(base);

  const cargo = new THREE.Mesh(
    new THREE.BoxBufferGeometry(75 * zoom, 35 * zoom, 40 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  cargo.position.x = 15 * zoom; cargo.position.z = 30 * zoom; truck.add(cargo);

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry(25 * zoom, 30 * zoom, 30 * zoom),
    [
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
      new THREE.MeshPhongMaterial({ color, flatShading: true })
    ]
  );
  cabin.position.x = -40 * zoom; cabin.position.z = 20 * zoom; truck.add(cabin);

  const frontWheel = new Wheel(); frontWheel.position.x = -38 * zoom; truck.add(frontWheel);
  const middleWheel = new Wheel(); middleWheel.position.x = -10 * zoom; truck.add(middleWheel);
  const backWheel = new Wheel(); backWheel.position.x = 30 * zoom; truck.add(backWheel);

  return truck;
}

function Three() {
  const three = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.BoxBufferGeometry(15 * zoom, 15 * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10 * zoom; three.add(trunk);

  const height = treeHeights[Math.floor(Math.random() * treeHeights.length)];
  const crown = new THREE.Mesh(
    new THREE.BoxBufferGeometry(30 * zoom, 30 * zoom, height * zoom),
    new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
  );
  crown.position.z = (height / 2 + 20) * zoom; three.add(crown);

  return three;
}

function Girl() {
  const girl = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxBufferGeometry(girlSize * zoom, girlSize * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xffc0cb, flatShading: true })
  );
  body.position.z = 10 * zoom; girl.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxBufferGeometry(10 * zoom, 10 * zoom, 10 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xffe0bd, flatShading: true })
  );
  head.position.z = 25 * zoom; girl.add(head);

  const hair = new THREE.Mesh(
    new THREE.BoxBufferGeometry(12 * zoom, 12 * zoom, 12 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x552200, flatShading: true })
  );
  hair.position.z = 25 * zoom; girl.add(hair);

  return girl;
}

// ---------- Lane ----------
function Road() {
  const road = new THREE.Group();
  const middle = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
    new THREE.MeshPhongMaterial({ color: 0x454a59 })
  ); middle.receiveShadow = true; road.add(middle);

  const left = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
    new THREE.MeshPhongMaterial({ color: 0x393d49 })
  ); left.position.x = -boardWidth * zoom; road.add(left);

  const right = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
    new THREE.MeshPhongMaterial({ color: 0x393d49 })
  ); right.position.x = boardWidth * zoom; road.add(right);

  return road;
}

function Grass() {
  const grass = new THREE.Group();
  const middle = new THREE.Mesh(
    new THREE.BoxBufferGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xbaf455 })
  ); middle.receiveShadow = true; grass.add(middle);

  const left = new THREE.Mesh(
    new THREE.BoxBufferGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x99c846 })
  ); left.position.x = -boardWidth * zoom; grass.add(left);

  const right = new THREE.Mesh(
    new THREE.BoxBufferGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x99c846 })
  ); right.position.x = boardWidth * zoom; grass.add(right);

  grass.position.z = 1.5 * zoom; return grass;
}

function Lane(index) {
  this.index = index;
  this.type = index <= 0 ? "field" : laneTypes[Math.floor(Math.random() * laneTypes.length)];

  switch (this.type) {
    case "field": this.mesh = new Grass(); break;
    case "forest":
      this.mesh = new Grass();
      this.occupiedPositions = new Set();
      this.threes = [1, 2, 3, 4].map(() => {
        const tree = new Three();
        let pos;
        do { pos = Math.floor(Math.random() * columns); } while (this.occupiedPositions.has(pos));
        this.occupiedPositions.add(pos);
        tree.position.x = (pos * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
        this.mesh.add(tree);
        return tree;
      });
      break;
    case "car":
    case "truck":
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      const count = this.type === "car" ? 3 : 2;
      const step = this.type === "car" ? 2 : 3;

      this.vechicles = Array.from({ length: count }, () => {
        const vehicle = this.type === "car" ? new Car() : new Truck();
        let pos;
        do { pos = Math.floor(Math.random() * columns / step); } while (occupiedPositions.has(pos));
        occupiedPositions.add(pos);
        vehicle.position.x = (pos * positionWidth * step + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
        if (!this.direction) vehicle.rotation.z = Math.PI;
        this.mesh.add(vehicle);
        return vehicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
  }
}

function generateLanes() {
  return [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map(i => {
      const lane = new Lane(i);
      lane.mesh.position.y = i * positionWidth * zoom;
      scene.add(lane.mesh);
      return lane;
    }).filter(lane => lane.index >= 0);
}

function addLane() {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index * positionWidth * zoom;
  scene.add(lane.mesh);
  lanes.push(lane);
}

// ---------- Initialize ----------
const girl = new Girl(); scene.add(girl);

hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6); scene.add(hemiLight);
dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(-100, -100, 200); dirLight.castShadow = true; dirLight.target = girl; scene.add(dirLight);
backLight = new THREE.DirectionalLight(0x000000, 0.4); backLight.position.set(200, 200, 50); backLight.castShadow = true; scene.add(backLight);

function initialiseValues() {
  lanes = generateLanes();
  currentLane = 0;
  currentColumn = Math.floor(columns / 2);
  previousTimestamp = null;
  startMoving = false;
  moves = [];
  stepStartTimestamp = null;

  girl.position.x = 0;
  girl.position.y = 0;

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;

  counterDOM.innerHTML = "0";
  endDOM.style.visibility = "hidden";
}

initialiseValues();

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Retry button
document.querySelector("#retry").addEventListener("click", () => {
  lanes.forEach(lane => scene.remove(lane.mesh));
  initialiseValues();
});

// ---------- Controls ----------
window.addEventListener("keydown", (event) => {
  switch(event.keyCode){
    case 38: move("forward"); break;
    case 40: move("backward"); break;
    case 37: move("left"); break;
    case 39: move("right"); break;
  }
});

// ---------- Move ----------
function move(direction) {
  const finalPos = moves.reduce((pos, move) => {
    switch(move){
      case "forward": return { lane: pos.lane+1, column: pos.column };
      case "backward": return { lane: pos.lane-1, column: pos.column };
      case "left": return { lane: pos.lane, column: pos.column-1 };
      case "right": return { lane: pos.lane, column: pos.column+1 };
      default: return pos;
    }
  }, { lane: currentLane, column: currentColumn });

  const targetLane = finalPos.lane, targetColumn = finalPos.column;

  if(direction==="forward" && lanes[targetLane+1]?.type==="forest" &&
     lanes[targetLane+1].occupiedPositions.has(targetColumn)) return;
  if(direction==="backward" && targetLane===0) return;
  if(direction==="backward" && lanes[targetLane-1]?.type==="forest" &&
     lanes[targetLane-1].occupiedPositions.has(targetColumn)) return;
  if(direction==="left" && targetColumn===0) return;
  if(direction==="left" && lanes[targetLane]?.type==="forest" &&
     lanes[targetLane].occupiedPositions.has(targetColumn-1)) return;
  if(direction==="right" && targetColumn===columns-1) return;
  if(direction==="right" && lanes[targetLane]?.type==="forest" &&
     lanes[targetLane].occupiedPositions.has(targetColumn+1)) return;

  if(!stepStartTimestamp) startMoving = true;
  if(direction==="forward") addLane();
  moves.push(direction);
}

// ---------- Animate ----------
function animate(timestamp){
  requestAnimationFrame(animate);
  if(!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  lanes.forEach(lane=>{
    if(lane.type==="car" || lane.type==="truck"){
      const beforeStart = (-boardWidth*zoom)/2 - positionWidth*2*zoom;
      const afterEnd = (boardWidth*zoom)/2 + positionWidth*2*zoom;
      lane.vechicles.forEach(v=>{
        if(lane.direction) v.position.x = v.position.x < beforeStart ? afterEnd : v.position.x - (lane.speed/16)*delta;
        else v.position.x = v.position.x > afterEnd ? beforeStart : v.position.x + (lane.speed/16)*delta;
      });
    }
  });

  if(startMoving){ stepStartTimestamp = timestamp; startMoving=false; }

  if(stepStartTimestamp){
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance = Math.min(moveDeltaTime/stepTime,1)*positionWidth*zoom;
    const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime/stepTime,1)*Math.PI)*8*zoom;

    switch(moves[0]){
      case "forward": 
        const posYf = currentLane*positionWidth*zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + posYf;
        girl.position.y = posYf;
        girl.position.z = jumpDeltaDistance;
        break;
      case "backward": 
        const posYb = currentLane*positionWidth*zoom - moveDeltaDistance;
        camera.position.y = initialCameraPositionY + posYb;
        girl.position.y = posYb;
        girl.position.z = jumpDeltaDistance;
        break;
      case "left": 
        const posXl = (currentColumn*positionWidth + positionWidth/2)*zoom - (boardWidth*zoom)/2 - moveDeltaDistance;
        camera.position.x = initialCameraPositionX + posXl;
        girl.position.x = posXl;
        girl.position.z = jumpDeltaDistance;
        break;
      case "right": 
        const posXr = (currentColumn*positionWidth + positionWidth/2)*zoom - (boardWidth*zoom)/2 + moveDeltaDistance;
        camera.position.x = initialCameraPositionX + posXr;
        girl.position.x = posXr;
        girl.position.z = jumpDeltaDistance;
        break;
    }

    if(moveDeltaTime > stepTime){
      switch(moves[0]){
        case "forward": currentLane++; counterDOM.innerHTML = currentLane; break;
        case "backward": currentLane--; break;
        case "left": currentColumn--; break;
        case "right": currentColumn++; break;
      }
      moves.shift();
      stepStartTimestamp = moves.length===0 ? null : timestamp;
    }
  }

  // ---------- Collision Detection ----------
  if(lanes[currentLane].type==="car" || lanes[currentLane].type==="truck"){
    const girlMinX = girl.position.x - (girlSize*zoom)/2;
    const girlMaxX = girl.position.x + (girlSize*zoom)/2;
    const vehicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];

    lanes[currentLane].vechicles.forEach(v=>{
      const carMinX = v.position.x - (vehicleLength*zoom)/2;
      const carMaxX = v.position.x + (vehicleLength*zoom)/2;
      if(girlMaxX > carMinX && girlMinX < carMaxX){
        // Game Over
        finalScoreDOM.innerHTML = currentLane;
        endDOM.style.visibility = "visible";
      }
    });
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// ---------- Window Resize ----------
window.addEventListener("resize",()=>{
  camera.left = window.innerWidth / -2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = window.innerHeight / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

