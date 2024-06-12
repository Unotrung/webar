const videoElement = document.getElementById('videoElement');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const threeCanvas = document.getElementById('three-canvas');
let model, videoWidth, videoHeight;

// Setup Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 5;

// Load glasses model
const loader = new THREE.GLTFLoader();
let glasses;
loader.load('eyeglass/scene.gltf', function (gltf) {
    glasses = gltf.scene;
    scene.add(glasses);
});

async function setupCamera() {
    videoElement.width = window.innerWidth;
    videoElement.height = window.innerHeight;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }
        });
        videoElement.srcObject = stream;

        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                resolve(videoElement);
            };
        });
    } catch (error) {
        console.error('Error accessing webcam: ', error);
        alert('Webcam not found. Please check your device and browser settings.');
    }
}

async function loadFaceLandmarksModel() {
    model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
}

async function detectFace() {
    const predictions = await model.estimateFaces({ input: videoElement });

    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    if (predictions.length > 0) {
        predictions.forEach(prediction => {
            const keypoints = prediction.scaledMesh;
            const leftEye = keypoints[33];
            const rightEye = keypoints[263];
            const eyeCenter = [(leftEye[0] + rightEye[0]) / 2, (leftEye[1] + rightEye[1]) / 2];

            if (glasses) {
                const scale = Math.abs(leftEye[0] - rightEye[0]) / 2;
                glasses.position.set(eyeCenter[0] / videoWidth * 2 - 1, -eyeCenter[1] / videoHeight * 2 + 1, -3);
                glasses.scale.set(scale, scale, scale);
                glasses.rotation.y = Math.atan2(leftEye[1] - rightEye[1], leftEye[0] - rightEye[0]);
            }
        });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(detectFace);
}

async function main() {
    await setupCamera();
    await loadFaceLandmarksModel();
    videoWidth = videoElement.videoWidth;
    videoHeight = videoElement.videoHeight;
    overlay.width = videoWidth;
    overlay.height = videoHeight;
    threeCanvas.width = videoWidth;
    threeCanvas.height = videoHeight;
    detectFace();
}

main();
