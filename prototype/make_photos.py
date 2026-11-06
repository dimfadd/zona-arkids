"""Turn the flat 'coloured' sheets into believable phone photos for testing/demo."""
import sys
import numpy as np, cv2

rng = np.random.default_rng(7)


def crayon(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    colored = (hsv[..., 1] > 60) & (hsv[..., 2] > 60)
    h, w = colored.shape
    # directional streak noise
    n = rng.random((h, w)).astype(np.float32)
    k = np.zeros((1, 41), np.float32); k[0, :] = 1 / 41
    M = cv2.getRotationMatrix2D((20, 0), 0, 1)
    streak = cv2.filter2D(n, -1, k)
    streak = cv2.warpAffine(streak, cv2.getRotationMatrix2D((w / 2, h / 2), 28, 1.0), (w, h), borderMode=cv2.BORDER_REFLECT)
    streak = (streak - streak.mean()) / (streak.std() + 1e-6)
    speck = rng.random((h, w)) > 0.93
    out = img.astype(np.float32)
    lift = np.clip(0.22 * streak, -0.15, 0.35)[..., None]
    out = np.where(colored[..., None], out + (255 - out) * np.clip(lift, 0, 1) - out * np.clip(-lift, 0, 1) * 0.5, out)
    out[colored & speck] = out[colored & speck] * 0.4 + 255 * 0.6
    return np.clip(out, 0, 255).astype(np.uint8)


def photo(src, dst, out_w=1200, out_h=1600, quad=None, seed=0):
    img = cv2.imread(src)
    img = crayon(img)
    h, w = img.shape[:2]
    if quad is None:
        quad = [(170, 210), (1030, 175), (1110, 1470), (95, 1420)]
    Hm = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(quad))
    # wooden table background
    yy, xx = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
    grain = np.sin(xx * 0.018 + np.sin(yy * 0.004) * 3) * 0.5 + 0.5
    table = np.dstack([90 + 30 * grain, 120 + 35 * grain, 160 + 35 * grain]).astype(np.float32)
    warped = cv2.warpPerspective(img, Hm, (out_w, out_h), flags=cv2.INTER_AREA)
    mask = cv2.warpPerspective(np.full((h, w), 255, np.uint8), Hm, (out_w, out_h))
    # soft drop shadow
    sh = cv2.GaussianBlur(mask, (0, 0), 14).astype(np.float32) / 255
    sh = np.roll(sh, (14, 10), (0, 1))
    table *= (1 - 0.45 * sh[..., None])
    m = (mask.astype(np.float32) / 255)[..., None]
    comp = table * (1 - m) + warped.astype(np.float32) * m
    # lighting gradient + warm tint + noise
    light = 0.80 + 0.22 * (1 - (xx / out_w) * 0.6 - (yy / out_h) * 0.5)
    comp *= light[..., None]
    comp *= np.array([0.94, 0.98, 1.02])  # BGR warm
    comp += rng.normal(0, 3.5, comp.shape)
    comp = cv2.GaussianBlur(np.clip(comp, 0, 255).astype(np.uint8), (0, 0), 0.7)
    if dst.endswith(".jpg"):
        cv2.imwrite(dst, comp, [cv2.IMWRITE_JPEG_QUALITY, 82])
    else:
        cv2.imwrite(dst, comp)


if __name__ == "__main__":
    b = "build/"
    photo(b + "warna-sapi-colored.png", b + "photo-warna.png")
    photo(b + "warna-sapi-colored.png", b + "photo-warna.jpg")
    q2 = [(140, 180), (1060, 230), (1050, 1500), (120, 1450)]
    photo(b + "tebal-sapi-colored.png", b + "photo-tebal.png", quad=q2)
    photo(b + "tebal-sapi-colored.png", b + "photo-tebal.jpg", quad=q2)
    # test-only: strong keystone tilt, and a page rotated 90 degrees clockwise
    q_tilt = [(330, 380), (870, 360), (1150, 1500), (50, 1520)]
    photo(b + "warna-sapi-colored.png", b + "photo-warna-tilt.png", quad=q_tilt)
    q_rot = [(1140, 410), (1130, 1190), (60, 1210), (80, 380)]
    photo(b + "tebal-sapi-colored.png", b + "photo-tebal-rot.png", quad=q_rot)
    print("photos ok")
