class VRObjectDetector {
    constructor() {
        this.video = document.getElementById('video');
        this.videoLeft = document.getElementById('video-left');
        this.videoRight = document.getElementById('video-right');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.labelsLeft = document.getElementById('labels-left');
        this.labelsRight = document.getElementById('labels-right');
        this.vrContainer = document.getElementById('vr-container');
        
        this.statusEl = document.getElementById('status');
        this.detectionCountEl = document.getElementById('detectionCount');
        this.detectedObjectsList = document.getElementById('detected-objects');
        
        this.model = null;
        this.isDetecting = false;
        this.detectionInterval = null;
        this.stream = null;
        this.detectedObjects = new Map();
        this.isVRMode = false;
        
        this.init();
    }

    async init() {
        try {
            await this.setupCamera();
            await this.loadModel();
            this.setupEventListeners();
            this.updateStatus('준비 완료!', 'success');
            this.startDetection();
        } catch (error) {
            console.error('초기화 실패:', error);
            this.updateStatus('초기화 실패: ' + error.message, 'error');
        }
    }

    async setupCamera() {
        this.updateStatus('카메라 접근 중...', 'info');
        
        try {
            // 모바일 호환성을 위한 다양한 제약조건 시도
            const constraints = [
                { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } },
                { video: { facingMode: { exact: 'environment' } } },
                { video: { facingMode: 'environment' } },
                { video: true }
            ];

            let stream = null;
            for (const constraint of constraints) {
                try {
                    console.log('시도 중인 제약조건:', constraint);
                    stream = await navigator.mediaDevices.getUserMedia(constraint);
                    break;
                } catch (err) {
                    console.warn('제약조건 실패:', constraint, err);
                    continue;
                }
            }

            if (!stream) {
                throw new Error('카메라 접근 실패');
            }

            this.stream = stream;
            
            // 메인 비디오에 스트림 연결
            this.video.srcObject = this.stream;
            
            // VR 뷰를 위한 복제 스트림
            this.videoLeft.srcObject = this.stream;
            this.videoRight.srcObject = this.stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    console.log(`Camera ready: ${this.canvas.width}x${this.canvas.height}`);
                    this.updateStatus('카메라 준비 완료', 'success');
                    resolve();
                };
            });
        } catch (error) {
            throw new Error('카메라 접근 실패. 권한을 확인해주세요.');
        }
    }

    async loadModel() {
        this.updateStatus('AI 모델 로딩 중...', 'info');
        
        try {
            // 모델 옵션 설정 - 더 많은 객체 탐지
            const modelConfig = {
                base: 'mobilenet_v2',  // 또는 'lite_mobilenet_v2' for faster
            };
            
            this.model = await cocoSsd.load(modelConfig);
            this.updateStatus('AI 모델 준비 완료', 'success');
            console.log('COCO-SSD model loaded successfully with config:', modelConfig);
        } catch (error) {
            throw new Error('AI 모델 로딩 실패');
        }
    }

    setupEventListeners() {
        const startBtn = document.getElementById('startBtn');
        const toggleBtn = document.getElementById('toggleDetection');

        startBtn.addEventListener('click', () => {
            this.toggleVRMode();
        });

        toggleBtn.addEventListener('click', () => {
            this.toggleDetection();
        });
    }

    toggleVRMode() {
        const startBtn = document.getElementById('startBtn');
        
        if (this.isVRMode) {
            document.body.classList.remove('vr-active');
            this.vrContainer.classList.remove('active');
            this.isVRMode = false;
            startBtn.textContent = 'VR 모드';
        } else {
            document.body.classList.add('vr-active');
            this.vrContainer.classList.add('active');
            this.isVRMode = true;
            startBtn.textContent = '일반 모드';
            
            // 모바일에서 전체화면 요청
            if (this.vrContainer.requestFullscreen) {
                this.vrContainer.requestFullscreen();
            } else if (this.vrContainer.webkitRequestFullscreen) {
                this.vrContainer.webkitRequestFullscreen();
            }
        }
    }

    toggleDetection() {
        const toggleBtn = document.getElementById('toggleDetection');
        
        if (this.isDetecting) {
            this.stopDetection();
            toggleBtn.textContent = '인식 시작';
            toggleBtn.classList.remove('active');
        } else {
            this.startDetection();
            toggleBtn.textContent = '인식 중지';
            toggleBtn.classList.add('active');
        }
    }

    startDetection() {
        if (this.isDetecting || !this.model) return;
        
        this.isDetecting = true;
        this.updateStatus('객체 인식 시작', 'success');
        console.log('Starting object detection...');
        
        this.detectionInterval = setInterval(() => {
            this.detectObjects();
        }, 100);  // 100ms로 단축하여 초당 10번 탐지
    }

    stopDetection() {
        this.isDetecting = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        this.clearLabels();
        this.updateStatus('객체 인식 중지', 'info');
    }

    async detectObjects() {
        if (!this.model || !this.isDetecting) return;

        try {
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // 탐지 옵션: 최대 객체 수 증가, 신뢰도 임계값 낮춤
            const predictions = await this.model.detect(this.canvas, 20, 0.3);  // 최대 20개 객체, 30% 이상 신뢰도
            
            if (predictions.length > 0) {
                console.log(`Detected ${predictions.length} objects:`, predictions);
            }
            
            this.processDetections(predictions);
        } catch (error) {
            console.error('Detection error:', error);
        }
    }

    processDetections(predictions) {
        this.clearLabels();
        this.detectedObjects.clear();
        
        if (predictions.length === 0) {
            this.updateDetectionCount(0);
            this.updateDetectedObjectsList([]);
            return;
        }

        this.updateDetectionCount(predictions.length);

        predictions.forEach((prediction) => {
            this.createLabel(prediction);
            this.detectedObjects.set(prediction.class, prediction.score);
        });

        this.updateDetectedObjectsList(predictions);
    }

    createLabel(prediction) {
        const { bbox, class: className, score } = prediction;
        const [x, y, width, height] = bbox;
        
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        // 화면 좌표로 변환
        const screenX = (centerX / this.canvas.width) * 100;
        const screenY = (centerY / this.canvas.height) * 100;
        
        const confidence = Math.round(score * 100);
        const translatedName = this.translateClassName(className);
        const carbonInfo = this.getCarbonInfo(className);
        
        // 탄소 정보 포맷팅
        let carbonText = '';
        if (carbonInfo.co2 > 0) {
            carbonText = `\nCO₂: ${carbonInfo.co2}kg ${carbonInfo.note}`;
        } else if (carbonInfo.co2 < 0) {
            carbonText = `\nCO₂: ${Math.abs(carbonInfo.co2)}kg ${carbonInfo.note}`;
        } else if (carbonInfo.co2 === 0 && className !== 'person') {
            carbonText = `\nCO₂: ${carbonInfo.note}`;
        }
        
        const labelText = `${translatedName} (${confidence}%)${carbonText}`;
        const color = this.getColorByConfidence(score);
        
        // 일반 모드와 VR 모드 둘 다에 라벨 생성
        if (this.isVRMode) {
            this.addLabelToVR(labelText, screenX, screenY, color);
        }
        
        // 항상 오버레이로도 표시
        this.addLabelOverlay(labelText, screenX, screenY, color);
    }

    addLabelToVR(text, x, y, color) {
        // 왼쪽 눈용 라벨
        const leftLabel = this.createLabelElement(text, x, y, color);
        this.labelsLeft.appendChild(leftLabel);
        
        // 오른쪽 눈용 라벨 (약간의 시차 적용)
        const rightLabel = this.createLabelElement(text, x + 0.5, y, color);
        this.labelsRight.appendChild(rightLabel);
    }

    addLabelOverlay(text, x, y, color) {
        if (!this.isVRMode) {
            const label = this.createLabelElement(text, x, y, color);
            label.style.position = 'fixed';
            label.style.zIndex = '50';
            document.body.appendChild(label);
            
            setTimeout(() => {
                if (label.parentNode) {
                    label.parentNode.removeChild(label);
                }
            }, 100);
        }
    }

    createLabelElement(text, x, y, color) {
        const label = document.createElement('div');
        label.className = 'object-label';
        label.innerHTML = text.replace(/\n/g, '<br>');
        label.style.left = `${x}%`;
        label.style.top = `${y}%`;
        label.style.borderColor = color;
        label.style.color = color;
        label.style.whiteSpace = 'pre-wrap';
        
        return label;
    }

    getCarbonInfo(className) {
        // 탄소 배출량 데이터 (kg CO2)
        // 제조/생산 과정에서의 평균 탄소 배출량 추정치
        const carbonData = {
            'person': { co2: 0, note: '사람' },
            'bicycle': { co2: 100, note: '제조시' },
            'car': { co2: 6000, note: '제조시' },
            'motorcycle': { co2: 500, note: '제조시' },
            'airplane': { co2: 100000, note: '제조시' },
            'bus': { co2: 50000, note: '제조시' },
            'train': { co2: 200000, note: '제조시' },
            'truck': { co2: 25000, note: '제조시' },
            'boat': { co2: 30000, note: '제조시' },
            'traffic light': { co2: 50, note: '제조시' },
            'fire hydrant': { co2: 80, note: '제조시' },
            'stop sign': { co2: 10, note: '제조시' },
            'parking meter': { co2: 30, note: '제조시' },
            'bench': { co2: 50, note: '제조시' },
            'bird': { co2: 0.1, note: '연간' },
            'cat': { co2: 310, note: '연간' },
            'dog': { co2: 770, note: '연간' },
            'horse': { co2: 1800, note: '연간' },
            'sheep': { co2: 390, note: '연간' },
            'cow': { co2: 2850, note: '연간' },
            'elephant': { co2: 8500, note: '연간' },
            'bear': { co2: 2000, note: '연간' },
            'zebra': { co2: 1500, note: '연간' },
            'giraffe': { co2: 3000, note: '연간' },
            'backpack': { co2: 5, note: '제조시' },
            'umbrella': { co2: 2, note: '제조시' },
            'handbag': { co2: 10, note: '제조시' },
            'tie': { co2: 1, note: '제조시' },
            'suitcase': { co2: 15, note: '제조시' },
            'frisbee': { co2: 0.5, note: '제조시' },
            'skis': { co2: 20, note: '제조시' },
            'snowboard': { co2: 25, note: '제조시' },
            'sports ball': { co2: 1, note: '제조시' },
            'kite': { co2: 0.3, note: '제조시' },
            'baseball bat': { co2: 3, note: '제조시' },
            'baseball glove': { co2: 5, note: '제조시' },
            'skateboard': { co2: 8, note: '제조시' },
            'surfboard': { co2: 30, note: '제조시' },
            'tennis racket': { co2: 5, note: '제조시' },
            'bottle': { co2: 0.5, note: '제조시' },
            'wine glass': { co2: 0.8, note: '제조시' },
            'cup': { co2: 0.3, note: '제조시' },
            'fork': { co2: 0.1, note: '제조시' },
            'knife': { co2: 0.2, note: '제조시' },
            'spoon': { co2: 0.1, note: '제조시' },
            'bowl': { co2: 0.5, note: '제조시' },
            'banana': { co2: 0.08, note: '개당' },
            'apple': { co2: 0.04, note: '개당' },
            'sandwich': { co2: 0.4, note: '개당' },
            'orange': { co2: 0.05, note: '개당' },
            'broccoli': { co2: 0.2, note: 'kg당' },
            'carrot': { co2: 0.1, note: 'kg당' },
            'hot dog': { co2: 0.9, note: '개당' },
            'pizza': { co2: 2.5, note: '판당' },
            'donut': { co2: 0.2, note: '개당' },
            'cake': { co2: 3, note: 'kg당' },
            'chair': { co2: 20, note: '제조시' },
            'couch': { co2: 90, note: '제조시' },
            'potted plant': { co2: -2, note: '연간 흡수' },
            'bed': { co2: 100, note: '제조시' },
            'dining table': { co2: 80, note: '제조시' },
            'toilet': { co2: 35, note: '제조시' },
            'tv': { co2: 300, note: '제조시' },
            'laptop': { co2: 400, note: '제조시' },
            'mouse': { co2: 2, note: '제조시' },
            'remote': { co2: 1, note: '제조시' },
            'keyboard': { co2: 8, note: '제조시' },
            'cell phone': { co2: 70, note: '제조시' },
            'microwave': { co2: 80, note: '제조시' },
            'oven': { co2: 150, note: '제조시' },
            'toaster': { co2: 15, note: '제조시' },
            'sink': { co2: 50, note: '제조시' },
            'refrigerator': { co2: 350, note: '제조시' },
            'book': { co2: 3, note: '제조시' },
            'clock': { co2: 5, note: '제조시' },
            'vase': { co2: 2, note: '제조시' },
            'scissors': { co2: 0.5, note: '제조시' },
            'teddy bear': { co2: 5, note: '제조시' },
            'hair drier': { co2: 10, note: '제조시' },
            'toothbrush': { co2: 0.05, note: '제조시' }
        };
        
        return carbonData[className] || { co2: 0, note: '정보없음' };
    }

    translateClassName(className) {
        const translations = {
            'person': '사람',
            'bicycle': '자전거',
            'car': '자동차',
            'motorcycle': '오토바이',
            'airplane': '비행기',
            'bus': '버스',
            'train': '기차',
            'truck': '트럭',
            'boat': '보트',
            'traffic light': '신호등',
            'fire hydrant': '소화전',
            'stop sign': '정지 표지판',
            'parking meter': '주차 미터기',
            'bench': '벤치',
            'bird': '새',
            'cat': '고양이',
            'dog': '개',
            'horse': '말',
            'sheep': '양',
            'cow': '소',
            'elephant': '코끼리',
            'bear': '곰',
            'zebra': '얼룩말',
            'giraffe': '기린',
            'backpack': '배낭',
            'umbrella': '우산',
            'handbag': '핸드백',
            'tie': '넥타이',
            'suitcase': '여행가방',
            'frisbee': '프리스비',
            'skis': '스키',
            'snowboard': '스노보드',
            'sports ball': '공',
            'kite': '연',
            'baseball bat': '야구 방망이',
            'baseball glove': '야구 글러브',
            'skateboard': '스케이트보드',
            'surfboard': '서핑보드',
            'tennis racket': '테니스 라켓',
            'bottle': '병',
            'wine glass': '와인잔',
            'cup': '컵',
            'fork': '포크',
            'knife': '나이프',
            'spoon': '숟가락',
            'bowl': '그릇',
            'banana': '바나나',
            'apple': '사과',
            'sandwich': '샌드위치',
            'orange': '오렌지',
            'broccoli': '브로콜리',
            'carrot': '당근',
            'hot dog': '핫도그',
            'pizza': '피자',
            'donut': '도넛',
            'cake': '케이크',
            'chair': '의자',
            'couch': '소파',
            'potted plant': '화분',
            'bed': '침대',
            'dining table': '식탁',
            'toilet': '화장실',
            'tv': 'TV',
            'laptop': '노트북',
            'mouse': '마우스',
            'remote': '리모컨',
            'keyboard': '키보드',
            'cell phone': '휴대폰',
            'microwave': '전자레인지',
            'oven': '오븐',
            'toaster': '토스터',
            'sink': '싱크대',
            'refrigerator': '냉장고',
            'book': '책',
            'clock': '시계',
            'vase': '꽃병',
            'scissors': '가위',
            'teddy bear': '테디베어',
            'hair drier': '헤어드라이어',
            'toothbrush': '칫솔'
        };
        
        return translations[className] || className;
    }

    getColorByConfidence(score) {
        if (score > 0.8) return '#00ff00';
        if (score > 0.6) return '#ffff00';
        if (score > 0.4) return '#ff9900';
        return '#ff0000';
    }

    clearLabels() {
        this.labelsLeft.innerHTML = '';
        this.labelsRight.innerHTML = '';
        
        // 오버레이 라벨 제거
        document.querySelectorAll('.object-label').forEach(label => {
            if (label.style.position === 'fixed') {
                label.remove();
            }
        });
    }

    updateStatus(message, type = 'info') {
        this.statusEl.textContent = message;
        this.statusEl.style.color = type === 'error' ? '#ef4444' : 
                                    type === 'success' ? '#4ade80' : '#60a5fa';
    }

    updateDetectionCount(count) {
        this.detectionCountEl.textContent = `감지된 객체: ${count}`;
    }

    updateDetectedObjectsList(predictions) {
        this.detectedObjectsList.innerHTML = '';
        
        predictions.slice(0, 10).forEach(prediction => {
            const li = document.createElement('li');
            const className = this.translateClassName(prediction.class);
            const confidence = Math.round(prediction.score * 100);
            const carbonInfo = this.getCarbonInfo(prediction.class);
            
            let carbonDisplay = '';
            if (carbonInfo.co2 !== 0) {
                carbonDisplay = `<span class="carbon-info">CO₂: ${Math.abs(carbonInfo.co2)}kg</span>`;
            }
            
            li.innerHTML = `
                <div>
                    <span>${className}</span>
                    ${carbonDisplay}
                </div>
                <span class="confidence">${confidence}%</span>
            `;
            
            this.detectedObjectsList.appendChild(li);
        });
    }
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', () => {
    // HTTPS 체크
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        const httpsUrl = 'https://' + location.host + location.pathname;
        alert('모바일에서 카메라를 사용하려면 HTTPS가 필요합니다.\n\nHTTPS 서버 실행 방법:\npython3 server.py\n\n그 후 ' + httpsUrl + ' 로 접속하세요.');
    }
    
    // 카메라 API 지원 체크
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('이 브라우저는 카메라 API를 지원하지 않습니다.\n\n지원 브라우저:\n- Chrome (Android/iOS)\n- Safari (iOS 11+)\n- Samsung Internet');
        return;
    }
    
    const detector = new VRObjectDetector();
    
    // 디버그 모드 토글
    document.addEventListener('keypress', (e) => {
        if (e.key === 'd') {
            document.getElementById('canvas').classList.toggle('debug');
        }
    });
});