import cv2
import dlib
import numpy as np
from scipy.spatial import distance as dist
import time

# To run this, you need to download:
# shape_predictor_68_face_landmarks.dat from dlib's model repository

def calculate_ear(eye):
    # Compute the euclidean distances between the two sets of
    # vertical eye landmarks (x, y)-coordinates
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])

    # Compute the euclidean distance between the horizontal
    # eye landmark (x, y)-coordinates
    C = dist.euclidean(eye[0], eye[3])

    # Compute the eye aspect ratio
    ear = (A + B) / (2.0 * C)
    return ear

# Thresholds
EAR_THRESHOLD = 0.25
CONSECUTIVE_FRAMES = 20

# Initialize dlib's face detector and landmark predictor
detector = dlib.get_frontal_face_detector()
# You must provide the path to the predictor file
try:
    predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")
except:
    print("Error: shape_predictor_68_face_landmarks.dat not found.")
    print("Please download it from: http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2")
    exit()

# Indices for eyes in 68-point model
(lStart, lEnd) = (42, 48)
(rStart, rEnd) = (36, 42)

# Start video capture
cap = cv2.VideoCapture(0)
counter = 0
alarm_on = False

print("Starting Driver Drowsiness Detection...")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    rects = detector(gray, 0)

    for rect in rects:
        shape = predictor(gray, rect)
        shape = np.array([[p.x, p.y] for p in shape.parts()])

        leftEye = shape[lStart:lEnd]
        rightEye = shape[rStart:rEnd]
        
        leftEAR = calculate_ear(leftEye)
        rightEAR = calculate_ear(rightEye)
        ear = (leftEAR + rightEAR) / 2.0

        # Visualize eyes
        leftEyeHull = cv2.convexHull(leftEye)
        rightEyeHull = cv2.convexHull(rightEye)
        cv2.drawContours(frame, [leftEyeHull], -1, (0, 255, 0), 1)
        cv2.drawContours(frame, [rightEyeHull], -1, (0, 255, 0), 1)

        if ear < EAR_THRESHOLD:
            counter += 1
            if counter >= CONSECUTIVE_FRAMES:
                cv2.putText(frame, "DROWSINESS ALERT!", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                # Here you would trigger an alarm sound
                # e.g., using winsound (Windows) or os.system('beep')
        else:
            counter = 0

        cv2.putText(frame, f"EAR: {ear:.2f}", (300, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

    cv2.imshow("Frame", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
