document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('videoElement');
    const inputCanvas = document.getElementById('inputCanvas');
    const outputCanvas = document.getElementById('outputCanvas');
    const inputCtx = inputCanvas.getContext('2d');
    const outputCtx = outputCanvas.getContext('2d');
    const startBtn = document.getElementById('startCamera');
    const stopBtn = document.getElementById('stopCamera');
    const inputStatus = document.getElementById('inputStatus');
    const outputStatus = document.getElementById('outputStatus');

    let stream = null;
    let isProcessing = false;
    let isRunning = false;

    // Function to maintain canvas aspect ratio
    function setCanvasDimensions(width, height) {
        // Set actual canvas dimensions
        inputCanvas.width = width;
        inputCanvas.height = height;
        outputCanvas.width = width;
        outputCanvas.height = height;
        
        console.log(`Canvas dimensions set to ${width}x${height}`);
    }

    function drawInputFrame() {
        if (video.readyState === video.HAVE_ENOUGH_DATA && isRunning) {
            // Set canvas dimensions to match video if they don't match
            if (inputCanvas.width !== video.videoWidth || inputCanvas.height !== video.videoHeight) {
                setCanvasDimensions(video.videoWidth, video.videoHeight);
            }

            // Draw current video frame to input canvas
            inputCtx.drawImage(video, 0, 0);
            
            // Continue loop
            requestAnimationFrame(drawInputFrame);
        } else if (isRunning) {
            requestAnimationFrame(drawInputFrame);
        }
    }

    async function processFrame() {
        if (!isProcessing && isRunning && video.readyState === video.HAVE_ENOUGH_DATA) {
            isProcessing = true;
            outputStatus.textContent = "Processing...";

            try {
                // Create temporary canvas for frame capture
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = video.videoWidth;
                tempCanvas.height = video.videoHeight;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Draw current video frame to temp canvas
                tempCtx.drawImage(video, 0, 0);

                // Send frame to server for processing
                const response = await fetch('/process_frame', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image: tempCanvas.toDataURL('image/jpeg', 0.8)
                    })
                });

                if (!response.ok) throw new Error('Network response was not ok');
                
                const result = await response.json();
                if (result.error) {
                    console.error('Server error:', result.error);
                    outputStatus.textContent = `Error: ${result.error}`;
                } else if (result.processed_image) {
                    // Create new image from processed data
                    const img = new Image();
                    img.onload = () => {
                        // Ensure we have the correct dimensions
                        if (outputCanvas.width !== video.videoWidth || outputCanvas.height !== video.videoHeight) {
                            setCanvasDimensions(video.videoWidth, video.videoHeight);
                        }
                        
                        outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
                        outputCtx.drawImage(img, 0, 0);
                        isProcessing = false;
                        
                        // Update status with pose information if available
                        if (result.landmarks_detected) {
                            if (result.pose_class && result.pose_class !== "Unknown") {
                                outputStatus.textContent = `Pose: ${result.pose_class} (${(result.pose_confidence * 100).toFixed(1)}%)`;
                            } else {
                                outputStatus.textContent = "Landmarks detected";
                            }
                        } else {
                            outputStatus.textContent = "No landmarks detected";
                        }
                        
                        // Continue processing if still running
                        if (isRunning) {
                            setTimeout(() => {
                                requestAnimationFrame(processFrame);
                            }, 10); // Small delay to prevent overloading
                        }
                    };
                    img.src = result.processed_image;
                    return; // Don't request new frame until image is loaded
                }
            } catch (error) {
                console.error('Processing error:', error);
                outputStatus.textContent = `Error: ${error.message}`;
                isProcessing = false;
            }
        }
        
        // Request next frame if still running
        if (isRunning) {
            requestAnimationFrame(processFrame);
        }
    }

    async function startCamera() {
        try {
            isRunning = true;
            inputStatus.textContent = "Starting camera...";
            outputStatus.textContent = "Waiting for camera...";
            
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                }
            });
            
            video.srcObject = stream;
            
            // Wait for video to be ready
            video.onloadedmetadata = () => {
                video.play()
                    .then(() => {
                        console.log("Video dimensions:", video.videoWidth, video.videoHeight);
                        // Initialize canvas size
                        setCanvasDimensions(video.videoWidth, video.videoHeight);
                        
                        inputStatus.textContent = "Camera active";
                        
                        // Start both drawing and processing loops
                        requestAnimationFrame(drawInputFrame);
                        requestAnimationFrame(processFrame);
                    })
                    .catch(err => {
                        console.error("Error playing video:", err);
                        inputStatus.textContent = "Error starting video";
                    });
            };

            startBtn.disabled = true;
            stopBtn.disabled = false;

        } catch (error) {
            console.error('Camera error:', error);
            inputStatus.textContent = "Camera error";
            outputStatus.textContent = "Camera error";
            alert('Error accessing camera. Please ensure camera permissions are granted.');
            isRunning = false;
        }
    }

    function stopCamera() {
        isRunning = false;
        isProcessing = false;
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
        outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        inputStatus.textContent = "Camera stopped";
        outputStatus.textContent = "Processing stopped";
    }

    // Add window resize handler to maintain canvas sizes
    window.addEventListener('resize', () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            setCanvasDimensions(video.videoWidth, video.videoHeight);
        }
    });

    startBtn.addEventListener('click', startCamera);
    stopBtn.addEventListener('click', stopCamera);
});