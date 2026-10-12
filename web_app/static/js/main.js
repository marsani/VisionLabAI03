/**
 * Visual Studio Segmentasi Citra Digital - Client Logic (Vanilla JS)
 * Praktikum 05: Komputer Visi & NLP
 */

// Global State
const state = {
    activeImageId: 'bimodal_coins.png',
    activeImageUrl: '',
    activeImageWidth: 600,
    activeImageHeight: 450,
    activeTab: 'tabThreshold',
    regionSeed: { x: 120, y: 120 },
    regionCanvasImg: null,
    edgeMode: 'compare',
    edgeDataCache: null,
    clusterMode: 'compare',
    clusterDataCache: null
};

// DOM Elements
const elements = {
    // Navigation
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    sampleCarousel: document.getElementById('sampleCarousel'),
    fileInput: document.getElementById('fileInput'),
    activeImagePreview: document.getElementById('activeImagePreview'),
    activeImageMeta: document.getElementById('activeImageMeta'),

    // Tab 1: Thresholding
    thresholdMethodSelect: document.getElementById('thresholdMethodSelect'),
    globalSliderGroup: document.getElementById('globalSliderGroup'),
    adaptiveParamsGroup: document.getElementById('adaptiveParamsGroup'),
    globalThresholdSlider: document.getElementById('globalThresholdSlider'),
    globalThresholdVal: document.getElementById('globalThresholdVal'),
    blockSizeSlider: document.getElementById('blockSizeSlider'),
    blockSizeVal: document.getElementById('blockSizeVal'),
    cConstSlider: document.getElementById('cConstSlider'),
    cConstVal: document.getElementById('cConstVal'),
    threshBlurToggle: document.getElementById('threshBlurToggle'),
    histogramCanvas: document.getElementById('histogramCanvas'),
    histLegendText: document.getElementById('histLegendText'),
    btnRunThreshold: document.getElementById('btnRunThreshold'),
    threshOriginalImg: document.getElementById('threshOriginalImg'),
    threshResultImg: document.getElementById('threshResultImg'),
    threshResultTag: document.getElementById('threshResultTag'),

    // Tab 2: Region Growing
    regionThresholdSlider: document.getElementById('regionThresholdSlider'),
    regionThresholdVal: document.getElementById('regionThresholdVal'),
    dynamicMeanToggle: document.getElementById('dynamicMeanToggle'),
    btnRunRegionGrowing: document.getElementById('btnRunRegionGrowing'),
    regionInteractiveCanvas: document.getElementById('regionInteractiveCanvas'),
    regionMaskImg: document.getElementById('regionMaskImg'),
    seedCoordText: document.getElementById('seedCoordText'),
    seedIntensityText: document.getElementById('seedIntensityText'),
    regionPixelCountText: document.getElementById('regionPixelCountText'),

    // Tab 3: Color Segmentation & GrabCut
    subTabHsvBtn: document.getElementById('subTabHsvBtn'),
    subTabGrabCutBtn: document.getElementById('subTabGrabCutBtn'),
    hsvControlsGroup: document.getElementById('hsvControlsGroup'),
    grabcutControlsGroup: document.getElementById('grabcutControlsGroup'),
    hMinSlider: document.getElementById('hMinSlider'),
    hMaxSlider: document.getElementById('hMaxSlider'),
    sMinSlider: document.getElementById('sMinSlider'),
    vMinSlider: document.getElementById('vMinSlider'),
    hMinVal: document.getElementById('hMinVal'),
    hMaxVal: document.getElementById('hMaxVal'),
    sMinVal: document.getElementById('sMinVal'),
    vMinVal: document.getElementById('vMinVal'),
    wrapRedToggle: document.getElementById('wrapRedToggle'),
    morphOpenCheck: document.getElementById('morphOpenCheck'),
    morphCloseCheck: document.getElementById('morphCloseCheck'),
    btnRunHsv: document.getElementById('btnRunHsv'),
    gcX: document.getElementById('gcX'),
    gcY: document.getElementById('gcY'),
    gcW: document.getElementById('gcW'),
    gcH: document.getElementById('gcH'),
    gcIterSlider: document.getElementById('gcIterSlider'),
    gcIterVal: document.getElementById('gcIterVal'),
    btnRunGrabcut: document.getElementById('btnRunGrabcut'),
    colorMaskImg: document.getElementById('colorMaskImg'),
    colorExtractedImg: document.getElementById('colorExtractedImg'),

    // Tab 4: Object Detection
    minAreaSlider: document.getElementById('minAreaSlider'),
    minAreaVal: document.getElementById('minAreaVal'),
    blurKsizeSlider: document.getElementById('blurKsizeSlider'),
    blurKsizeVal: document.getElementById('blurKsizeVal'),
    btnRunDetection: document.getElementById('btnRunDetection'),
    detectAnnotatedImg: document.getElementById('detectAnnotatedImg'),
    detectMaskImg: document.getElementById('detectMaskImg'),
    totalObjectsCount: document.getElementById('totalObjectsCount'),
    objectsTableBody: document.getElementById('objectsTableBody'),

    // Tab 5: Edge Detection
    subTabEdgeCompare: document.getElementById('subTabEdgeCompare'),
    subTabEdgeSingle: document.getElementById('subTabEdgeSingle'),
    edgeSingleMethodGroup: document.getElementById('edgeSingleMethodGroup'),
    edgeMethodSelect: document.getElementById('edgeMethodSelect'),
    cannyControlsGroup: document.getElementById('cannyControlsGroup'),
    cannyTh1Slider: document.getElementById('cannyTh1Slider'),
    cannyTh1Val: document.getElementById('cannyTh1Val'),
    cannyTh2Slider: document.getElementById('cannyTh2Slider'),
    cannyTh2Val: document.getElementById('cannyTh2Val'),
    sobelControlsGroup: document.getElementById('sobelControlsGroup'),
    sobelKsizeSelect: document.getElementById('sobelKsizeSelect'),
    edgeBinaryThSlider: document.getElementById('edgeBinaryThSlider'),
    edgeBinaryThVal: document.getElementById('edgeBinaryThVal'),
    edgeBlurToggle: document.getElementById('edgeBlurToggle'),
    edgeBlurKsizeWrapper: document.getElementById('edgeBlurKsizeWrapper'),
    edgeBlurKsizeSlider: document.getElementById('edgeBlurKsizeSlider'),
    edgeBlurKsizeVal: document.getElementById('edgeBlurKsizeVal'),
    fastestMethodBadge: document.getElementById('fastestMethodBadge'),
    fastestMethodSub: document.getElementById('fastestMethodSub'),
    btnRunEdgeDetection: document.getElementById('btnRunEdgeDetection'),
    edgeCompareView: document.getElementById('edgeCompareView'),
    edgeSingleView: document.getElementById('edgeSingleView'),
    edgeStatusBadge: document.getElementById('edgeStatusBadge'),
    imgEdgeCanny: document.getElementById('imgEdgeCanny'),
    imgEdgeSobel: document.getElementById('imgEdgeSobel'),
    imgEdgePrewitt: document.getElementById('imgEdgePrewitt'),
    imgEdgeRoberts: document.getElementById('imgEdgeRoberts'),
    timeBadgeCanny: document.getElementById('timeBadgeCanny'),
    timeBadgeSobel: document.getElementById('timeBadgeSobel'),
    timeBadgePrewitt: document.getElementById('timeBadgePrewitt'),
    timeBadgeRoberts: document.getElementById('timeBadgeRoberts'),
    densityCanny: document.getElementById('densityCanny'),
    densitySobel: document.getElementById('densitySobel'),
    densityPrewitt: document.getElementById('densityPrewitt'),
    densityRoberts: document.getElementById('densityRoberts'),
    tableTimeCanny: document.getElementById('tableTimeCanny'),
    tableTimeSobel: document.getElementById('tableTimeSobel'),
    tableTimePrewitt: document.getElementById('tableTimePrewitt'),
    tableTimeRoberts: document.getElementById('tableTimeRoberts'),
    tablePixelsCanny: document.getElementById('tablePixelsCanny'),
    tablePixelsSobel: document.getElementById('tablePixelsSobel'),
    tablePixelsPrewitt: document.getElementById('tablePixelsPrewitt'),
    tablePixelsRoberts: document.getElementById('tablePixelsRoberts'),
    singleMethodHeading: document.getElementById('singleMethodHeading'),
    singleTimeBadge: document.getElementById('singleTimeBadge'),
    singleCharacteristicsText: document.getElementById('singleCharacteristicsText'),
    singleProsConsText: document.getElementById('singleProsConsText'),
    singleEdgeImg: document.getElementById('singleEdgeImg'),
    singleOverlayImg: document.getElementById('singleOverlayImg'),
    compXImg: document.getElementById('compXImg'),
    compYImg: document.getElementById('compYImg'),
    directionalComponentsBlock: document.getElementById('directionalComponentsBlock'),

    // Tab 6: Clustering (K-Means & FCM)
    subTabClusterCompare: document.getElementById('subTabClusterCompare'),
    subTabClusterSingle: document.getElementById('subTabClusterSingle'),
    clusterMethodSelectGroup: document.getElementById('clusterMethodSelectGroup'),
    clusterMethodSelect: document.getElementById('clusterMethodSelect'),
    clusterKSlider: document.getElementById('clusterKSlider'),
    clusterKVal: document.getElementById('clusterKVal'),
    fcmMControlGroup: document.getElementById('fcmMControlGroup'),
    fcmMSlider: document.getElementById('fcmMSlider'),
    fcmMVal: document.getElementById('fcmMVal'),
    clusterIterSlider: document.getElementById('clusterIterSlider'),
    clusterIterVal: document.getElementById('clusterIterVal'),
    clusterColorSpaceSelect: document.getElementById('clusterColorSpaceSelect'),
    clusterExtractGroup: document.getElementById('clusterExtractGroup'),
    clusterExtractSelect: document.getElementById('clusterExtractSelect'),
    btnRunClustering: document.getElementById('btnRunClustering'),
    clusterCompareView: document.getElementById('clusterCompareView'),
    clusterSingleView: document.getElementById('clusterSingleView'),
    clusterStatusBadge: document.getElementById('clusterStatusBadge'),
    imgClusterKMeans: document.getElementById('imgClusterKMeans'),
    timeBadgeKMeans: document.getElementById('timeBadgeKMeans'),
    kmPaletteBar: document.getElementById('kmPaletteBar'),
    imgClusterFCM: document.getElementById('imgClusterFCM'),
    timeBadgeFCM: document.getElementById('timeBadgeFCM'),
    fcmPaletteBar: document.getElementById('fcmPaletteBar'),
    fcmUncertaintyImg: document.getElementById('fcmUncertaintyImg'),
    clusterSingleHeading: document.getElementById('clusterSingleHeading'),
    clusterSingleTimeBadge: document.getElementById('clusterSingleTimeBadge'),
    clusterMetaCard: document.getElementById('clusterMetaCard'),
    clusterCharacteristicsText: document.getElementById('clusterCharacteristicsText'),
    clusterProsConsText: document.getElementById('clusterProsConsText'),
    clusterSingleOrigImg: document.getElementById('clusterSingleOrigImg'),
    clusterSingleSegImg: document.getElementById('clusterSingleSegImg'),
    clusterExtractedBlock: document.getElementById('clusterExtractedBlock'),
    clusterExtractedImg: document.getElementById('clusterExtractedImg'),
    clusterPaletteTableBody: document.getElementById('clusterPaletteTableBody')
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSampleImages();
    initUpload();
    initThresholdControls();
    initRegionGrowingControls();
    initColorControls();
    initDetectionControls();
    initEdgeControls();
    initClusterControls();
});

// ================= TABS SWITCHING =================
function initTabs() {
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');

            state.activeTab = targetId;
            executeCurrentTab();
        });
    });
}

function executeCurrentTab() {
    if (state.activeTab === 'tabThreshold') {
        runThresholding();
    } else if (state.activeTab === 'tabRegion') {
        runRegionGrowing();
    } else if (state.activeTab === 'tabColor') {
        if (!elements.hsvControlsGroup.classList.contains('hidden')) {
            runHsvSegmentation();
        } else {
            runGrabCut();
        }
    } else if (state.activeTab === 'tabDetect') {
        runObjectDetection();
    } else if (state.activeTab === 'tabEdge') {
        runEdgeDetection();
    } else if (state.activeTab === 'tabCluster') {
        runClustering();
    }
}

// ================= SAMPLE IMAGES & UPLOAD =================
async function initSampleImages() {
    try {
        const res = await fetch('/api/samples');
        const data = await res.json();
        if (data.samples && data.samples.length > 0) {
            renderSampleCarousel(data.samples);
            selectSample(data.samples[0]);
        }
    } catch (err) {
        console.error('Gagal memuat sampel citra:', err);
    }
}

function renderSampleCarousel(samples) {
    elements.sampleCarousel.innerHTML = '';
    samples.forEach(sample => {
        const item = document.createElement('div');
        item.className = `sample-item ${sample.id === state.activeImageId ? 'active' : ''}`;
        item.id = `sample-${sample.id.replace('.', '_')}`;
        item.innerHTML = `
            <img src="${sample.thumb}" alt="${sample.name}" class="sample-thumb">
            <div class="sample-meta">
                <div class="sample-name">${sample.name}</div>
                <div class="sample-dim">${sample.width}x${sample.height} px</div>
            </div>
        `;
        item.addEventListener('click', () => selectSample(sample));
        elements.sampleCarousel.appendChild(item);
    });
}

function selectSample(sample) {
    state.activeImageId = sample.id;
    state.activeImageWidth = sample.width;
    state.activeImageHeight = sample.height;

    // Update active highlight in sidebar
    document.querySelectorAll('.sample-item').forEach(el => el.classList.remove('active'));
    const currentEl = document.getElementById(`sample-${sample.id.replace('.', '_')}`);
    if (currentEl) currentEl.classList.add('active');

    elements.activeImagePreview.src = sample.thumb;
    elements.activeImageMeta.textContent = `${sample.name} (${sample.width}x${sample.height})`;

    // Smart Preset Selector based on chosen image
    if (sample.id === 'uneven_light.png') {
        elements.thresholdMethodSelect.value = 'adaptive_gaussian';
        elements.thresholdMethodSelect.dispatchEvent(new Event('change'));
    } else if (sample.id === 'fruits_color.png') {
        // Switch recommended tab to color or set preset
        applyColorPreset('red');
    }

    executeCurrentTab();
}

function initUpload() {
    elements.fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                const newSample = {
                    id: data.id,
                    name: data.name,
                    thumb: data.thumb,
                    width: data.width,
                    height: data.height
                };
                selectSample(newSample);
            } else {
                alert('Gagal mengunggah citra: ' + (data.error || 'Unknown'));
            }
        } catch (err) {
            console.error('Error saat upload:', err);
        }
    });
}

// ================= TAB 1: THRESHOLDING LOGIC =================
function initThresholdControls() {
    elements.thresholdMethodSelect.addEventListener('change', () => {
        const method = elements.thresholdMethodSelect.value;
        if (method.startsWith('adaptive')) {
            elements.globalSliderGroup.classList.add('hidden');
            elements.adaptiveParamsGroup.classList.remove('hidden');
        } else if (method === 'otsu') {
            elements.globalSliderGroup.classList.add('hidden');
            elements.adaptiveParamsGroup.classList.add('hidden');
        } else {
            elements.globalSliderGroup.classList.remove('hidden');
            elements.adaptiveParamsGroup.classList.add('hidden');
        }
        runThresholding();
    });

    elements.globalThresholdSlider.addEventListener('input', (e) => {
        elements.globalThresholdVal.textContent = e.target.value;
        runThresholding();
    });

    elements.blockSizeSlider.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (val % 2 === 0) val += 1;
        elements.blockSizeVal.textContent = val;
        runThresholding();
    });

    elements.cConstSlider.addEventListener('input', (e) => {
        elements.cConstVal.textContent = e.target.value;
        runThresholding();
    });

    elements.threshBlurToggle.addEventListener('change', runThresholding);
    elements.btnRunThreshold.addEventListener('click', runThresholding);
}

async function runThresholding() {
    const payload = {
        image_id: state.activeImageId,
        method: elements.thresholdMethodSelect.value,
        threshold: parseInt(elements.globalThresholdSlider.value),
        block_size: parseInt(elements.blockSizeSlider.value),
        c: parseInt(elements.cConstSlider.value),
        apply_blur: elements.threshBlurToggle.checked
    };

    try {
        const res = await fetch('/api/threshold', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.result) {
            elements.threshOriginalImg.src = data.original;
            elements.threshResultImg.src = data.result;
            elements.threshResultTag.textContent = `Hasil: ${data.method.toUpperCase()} (T=${data.calculated_threshold})`;

            if (data.histogram) {
                renderHistogram(data.histogram, data.calculated_threshold);
            }
        }
    } catch (err) {
        console.error('Error thresholding:', err);
    }
}

function renderHistogram(histData, calculatedT) {
    const canvas = elements.histogramCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...histData);
    const barWidth = width / 256;

    // Draw bars
    ctx.fillStyle = '#6366f1';
    for (let i = 0; i < 256; i++) {
        const barHeight = (histData[i] / maxVal) * (height - 15);
        ctx.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth), barHeight);
    }

    // Draw threshold line
    if (calculatedT !== undefined && calculatedT >= 0) {
        const lineX = (calculatedT / 255) * width;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, height);
        ctx.stroke();

        elements.histLegendText.textContent = `Nilai Ambang Terpilih (T) = ${calculatedT}`;
    }
}

// ================= TAB 2: REGION GROWING LOGIC =================
function initRegionGrowingControls() {
    elements.regionThresholdSlider.addEventListener('input', (e) => {
        elements.regionThresholdVal.textContent = e.target.value;
    });

    elements.regionThresholdSlider.addEventListener('change', runRegionGrowing);
    elements.dynamicMeanToggle.addEventListener('change', runRegionGrowing);
    document.querySelectorAll('input[name="connectivity"]').forEach(radio => {
        radio.addEventListener('change', runRegionGrowing);
    });
    elements.btnRunRegionGrowing.addEventListener('click', runRegionGrowing);

    // Canvas click event for Seed Point Selection
    const canvas = elements.regionInteractiveCanvas;
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        state.regionSeed = { x, y };
        elements.seedCoordText.textContent = `(${x}, ${y})`;
        runRegionGrowing();
    });
}

async function runRegionGrowing() {
    const connVal = document.querySelector('input[name="connectivity"]:checked')?.value || '8';
    const payload = {
        image_id: state.activeImageId,
        seed_x: state.regionSeed.x,
        seed_y: state.regionSeed.y,
        threshold: parseInt(elements.regionThresholdSlider.value),
        connectivity: parseInt(connVal),
        dynamic_mean: elements.dynamicMeanToggle.checked
    };

    try {
        const res = await fetch('/api/region_growing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.overlay) {
            elements.regionMaskImg.src = data.mask;
            elements.seedIntensityText.textContent = `${data.seed.intensity}`;
            elements.regionPixelCountText.textContent = `${data.pixel_count} px (${data.percentage}%)`;
            elements.seedCoordText.textContent = `(${data.seed.x}, ${data.seed.y})`;

            // Draw overlay on interactive canvas
            drawCanvasOverlay(data.overlay, data.seed);
        }
    } catch (err) {
        console.error('Error region growing:', err);
    }
}

function drawCanvasOverlay(overlayBase64, seed) {
    const canvas = elements.regionInteractiveCanvas;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Highlight Seed with animated ring
        ctx.beginPath();
        ctx.arc(seed.x, seed.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
    };
    img.src = overlayBase64;
}

// ================= TAB 3: COLOR & GRABCUT LOGIC =================
function initColorControls() {
    elements.subTabHsvBtn.addEventListener('click', () => {
        elements.subTabHsvBtn.classList.add('active');
        elements.subTabGrabCutBtn.classList.remove('active');
        elements.hsvControlsGroup.classList.remove('hidden');
        elements.grabcutControlsGroup.classList.add('hidden');
        runHsvSegmentation();
    });

    elements.subTabGrabCutBtn.addEventListener('click', () => {
        elements.subTabGrabCutBtn.classList.add('active');
        elements.subTabHsvBtn.classList.remove('active');
        elements.grabcutControlsGroup.classList.remove('hidden');
        elements.hsvControlsGroup.classList.add('hidden');
        runGrabCut();
    });

    // Sliders
    ['hMin', 'hMax', 'sMin', 'vMin'].forEach(id => {
        const slider = elements[id + 'Slider'];
        const valSpan = elements[id + 'Val'];
        slider.addEventListener('input', (e) => {
            valSpan.textContent = e.target.value;
        });
        slider.addEventListener('change', runHsvSegmentation);
    });

    elements.wrapRedToggle.addEventListener('change', runHsvSegmentation);
    elements.morphOpenCheck.addEventListener('change', runHsvSegmentation);
    elements.morphCloseCheck.addEventListener('change', runHsvSegmentation);
    elements.btnRunHsv.addEventListener('click', runHsvSegmentation);

    // Preset buttons
    document.querySelectorAll('.btn-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            applyColorPreset(preset);
        });
    });

    // GrabCut
    elements.gcIterSlider.addEventListener('input', (e) => {
        elements.gcIterVal.textContent = e.target.value;
    });
    elements.btnRunGrabcut.addEventListener('click', runGrabCut);
}

function applyColorPreset(preset) {
    if (preset === 'red') {
        elements.wrapRedToggle.checked = true;
        elements.hMinSlider.value = 0;
        elements.hMaxSlider.value = 10;
        elements.sMinSlider.value = 100;
        elements.vMinSlider.value = 100;
    } else if (preset === 'yellow') {
        elements.wrapRedToggle.checked = false;
        elements.hMinSlider.value = 18;
        elements.hMaxSlider.value = 35;
        elements.sMinSlider.value = 100;
        elements.vMinSlider.value = 100;
    } else if (preset === 'green') {
        elements.wrapRedToggle.checked = false;
        elements.hMinSlider.value = 36;
        elements.hMaxSlider.value = 85;
        elements.sMinSlider.value = 60;
        elements.vMinSlider.value = 60;
    }

    elements.hMinVal.textContent = elements.hMinSlider.value;
    elements.hMaxVal.textContent = elements.hMaxSlider.value;
    elements.sMinVal.textContent = elements.sMinSlider.value;
    elements.vMinVal.textContent = elements.vMinSlider.value;

    runHsvSegmentation();
}

async function runHsvSegmentation() {
    const payload = {
        image_id: state.activeImageId,
        h_min: parseInt(elements.hMinSlider.value),
        h_max: parseInt(elements.hMaxSlider.value),
        s_min: parseInt(elements.sMinSlider.value),
        s_max: 255,
        v_min: parseInt(elements.vMinSlider.value),
        v_max: 255,
        is_wrap_red: elements.wrapRedToggle.checked,
        morph_open: elements.morphOpenCheck.checked,
        morph_close: elements.morphCloseCheck.checked,
        kernel_size: 5
    };

    try {
        const res = await fetch('/api/color_segmentation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.clean_mask) {
            elements.colorMaskImg.src = data.clean_mask;
            elements.colorExtractedImg.src = data.extracted_white;
        }
    } catch (err) {
        console.error('Error HSV segmentation:', err);
    }
}

async function runGrabCut() {
    const payload = {
        image_id: state.activeImageId,
        rect: [
            parseInt(elements.gcX.value),
            parseInt(elements.gcY.value),
            parseInt(elements.gcW.value),
            parseInt(elements.gcH.value)
        ],
        iter_count: parseInt(elements.gcIterSlider.value)
    };

    try {
        const res = await fetch('/api/grabcut', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.extracted_white) {
            elements.colorMaskImg.src = data.mask;
            elements.colorExtractedImg.src = data.extracted_white;
        }
    } catch (err) {
        console.error('Error GrabCut:', err);
    }
}

// ================= TAB 4: OBJECT DETECTION LOGIC =================
function initDetectionControls() {
    elements.minAreaSlider.addEventListener('input', (e) => {
        elements.minAreaVal.textContent = `${e.target.value} px`;
    });
    elements.blurKsizeSlider.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (val % 2 === 0) val += 1;
        elements.blurKsizeVal.textContent = val;
    });

    elements.minAreaSlider.addEventListener('change', runObjectDetection);
    elements.blurKsizeSlider.addEventListener('change', runObjectDetection);
    document.querySelectorAll('input[name="detectMethod"]').forEach(r => {
        r.addEventListener('change', runObjectDetection);
    });

    elements.btnRunDetection.addEventListener('click', runObjectDetection);
}

async function runObjectDetection() {
    const method = document.querySelector('input[name="detectMethod"]:checked')?.value || 'otsu';
    const payload = {
        image_id: state.activeImageId,
        min_area: parseFloat(elements.minAreaSlider.value),
        blur_ksize: parseInt(elements.blurKsizeSlider.value),
        method: method
    };

    try {
        const res = await fetch('/api/object_detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.annotated) {
            elements.detectAnnotatedImg.src = data.annotated;
            elements.detectMaskImg.src = data.binary_mask;
            elements.totalObjectsCount.textContent = data.total_objects;

            renderObjectsTable(data.objects);
        }
    } catch (err) {
        console.error('Error object detection:', err);
    }
}

function renderObjectsTable(objects) {
    const tbody = elements.objectsTableBody;
    tbody.innerHTML = '';

    if (!objects || objects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada objek yang memenuhi kriteria luas minimum</td></tr>';
        return;
    }

    objects.forEach(obj => {
        const tr = document.createElement('tr');
        const [bx, by, bw, bh] = obj.bbox;
        tr.innerHTML = `
            <td><strong style="color:#a5b4fc">#${obj.id}</strong></td>
            <td>(${obj.centroid_x}, ${obj.centroid_y})</td>
            <td>${obj.area.toLocaleString()} px</td>
            <td>${obj.perimeter.toLocaleString()}</td>
            <td><span class="badge ${obj.circularity > 0.85 ? 'status-badge' : 'info-badge'}">${obj.circularity}</span></td>
            <td>[${bx}, ${by}, ${bw}, ${bh}]</td>
        `;
        tbody.appendChild(tr);
    });
}

// ================= TAB 5: DETEKSI TEPI (CANNY, SOBEL, PREWITT, ROBERTS) =================
function initEdgeControls() {
    // Mode switcher buttons
    if (elements.subTabEdgeCompare && elements.subTabEdgeSingle) {
        elements.subTabEdgeCompare.addEventListener('click', () => {
            state.edgeMode = 'compare';
            elements.subTabEdgeCompare.classList.add('active');
            elements.subTabEdgeSingle.classList.remove('active');
            elements.edgeCompareView.style.display = 'block';
            elements.edgeSingleView.style.display = 'none';
            elements.edgeSingleMethodGroup.style.display = 'none';
            updateEdgeControlsVisibility();
            runEdgeDetection();
        });

        elements.subTabEdgeSingle.addEventListener('click', () => {
            state.edgeMode = 'single';
            elements.subTabEdgeSingle.classList.add('active');
            elements.subTabEdgeCompare.classList.remove('active');
            elements.edgeCompareView.style.display = 'none';
            elements.edgeSingleView.style.display = 'block';
            elements.edgeSingleMethodGroup.style.display = 'block';
            updateEdgeControlsVisibility();
            runEdgeDetection();
        });
    }

    // Sliders & Controls
    if (elements.cannyTh1Slider) {
        elements.cannyTh1Slider.addEventListener('input', (e) => {
            elements.cannyTh1Val.textContent = e.target.value;
        });
    }

    if (elements.cannyTh2Slider) {
        elements.cannyTh2Slider.addEventListener('input', (e) => {
            elements.cannyTh2Val.textContent = e.target.value;
        });
    }

    if (elements.edgeBinaryThSlider) {
        elements.edgeBinaryThSlider.addEventListener('input', (e) => {
            const v = parseInt(e.target.value);
            elements.edgeBinaryThVal.textContent = v === 0 ? '0 (Gradien Murni)' : `${v}`;
        });
    }

    if (elements.edgeBlurToggle) {
        elements.edgeBlurToggle.addEventListener('change', (e) => {
            elements.edgeBlurKsizeWrapper.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    if (elements.edgeBlurKsizeSlider) {
        elements.edgeBlurKsizeSlider.addEventListener('input', (e) => {
            elements.edgeBlurKsizeVal.textContent = e.target.value;
        });
    }

    if (elements.edgeMethodSelect) {
        elements.edgeMethodSelect.addEventListener('change', () => {
            updateEdgeControlsVisibility();
            if (state.edgeMode === 'single') {
                runEdgeDetection();
            }
        });
    }

    // View Mode Radios (Grayscale vs Color Overlay)
    document.querySelectorAll('input[name="edgeViewMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (state.edgeDataCache) {
                if (state.edgeMode === 'compare') {
                    renderEdgeCompareResults(state.edgeDataCache);
                }
            }
        });
    });

    if (elements.btnRunEdgeDetection) {
        elements.btnRunEdgeDetection.addEventListener('click', () => {
            runEdgeDetection();
        });
    }
}

function updateEdgeControlsVisibility() {
    if (state.edgeMode === 'compare') {
        if (elements.cannyControlsGroup) elements.cannyControlsGroup.style.display = 'block';
        if (elements.sobelControlsGroup) elements.sobelControlsGroup.style.display = 'block';
    } else {
        const method = elements.edgeMethodSelect ? elements.edgeMethodSelect.value : 'canny';
        if (elements.cannyControlsGroup) {
            elements.cannyControlsGroup.style.display = method === 'canny' ? 'block' : 'none';
        }
        if (elements.sobelControlsGroup) {
            elements.sobelControlsGroup.style.display = method === 'sobel' ? 'block' : 'none';
        }
    }
}

async function runEdgeDetection() {
    const isCompare = state.edgeMode === 'compare';

    const payload = {
        image_id: state.activeImageId,
        mode: isCompare ? 'compare_all' : 'single',
        method: elements.edgeMethodSelect ? elements.edgeMethodSelect.value : 'canny',
        canny_th1: elements.cannyTh1Slider ? parseInt(elements.cannyTh1Slider.value) : 100,
        canny_th2: elements.cannyTh2Slider ? parseInt(elements.cannyTh2Slider.value) : 200,
        sobel_ksize: elements.sobelKsizeSelect ? parseInt(elements.sobelKsizeSelect.value) : 3,
        apply_blur: elements.edgeBlurToggle ? elements.edgeBlurToggle.checked : false,
        blur_ksize: elements.edgeBlurKsizeSlider ? parseInt(elements.edgeBlurKsizeSlider.value) : 3,
        binary_threshold: elements.edgeBinaryThSlider ? parseInt(elements.edgeBinaryThSlider.value) : 0
    };

    if (elements.edgeStatusBadge) {
        elements.edgeStatusBadge.textContent = 'Memproses...';
        elements.edgeStatusBadge.className = 'badge status-badge';
    }

    try {
        const res = await fetch('/api/edge_detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) {
            alert('Error deteksi tepi: ' + data.error);
            return;
        }

        if (elements.edgeStatusBadge) {
            elements.edgeStatusBadge.textContent = 'Selesai';
            elements.edgeStatusBadge.className = 'badge info-badge';
        }

        if (isCompare) {
            state.edgeDataCache = data;
            renderEdgeCompareResults(data);
        } else {
            renderEdgeSingleResults(data);
        }
    } catch (err) {
        console.error('Error saat deteksi tepi:', err);
        if (elements.edgeStatusBadge) {
            elements.edgeStatusBadge.textContent = 'Gagal';
        }
    }
}

function renderEdgeCompareResults(data) {
    if (!data || !data.table) return;
    const isOverlay = (document.querySelector('input[name="edgeViewMode"]:checked')?.value || 'grayscale') === 'overlay';

    let fastestTime = Infinity;
    let fastestMethod = 'Roberts';

    data.table.forEach(item => {
        const m = item.method;
        const imgEl = elements[`imgEdge${m}`];
        const timeBadge = elements[`timeBadge${m}`];
        const densityEl = elements[`density${m}`];
        const tableTime = elements[`tableTime${m}`];
        const tablePixels = elements[`tablePixels${m}`];

        if (imgEl) {
            imgEl.src = isOverlay ? item.overlay : item.image;
        }
        if (timeBadge) {
            timeBadge.textContent = `${item.time_ms} ms`;
        }
        if (densityEl) {
            densityEl.textContent = `${item.edge_pixels.toLocaleString()} px (${item.edge_percentage}%)`;
        }
        if (tableTime) {
            tableTime.textContent = `${item.time_ms} ms`;
            tableTime.className = 'badge status-badge';
        }
        if (tablePixels) {
            tablePixels.textContent = `${item.edge_pixels.toLocaleString()} px (${item.edge_percentage}%)`;
        }

        if (item.time_ms < fastestTime) {
            fastestTime = item.time_ms;
            fastestMethod = m;
        }
    });

    if (elements.fastestMethodBadge) {
        elements.fastestMethodBadge.textContent = `${fastestMethod} (${fastestTime} ms)`;
    }
}

function renderEdgeSingleResults(data) {
    if (!data) return;

    if (elements.singleMethodHeading) {
        elements.singleMethodHeading.textContent = `${data.method} Edge Detection Studio`;
    }
    if (elements.singleTimeBadge) {
        elements.singleTimeBadge.textContent = `${data.time_ms} ms (${data.edge_percentage}% tepi)`;
    }
    if (elements.singleCharacteristicsText) {
        elements.singleCharacteristicsText.textContent = data.characteristics;
    }
    if (elements.singleProsConsText) {
        elements.singleProsConsText.textContent = `Kelebihan / Kekurangan: ${data.pros_cons}`;
    }
    if (elements.singleEdgeImg) {
        elements.singleEdgeImg.src = data.edge_result;
    }
    if (elements.singleOverlayImg) {
        elements.singleOverlayImg.src = data.overlay_result;
    }

    if (data.comp_x && data.comp_y) {
        if (elements.directionalComponentsBlock) elements.directionalComponentsBlock.style.display = 'block';
        if (elements.compXImg) elements.compXImg.src = data.comp_x;
        if (elements.compYImg) elements.compYImg.src = data.comp_y;
    } else {
        if (elements.directionalComponentsBlock) elements.directionalComponentsBlock.style.display = 'none';
    }
}

// ================= TAB 6: CLUSTERING (K-MEANS & FUZZY C-MEANS) =================
function initClusterControls() {
    // Mode switcher buttons
    if (elements.subTabClusterCompare && elements.subTabClusterSingle) {
        elements.subTabClusterCompare.addEventListener('click', () => {
            state.clusterMode = 'compare';
            elements.subTabClusterCompare.classList.add('active');
            elements.subTabClusterSingle.classList.remove('active');
            elements.clusterCompareView.style.display = 'block';
            elements.clusterSingleView.style.display = 'none';
            elements.clusterMethodSelectGroup.style.display = 'none';
            elements.clusterExtractGroup.style.display = 'none';
            elements.fcmMControlGroup.style.display = 'block';
            runClustering();
        });

        elements.subTabClusterSingle.addEventListener('click', () => {
            state.clusterMode = 'single';
            elements.subTabClusterSingle.classList.add('active');
            elements.subTabClusterCompare.classList.remove('active');
            elements.clusterCompareView.style.display = 'none';
            elements.clusterSingleView.style.display = 'block';
            elements.clusterMethodSelectGroup.style.display = 'block';
            elements.clusterExtractGroup.style.display = 'block';
            updateClusterControlsVisibility();
            runClustering();
        });
    }

    if (elements.clusterMethodSelect) {
        elements.clusterMethodSelect.addEventListener('change', () => {
            updateClusterControlsVisibility();
            if (state.clusterMode === 'single') {
                runClustering();
            }
        });
    }

    if (elements.clusterKSlider) {
        elements.clusterKSlider.addEventListener('input', (e) => {
            const k = e.target.value;
            elements.clusterKVal.textContent = `${k} Kluster`;
            updateClusterExtractOptions(parseInt(k));
        });
    }

    if (elements.fcmMSlider) {
        elements.fcmMSlider.addEventListener('input', (e) => {
            elements.fcmMVal.textContent = parseFloat(e.target.value).toFixed(1);
        });
    }

    if (elements.clusterIterSlider) {
        elements.clusterIterSlider.addEventListener('input', (e) => {
            elements.clusterIterVal.textContent = `${e.target.value} iterasi`;
        });
    }

    if (elements.clusterExtractSelect) {
        elements.clusterExtractSelect.addEventListener('change', () => {
            if (state.clusterMode === 'single') {
                runClustering();
            }
        });
    }

    if (elements.btnRunClustering) {
        elements.btnRunClustering.addEventListener('click', () => {
            runClustering();
        });
    }
}

function updateClusterControlsVisibility() {
    if (state.clusterMode === 'single') {
        const method = elements.clusterMethodSelect ? elements.clusterMethodSelect.value : 'kmeans';
        if (elements.fcmMControlGroup) {
            elements.fcmMControlGroup.style.display = method === 'fcm' ? 'block' : 'none';
        }
    } else {
        if (elements.fcmMControlGroup) elements.fcmMControlGroup.style.display = 'block';
    }
}

function updateClusterExtractOptions(k) {
    if (!elements.clusterExtractSelect) return;
    const currentVal = elements.clusterExtractSelect.value;
    elements.clusterExtractSelect.innerHTML = '<option value="-1">Tampilkan Semua Kluster</option>';
    for (let i = 0; i < k; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Isolasi Kluster #${i + 1}`;
        elements.clusterExtractSelect.appendChild(opt);
    }
    if (parseInt(currentVal) < k) {
        elements.clusterExtractSelect.value = currentVal;
    } else {
        elements.clusterExtractSelect.value = '-1';
    }
}

async function runClustering() {
    const isCompare = state.clusterMode === 'compare';
    const payload = {
        image_id: state.activeImageId,
        mode: isCompare ? 'compare_both' : 'single',
        method: elements.clusterMethodSelect ? elements.clusterMethodSelect.value : 'kmeans',
        k: elements.clusterKSlider ? parseInt(elements.clusterKSlider.value) : 4,
        m: elements.fcmMSlider ? parseFloat(elements.fcmMSlider.value) : 2.0,
        max_iter: elements.clusterIterSlider ? parseInt(elements.clusterIterSlider.value) : 20,
        color_space: elements.clusterColorSpaceSelect ? elements.clusterColorSpaceSelect.value : 'bgr',
        selected_cluster: elements.clusterExtractSelect ? parseInt(elements.clusterExtractSelect.value) : -1
    };

    if (elements.clusterStatusBadge) {
        elements.clusterStatusBadge.textContent = 'Memproses Kluster...';
        elements.clusterStatusBadge.className = 'badge status-badge';
    }

    try {
        const res = await fetch('/api/clustering', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) {
            alert('Error clustering: ' + data.error);
            return;
        }

        if (elements.clusterStatusBadge) {
            elements.clusterStatusBadge.textContent = 'Selesai';
            elements.clusterStatusBadge.className = 'badge info-badge';
        }

        if (isCompare) {
            state.clusterDataCache = data;
            renderClusterCompareResults(data);
        } else {
            renderClusterSingleResults(data);
        }
    } catch (err) {
        console.error('Error saat segmentasi clustering:', err);
        if (elements.clusterStatusBadge) {
            elements.clusterStatusBadge.textContent = 'Gagal';
        }
    }
}

function renderClusterCompareResults(data) {
    if (!data) return;

    if (elements.imgClusterKMeans && data.kmeans) {
        elements.imgClusterKMeans.src = data.kmeans.segmented;
        if (elements.timeBadgeKMeans) elements.timeBadgeKMeans.textContent = `${data.kmeans.time_ms} ms`;
        renderPaletteBar(elements.kmPaletteBar, data.kmeans.palette);
    }

    if (elements.imgClusterFCM && data.fcm) {
        elements.imgClusterFCM.src = data.fcm.segmented;
        if (elements.timeBadgeFCM) elements.timeBadgeFCM.textContent = `${data.fcm.time_ms} ms`;
        renderPaletteBar(elements.fcmPaletteBar, data.fcm.palette);
        if (elements.fcmUncertaintyImg && data.fcm.uncertainty_map) {
            elements.fcmUncertaintyImg.src = data.fcm.uncertainty_map;
        }
    }
}

function renderPaletteBar(containerEl, palette) {
    if (!containerEl || !palette) return;
    containerEl.innerHTML = '';
    palette.forEach(p => {
        const seg = document.createElement('div');
        seg.className = 'palette-bar-seg';
        seg.style.width = `${p.percentage}%`;
        seg.style.backgroundColor = p.hex;
        seg.title = `Kluster #${p.cluster_id}: ${p.percentage}% (${p.hex})`;
        containerEl.appendChild(seg);
    });
}

function renderClusterSingleResults(data) {
    if (!data) return;

    if (elements.clusterSingleHeading) {
        elements.clusterSingleHeading.textContent = `${data.method} (${data.type})`;
    }
    if (elements.clusterSingleTimeBadge) {
        elements.clusterSingleTimeBadge.textContent = `${data.time_ms} ms (K=${data.k})`;
    }
    if (elements.clusterCharacteristicsText) {
        elements.clusterCharacteristicsText.textContent = data.characteristics;
    }
    if (elements.clusterProsConsText) {
        elements.clusterProsConsText.textContent = `Kelebihan / Kekurangan: ${data.pros_cons}`;
    }
    if (elements.clusterSingleOrigImg) {
        elements.clusterSingleOrigImg.src = data.original;
    }
    if (elements.clusterSingleSegImg) {
        elements.clusterSingleSegImg.src = data.segmented;
    }

    if (elements.clusterExtractedBlock && elements.clusterExtractedImg) {
        if (data.extracted_cluster) {
            elements.clusterExtractedBlock.style.display = 'block';
            elements.clusterExtractedImg.src = data.extracted_cluster;
        } else {
            elements.clusterExtractedBlock.style.display = 'none';
        }
    }

    // Palette table
    if (elements.clusterPaletteTableBody && data.palette) {
        const tbody = elements.clusterPaletteTableBody;
        tbody.innerHTML = '';
        data.palette.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color:var(--primary)">Kluster #${p.cluster_id}</strong></td>
                <td><span class="swatch-box" style="background-color: ${p.hex}"></span> ${p.hex}</td>
                <td><code>RGB(${p.rgb.join(', ')})</code></td>
                <td>${p.pixel_count.toLocaleString()} piksel</td>
                <td><span class="badge status-badge">${p.percentage}%</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
}
