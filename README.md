# Yoga Pose Detection with OpenCV and Mediapipe

Welcome to the Yoga Pose Detection repository! This project utilizes OpenCV and Mediapipe to detect and classify various yoga poses from live video feeds or static images. The aim is to provide a tool for users to practice yoga with real-time feedback on their poses.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Supported Poses](#supported-poses)
- [Acknowledgements](#acknowledgements)

## Features
- Real-time yoga pose detection using webcam.
- Pose classification and feedback.
- Visualization of detected keypoints on the body.
- Support for multiple predefined yoga poses.

## Installation
### Prerequisites
- Python 3.6+
- OpenCV
- Mediapipe

### Step-by-Step Guide
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/yoga-pose-detection.git
   cd yoga-pose-detection
   ```

2. **Create and activate a virtual environment (optional but recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
   
## Supported Poses
The current version of the project supports the following yoga poses:
- Tree Pose (Vrikshasana)
- T Pose

The list of poses can be expanded by adding new pose definitions in 'classifyPose' function in yoga_pose_detection.ipynb.

## Acknowledgements
This project is built on top of the amazing [Mediapipe](https://mediapipe.dev/) framework by Google and the versatile [OpenCV](https://opencv.org/) library. Special thanks to the contributors and maintainers of these projects.
