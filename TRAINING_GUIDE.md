# Sign Language Model Training Guide - SilentVoice

Welcome! This guide provides step-by-step instructions and best practices for collecting hand gesture data and training new sign language models using the **Sign Language Trainer** tool.

---

## 1. Preparing Your Setup (Crucial for Accuracy)

Before starting data collection, ensure your environment is set up correctly. Clean data leads to high-accuracy recognition.

* **Lighting:** Ensure the room is well-lit. Avoid strong backlights (e.g., sitting directly in front of a bright window), which turn your hands into dark silhouettes and make tracking fail.
* **Camera Position:** Position your webcam at eye level or slightly lower. Your upper body, shoulders, and both hands should be fully visible in the camera frame.
* **Background:** Try to train in front of a clean, non-cluttered background. Complex backgrounds can sometimes confuse hand detection models.
* **Remove Accessories:** For best results, avoid wearing gloves, large wristbands, or rings that might interfere with MediaPipe's hand tracking points.

---

## 2. Step-by-Step Data Collection Workflow

Follow this procedure for every letter/symbol you want the model to learn:

### Step A: Selection & Preparation
1. Start the trainer interface:
   ```powershell
   python train.py
   ```
2. Select your target **Sign Language** from the dropdown menu (e.g., *Arabic Sign Language*, *Greek Sign Language*).
3. The **Gesture Reference Guide** at the bottom left will automatically display the cheat sheet. *Use your mouse wheel to zoom in/out and drag with the left-mouse button to pan* around the cheat sheet to locate the letter.

### Step B: Setting Parameters
4. **Letter (A-Z):** Type the single character or symbol identifier you are about to sign (e.g. `A`, `B`, `ا`, `ب`).
5. **Samples:** Specify how many frames to record.
   * **50-100 samples** is ideal for training a single letter.
   * Do not record too few samples (less than 30), or the neural network won't generalize well.

### Step C: Recording Gestures
6. Position your hand(s) in the camera preview and form the correct sign shape.
7. Click **▶ Start Collection**.
8. **While recording (highly important!):**
   * Do not hold your hand completely rigid in one exact spot.
   * **Slightly move, rotate, and tilt your hand(s)** closer to and farther away from the camera. This teaches the model to recognize the gesture from slightly different angles and distances.
   * Keep your sign shape consistent during the recording.
9. If you need to rest your hand, click **⏸ Pause** to stop recording temporarily, then click **▶ Resume** when ready.
10. Once the progress bar reaches 100%, a success box will pop up, and data is saved to `dataset/<selected_language>_landmarks_data.csv`.

---

## 3. Best Practices for Quality Data

* **Two-Handed vs. One-Handed Signs:** Ensure you use the correct hand(s) as shown in the reference guide. If a sign requires one hand, make sure the other hand is completely out of the camera view.
* **Continuous Movement:** Move your hand slightly (pan, tilt, forward/back) during the few seconds of recording to capture variation.
* **Avoid Transitions:** Do not start recording *before* your hand is in the correct sign shape. If you make a mistake, stop, select the letter, and overwrite or collect again.

---

## 4. Training the Neural Network

Once you have finished collecting samples for all letters in your vocabulary:

1. Click the **🎯 Train Model** button.
2. The trainer will run in the background. You can track progress in the **Activity Log** panel.
3. Look for the final logs:
   * `📈 Accuracy: XX.XX%`
   * `💾 Model saved as 'models/<selected_language>_landmarks_model.pkl'`
4. **Target Accuracy:** Aim for **95% or higher**. If accuracy is low (e.g., under 85%), it usually means some signs look too similar or you need to collect more samples with better hand shape consistency.

---

## 5. Troubleshooting Guide

* **Hand landmarks are not showing up on camera:**
  * Adjust lighting. Shadowy hands or low contrast prevents MediaPipe from mapping landmarks.
  * Hold your hand closer to the center of the camera view.
* **Training Status fails with "No data file found":**
  * You must successfully complete at least one data collection session for the selected language before training. Check if the CSV file exists inside the `dataset/` directory.
* **Camera device fails to open:**
  * Make sure other applications using the webcam (like Zoom, Teams, or the interpreter `runmodel.py`) are fully closed before running `train.py`.
