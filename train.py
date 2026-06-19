# Standard library imports
import cv2
import mediapipe as mp
import csv
import os
import pickle
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk
from PIL import Image, ImageTk
import threading

# Supported sign languages and their code abbreviations
SUPPORTED_SIGN_LANGS = {
    "American Sign Language (ASL)": "asl",
    "Arabic Sign Language": "arabic",
    "Australian Sign Language (Auslan)": "australian",
    "Brazilian Sign Language (Libras)": "brazilian",
    "British Sign Language (BSL)": "british",
    "Chinese Sign Language (CSL)": "chinese",
    "Greek Sign Language (GSL)": "greek",
    "Indian Sign Language (ISL)": "indian",
    "Irish Sign Language (ISL)": "irish",
    "Japanese Sign Language (JSL)": "japanese",
    "Korean Sign Language (KSL)": "korean",
    "Marathi Sign Language": "marathi",
    "Mongolian Sign Language (MSL)": "mongolian",
    "Polish Sign Language (PJM)": "polish",
    "Portuguese Sign Language": "portuguese",
    "Russian Sign Language (RSL)": "russian",
    "South African Sign Language (SASL)": "south_african",
    "Spanish Sign Language (LSE)": "spanish",
    "Swedish Sign Language (SSL)": "swedish",
    "Tamil Sign Language": "tamil",
    "Ukrainian Sign Language (USL)": "ukrainian"
}

# Image mapping for sign language reference guides (cheat sheets)
SIGN_LANG_IMAGES = {
    "asl": "american.jpeg",
    "arabic": "arabic.jpg",
    "australian": "australian.jpg",
    "brazilian": "brazilian.jpg",
    "british": "british.jpeg",
    "chinese": "chinese.jpg",
    "greek": "Greek Sign Language.png",
    "indian": "indian.jpeg",
    "irish": "irish.jpg",
    "japanese": "japanese.jpg",
    "korean": "korean.png",
    "marathi": "marathi.webp",
    "mongolian": "mongonian.gif",
    "polish": "polish.jpg",
    "portuguese": "portugese.jpg",
    "russian": "russian.jpg",
    "south_african": "south african.jpg",
    "spanish": "spanish.jpeg",
    "swedish": "sweden.jpg",
    "tamil": "tamil.png",
    "ukrainian": "ukranian.JPG"
}

# Initialize MediaPipe hands module for hand tracking
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

class TrainModelGUI:
    """
    Main GUI class for ASL Model Training application.
    Provides interface for data collection and model training.
    """
    def __init__(self, root):
        """
        Initialize the GUI application.
        Args:
            root: The root tkinter window
        """
        self.root = root
        self.root.title("Sign Language Trainer - SilentVoice")
        self.root.geometry("1000x700")
        self.root.configure(bg="#0f0f0f")
        
        # Initialize variables
        self.cap = None                  # Video capture object
        self.is_collecting = False       # Flag for data collection state
        self.current_letter = ""         # Current letter being collected
        self.samples_to_collect = 0      # Total samples to collect
        self.samples_collected = 0       # Current number of samples
        self.is_paused = False          # Pause state flag
        self.collecting_thread = None    # Thread for data collection
        self.selected_lang = tk.StringVar(self.root)
        self.selected_lang.set("American Sign Language (ASL)")
        self.zoom_scale = 1.0
        self.original_image = None
        # Pre-create empty dataset files for all supported languages
        self.initialize_datasets()
        
        # Setup UI components
        self.create_ui()

    def initialize_datasets(self):
        if not os.path.exists("dataset"):
            os.makedirs("dataset")
        for lang_code in SUPPORTED_SIGN_LANGS.values():
            data_path = os.path.join("dataset", f"{lang_code}_landmarks_data.csv")
            if not os.path.exists(data_path):
                with open(data_path, "w", newline="") as f:
                    pass

    def get_paths(self):
        lang_code = SUPPORTED_SIGN_LANGS[self.selected_lang.get()]
        data_path = os.path.join("dataset", f"{lang_code}_landmarks_data.csv")
        model_path = os.path.join("models", f"{lang_code}_landmarks_model.pkl")
        return data_path, model_path

    def update_reference_image(self, event=None):
        lang_code = SUPPORTED_SIGN_LANGS[self.selected_lang.get()]
        img_name = SIGN_LANG_IMAGES.get(lang_code)
        if not img_name:
            self.original_image = None
            self.ref_canvas.delete("all")
            self.ref_canvas.create_text(230, 110, text="No reference image available", fill="#ffffff", font=("Segoe UI", 11))
            return
            
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Check inside Silent_Voice first, then fallback to parent folder
        img_path = os.path.join(script_dir, "sign languages", img_name)
        if not os.path.exists(img_path):
            img_path = os.path.join(os.path.dirname(script_dir), "sign languages", img_name)
        
        if os.path.exists(img_path):
            try:
                # Load and preserve the original image for scaling
                img = Image.open(img_path)
                if img_name.lower().endswith('.gif'):
                    img.seek(0)
                
                # Initial fit sizing
                max_w, max_h = 460, 220
                w, h = img.size
                ratio = min(max_w / w, max_h / h)
                new_w = int(w * ratio)
                new_h = int(h * ratio)
                
                self.original_image = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                self.zoom_scale = 1.0
                self.render_zoomed_image()
                self.log(f"🖼 Loaded reference guide for '{self.selected_lang.get()}' (Scroll to zoom, Drag to pan)")
            except Exception as e:
                self.original_image = None
                self.ref_canvas.delete("all")
                self.ref_canvas.create_text(230, 110, text=f"Error loading image: {e}", fill="#e74c3c", font=("Segoe UI", 11))
        else:
            self.original_image = None
            self.ref_canvas.delete("all")
            self.ref_canvas.create_text(230, 110, text=f"Reference image not found:\n{img_name}", fill="#e74c3c", font=("Segoe UI", 11))

    def render_zoomed_image(self):
        if self.original_image is None:
            return
        w, h = self.original_image.size
        new_w = int(w * self.zoom_scale)
        new_h = int(h * self.zoom_scale)
        
        img = self.original_image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        photo = ImageTk.PhotoImage(img)
        
        self.ref_canvas.delete("all")
        self.ref_canvas.image_obj = photo  # Keep reference
        
        canvas_w = self.ref_canvas.winfo_width()
        canvas_h = self.ref_canvas.winfo_height()
        if canvas_w <= 1: canvas_w = 460
        if canvas_h <= 1: canvas_h = 220
        
        x = max(canvas_w // 2, new_w // 2)
        y = max(canvas_h // 2, new_h // 2)
        
        self.ref_canvas.create_image(x, y, image=photo, anchor="center")
        self.ref_canvas.config(scrollregion=(0, 0, max(canvas_w, new_w), max(canvas_h, new_h)))

    def zoom_reference_image(self, event):
        if self.original_image is None:
            return
        if event.delta > 0:
            self.zoom_scale = min(4.0, self.zoom_scale + 0.1)
        else:
            self.zoom_scale = max(0.2, self.zoom_scale - 0.1)
        self.render_zoomed_image()

    def start_pan(self, event):
        self.ref_canvas.scan_mark(event.x, event.y)
        
    def pan_image(self, event):
        self.ref_canvas.scan_dragto(event.x, event.y, gain=1)

    def create_ui(self):
        """
        Create and setup all UI components including frames, buttons, and labels.
        Organizes the interface into main sections: video feed, controls, and logging.
        """
        header = tk.Label(self.root, text="Sign Language Trainer", font=("Segoe UI", 24, "bold"),fg="#ffffff", bg="#1c1c1c", pady=10)
        header.pack(fill=tk.X)
        main_frame = tk.Frame(self.root, bg="#0f0f0f")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        left_frame = tk.Frame(main_frame, bg="#1c1c1c", bd=2, relief="ridge")
        left_frame.pack(side=tk.LEFT, fill="both", expand=True, padx=(0, 10))
        cam_label = tk.Label(left_frame, text="Camera Preview", font=("Segoe UI", 14, "bold"), fg="#00ff88", bg="#1c1c1c")
        cam_label.pack(pady=5)
        self.video_label = tk.Label(left_frame, bg="#0f0f0f")
        self.video_label.pack(fill="both", expand=True, padx=10, pady=(10, 5))
        
        # Gesture Reference Guide Frame
        ref_frame = tk.LabelFrame(left_frame, text="Gesture Reference Guide (Scroll to Zoom, Drag to Pan)", font=("Segoe UI", 12, "bold"), fg="#00ff88", bg="#1c1c1c", padx=5, pady=5)
        ref_frame.pack(fill="both", expand=True, padx=10, pady=(5, 10))
        self.ref_canvas = tk.Canvas(ref_frame, bg="#1c1c1c", highlightthickness=0)
        self.ref_canvas.pack(fill="both", expand=True)
        
        # Bind zoom and pan events to canvas
        self.ref_canvas.bind("<MouseWheel>", self.zoom_reference_image)
        self.ref_canvas.bind("<ButtonPress-1>", self.start_pan)
        self.ref_canvas.bind("<B1-Motion>", self.pan_image)
        right_frame = tk.Frame(main_frame, bg="#0f0f0f", width=400)
        right_frame.pack(side=tk.RIGHT, fill="both", padx=(10, 0))
        collection_frame = tk.LabelFrame(right_frame, text="Data Collection", font=("Segoe UI", 12, "bold"), fg="#00ff88", bg="#1c1c1c", padx=15, pady=15)
        collection_frame.pack(fill="x", pady=(0, 15))
        
        tk.Label(collection_frame, text="Sign Language:", font=("Segoe UI", 11), fg="#ffffff", bg="#1c1c1c").grid(row=0, column=0, sticky="w", pady=5)
        self.lang_combobox = tk.OptionMenu(collection_frame, self.selected_lang, *SUPPORTED_SIGN_LANGS.keys())
        self.lang_combobox.config(font=("Segoe UI", 11), bg="#1c1c1c", fg="white", activebackground="#2c2c2c", activeforeground="white", highlightthickness=0, relief="flat")
        try:
            self.lang_combobox["menu"].config(bg="#1c1c1c", fg="white", font=("Segoe UI", 11))
        except Exception:
            pass
        self.lang_combobox.grid(row=0, column=1, pady=5, sticky="ew")
        self.selected_lang.trace_add("write", lambda *args: self.root.after(50, self.update_reference_image))
        
        tk.Label(collection_frame, text="Sign Label:", font=("Segoe UI", 11), fg="#ffffff", bg="#1c1c1c").grid(row=1, column=0, sticky="w", pady=5)
        self.letter_entry = tk.Entry(collection_frame, font=("Segoe UI", 11), width=10)
        self.letter_entry.grid(row=1, column=1, pady=5, sticky="ew")
        
        tk.Label(collection_frame, text="Samples:", font=("Segoe UI", 11), fg="#ffffff", bg="#1c1c1c").grid(row=2, column=0, sticky="w", pady=5)
        self.samples_entry = tk.Entry(collection_frame, font=("Segoe UI", 11), width=10)
        self.samples_entry.insert(0, "50")
        self.samples_entry.grid(row=2, column=1, pady=5, sticky="ew")
        
        collection_frame.columnconfigure(1, weight=1)
        self.progress_label = tk.Label(collection_frame, text="Progress: 0/0", font=("Segoe UI", 10), fg="#f1c40f", bg="#1c1c1c")
        self.progress_label.grid(row=3, column=0, columnspan=2, pady=10)
        self.progress_bar = ttk.Progressbar(collection_frame, orient="horizontal", mode="determinate", maximum=100, length=300)
        self.progress_bar.grid(row=4, column=0, columnspan=2, pady=5)
        btn_frame = tk.Frame(collection_frame, bg="#1c1c1c")
        btn_frame.grid(row=5, column=0, columnspan=2, pady=15)
        self.start_btn = tk.Button(btn_frame, text="▶ Start Collection", font=("Segoe UI", 11,"bold"), bg="#27ae60", fg="white", padx=15, pady=8, command=self.start_collection)
        self.start_btn.pack(side=tk.LEFT, padx=5)
        self.stop_btn = tk.Button(btn_frame, text="■ Stop", font=("Segoe UI", 11, "bold"), bg="#c0392b", fg="white", padx=15, pady=8, command=self.stop_collection, state="disabled")
        self.stop_btn.pack(side=tk.LEFT, padx=5)
        self.pause_btn = tk.Button(btn_frame, text="⏸ Pause", font=("Segoe UI", 11, "bold"), bg="#f1c40f", fg="white", padx=15, pady=8, command=self.pause_collection, state="normal")
        self.pause_btn.pack(side=tk.LEFT, padx=5)
        self.resume_btn = tk.Button(btn_frame, text="▶ Resume", font=("Segoe UI", 11, "bold"), bg="#27ae60", fg="white", padx=15, pady=8, command=self.resume_collection, state="disabled")
        self.resume_btn.pack(side=tk.LEFT, padx=5)
        training_frame = tk.LabelFrame(right_frame, text="Model Training", font=("Segoe UI", 12, "bold"), fg="#00ff88", bg="#1c1c1c", padx=15, pady=15)
        training_frame.pack(fill="x", pady=(0, 15))
        self.train_btn = tk.Button(training_frame, text="🎯 Train Model", font=("Segoe UI", 12, "bold"),bg="#3498db", fg="white", padx=20, pady=10, command=self.train_model)
        self.train_btn.pack(pady=10)
        self.training_status = tk.Label(training_frame, text="Status: Not trained", font=("Segoe UI", 10), fg="#cccccc", bg="#1c1c1c")
        self.training_status.pack()
        log_frame = tk.LabelFrame(right_frame, text="Activity Log", font=("Segoe UI", 12, "bold"), fg="#00ff88", bg="#1c1c1c", padx=10, pady=10)
        log_frame.pack(fill="both", expand=True)
        self.log_text = scrolledtext.ScrolledText(log_frame, font=("Consolas", 9), bg="#0f0f0f", fg="#00ff88", height=10, wrap=tk.WORD)
        self.log_text.pack(fill="both", expand=True)
        self.update_reference_image()
        self.init_camera()
        self.update_video()
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def log(self, message):
        """
        Add a message to the log window and console.
        Args:
            message: The message to log
        """
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
        print(message)

    def init_camera(self):
        """
        Initialize the webcam capture with specified resolution.
        Attempts to open the default camera (index 0).
        """
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.log("✅ Camera initialized")

    def update_video(self):
        """
        Update the video feed display.
        Processes each frame to detect and draw hand landmarks.
        Called repeatedly to maintain real-time video feed.
        """
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)
                # Convert BGR to RGB for MediaPipe processing
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                # Detect hand landmarks
                results = hands.process(frame_rgb)
                
                # Draw landmarks if hands are detected
                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                
                # Convert and display the frame
                img = Image.fromarray(frame_rgb)
                img = img.resize((480, 360), Image.Resampling.LANCZOS)
                imgtk = ImageTk.PhotoImage(image=img)
                self.video_label.imgtk = imgtk
                self.video_label.configure(image=imgtk)
        
        # Schedule next frame update
        self.root.after(10, self.update_video)

    def append_to_csv(self, data, label):
        data_path, _ = self.get_paths()
        with open(data_path, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(data + [label])

    def pause_collection(self):
        """
        Pause the data collection process.
        Changes the state to paused and updates the UI accordingly.
        """
        if self.is_collecting and not self.is_paused:
            self.is_paused = True
            self.pause_btn.config(state="disabled")
            self.resume_btn.config(state="normal")
            self.log("⏸ Paused collection")

    def resume_collection(self):
        """
        Resume the paused data collection process.
        Changes the state to collecting and updates the UI accordingly.
        """
        if self.is_collecting and self.is_paused:
            self.is_paused = False
            self.pause_btn.config(state="normal")
            self.resume_btn.config(state="disabled")
            self.log("▶ Resumed collection")

    def collection_worker(self):
        """
        Worker thread function for collecting hand landmark data.
        Runs continuously until required samples are collected or stopped manually.
        Handles data collection, progress updates, and error conditions.
        """
        self.samples_collected = 0
        while self.is_collecting and self.samples_collected < self.samples_to_collect:
            if self.is_paused:
                self.root.after(100, lambda: None)
                continue
            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret:
                    frame = cv2.flip(frame, 1)
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = hands.process(frame_rgb)
                    
                    # Process detected hands (up to 2) and extract 126 coordinates
                    if results.multi_hand_landmarks:
                        left_hand_lm = [0.0] * 63
                        right_hand_lm = [0.0] * 63
                        for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                            handedness = results.multi_handedness[idx].classification[0].label
                            lm_coords = []
                            for lm in hand_landmarks.landmark:
                                lm_coords.extend([lm.x, lm.y, lm.z])
                            
                            if handedness == "Left":
                                left_hand_lm = lm_coords
                            elif handedness == "Right":
                                right_hand_lm = lm_coords
                        
                        combined_lm = left_hand_lm + right_hand_lm
                        self.append_to_csv(combined_lm, self.current_letter)
                        self.samples_collected += 1
                        progress = (self.samples_collected / self.samples_to_collect) * 100
                        self.progress_bar['value'] = progress
                        self.progress_label.config(text=f"Progress: {self.samples_collected}/{self.samples_to_collect}")
                        self.log(f"Collected sample {self.samples_collected}/{self.samples_to_collect} for '{self.current_letter}'")
                        if self.samples_collected >= self.samples_to_collect:
                            break
        self.is_collecting = False
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self.pause_btn.config(state="normal")
        self.resume_btn.config(state="disabled")
        self.log(f"✅ Collection complete for label '{self.current_letter}'")
        messagebox.showinfo("Success", f"Collected {self.samples_collected} samples for '{self.current_letter}'")

    def start_collection(self):
        """
        Start the data collection process.
        Validates input parameters and initializes the collection thread.
        Updates UI to reflect the collecting state.
        """
        letter = self.letter_entry.get().strip()
        if not letter:
            messagebox.showerror("Error", "Please enter a sign label (e.g. A, B, Hw)")
            return
        try:
            samples = int(self.samples_entry.get())
            if samples <= 0:
                raise ValueError()
        except:
            messagebox.showerror("Error", "Please enter a valid number of samples")
            return
        self.current_letter = letter
        self.samples_to_collect = samples
        self.is_collecting = True
        self.is_paused = False
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        self.pause_btn.config(state="normal")
        self.resume_btn.config(state="disabled")
        self.log(f"🎬 Starting collection for label '{letter}' ({samples} samples)")
        self.log("👋 Show your hand sign to the camera...")
        self.collecting_thread = threading.Thread(target=self.collection_worker, daemon=True)
        self.collecting_thread.start()

    def stop_collection(self):
        """
        Stop the data collection process.
        Updates the state and UI to reflect the stopped condition.
        """
        self.is_collecting = False
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self.pause_btn.config(state="normal")
        self.resume_btn.config(state="disabled")
        self.log("⏹ Collection stopped")

    def train_model(self):
        """
        Initiates the model training process in a separate thread.
        Handles data loading, model training, evaluation, and saving.
        Updates UI with progress and results.
        """
        self.log("🎯 Starting model training...")
        self.training_status.config(text="Status: Training...", fg="#f1c40f")
        self.train_btn.config(state="disabled")
        def train_worker():
            try:
                X, y = [], []
                data_path, model_path = self.get_paths()
                if not os.path.exists(data_path):
                    self.log(f"❌ No data file found at '{data_path}'! Collect data first.")
                    messagebox.showerror("Error", f"No data found for {self.selected_lang.get()}. Please collect data first.")
                    self.train_btn.config(state="normal")
                    self.training_status.config(text="Status: Failed", fg="#e74c3c")
                    return
                with open(data_path, "r") as f:
                    reader = csv.reader(f)
                    for row in reader:
                        if len(row) > 0:
                            X.append([float(val) for val in row[:-1]])
                            y.append(row[-1])
                if len(X) == 0:
                    self.log(f"❌ No data found in CSV file '{data_path}'!")
                    messagebox.showerror("Error", "CSV file is empty. Please collect data first.")
                    self.train_btn.config(state="normal")
                    self.training_status.config(text="Status: Failed", fg="#e74c3c")
                    return
                self.log(f"📊 Loaded {len(X)} samples")
                le = LabelEncoder()
                y_enc = le.fit_transform(y)
                X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42)
                self.log(f"📚 Training set: {len(X_train)} samples")
                self.log(f"📝 Test set: {len(X_test)} samples")
                model = MLPClassifier(hidden_layer_sizes=(100,), max_iter=500)
                model.fit(X_train, y_train)
                accuracy = model.score(X_test, y_test)
                self.log(f"✅ Model trained successfully!")
                self.log(f"📈 Accuracy: {accuracy * 100:.2f}%")
                with open(model_path, "wb") as f:
                    pickle.dump((model, le), f)
                self.log(f"💾 Model saved as '{model_path}'")
                self.training_status.config(text=f"Status: Trained (Accuracy: {accuracy * 100:.1f}%)", fg="#2ecc71")
                messagebox.showinfo("Success", f"Model trained successfully!\n\nAccuracy: {accuracy * 100:.2f}%\nSaved as: {model_path}")
            except Exception as e:
                self.log(f"❌ Training failed: {str(e)}")
                messagebox.showerror("Error", f"Training failed:\n{str(e)}")
                self.training_status.config(text="Status: Failed", fg="#e74c3c")
            finally:
                self.train_btn.config(state="normal")
        threading.Thread(target=train_worker, daemon=True).start()

    def on_closing(self):
        """
        Cleanup method called when closing the application.
        Releases camera resources and closes the window.
        """
        self.is_collecting = False
        if self.cap:
            self.cap.release()
        hands.close()
        self.root.destroy()

# Entry point of the application
if __name__ == "__main__":
    root = tk.Tk()
    app = TrainModelGUI(root)
    root.mainloop()
