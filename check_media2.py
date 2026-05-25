import cv2
import numpy as np

img = cv2.imread("/Users/mohitgandhi/.gemini/antigravity-ide/brain/dcff643c-93bf-4cb2-b4e8-7cec27aef5e1/media__1779710546069.png")
if img is not None:
    print("media__1779710546069.png shape:", img.shape)
    print("Min:", np.min(img, axis=(0, 1)))
    print("Max:", np.max(img, axis=(0, 1)))
    print("Mean:", np.mean(img, axis=(0, 1)))
    # Count light pixels
    print("Light pixels (>200 all):", np.sum(np.all(img > 200, axis=2)))
    # Count dark pixels
    print("Dark pixels (<50 all):", np.sum(np.all(img < 50, axis=2)))
else:
    print("Could not load media__1779710546069.png")
