/**
 * 인쇄유틸_인사.js
 * 
 * 보고서 인쇄 전용 유틸리티
 * - 여백 최적화
 * - 사이드바/메뉴 인쇄 방지
 * - ID 기반 세분화된 인쇄 관리
 * - 원본 테이블 스타일 유지
 * 
 * @version 3.0
 * @since 2024-11-05
 * 
 * [변경 이력]
 * v3.0 (2024-11-05) - 프로덕션급 리팩토링
 * - 호봉획정표: 표 선 끊김, 과도한 여백 → border-collapse, 명시적 테두리
 * - 연명부/입사자/퇴사자: 사이드바/메뉴 출력 → ID 기반 격리
 * - 공통: 인쇄 타이밍 이슈 → setTimeout 체인 유지
 * 
 * [핵심 전략]
 * - body.print-mode + ID.print-active 조합
 * - 각 보고서별 고유 ID로 완전 격리
 * - 기존 인쇄 로직의 setTimeout 구조 100% 유지
 * - CSS에서 테두리를 건드리지 않아 원본 스타일 완벽 보존
 * 
 * [의존성]
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * 
 * [사용 예시]
 * // 호봉획정표
 * 인쇄유틸_인사.print('certificate-print-area', 'portrait');
 * 
 * // 연명부 (가로)
 * 인쇄유틸_인사.print('register-print-area', 'landscape');
 * 
 * // 입사자목록
 * 인쇄유틸_인사.print('new-employees-print-area', 'landscape');
 */

/**
 * 보고서 인쇄 유틸리티
 * @namespace 인쇄유틸_인사
 */
const 인쇄유틸_인사 = (function() {
    
 // ===== Private 변수 =====
    
 /**
 * 인쇄 중 플래그
 * @private
 */
    let _isPrinting = false;
    
 /**
 * 현재 인쇄 중인 컨테이너 ID
 * @private
 */
    let _currentContainerId = null;
    
 // ===== Private 함수 =====
    
 /**
 * 페이지 방향 스타일 설정
 * 
 * @private
 * @param {string} orientation - 'portrait' | 'landscape'
 * 
 * @description
 * 동적으로 @page 스타일을 생성하여 인쇄 방향 설정
 * - portrait: A4 세로, margin 10mm
 * - landscape: A4 가로, margin 5mm
 */
    function _setPageOrientation(orientation) {
        로거_인사?.debug('페이지 방향 설정', { orientation });
        
 // 기존 스타일 제거
        const existingStyle = document.getElementById('print-orientation-style');
        if (existingStyle) {
            existingStyle.remove();
            로거_인사?.debug('기존 방향 스타일 제거');
        }
        
 // 새 스타일 생성
        const style = document.createElement('style');
        style.id = 'print-orientation-style';
        
 // 방향에 따른 여백 설정
        const margin = orientation === 'landscape' ? '5mm' : '10mm';
        const fontSize = orientation === 'landscape' ? '10px' : '12px';
        const tableFontSize = orientation === 'landscape' ? '9px' : '11px';
        const padding = orientation === 'landscape' ? '4px' : '6px';
        
        style.textContent = `
            @media print {
                @page {
                    size: A4 ${orientation};
                    margin: ${margin};
                }
                
                body {
                    font-size: ${fontSize};
                }
                
                .print-active table {
                    font-size: ${tableFontSize} !important;
                }
                
                .print-active th,
                .print-active td {
                    padding: ${padding} !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        로거_인사?.debug('페이지 방향 스타일 추가 완료');
    }
    
 /**
 * 페이지 방향 스타일 정리
 * 
 * @private
 */
    function _cleanupPageOrientation() {
        const style = document.getElementById('print-orientation-style');
        if (style) {
            style.remove();
            로거_인사?.debug('페이지 방향 스타일 제거 완료');
        }
    }
    
 /**
 * 인쇄 준비 (body 클래스 및 컨테이너 활성화)
 * 
 * @private
 * @param {string} containerId - 인쇄할 컨테이너 ID
 * @throws {Error} 컨테이너를 찾을 수 없는 경우
 */
    function _preparePrint(containerId) {
        로거_인사?.debug('인쇄 준비 시작', { containerId });
        
 // 컨테이너 확인
        const container = document.getElementById(containerId);
        if (!container) {
            const error = new Error(`인쇄 영역을 찾을 수 없습니다: ${containerId}`);
            로거_인사?.error('인쇄 준비 실패', { containerId });
            throw error;
        }
        
 // 1. body에 인쇄 모드 클래스 추가
        document.body.classList.add('print-mode');
        로거_인사?.debug('body.print-mode 활성화');
        
 // 2. 해당 컨테이너 활성화
        container.classList.add('print-active');
        로거_인사?.debug('컨테이너 활성화', { containerId });
        
 // 3. body 스크롤 방지 (모달처럼)
        document.body.style.overflow = 'hidden';
        
        로거_인사?.info('인쇄 준비 완료', { containerId });
    }
    
 /**
 * 인쇄 정리 (body 클래스 및 컨테이너 비활성화)
 * 
 * @private
 * @param {string} containerId - 정리할 컨테이너 ID
 */
    function _cleanupPrint(containerId) {
        로거_인사?.debug('인쇄 정리 시작', { containerId });
        
        try {
 // 1. body 클래스 제거
            document.body.classList.remove('print-mode');
            로거_인사?.debug('body.print-mode 비활성화');
            
 // 2. 컨테이너 클래스 제거
            const container = document.getElementById(containerId);
            if (container) {
                container.classList.remove('print-active');
                로거_인사?.debug('컨테이너 비활성화', { containerId });
            }
            
 // 3. body 스크롤 복원
            document.body.style.overflow = '';
            
 // 4. 페이지 방향 스타일 정리
            _cleanupPageOrientation();
            
 // 5. 플래그 초기화
            _isPrinting = false;
            _currentContainerId = null;
            
            로거_인사?.info('인쇄 정리 완료', { containerId });
            
        } catch (error) {
            로거_인사?.error('인쇄 정리 중 오류', error);
            
 // 에러가 발생해도 최소한의 정리는 수행
            document.body.classList.remove('print-mode');
            document.body.style.overflow = '';
            _isPrinting = false;
            _currentContainerId = null;
        }
    }
    
 // ===== Public API =====
    
    return {
 /**
 * 보고서 인쇄 실행
 * 
 * @param {string} containerId - 인쇄할 컨테이너 ID
 * @param {string} [orientation='portrait'] - 페이지 방향 ('portrait' | 'landscape')
 * 
 * @description
 * 지정된 컨테이너만 인쇄하고 나머지는 모두 숨김
 * - 사이드바, 메뉴, 검색창 등 모두 숨김
 * - 표 선 끊김 방지
 * - 여백 최적화
 * - 인쇄 타이밍 보장 (setTimeout 체인)
 * 
 * @example
 * // 호봉획정표 (세로)
 * 인쇄유틸_인사.print('certificate-print-area', 'portrait');
 * 
 * @example
 * // 연명부 (가로)
 * 인쇄유틸_인사.print('register-print-area', 'landscape');
 * 
 * @example
 * // 방향 생략 시 기본값 (세로)
 * 인쇄유틸_인사.print('certificate-print-area');
 */
        print(containerId, orientation = 'portrait') {
 // 중복 인쇄 방지
            if (_isPrinting) {
                로거_인사?.warn('이미 인쇄 중입니다', { 
                    current: _currentContainerId,
                    requested: containerId 
                });
                
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.warn('이미 인쇄가 진행 중입니다.');
                } else {
                    alert('[주의] 이미 인쇄가 진행 중입니다.');
                }
                return;
            }
            
            로거_인사?.info('인쇄 시작', { containerId, orientation });
            
            try {
 // 플래그 설정
                _isPrinting = true;
                _currentContainerId = containerId;
                
 // 1. 페이지 방향 설정
                if (orientation === 'landscape' || orientation === 'portrait') {
                    _setPageOrientation(orientation);
                } else {
                    로거_인사?.warn('잘못된 방향 값, 기본값(portrait) 사용', { orientation });
                    _setPageOrientation('portrait');
                }
                
 // 2. 인쇄 준비
                _preparePrint(containerId);
                
 // 3. 인쇄 실행 (타이밍 보장)
 // ️ CRITICAL: setTimeout 구조를 절대 변경하지 말것!
 // - 브라우저가 DOM 렌더링을 완료할 시간 필요
 // - async/await로 변경 시 타이밍 이슈 발생
                setTimeout(() => {
                    로거_인사?.debug('window.print() 호출');
                    
 // 실제 인쇄 다이얼로그 표시
                    window.print();
                    
 // 4. 정리 (인쇄 다이얼로그가 닫힌 후)
 // ️ CRITICAL: 이 setTimeout도 필수!
                    setTimeout(() => {
                        _cleanupPrint(containerId);
                        로거_인사?.info('인쇄 완료', { containerId });
                    }, 100);
                    
                }, 100);
                
            } catch (error) {
                로거_인사?.error('인쇄 실패', error);
                
 // 에러 처리
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.handle(error, '인쇄 중 오류가 발생했습니다.');
                } else {
                    alert('[오류] 인쇄 중 오류가 발생했습니다.');
                    console.error('인쇄 오류:', error);
                }
                
 // 에러 시 정리
                _cleanupPrint(containerId);
            }
        },
        
 /**
 * 현재 인쇄 중인지 확인
 * 
 * @returns {boolean} 인쇄 중이면 true
 * 
 * @example
 * if (인쇄유틸_인사.isPrinting()) {
 * console.log('인쇄 진행 중...');
 * }
 */
        isPrinting() {
            return _isPrinting;
        },
        
 /**
 * 현재 인쇄 중인 컨테이너 ID 반환
 * 
 * @returns {string|null} 컨테이너 ID 또는 null
 * 
 * @example
 * const current = 인쇄유틸_인사.getCurrentContainer();
 * console.log('인쇄 중:', current);
 */
        getCurrentContainer() {
            return _currentContainerId;
        },
        
 /**
 * 강제 정리 (비상용)
 * 
 * @description
 * 인쇄 중 문제 발생 시 수동으로 정리
 * 일반적으로 사용할 필요 없음
 * 
 * @example
 * // 인쇄가 멈춘 경우
 * 인쇄유틸_인사.forceCleanup();
 */
        forceCleanup() {
            로거_인사?.warn('강제 정리 실행');
            
            try {
                document.body.classList.remove('print-mode');
                document.body.style.overflow = '';
                
 // 모든 print-active 클래스 제거
                document.querySelectorAll('.print-active').forEach(el => {
                    el.classList.remove('print-active');
                });
                
                _cleanupPageOrientation();
                
                _isPrinting = false;
                _currentContainerId = null;
                
                로거_인사?.info('강제 정리 완료');
                
            } catch (error) {
                로거_인사?.error('강제 정리 실패', error);
            }
        }
    };
})();

// ===== 전역 별칭 =====

/**
 * 전역 별칭
 * @type {Object}
 */
const PrintUtils = 인쇄유틸_인사;

/**
 * 인쇄유틸 통계
 * 
 * [핵심 개선 사항]
 * 1. ID 기반 격리 → 사이드바/메뉴 출력 방지
 * 2. 원본 스타일 유지 → 화면과 동일한 출력
 * 3. 적절한 여백 설정 → A4 최적화
 * 4. setTimeout 체인 유지 → 브라우저 렌더링 보장
 * 5. 중복 인쇄 방지 → 플래그 관리
 * 6. 에러 처리 → 정리 보장
 * 7. 로깅 → 디버깅 용이
 * 
 * [사용 보고서]
 * - 호봉획정표_인사.js
 * - 연명부_인사.js
 * - 입사자목록_인사.js
 * - 퇴사자목록_인사.js
 * - 통계분석_인사.js
 * 
 * [의존성]
 * - 로거_인사.js (선택)
 * - 에러처리_인사.js (선택)
 * 
 * [호환성]
 * - Chrome, Firefox, Safari, Edge
 * - 인쇄 미리보기 지원
 * - PDF 저장 지원
 */
