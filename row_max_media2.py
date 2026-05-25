import cv2
import numpy as np

img = cv2.imread("/Users/mohitgandhi/.gemini/antigravity-ide/brain/dcff643c-93bf-4cb2-b4e8-7cec27aef5e1/media__1779710546069.png")
h, w, c = img.shape
print(f"media2 shape: {w}x{h}")
for row_idx in range(4):
    y_start = int(row_idx * (h / 4))
    y_end = int(min((row_idx + 1) * (h / 4), h))
    slice_img = img[y_start:y_end, :]
    print(f"Row {row_idx+1}: min={np.min(slice_img)}, max={np.max(slice_img)}, mean={np.mean(slice_img)}")
