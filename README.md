# VR 실시간 객체 인식 웹 애플리케이션

웹 브라우저에서 실시간으로 객체를 인식하고 VR 모드로 볼 수 있는 웹 애플리케이션입니다.

## 시연 영상

[![Video Title](https://www.youtube.com/shorts/r8xS4rwfNjA)](https://www.youtube.com/shorts/r8xS4rwfNjA)


## 주요 기능

- **실시간 객체 인식**: TensorFlow.js와 COCO-SSD 모델을 사용한 실시간 객체 감지
- **VR 모드**: 스테레오스코픽 뷰로 VR 헤드셋에서 사용 가능
- **WebRTC 지원**: 브라우저 카메라를 통한 실시간 영상 처리
- **반응형 디자인**: 모바일 및 데스크톱 환경 모두 지원

## 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI/ML**: TensorFlow.js, COCO-SSD 사전 훈련 모델
- **Backend**: Python (Flask/WebSocket 서버)
- **보안**: HTTPS (자체 서명 인증서)

## 파일 구조

```
vrgame/
├── index.html      # 메인 HTML 파일
├── app.js          # 클라이언트 JavaScript (객체 인식 및 VR 로직)
├── styles.css      # 스타일시트
├── server.py       # Python 웹소켓 서버
├── cert.pem        # SSL 인증서
└── key.pem         # SSL 개인 키
```

## 설치 및 실행

### 요구사항

- Python 3.7+
- 모던 웹 브라우저 (Chrome, Firefox, Safari)
- 웹캠이 있는 디바이스

### 서버 실행

1. Python 종속성 설치:
```bash
pip install flask flask-cors
```

2. 서버 시작:
```bash
python server.py
```

3. 브라우저에서 접속:
```
https://localhost:5000
```

**참고**: 자체 서명 인증서를 사용하므로 브라우저에서 보안 경고가 표시될 수 있습니다. 개발 환경에서는 "고급" > "계속 진행"을 선택하세요.

## 사용 방법

1. **일반 모드**: 웹캠 영상에서 실시간으로 객체를 인식하고 라벨을 표시합니다.

2. **VR 모드**: "VR 모드" 버튼을 클릭하여 스테레오스코픽 뷰로 전환합니다.
   - VR 헤드셋이나 Google Cardboard와 같은 기기에서 사용 가능
   - 좌우 화면에 동일한 객체 인식 결과 표시

3. **인식 제어**: "인식 중지/시작" 버튼으로 객체 인식을 일시정지하거나 재개할 수 있습니다.

## 인식 가능한 객체

COCO-SSD 모델이 인식할 수 있는 80가지 객체 카테고리:
- 사람, 자전거, 자동차, 오토바이
- 동물 (개, 고양이, 새, 말, 소 등)
- 가구 (의자, 소파, 침대, 테이블 등)  
- 전자기기 (노트북, 마우스, 키보드, 휴대폰 등)
- 음식 (피자, 도넛, 케이크, 과일 등)
- 기타 일상 물품

## 브라우저 호환성

- Chrome 90+ ✅
- Firefox 88+ ✅  
- Safari 14.1+ ✅
- Edge 90+ ✅

**모바일 지원**: iOS Safari, Chrome Android

## 보안 고려사항

- HTTPS를 통한 안전한 연결 (카메라 접근에 필수)
- 개발 환경용 자체 서명 인증서 사용
- 프로덕션 환경에서는 공인 SSL 인증서 사용 권장

## 라이선스

MIT License

## 문의사항

이슈나 문의사항이 있으시면 GitHub Issues를 통해 연락주세요.
