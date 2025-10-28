import cv2
import mediapipe as mp
import numpy as np
import tkinter as tk
from tkinter import messagebox
from tkinter import ttk
from PIL import Image, ImageTk
import threading
import time
import pickle
from googletrans import Translator
from gtts import gTTS
import os
import playsound
import colorsys

# ========== Load Model ==========
with open("asl(1)_landmarks_model.pkl", "rb") as f:
    model, le = pickle.load(f)

# ========== Translator ==========
translator = Translator()

def translate_sentence(sentence, target_lang="hi"):
    try:
        result = translator.translate(sentence, dest=target_lang)
        return result.text
    except Exception as e:
        return f"Translation error: {e}"

# ========== gTTS Speak ==========
def speak_multilang(text, lang="en"):
    def run():
        try:
            tts = gTTS(text=text, lang=lang)
            filename = "temp_tts.mp3"
            tts.save(filename)
            playsound.playsound(filename)
            try:
                os.remove(filename)
            except OSError:
                pass
        except Exception as e:
            print("TTS Error:", e)
    threading.Thread(target=run, daemon=True).start()

# ========== Mediapipe ==========
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

# ====== Window icon (set your path here) ======
ICON_PATH = r"C:\Users\91932\Downloads\ChatGPT Image Sep 10, 2025, 05_04_37 PM.png"
BACKGROUND_IMAGE_PATH = r"C:\Users\91932\OneDrive\Documents\hackaton c2c\1fb10de3-177a-45a7-bb9b-9ecc0aa2fdaf.jpg"
STARTUP_VIDEO_PATH = r"C:\Users\91932\Downloads\WhatsApp Video 2025-09-11 at 23.46.07.mp4" # set your startup video path here

def load_window_icon(win, path):
    try:
        if not path or not os.path.exists(path):
            return
        if path.lower().endswith(".ico"):
            win.iconbitmap(path)
        else:
            img = Image.open(path)
            photo = ImageTk.PhotoImage(img)
            win.iconphoto(False, photo)
            if not hasattr(win, "_icon_refs"):
                win._icon_refs = []
            win._icon_refs.append(photo)
    except Exception as e:
        print("Failed to load window icon:", e)

# --------- Live window class ----------
class LiveWindow:
    def __init__(self, master=None):
        self._created_root = master is None
        if self._created_root:
            self.win = tk.Tk()
        else:
            self.win = tk.Toplevel(master)

        self.win.title("SilentVoice - ASL Interpreter (Live)")
        load_window_icon(self.win, ICON_PATH)
        self.win.geometry("1200x800")
        # use a solid background color (no transparency)
        self.base_bg = "#0f0f0f"
        self.win.configure(bg=self.base_bg)

        # ====== Top Title Bar ======
        self.header = tk.Label(
            self.win,
            text="SilentVoice",
            font=("Segoe UI", 28, "bold"),
            fg="#ffffff",
            bg="#1c1c1c",
            pady=12
        )
        self.header.pack(fill=tk.X)
        # start hue for RGB cycling
        self._title_hue = 0.0
        self.animate_title()

        # ====== Main Content (Camera + Sidebar) ======
        self.content_frame = tk.Frame(self.win, bg=self.base_bg)
        self.content_frame.pack(fill="both", expand=True, padx=10, pady=10)

        # Camera Feed (LEFT side)
        CAM_BG_W, CAM_BG_H = 800, 600
        self.cam_frame = tk.Frame(self.content_frame, bg="#1c1c1c", bd=4, relief="ridge", width=CAM_BG_W, height=CAM_BG_H)
        self.cam_frame.pack(side=tk.LEFT, padx=10, pady=10)
        self.cam_frame.pack_propagate(False)

        self.bg_photo = None
        try:
            if os.path.exists(BACKGROUND_IMAGE_PATH):
                bg_img = Image.open(BACKGROUND_IMAGE_PATH).convert("RGB")
                bg_img = bg_img.resize((CAM_BG_W, CAM_BG_H), Image.Resampling.LANCZOS)
                self.bg_photo = ImageTk.PhotoImage(bg_img)
                self.bg_label = tk.Label(self.cam_frame, image=self.bg_photo)
                self.bg_label.place(x=0, y=0, relwidth=1, relheight=1)
        except Exception as e:
            print("Background load error:", e)

        # 🔥 Camera feed covers entire frame
        self.lmain = tk.Label(self.cam_frame, bg="#0f0f0f")
        self.lmain.pack(fill="both", expand=True)

        # Sidebar (RIGHT side)
        self.sidebar = tk.Frame(self.content_frame, bg=self.base_bg, width=700)
        self.sidebar.pack(side=tk.RIGHT, fill="y", padx=10, pady=10)

        self.label_pred = tk.Label(self.sidebar, text="Letter: -", font=("Segoe UI", 40, "bold"),
                                   fg="#00ff88", bg=self.base_bg, anchor="w")
        self.label_pred.pack(pady=(20,8), fill="x", padx=10)

        self.label_word = tk.Label(self.sidebar, text="Word:", font=("Segoe UI", 22),
                                   fg="#f1c40f", bg=self.base_bg, wraplength=660, justify="left", anchor="w")
        self.label_word.pack(pady=(8,20), fill="x", padx=10)

        self.label_fps = tk.Label(self.sidebar, text="FPS: 0", font=("Segoe UI", 16),
                                  fg="#ff5555", bg=self.base_bg, anchor="w")
        self.label_fps.pack(pady=10, fill="x", padx=10)

        # ===== Bottom Control Bar =====
        self.bottom_bar = tk.Frame(self.win, bg=self.base_bg, pady=10)
        self.bottom_bar.pack(fill=tk.X, side=tk.BOTTOM)

        self.btn_start = self.make_button(self.bottom_bar, "■ End", "#c0392b", self.toggle_camera)
        self.btn_start.pack(side=tk.LEFT, padx=12)
        self.btn_speak = self.make_button(self.bottom_bar, "🔊 Speak", "#e67e22", self.speak_word)
        self.btn_speak.pack(side=tk.LEFT, padx=12)
        self.btn_backspace = self.make_button(self.bottom_bar, "⌫ Backspace", "#7f8c8d", self.remove_last_char)
        self.btn_backspace.pack(side=tk.LEFT, padx=12)
        self.btn_pause = self.make_button(self.bottom_bar, "⏸ Pause", "#8e44ad", self.toggle_pause)
        self.btn_pause.pack(side=tk.LEFT, padx=12)

        self.languages = {
            "English": "en", "Hindi": "hi", "Spanish": "es", "French": "fr",
            "Chinese": "zh-cn", "German": "de", "Arabic": "ar", "Tamil": "ta",
            "Telugu": "te", "Russian": "ru", "Marathi": "mr"
        }
        self.selected_lang = tk.StringVar(self.win)
        self.selected_lang.set("English")
        lang_menu = tk.OptionMenu(self.bottom_bar, self.selected_lang, *self.languages.keys())
        lang_menu.config(font=("Segoe UI", 14), bg="#2980b9", fg="white", relief="flat", width=12)
        lang_menu.pack(side=tk.RIGHT, padx=20, pady=4)

        self.acc_panel = tk.Frame(self.bottom_bar, bg=self.base_bg)
        self.acc_panel.pack(side=tk.RIGHT, padx=(10,20), pady=4)
        
        self.label_acc = tk.Label(self.acc_panel, text="Accuracy", font=("Segoe UI", 10, "bold"),
                                  fg="#cccccc", bg=self.base_bg)
        self.label_acc.pack(anchor="e")

        style = ttk.Style()
        try:
            style.theme_use('default')
        except Exception:
            pass
        style.configure("Acc.Horizontal.TProgressbar", troughcolor="#2c2c2c", background="#2ecc71", thickness=12)
        self.acc_bar = ttk.Progressbar(self.acc_panel, orient="horizontal", mode="determinate",
                                       maximum=100, style="Acc.Horizontal.TProgressbar", length=220)
        self.acc_bar.pack(anchor="e", pady=(4,0))

        # Camera + Variables
        self.cap = None
        self.running = True
        self.paused = False
        self.prev_time = 0
        self.pred_history = []
        self.max_history = 5
        self.last_letter = ""
        self.word = ""
        self.letter_hold_count = 0
        self.hold_threshold = 10

        self.win.bind('<space>', self.add_space)
        self.win.bind('<BackSpace>', self.remove_last_char)
        self.win.protocol("WM_DELETE_WINDOW", self.on_closing)

        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        self.update_frame()

    def make_button(self, parent, text, color, command):
        return tk.Button(parent, text=text, font=("Segoe UI", 14, "bold"),
                         bg=color, fg="white", relief="flat",
                         activebackground="#2c2c2c", padx=15, pady=8, command=command)

    def add_space(self, event=None):
        self.word += " "
        self.label_word.config(text=f"Word: {self.word}")

    def remove_last_char(self, event=None):
        if self.word:
            self.word = self.word[:-1]
            self.label_word.config(text=f"Word: {self.word}")

    def toggle_camera(self):
        self.running = False
        if self.cap:
            self.cap.release()
        sentence = self.word.strip()
        if sentence:
            self.speak_sentence(sentence)
        self.win.destroy()

    def toggle_pause(self):
        if not self.running:
            return
        self.paused = not self.paused
        if self.paused:
            self.btn_pause.config(text="▶ Resume", bg="#16a085")
        else:
            self.btn_pause.config(text="⏸ Pause", bg="#8e44ad")

    def speak_word(self):
        sentence = self.word.strip()
        if sentence:
            self.speak_sentence(sentence)
        else:
            messagebox.showinfo("Speak", "No word detected to speak.")

    def speak_sentence(self, sentence):
        lang_code = self.languages[self.selected_lang.get()]
        translated_sentence = translate_sentence(sentence, lang_code) if lang_code != "en" else sentence
        self.label_word.config(text=f"Word: {translated_sentence}")
        speak_multilang(translated_sentence, lang=lang_code)

    def get_stable_prediction(self, pred_class):
        self.pred_history.append(pred_class)
        if len(self.pred_history) > self.max_history:
            self.pred_history.pop(0)
        return max(set(self.pred_history), key=self.pred_history.count)

    def update_frame(self):
        if not self.running:
            return

        if self.paused:
            self.win.after(10, self.update_frame)
            return

        ret, frame = self.cap.read()
        if ret:
            frame = cv2.flip(frame, 1)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(frame_rgb)

            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                    lm_list = []
                    for lm in hand_landmarks.landmark:
                        lm_list.extend([lm.x, lm.y, lm.z])

                    try:
                        proba = model.predict_proba([lm_list])[0]
                        pred_idx = np.argmax(proba)
                        letter = le.inverse_transform([pred_idx])[0]
                        confidence = proba[pred_idx] * 100
                    except Exception:
                        letter = ""
                        confidence = 0.0

                    stable_letter = self.get_stable_prediction(letter) if letter else ""
                    self.label_pred.config(text=f"Letter: {stable_letter}")

                    if confidence > 80:
                        color = "#2ecc71"
                    elif confidence > 50:
                        color = "#f1c40f"
                    else:
                        color = "#e74c3c"
                    
                    self.label_acc.config(text=f"Accuracy: {confidence:.2f}%", fg=color)
                    try:
                        self.acc_bar['value'] = max(0.0, min(100.0, confidence))
                    except Exception:
                        pass

                    if stable_letter == self.last_letter:
                        self.letter_hold_count += 1
                    else:
                        self.letter_hold_count = 0
                        self.last_letter = stable_letter

                    if self.letter_hold_count == self.hold_threshold and stable_letter:
                        self.word += stable_letter
                        self.label_word.config(text=f"Word: {self.word}")
            else:
                try:
                    self.acc_bar['value'] = 0
                except Exception:
                    pass

            curr_time = time.time()
            fps = 1 / (curr_time - self.prev_time + 1e-6)
            self.prev_time = curr_time
            self.label_fps.config(text=f"FPS: {int(fps)}")

            # 🔥 Resize frame to cover full cam_frame
            img = Image.fromarray(frame_rgb)
            w = self.cam_frame.winfo_width()
            h = self.cam_frame.winfo_height()
            if w > 1 and h > 1:
                img = img.resize((w, h), Image.Resampling.LANCZOS)

            imgtk = ImageTk.PhotoImage(image=img)
            self.lmain.imgtk = imgtk
            self.lmain.configure(image=imgtk)

        self.win.after(10, self.update_frame)

    def on_closing(self):
        self.running = False
        if self.cap:
            self.cap.release()
        hands.close()
        self.win.destroy()

    # animate title color (HSV -> RGB cycling)
    def animate_title(self):
        try:
            r, g, b = colorsys.hsv_to_rgb(self._title_hue, 1.0, 1.0)
            hexcol = '#%02x%02x%02x' % (int(r * 255), int(g * 255), int(b * 255))
            self.header.config(fg=hexcol)
            self._title_hue += 0.008
            if self._title_hue >= 1.0:
                self._title_hue -= 1.0
        except Exception:
            pass
        self.win.after(50, self.animate_title)

# --------- Startup window (with dynamic video background) ----------
class StartupWindow:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("SilentVoice - Launcher")
        load_window_icon(self.root, ICON_PATH)
        self.root.geometry("600x400")
        self.root.configure(bg="#121212")

        # background video label (fills window)
        self.bg_label = tk.Label(self.root, bd=0)
        self.bg_label.place(x=0, y=0, relwidth=1, relheight=1)

        # attempt to open startup video
        self._cap = None
        try:
            if STARTUP_VIDEO_PATH and os.path.exists(STARTUP_VIDEO_PATH):
                self._cap = cv2.VideoCapture(STARTUP_VIDEO_PATH)
                if not self._cap.isOpened():
                    self._cap = None
        except Exception:
            self._cap = None

        # fallback: if no video, keep solid background (previous title will show)
        # overlay UI (will appear above bg_label)
        # title = tk.Label(self.root, text="SILENTVOICE", font=("Segoe UI", 32, "bold"),
        #                  fg="white", bg="#121212")
        # title.place(relx=0.5, rely=0.18, anchor="center")

        # subtitle = tk.Label(self.root, text="The Symphony of Aphonics", font=("Segoe UI", 16),
        #                     fg="#cccccc", bg="#121212")
        # subtitle.place(relx=0.5, rely=0.30, anchor="center")

        start_btn = tk.Button(self.root, text="▶ Start Live Interpreter", font=("Segoe UI", 16, "bold"),
                              bg="#27ae60", fg="white", padx=20, pady=10, command=self.open_live)
        start_btn.place(relx=0.5, rely=0.80, anchor="center")

        # info = tk.Label(self.root, text="Press Start to open the live interpreter window.", fg="#aaaaaa", bg="#121212")
        # info.place(relx=0.5, rely=0.70, anchor="center")

        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

        # start video loop if available
        if self._cap:
            self._video_running = True
            self._update_startup_video()
        else:
            # show a static background color/image if you want; keep bg_label empty for solid bg
            pass

        self.root.mainloop()

    def _update_startup_video(self):
        if not self._video_running or not self._cap:
            return
        ret, frame = self._cap.read()
        if not ret:
            # loop video
            try:
                self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self._cap.read()
            except Exception:
                ret = False

        if ret:
            # convert BGR to RGB
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            # resize to current window size
            w = max(1, self.root.winfo_width())
            h = max(1, self.root.winfo_height())
            try:
                frame = cv2.resize(frame, (w, h), interpolation=cv2.INTER_LINEAR)
            except Exception:
                pass
            img = Image.fromarray(frame)
            photo = ImageTk.PhotoImage(img)
            # keep reference to avoid GC
            self.bg_label.imgtk = photo
            self.bg_label.configure(image=photo)
            # ensure bg_label is at back
            self.bg_label.lower()

        # schedule next frame
        self.root.after(30, self._update_startup_video)

    def open_live(self):
        try:
            # stop and release startup video
            if hasattr(self, "_video_running"):
                self._video_running = False
            if self._cap:
                try:
                    self._cap.release()
                except:
                    pass
            self.root.destroy()
        except:
            pass
        LiveWindow(None)

    def on_close(self):
        try:
            if hasattr(self, "_video_running"):
                self._video_running = False
            if self._cap:
                try:
                    self._cap.release()
                except:
                    pass
        except:
            pass
        try:
            hands.close()
        except:
            pass
        self.root.destroy()

if __name__ == "__main__":
    StartupWindow()