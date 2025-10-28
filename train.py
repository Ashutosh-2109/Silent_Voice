import cv2
import mediapipe as mp
import csv
import os
import pickle
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

DATA_FILE = "asl_landmarks_data.csv"
MODEL_FILE = "asl(1)_landmarks_model.pkl"

# 1. Collect Data
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print("Press ESC anytime to stop collecting data.")

def append_to_csv(data, label, filename=DATA_FILE):
    with open(filename, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(data + [label])

while True:
    letter_to_collect = input("Enter the letter to collect (A-Z): ").upper()
    samples = int(input(f"How many samples for {letter_to_collect}? "))
    collected = 0

    while collected < samples:
        ret, frame = cap.read()
        frame = cv2.flip(frame, 1)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(frame_rgb)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                lm_list = []
                for lm in hand_landmarks.landmark:
                    lm_list.extend([lm.x, lm.y, lm.z])
                append_to_csv(lm_list, letter_to_collect)
                collected += 1
                print(f"Collected {collected}/{samples} for letter {letter_to_collect}")

        cv2.imshow("Collecting Landmarks", frame)
        if cv2.waitKey(1) & 0xFF == 27:
            break

    cont = input("Collect another letter? (y/n): ").lower()
    if cont != 'y':
        break

cap.release()
cv2.destroyAllWindows()

print("✅ Data collection complete!")

# 2. Load all data from CSV
X, y = [], []
if os.path.exists(DATA_FILE):
    with open(DATA_FILE, "r") as f:
        reader = csv.reader(f)
        for row in reader:
            X.append([float(val) for val in row[:-1]])
            y.append(row[-1])
else:
    print("No data found in CSV!")

# 3. Train Model
le = LabelEncoder()
y_enc = le.fit_transform(y)
X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42)

model = MLPClassifier(hidden_layer_sizes=(100,), max_iter=500)
model.fit(X_train, y_train)
print("Model trained!")

# Save model and label encoder
with open(MODEL_FILE, "wb") as f:
    pickle.dump((model, le), f)

print(f"Model saved as {MODEL_FILE}")