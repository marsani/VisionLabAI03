"""
Flask Web Application: Visual Studio Segmentasi Citra Digital (Praktikum 05)
Menyediakan antarmuka web interaktif dalam satu menu terpadu untuk:
- Thresholding Studio (Global, Otsu, Adaptive, Live Histogram)
- Interactive Region Growing (Canvas click to pick seed, dynamic tolerance)
- Pemisahan Objek Latar Belakang (HSV Color Masking, Morfologi, GrabCut)
- Deteksi & Analisis Objek (Contour, Bounding Box, Centroid, Morfometri)
"""

import os
import io
import time
import base64
from collections import deque
from flask import Flask, render_template, request, jsonify, send_from_directory
import cv2
import numpy as np
from scipy.ndimage import convolve

app = Flask(__name__, static_folder='static', template_folder='templates')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
SAMPLE_DIR = os.path.join(PARENT_DIR, "sample_images")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper: encode OpenCV image to base64 jpeg/png
def encode_image(img, ext=".png"):
    is_success, buffer = cv2.imencode(ext, img)
    if not is_success:
        return ""
    return f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

# Helper: get image array from path or upload
def get_image(img_source):
    if not img_source:
        img_source = "bimodal_coins.png"

    # Cek di uploads terlebih dahulu
    upload_path = os.path.join(UPLOAD_DIR, img_source)
    if os.path.exists(upload_path):
        return cv2.imread(upload_path)

    # Cek di sample_images
    sample_path = os.path.join(SAMPLE_DIR, img_source)
    if os.path.exists(sample_path):
        return cv2.imread(sample_path)

    # Fallback jika full path
    if os.path.exists(img_source):
        return cv2.imread(img_source)

    return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/samples', methods=['GET'])
def get_samples():
    samples = []
    if os.path.exists(SAMPLE_DIR):
        for fname in sorted(os.listdir(SAMPLE_DIR)):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg')):
                fpath = os.path.join(SAMPLE_DIR, fname)
                img = cv2.imread(fpath)
                if img is not None:
                    h, w = img.shape[:2]
                    # Create thumbnail
                    thumb = cv2.resize(img, (120, int(120 * h / w)))
                    samples.append({
                        "id": fname,
                        "name": fname.replace(".png", "").replace("_", " ").title(),
                        "thumb": encode_image(thumb),
                        "width": w,
                        "height": h
                    })
    return jsonify({"samples": samples})

@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = f"upload_{len(os.listdir(UPLOAD_DIR))}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    file.save(filepath)

    img = cv2.imread(filepath)
    if img is None:
        return jsonify({"error": "Format citra tidak valid"}), 400

    h, w = img.shape[:2]
    thumb = cv2.resize(img, (120, int(120 * h / w)))
    return jsonify({
        "success": True,
        "id": filename,
        "name": file.filename,
        "thumb": encode_image(thumb),
        "width": w,
        "height": h
    })

@app.route('/api/threshold', methods=['POST'])
def process_threshold():
    data = request.json or {}
    img_id = data.get('image_id', 'bimodal_coins.png')
    method = data.get('method', 'otsu')  # binary, binary_inv, trunc, tozero, otsu, adaptive_mean, adaptive_gaussian
    thresh_val = int(data.get('threshold', 127))
    block_size = int(data.get('block_size', 15))
    if block_size % 2 == 0:
        block_size += 1
    c_val = int(data.get('c', 4))
    apply_blur = bool(data.get('apply_blur', True))

    img = get_image(img_id)
    if img is None:
        return jsonify({"error": "Citra tidak ditemukan"}), 404

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()

    # Hitung histogram grayscale
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).ravel().tolist()

    proc_gray = cv2.GaussianBlur(gray, (5, 5), 0) if apply_blur else gray

    calculated_thresh = thresh_val

    if method == 'binary':
        _, res = cv2.threshold(proc_gray, thresh_val, 255, cv2.THRESH_BINARY)
    elif method == 'binary_inv':
        _, res = cv2.threshold(proc_gray, thresh_val, 255, cv2.THRESH_BINARY_INV)
    elif method == 'trunc':
        _, res = cv2.threshold(proc_gray, thresh_val, 255, cv2.THRESH_TRUNC)
    elif method == 'tozero':
        _, res = cv2.threshold(proc_gray, thresh_val, 255, cv2.THRESH_TOZERO)
    elif method == 'otsu':
        ret, res = cv2.threshold(proc_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        calculated_thresh = round(ret, 1)
    elif method == 'adaptive_mean':
        res = cv2.adaptiveThreshold(proc_gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, block_size, c_val)
    elif method == 'adaptive_gaussian':
        res = cv2.adaptiveThreshold(proc_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, block_size, c_val)
    else:
        return jsonify({"error": "Metode tidak dikenali"}), 400

    return jsonify({
        "original": encode_image(img),
        "result": encode_image(res),
        "histogram": hist,
        "calculated_threshold": calculated_thresh,
        "method": method
    })

@app.route('/api/region_growing', methods=['POST'])
def process_region_growing():
    data = request.json or {}
    img_id = data.get('image_id', 'shapes_noisy.png')
    seed_x = int(data.get('seed_x', 120))
    seed_y = int(data.get('seed_y', 120))
    threshold = int(data.get('threshold', 15))
    connectivity = int(data.get('connectivity', 8))
    dynamic_mean = bool(data.get('dynamic_mean', True))

    img = get_image(img_id)
    if img is None:
        return jsonify({"error": "Citra tidak ditemukan"}), 404

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()
    h, w = gray.shape

    seed_x = max(0, min(w - 1, seed_x))
    seed_y = max(0, min(h - 1, seed_y))

    # Algoritma Region Growing BFS
    visited = np.zeros((h, w), dtype=bool)
    mask = np.zeros((h, w), dtype=np.uint8)

    if connectivity == 4:
        neighbors = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    else:
        neighbors = [(-1, -1), (-1, 0), (-1, 1),
                     (0, -1),           (0, 1),
                     (1, -1),  (1, 0),  (1, 1)]

    queue = deque([(seed_x, seed_y)])
    visited[seed_y, seed_x] = True
    mask[seed_y, seed_x] = 255

    seed_intensity = int(gray[seed_y, seed_x])
    region_sum = float(seed_intensity)
    pixel_count = 1

    while queue:
        cx, cy = queue.popleft()
        ref_val = (region_sum / pixel_count) if dynamic_mean else float(seed_intensity)

        for dx, dy in neighbors:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                if not visited[ny, nx]:
                    visited[ny, nx] = True
                    val = float(gray[ny, nx])
                    if abs(val - ref_val) <= threshold:
                        mask[ny, nx] = 255
                        queue.append((nx, ny))
                        region_sum += val
                        pixel_count += 1

    # Buat overlay berwarna cyan/kuning pada citra asli
    overlay = img.copy() if len(img.shape) == 3 else cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    colored_highlight = np.zeros_like(overlay)
    colored_highlight[mask == 255] = [0, 230, 255]  # Cyan-yellow highlight

    # Blending area tersegmentasi
    blended = cv2.addWeighted(overlay, 0.55, colored_highlight, 0.45, 0)
    overlay = np.where(mask[:, :, np.newaxis] == 255, blended, overlay)

    # Tambahkan garis kontur tepi hijau agar batas wilayah sangat jelas
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(overlay, contours, -1, (0, 255, 0), 2)

    # Gambar titik seed
    cv2.circle(overlay, (seed_x, seed_y), 5, (0, 0, 255), -1)
    cv2.circle(overlay, (seed_x, seed_y), 7, (255, 255, 255), 2)

    total_pixels = h * w
    percentage = round((pixel_count / total_pixels) * 100, 2)

    return jsonify({
        "original": encode_image(img),
        "mask": encode_image(mask),
        "overlay": encode_image(overlay),
        "seed": {"x": seed_x, "y": seed_y, "intensity": seed_intensity},
        "pixel_count": pixel_count,
        "percentage": percentage
    })

@app.route('/api/color_segmentation', methods=['POST'])
def process_color_segmentation():
    data = request.json or {}
    img_id = data.get('image_id', 'fruits_color.png')
    h_min = int(data.get('h_min', 0))
    h_max = int(data.get('h_max', 10))
    s_min = int(data.get('s_min', 100))
    s_max = int(data.get('s_max', 255))
    v_min = int(data.get('v_min', 100))
    v_max = int(data.get('v_max', 255))
    is_wrap_red = bool(data.get('is_wrap_red', False))

    apply_open = bool(data.get('morph_open', True))
    apply_close = bool(data.get('morph_close', True))
    kernel_size = int(data.get('kernel_size', 5))

    img = get_image(img_id)
    if img is None:
        return jsonify({"error": "Citra tidak ditemukan"}), 404

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    if is_wrap_red:
        # Merah terbelah pada rentang 0-10 dan 160-180
        mask1 = cv2.inRange(hsv, np.array([0, s_min, v_min]), np.array([10, s_max, v_max]))
        mask2 = cv2.inRange(hsv, np.array([160, s_min, v_min]), np.array([180, s_max, v_max]))
        raw_mask = cv2.bitwise_or(mask1, mask2)
    else:
        lower = np.array([h_min, s_min, v_min])
        upper = np.array([h_max, s_max, v_max])
        raw_mask = cv2.inRange(hsv, lower, upper)

    clean_mask = raw_mask.copy()
    if kernel_size > 1:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
        if apply_open:
            clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_OPEN, kernel)
        if apply_close:
            clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_CLOSE, kernel)

    # Ekstraksi objek pada latar belakang hitam dan putih
    extracted_black = cv2.bitwise_and(img, img, mask=clean_mask)
    white_bg = np.full_like(img, 255)
    extracted_white = np.where(clean_mask[:, :, np.newaxis] == 255, img, white_bg)

    return jsonify({
        "original": encode_image(img),
        "raw_mask": encode_image(raw_mask),
        "clean_mask": encode_image(clean_mask),
        "extracted_black": encode_image(extracted_black),
        "extracted_white": encode_image(extracted_white),
        "pixel_count": int(np.count_nonzero(clean_mask))
    })

@app.route('/api/grabcut', methods=['POST'])
def process_grabcut():
    data = request.json or {}
    img_id = data.get('image_id', 'fruits_color.png')
    rect = data.get('rect', [65, 100, 170, 220])  # [x, y, w, h]
    iter_count = int(data.get('iter_count', 5))

    img = get_image(img_id)
    if img is None:
        return jsonify({"error": "Citra tidak ditemukan"}), 404

    h, w = img.shape[:2]
    rx, ry, rw, rh = rect
    rx = max(0, min(w - 2, rx))
    ry = max(0, min(h - 2, ry))
    rw = max(1, min(w - rx - 1, rw))
    rh = max(1, min(h - ry - 1, rh))

    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(img, mask, (rx, ry, rw, rh), bgd_model, fgd_model, iterCount=iter_count, mode=cv2.GC_INIT_WITH_RECT)
        bin_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype('uint8')
    except Exception as e:
        return jsonify({"error": f"GrabCut error: {str(e)}"}), 500

    white_bg = np.full_like(img, 255)
    extracted_white = np.where(bin_mask[:, :, np.newaxis] == 255, img, white_bg)

    # Gambarkan ROI Bounding Box pada citra asli
    img_roi = img.copy()
    cv2.rectangle(img_roi, (rx, ry), (rx + rw, ry + rh), (0, 255, 0), 2)
    cv2.putText(img_roi, "ROI GrabCut", (rx, max(15, ry - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return jsonify({
        "original_roi": encode_image(img_roi),
        "mask": encode_image(bin_mask),
        "extracted_white": encode_image(extracted_white)
    })

@app.route('/api/object_detection', methods=['POST'])
def process_object_detection():
    data = request.json or {}
    img_id = data.get('image_id', 'bimodal_coins.png')
    min_area = float(data.get('min_area', 500))
    blur_ksize = int(data.get('blur_ksize', 7))
    if blur_ksize % 2 == 0:
        blur_ksize += 1
    method = data.get('method', 'otsu')  # otsu or adaptive

    img = get_image(img_id)
    if img is None:
        return jsonify({"error": "Citra tidak ditemukan"}), 404

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()
    blurred = cv2.GaussianBlur(gray, (blur_ksize, blur_ksize), 0)

    if method == 'otsu':
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 4)

    # Pembersihan Morfologi
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    annotated = img.copy() if len(img.shape) == 3 else cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    detected_objects = []

    obj_id = 1
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue

        perimeter = cv2.arcLength(cnt, True)
        M = cv2.moments(cnt)
        cx = int(M["m10"] / M["m00"]) if M["m00"] != 0 else 0
        cy = int(M["m01"] / M["m00"]) if M["m00"] != 0 else 0

        bx, by, bw, bh = cv2.boundingRect(cnt)
        circularity = (4 * np.pi * area) / (perimeter ** 2) if perimeter > 0 else 0

        # Anotasi visual
        cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), (255, 140, 0), 2)
        cv2.drawContours(annotated, [cnt], -1, (0, 230, 0), 2)
        cv2.circle(annotated, (cx, cy), 4, (0, 0, 255), -1)
        cv2.putText(annotated, f"#{obj_id}", (bx, max(15, by - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)

        detected_objects.append({
            "id": obj_id,
            "centroid_x": cx,
            "centroid_y": cy,
            "area": round(area, 1),
            "perimeter": round(perimeter, 1),
            "circularity": round(circularity, 3),
            "bbox": [bx, by, bw, bh]
        })
        obj_id += 1

    return jsonify({
        "original": encode_image(img),
        "binary_mask": encode_image(cleaned),
        "annotated": encode_image(annotated),
        "total_objects": len(detected_objects),
        "objects": detected_objects
    })

EDGE_METHODS_METADATA = {
    "Canny": {
        "method": "Canny",
        "characteristics": "Menghasilkan garis tepi yang paling halus, tipis, kontinu (menyambung), dan bersih dari derau (noise).",
        "pros_cons": "Terbaik untuk deteksi objek presisi, tetapi proses komputasinya lebih rumit."
    },
    "Sobel": {
        "method": "Sobel",
        "characteristics": "Garis tepi yang dihasilkan cukup jelas dan tebal, terutama pada sudut diagonal.",
        "pros_cons": "Bagus untuk mendeteksi pola bentuk dasar objek, namun sensitif terhadap gangguan noise."
    },
    "Prewitt": {
        "method": "Prewitt",
        "characteristics": "Mirip dengan Sobel, tetapi garis tepi yang dihasilkan cenderung sedikit lebih kaku dan kurang tajam dibanding Sobel.",
        "pros_cons": "Sangat mudah diimplementasikan untuk mendeteksi tepi vertikal dan horizontal."
    },
    "Roberts": {
        "method": "Roberts",
        "characteristics": "Menghasilkan garis tepi yang sangat sederhana dan hanya mendeteksi perubahan intensitas yang sangat tajam.",
        "pros_cons": "Proses komputasinya paling cepat, tetapi hasilnya sering kali kurang detail atau putus-putus."
    }
}

@app.route('/api/edge_detection', methods=['POST'])
def process_edge_detection():
    data = request.json or {}
    img_id = data.get('image_id', 'bimodal_coins.png')
    mode = data.get('mode', 'compare_all')  # 'compare_all' or 'single'
    method = data.get('method', 'canny').lower()  # canny, sobel, prewitt, roberts
    canny_th1 = int(data.get('canny_th1', 100))
    canny_th2 = int(data.get('canny_th2', 200))
    sobel_ksize = int(data.get('sobel_ksize', 3))
    if sobel_ksize not in [1, 3, 5, 7]:
        sobel_ksize = 3
    apply_blur = bool(data.get('apply_blur', False))
    blur_ksize = int(data.get('blur_ksize', 3))
    if blur_ksize % 2 == 0:
        blur_ksize += 1
    bin_thresh = int(data.get('binary_threshold', 0))  # 0: grayscale gradient, >0: binary

    img = get_image(img_id)
    if img is None:
        return jsonify({"error": "Citra tidak ditemukan"}), 404

    bgr = img if len(img.shape) == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    if apply_blur and blur_ksize > 1:
        proc_gray = cv2.GaussianBlur(gray, (blur_ksize, blur_ksize), 0)
    else:
        proc_gray = gray

    total_pixels = gray.shape[0] * gray.shape[1]

    def create_overlay(base_bgr, edge_uint8, color=(0, 255, 0)):
        overlay = base_bgr.copy()
        mask = (edge_uint8 > bin_thresh) if bin_thresh > 0 else (edge_uint8 > 50)
        overlay[mask] = color
        return overlay

    # Kernel Prewitt
    kernel_prewitt_x = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=float)
    kernel_prewitt_y = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=float)

    # Kernel Roberts
    kernel_roberts_x = np.array([[1, 0], [0, -1]], dtype=float)
    kernel_roberts_y = np.array([[0, 1], [-1, 0]], dtype=float)

    if mode == 'compare_all':
        # 1. Canny
        t0 = time.perf_counter()
        canny_edges = cv2.Canny(proc_gray, threshold1=canny_th1, threshold2=canny_th2)
        t_canny = round((time.perf_counter() - t0) * 1000, 2)
        canny_cnt = int(np.count_nonzero(canny_edges))

        # 2. Sobel
        t0 = time.perf_counter()
        sobel_x = cv2.Sobel(proc_gray, cv2.CV_64F, 1, 0, ksize=sobel_ksize)
        sobel_y = cv2.Sobel(proc_gray, cv2.CV_64F, 0, 1, ksize=sobel_ksize)
        sobel_edges = np.hypot(sobel_x, sobel_y)
        sobel_uint8 = np.clip(sobel_edges, 0, 255).astype(np.uint8)
        if bin_thresh > 0:
            _, sobel_uint8 = cv2.threshold(sobel_uint8, bin_thresh, 255, cv2.THRESH_BINARY)
        t_sobel = round((time.perf_counter() - t0) * 1000, 2)
        sobel_cnt = int(np.count_nonzero(sobel_uint8 > (0 if bin_thresh > 0 else 50)))

        # 3. Prewitt
        t0 = time.perf_counter()
        prewitt_x = convolve(proc_gray.astype(float), kernel_prewitt_x)
        prewitt_y = convolve(proc_gray.astype(float), kernel_prewitt_y)
        prewitt_edges = np.hypot(prewitt_x, prewitt_y)
        prewitt_uint8 = np.clip(prewitt_edges, 0, 255).astype(np.uint8)
        if bin_thresh > 0:
            _, prewitt_uint8 = cv2.threshold(prewitt_uint8, bin_thresh, 255, cv2.THRESH_BINARY)
        t_prewitt = round((time.perf_counter() - t0) * 1000, 2)
        prewitt_cnt = int(np.count_nonzero(prewitt_uint8 > (0 if bin_thresh > 0 else 50)))

        # 4. Roberts
        t0 = time.perf_counter()
        roberts_x = convolve(proc_gray.astype(float), kernel_roberts_x)
        roberts_y = convolve(proc_gray.astype(float), kernel_roberts_y)
        roberts_edges = np.hypot(roberts_x, roberts_y)
        roberts_uint8 = np.clip(roberts_edges, 0, 255).astype(np.uint8)
        if bin_thresh > 0:
            _, roberts_uint8 = cv2.threshold(roberts_uint8, bin_thresh, 255, cv2.THRESH_BINARY)
        t_roberts = round((time.perf_counter() - t0) * 1000, 2)
        roberts_cnt = int(np.count_nonzero(roberts_uint8 > (0 if bin_thresh > 0 else 50)))

        return jsonify({
            "mode": "compare_all",
            "original": encode_image(bgr),
            "original_gray": encode_image(gray),
            "table": [
                {
                    "method": "Canny",
                    "characteristics": EDGE_METHODS_METADATA["Canny"]["characteristics"],
                    "pros_cons": EDGE_METHODS_METADATA["Canny"]["pros_cons"],
                    "image": encode_image(canny_edges),
                    "overlay": encode_image(create_overlay(bgr, canny_edges, (0, 255, 0))),
                    "time_ms": t_canny,
                    "edge_pixels": canny_cnt,
                    "edge_percentage": round((canny_cnt / total_pixels) * 100, 2)
                },
                {
                    "method": "Sobel",
                    "characteristics": EDGE_METHODS_METADATA["Sobel"]["characteristics"],
                    "pros_cons": EDGE_METHODS_METADATA["Sobel"]["pros_cons"],
                    "image": encode_image(sobel_uint8),
                    "overlay": encode_image(create_overlay(bgr, sobel_uint8, (0, 215, 255))),
                    "time_ms": t_sobel,
                    "edge_pixels": sobel_cnt,
                    "edge_percentage": round((sobel_cnt / total_pixels) * 100, 2)
                },
                {
                    "method": "Prewitt",
                    "characteristics": EDGE_METHODS_METADATA["Prewitt"]["characteristics"],
                    "pros_cons": EDGE_METHODS_METADATA["Prewitt"]["pros_cons"],
                    "image": encode_image(prewitt_uint8),
                    "overlay": encode_image(create_overlay(bgr, prewitt_uint8, (255, 105, 180))),
                    "time_ms": t_prewitt,
                    "edge_pixels": prewitt_cnt,
                    "edge_percentage": round((prewitt_cnt / total_pixels) * 100, 2)
                },
                {
                    "method": "Roberts",
                    "characteristics": EDGE_METHODS_METADATA["Roberts"]["characteristics"],
                    "pros_cons": EDGE_METHODS_METADATA["Roberts"]["pros_cons"],
                    "image": encode_image(roberts_uint8),
                    "overlay": encode_image(create_overlay(bgr, roberts_uint8, (255, 200, 0))),
                    "time_ms": t_roberts,
                    "edge_pixels": roberts_cnt,
                    "edge_percentage": round((roberts_cnt / total_pixels) * 100, 2)
                }
            ]
        })
    else:
        # Single Method Detailed Mode
        comp_x_img = None
        comp_y_img = None
        t0 = time.perf_counter()

        if method == 'canny':
            edge_res = cv2.Canny(proc_gray, threshold1=canny_th1, threshold2=canny_th2)
            meta = EDGE_METHODS_METADATA["Canny"]
            color = (0, 255, 0)
        elif method == 'sobel':
            sobel_x = cv2.Sobel(proc_gray, cv2.CV_64F, 1, 0, ksize=sobel_ksize)
            sobel_y = cv2.Sobel(proc_gray, cv2.CV_64F, 0, 1, ksize=sobel_ksize)
            sobel_edges = np.hypot(sobel_x, sobel_y)
            edge_res = np.clip(sobel_edges, 0, 255).astype(np.uint8)
            comp_x_img = cv2.convertScaleAbs(sobel_x)
            comp_y_img = cv2.convertScaleAbs(sobel_y)
            if bin_thresh > 0:
                _, edge_res = cv2.threshold(edge_res, bin_thresh, 255, cv2.THRESH_BINARY)
            meta = EDGE_METHODS_METADATA["Sobel"]
            color = (0, 215, 255)
        elif method == 'prewitt':
            prewitt_x = convolve(proc_gray.astype(float), kernel_prewitt_x)
            prewitt_y = convolve(proc_gray.astype(float), kernel_prewitt_y)
            prewitt_edges = np.hypot(prewitt_x, prewitt_y)
            edge_res = np.clip(prewitt_edges, 0, 255).astype(np.uint8)
            comp_x_img = np.clip(np.abs(prewitt_x), 0, 255).astype(np.uint8)
            comp_y_img = np.clip(np.abs(prewitt_y), 0, 255).astype(np.uint8)
            if bin_thresh > 0:
                _, edge_res = cv2.threshold(edge_res, bin_thresh, 255, cv2.THRESH_BINARY)
            meta = EDGE_METHODS_METADATA["Prewitt"]
            color = (255, 105, 180)
        elif method == 'roberts':
            roberts_x = convolve(proc_gray.astype(float), kernel_roberts_x)
            roberts_y = convolve(proc_gray.astype(float), kernel_roberts_y)
            roberts_edges = np.hypot(roberts_x, roberts_y)
            edge_res = np.clip(roberts_edges, 0, 255).astype(np.uint8)
            comp_x_img = np.clip(np.abs(roberts_x), 0, 255).astype(np.uint8)
            comp_y_img = np.clip(np.abs(roberts_y), 0, 255).astype(np.uint8)
            if bin_thresh > 0:
                _, edge_res = cv2.threshold(edge_res, bin_thresh, 255, cv2.THRESH_BINARY)
            meta = EDGE_METHODS_METADATA["Roberts"]
            color = (255, 200, 0)
        else:
            return jsonify({"error": f"Metode '{method}' tidak dikenali"}), 400

        t_elapsed = round((time.perf_counter() - t0) * 1000, 2)
        edge_cnt = int(np.count_nonzero(edge_res > (0 if bin_thresh > 0 else 50)))

        return jsonify({
            "mode": "single",
            "method": meta["method"],
            "characteristics": meta["characteristics"],
            "pros_cons": meta["pros_cons"],
            "original": encode_image(bgr),
            "edge_result": encode_image(edge_res),
            "overlay_result": encode_image(create_overlay(bgr, edge_res, color)),
            "comp_x": encode_image(comp_x_img) if comp_x_img is not None else None,
            "comp_y": encode_image(comp_y_img) if comp_y_img is not None else None,
            "time_ms": t_elapsed,
            "edge_pixels": edge_cnt,
            "edge_percentage": round((edge_cnt / total_pixels) * 100, 2)
        })

# ================= 06. CLUSTERING (K-MEANS & FUZZY C-MEANS) =================
CLUSTERING_METADATA = {
    "kmeans": {
        "method": "K-Means Clustering",
        "type": "Crisp / Hard Partitioning",
        "characteristics": "Mengelompokkan piksel berdasarkan kedekatan jarak fitur Euclidean secara tegas (setiap piksel hanya memiliki 1 label kluster tunggal).",
        "pros_cons": "Sangat cepat, efisien, dan konvergen stabil; namun batas segmentasi cenderung kaku dan rentan terhadap sensitivitas inisialisasi pusat cluster."
    },
    "fcm": {
        "method": "Fuzzy C-Means (FCM)",
        "type": "Soft / Fuzzy Partitioning",
        "characteristics": "Mengelompokkan piksel dengan derajat keanggotaan probabilitas (u_ij antara 0 dan 1), ideal untuk piksel ambigu pada batas objek.",
        "pros_cons": "Sangat baik memodelkan ketidakpastian dan gradasi warna alami; komputasi sedikit lebih tinggi karena menghitung matriks keanggotaan pada setiap iterasi."
    }
}

def helper_kmeans(img_bgr, k, color_space='bgr', max_iter=20):
    t0 = time.perf_counter()
    h, w = img_bgr.shape[:2]
    
    if color_space == 'lab':
        feat = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    elif color_space == 'hsv':
        feat = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    elif color_space == 'gray':
        feat = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)[:, :, np.newaxis]
    else:
        feat = img_bgr.copy()
        
    pixels = feat.reshape((-1, feat.shape[2])).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, max_iter, 0.2)
    ret, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_RANDOM_CENTERS)
    
    labels = labels.flatten()
    orig_pixels = img_bgr.reshape((-1, 3))
    seg_img = np.zeros_like(orig_pixels, dtype=np.uint8)
    palette = []
    
    for i in range(k):
        mask_i = (labels == i)
        count_i = int(np.count_nonzero(mask_i))
        pct_i = round((count_i / (h * w)) * 100, 2)
        if count_i > 0:
            mean_bgr = np.mean(orig_pixels[mask_i], axis=0).astype(np.uint8)
        else:
            mean_bgr = np.array([128, 128, 128], dtype=np.uint8)
            
        seg_img[mask_i] = mean_bgr
        hex_color = f"#{int(mean_bgr[2]):02x}{int(mean_bgr[1]):02x}{int(mean_bgr[0]):02x}"
        palette.append({
            "cluster_id": i + 1,
            "hex": hex_color,
            "rgb": [int(mean_bgr[2]), int(mean_bgr[1]), int(mean_bgr[0])],
            "pixel_count": count_i,
            "percentage": pct_i
        })
        
    seg_img = seg_img.reshape((h, w, 3))
    labels_2d = labels.reshape((h, w))
    elapsed = round((time.perf_counter() - t0) * 1000, 2)
    return seg_img, labels_2d, palette, elapsed

def helper_fcm(img_bgr, c, m=2.0, color_space='bgr', max_iter=20, epsilon=0.01):
    t0 = time.perf_counter()
    h, w = img_bgr.shape[:2]
    N = h * w
    
    if color_space == 'lab':
        feat = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    elif color_space == 'hsv':
        feat = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    elif color_space == 'gray':
        feat = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)[:, :, np.newaxis]
    else:
        feat = img_bgr.copy()
        
    pixels_norm = feat.reshape((-1, feat.shape[2])).astype(np.float32) / 255.0
    
    np.random.seed(42)
    u = np.random.dirichlet(np.ones(c), size=N).T  # shape: (c, N)
    
    for _ in range(max_iter):
        u_m = u ** m
        denom = np.sum(u_m, axis=1, keepdims=True) + 1e-8
        centers = (u_m @ pixels_norm) / denom
        
        diff = pixels_norm[None, :, :] - centers[:, None, :]
        dist = np.linalg.norm(diff, axis=2) + 1e-8
        
        inv_dist = dist ** (-2.0 / (m - 1.0))
        u_new = inv_dist / (np.sum(inv_dist, axis=0, keepdims=True) + 1e-8)
        
        if np.linalg.norm(u_new - u) < epsilon:
            break
        u = u_new
        
    labels = np.argmax(u, axis=0)
    orig_pixels = img_bgr.reshape((-1, 3))
    seg_img = np.zeros_like(orig_pixels, dtype=np.uint8)
    palette = []
    
    for i in range(c):
        mask_i = (labels == i)
        count_i = int(np.count_nonzero(mask_i))
        pct_i = round((count_i / N) * 100, 2)
        if count_i > 0:
            mean_bgr = np.mean(orig_pixels[mask_i], axis=0).astype(np.uint8)
        else:
            mean_bgr = np.array([128, 128, 128], dtype=np.uint8)
            
        seg_img[mask_i] = mean_bgr
        hex_color = f"#{int(mean_bgr[2]):02x}{int(mean_bgr[1]):02x}{int(mean_bgr[0]):02x}"
        palette.append({
            "cluster_id": i + 1,
            "hex": hex_color,
            "rgb": [int(mean_bgr[2]), int(mean_bgr[1]), int(mean_bgr[0])],
            "pixel_count": count_i,
            "percentage": pct_i
        })
        
    seg_img = seg_img.reshape((h, w, 3))
    labels_2d = labels.reshape((h, w))
    
    # Uncertainty map (1 - max membership)
    max_u = np.max(u, axis=0).reshape((h, w))
    uncert = np.uint8(np.clip((1.0 - max_u) * c * 255.0, 0, 255))
    uncert_map = cv2.applyColorMap(uncert, cv2.COLORMAP_JET)
    
    elapsed = round((time.perf_counter() - t0) * 1000, 2)
    return seg_img, labels_2d, palette, elapsed, uncert_map

@app.route('/api/clustering', methods=['POST'])
def process_clustering():
    data = request.json or {}
    img_id = data.get('image_id', 'fruits_color.png')
    mode = data.get('mode', 'compare_both')  # 'compare_both' or 'single'
    method = data.get('method', 'kmeans').lower()  # 'kmeans' or 'fcm'
    k = max(2, min(8, int(data.get('k', 4))))
    m = max(1.1, min(3.0, float(data.get('m', 2.0))))
    max_iter = max(5, min(50, int(data.get('max_iter', 20))))
    color_space = data.get('color_space', 'bgr').lower()
    selected_cluster = int(data.get('selected_cluster', -1))

    img = get_image(img_id)
    if img is None:
        return jsonify({"error": "Citra tidak ditemukan"}), 404

    bgr = img if len(img.shape) == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    if mode == 'compare_both':
        km_seg, km_labels, km_palette, km_time = helper_kmeans(bgr, k, color_space, max_iter)
        fcm_seg, fcm_labels, fcm_palette, fcm_time, fcm_uncert = helper_fcm(bgr, k, m, color_space, max_iter)

        return jsonify({
            "mode": "compare_both",
            "original": encode_image(bgr),
            "k": k,
            "kmeans": {
                "segmented": encode_image(km_seg),
                "palette": km_palette,
                "time_ms": km_time,
                "characteristics": CLUSTERING_METADATA["kmeans"]["characteristics"],
                "pros_cons": CLUSTERING_METADATA["kmeans"]["pros_cons"]
            },
            "fcm": {
                "segmented": encode_image(fcm_seg),
                "uncertainty_map": encode_image(fcm_uncert),
                "palette": fcm_palette,
                "time_ms": fcm_time,
                "characteristics": CLUSTERING_METADATA["fcm"]["characteristics"],
                "pros_cons": CLUSTERING_METADATA["fcm"]["pros_cons"]
            }
        })
    else:
        # Single detailed exploration
        if method == 'fcm':
            seg, labels_2d, palette, elapsed, uncert = helper_fcm(bgr, k, m, color_space, max_iter)
            uncert_img = encode_image(uncert)
            meta = CLUSTERING_METADATA["fcm"]
        else:
            seg, labels_2d, palette, elapsed = helper_kmeans(bgr, k, color_space, max_iter)
            uncert_img = None
            meta = CLUSTERING_METADATA["kmeans"]

        extracted_img = None
        if selected_cluster >= 0 and selected_cluster < k:
            mask = (labels_2d == selected_cluster).astype(np.uint8) * 255
            extracted = cv2.bitwise_and(bgr, bgr, mask=mask)
            extracted_img = encode_image(extracted)

        return jsonify({
            "mode": "single",
            "method": meta["method"],
            "type": meta["type"],
            "characteristics": meta["characteristics"],
            "pros_cons": meta["pros_cons"],
            "original": encode_image(bgr),
            "segmented": encode_image(seg),
            "palette": palette,
            "uncertainty_map": uncert_img,
            "extracted_cluster": extracted_img,
            "time_ms": elapsed,
            "k": k
        })

if __name__ == '__main__':
    # Running locally on port 5050
    print("Membuka server Visual Studio Segmentasi Citra di http://localhost:5050 ...")
    app.run(host='0.0.0.0', port=5050, debug=False)
