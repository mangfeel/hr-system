/**
 * 에러처리_인사.js
 * 
 * 통합 에러 처리 시스템
 * - 커스텀 에러 클래스
 * - 에러 로깅 및 저장
 * - 사용자 알림 함수
 * - 개발/프로덕션 모드 구분
 * - 검증 에러 표시
 * 
 * @version 4.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v4.0 (2026-02-13) - 토스트 알림 시스템 도입
 *   - success(), info() → 토스트 알림 (자동 사라짐)
 *   - warn(), handle(), showValidationErrors() → alert 유지
 *   - 짧은 메시지 3초, 긴 메시지 5초 표시
 *   - 클릭 또는 × 버튼으로 즉시 닫기 가능
 * v3.0 - 프로덕션급 리팩토링: 에러 처리 시스템 구축
 * 
 * [의존성]
 * - 상수_인사.js (CONFIG)
 * - 로거_인사.js (로거_인사)
 * 
 * [사용 예시]
 * throw new 인사에러('데이터 없음', 'EMPLOYEE_NOT_FOUND', { id: 123 });
 * 에러처리_인사.handle(error, '저장 중 오류가 발생했습니다.');
 * 에러처리_인사.showValidationErrors(['이름 필수', '날짜 형식 오류']);
 */

/**
 * 인사관리시스템 커스텀 에러 클래스
 * 
 * @class 인사에러
 * @extends Error
 */
class 인사에러 extends Error {
 /**
 * 생성자
 * 
 * @param {string} message - 에러 메시지
 * @param {string} code - 에러 코드 (CONFIG.ERROR_CODES 참조)
 * @param {Object} [context={}] - 추가 컨텍스트 정보
 * 
 * @example
 * throw new 인사에러(
 * '직원을 찾을 수 없습니다',
 * 'EMPLOYEE_NOT_FOUND',
 * { id: 'abc123' }
 * );
 */
    constructor(message, code, context = {}) {
        super(message);
        
 /**
 * 에러 이름
 * @type {string}
 */
        this.name = '인사에러';
        
 /**
 * 에러 코드
 * @type {string}
 */
        this.code = code;
        
 /**
 * 추가 컨텍스트 정보
 * @type {Object}
 */
        this.context = context;
        
 /**
 * 발생 시간
 * @type {string}
 */
        this.timestamp = new Date().toISOString();
        
 // 스택 트레이스 캡처 (V8 엔진)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, 인사에러);
        }
    }
    
 /**
 * 에러를 JSON으로 변환
 * @returns {Object}
 */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
    
 /**
 * 에러를 문자열로 변환
 * @returns {string}
 */
    toString() {
        return `[${this.code}] ${this.message}`;
    }
}

/**
 * 에러 처리 시스템
 * @namespace 에러처리_인사
 */
const 에러처리_인사 = (function() {
 /**
 * 에러 히스토리 (최대 50개)
 * @private
 * @type {Array<Object>}
 */
    let _errorHistory = [];
    
 /**
 * 최대 에러 히스토리 개수
 * @private
 * @type {number}
 */
    const _maxHistory = 50;
    
 /**
 * 개발 모드 여부
 * @private
 * @returns {boolean}
 */
    function _isDevelopment() {
        if (typeof CONFIG === 'undefined') return false;
        return CONFIG.ENV === 'development' || CONFIG.DEBUG === true;
    }
    
 /**
 * 에러 히스토리에 저장
 * @private
 * @param {Error|인사에러} error - 에러 객체
 * @param {string} userMessage - 사용자 메시지
 * @param {Object} context - 컨텍스트
 */
    function _saveToHistory(error, userMessage, context) {
        try {
            const entry = {
                timestamp: new Date().toISOString(),
                error: {
                    name: error.name,
                    message: error.message,
                    code: error.code || 'UNKNOWN_ERROR',
                    stack: error.stack
                },
                userMessage: userMessage,
                context: context
            };
            
            _errorHistory.push(entry);
            
 // 최대 개수 유지
            if (_errorHistory.length > _maxHistory) {
                _errorHistory.shift();
            }
        } catch (e) {
            console.error('에러 히스토리 저장 실패:', e);
        }
    }
    
 /**
 * 에러 정보 추출
 * @private
 * @param {Error|인사에러|string} error - 에러
 * @returns {Object}
 */
    function _extractErrorInfo(error) {
        if (error instanceof 인사에러) {
            return {
                name: error.name,
                message: error.message,
                code: error.code,
                context: error.context,
                stack: error.stack
            };
        } else if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                code: 'UNKNOWN_ERROR',
                context: {},
                stack: error.stack
            };
        } else if (typeof error === 'string') {
            return {
                name: 'Error',
                message: error,
                code: 'UNKNOWN_ERROR',
                context: {},
                stack: null
            };
        } else {
            return {
                name: 'Error',
                message: '알 수 없는 오류',
                code: 'UNKNOWN_ERROR',
                context: {},
                stack: null
            };
        }
    }
    
 /**
 * 사용자에게 표시할 메시지 결정
 * @private
 * @param {string} userMessage - 명시적 사용자 메시지
 * @param {Object} errorInfo - 에러 정보
 * @returns {string}
 */
    function _getUserMessage(userMessage, errorInfo) {
 // 명시적 메시지가 있으면 사용
        if (userMessage) {
            return userMessage;
        }
        
 // CONFIG가 있으면 기본 메시지 사용
        if (typeof CONFIG !== 'undefined') {
            return CONFIG.MESSAGES.ERROR_OCCURRED;
        }
        
 // 최후의 기본값
        return '오류가 발생했습니다.';
    }
    
 /**
 * 토스트 컨테이너 생성/반환
 * @private
 * @returns {HTMLElement}
 */
    function _getToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }
    
 /**
 * 토스트 알림 표시
 * @private
 * @param {string} message - 메시지
 * @param {string} type - 'success' | 'info'
 */
    function _showToast(message, type) {
        var container = _getToastContainer();
        
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        
        // 메시지 길이에 따라 표시 시간 결정
        var duration = (message.length > 50 || message.indexOf('\n') !== -1) ? 5000 : 3000;
        
        // 아이콘
        var icon = (type === 'success') ? '✓' : 'ℹ';
        var title = (type === 'success') ? '완료' : '안내';
        
        toast.innerHTML = 
            '<div class="toast-title">' +
                '<span>' + icon + '</span> ' + title +
            '</div>' +
            '<div class="toast-message">' + message.replace(/\n/g, '<br>') + '</div>' +
            '<button class="toast-close" aria-label="닫기">&times;</button>' +
            '<div class="toast-progress" style="animation-duration: ' + duration + 'ms"></div>';
        
        // 닫기 버튼
        toast.querySelector('.toast-close').addEventListener('click', function(e) {
            e.stopPropagation();
            _removeToast(toast);
        });
        
        // 토스트 클릭으로 닫기
        toast.addEventListener('click', function() {
            _removeToast(toast);
        });
        
        container.appendChild(toast);
        
        // 자동 제거
        toast._timer = setTimeout(function() {
            _removeToast(toast);
        }, duration);
    }
    
 /**
 * 토스트 제거 (애니메이션 포함)
 * @private
 * @param {HTMLElement} toast
 */
    function _removeToast(toast) {
        if (!toast || toast.classList.contains('toast-removing')) return;
        
        if (toast._timer) clearTimeout(toast._timer);
        toast.classList.add('toast-removing');
        
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
 /**
 * 개발자 정보 추가 여부
 * @private
 * @param {Object} errorInfo - 에러 정보
 * @returns {string}
 */
    function _getDeveloperInfo(errorInfo) {
        if (!_isDevelopment()) return '';
        
        let info = `\n\n[개발자 정보]`;
        info += `\n코드: ${errorInfo.code}`;
        info += `\n메시지: ${errorInfo.message}`;
        
        if (errorInfo.context && Object.keys(errorInfo.context).length > 0) {
            info += `\n컨텍스트: ${JSON.stringify(errorInfo.context)}`;
        }
        
        return info;
    }
    
 // Public API
    return {
 /**
 * 에러 처리 (통합)
 * 
 * @param {Error|인사에러|string} error - 에러 객체
 * @param {string} [userMessage] - 사용자에게 표시할 메시지
 * @param {Object} [context={}] - 추가 컨텍스트 정보
 * 
 * @example
 * try {
 * // 작업 수행
 * } catch (error) {
 * 에러처리_인사.handle(error, '저장 중 오류가 발생했습니다.');
 * }
 */
        handle(error, userMessage, context = {}) {
            try {
 // 에러 정보 추출
                const errorInfo = _extractErrorInfo(error);
                
 // 로깅 (로거가 있으면)
                if (typeof 로거_인사 !== 'undefined') {
                    로거_인사.error('에러 발생', {
                        code: errorInfo.code,
                        message: errorInfo.message,
                        context: { ...errorInfo.context, ...context }
                    });
                }
                
 // 히스토리 저장
                _saveToHistory(error, userMessage, context);
                
 // 사용자 메시지 결정
                const displayMessage = _getUserMessage(userMessage, errorInfo);
                
 // 개발 모드에서는 상세 정보 추가
                const fullMessage = displayMessage + _getDeveloperInfo(errorInfo);
                
 // 사용자에게 알림
                alert(`[오류] ${fullMessage}`);
                
            } catch (e) {
 // 에러 처리 자체가 실패하면 최소한의 알림
                console.error('에러 처리 실패:', e);
                alert('[오류] 오류가 발생했습니다.');
            }
        },
        
 /**
 * 검증 에러 목록 표시
 * 
 * @param {Array<string>} errors - 에러 메시지 배열
 * 
 * @example
 * 에러처리_인사.showValidationErrors([
 * '이름을 입력하세요.',
 * '날짜 형식이 올바르지 않습니다.'
 * ]);
 */
        showValidationErrors(errors) {
            if (!errors || errors.length === 0) return;
            
 // 로깅
            if (typeof 로거_인사 !== 'undefined') {
                로거_인사.warn('검증 오류', { errors });
            }
            
 // 메시지 구성
            const message = '[주의] 다음 항목을 확인해주세요:\n\n' +
                errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
            
            alert(message);
        },
        
 /**
 * 성공 메시지 표시
 * 
 * @param {string} message - 메시지
 * 
 * @example
 * 에러처리_인사.success('저장되었습니다.');
 */
        success(message) {
 // 로깅
            if (typeof 로거_인사 !== 'undefined') {
                로거_인사.info('성공 메시지', { message });
            }
            
            _showToast(message, 'success');
        },
        
 /**
 * 경고 메시지 표시
 * 
 * @param {string} message - 메시지
 * 
 * @example
 * 에러처리_인사.warn('이미 존재하는 데이터입니다.');
 */
        warn(message) {
 // 로깅
            if (typeof 로거_인사 !== 'undefined') {
                로거_인사.warn('경고 메시지', { message });
            }
            
            alert(`[주의] ${message}`);
        },
        
 /**
 * 정보 메시지 표시
 * 
 * @param {string} message - 메시지
 * 
 * @example
 * 에러처리_인사.info('처리가 완료되었습니다.');
 */
        info(message) {
 // 로깅
            if (typeof 로거_인사 !== 'undefined') {
                로거_인사.info('정보 메시지', { message });
            }
            
            _showToast(message, 'info');
        },
        
 /**
 * 확인 대화상자 표시
 * 
 * @param {string} message - 확인 메시지
 * @returns {boolean} 사용자 응답 (true: 확인, false: 취소)
 * 
 * @example
 * if (에러처리_인사.confirm('정말 삭제하시겠습니까?')) {
 * // 삭제 진행
 * }
 */
        confirm(message) {
 // 로깅
            if (typeof 로거_인사 !== 'undefined') {
                로거_인사.debug('확인 대화상자', { message });
            }
            
            return confirm(message);
        },
        
 /**
 * 에러 히스토리 조회
 * 
 * @returns {Array<Object>} 에러 히스토리
 * 
 * @example
 * const history = 에러처리_인사.getErrorHistory();
 */
        getErrorHistory() {
            return [..._errorHistory];
        },
        
 /**
 * 에러 히스토리 초기화
 * 
 * @example
 * 에러처리_인사.clearErrorHistory();
 */
        clearErrorHistory() {
            _errorHistory = [];
        },
        
 /**
 * 에러 히스토리 통계
 * 
 * @returns {Object} 통계 정보
 * 
 * @example
 * const stats = 에러처리_인사.getErrorStats();
 * // { total: 10, codes: { EMPLOYEE_NOT_FOUND: 3, ... } }
 */
        getErrorStats() {
            const stats = {
                total: _errorHistory.length,
                codes: {}
            };
            
            _errorHistory.forEach(entry => {
                const code = entry.error.code;
                stats.codes[code] = (stats.codes[code] || 0) + 1;
            });
            
            return stats;
        },
        
 /**
 * 에러 히스토리를 텍스트로 내보내기
 * 
 * @returns {string} 텍스트 형식
 * 
 * @example
 * const text = 에러처리_인사.exportErrorHistory();
 */
        exportErrorHistory() {
            return _errorHistory.map(entry => {
                const time = entry.timestamp;
                const code = entry.error.code;
                const message = entry.error.message;
                const userMsg = entry.userMessage || '(없음)';
                
                return `[${time}] [${code}] ${message} | 사용자 메시지: ${userMsg}`;
            }).join('\n');
        },
        
 /**
 * 특정 에러 코드의 히스토리 조회
 * 
 * @param {string} code - 에러 코드
 * @returns {Array<Object>} 필터링된 히스토리
 * 
 * @example
 * const notFoundErrors = 에러처리_인사.getErrorsByCode('EMPLOYEE_NOT_FOUND');
 */
        getErrorsByCode(code) {
            return _errorHistory.filter(entry => entry.error.code === code);
        },
        
 /**
 * 최근 에러 조회
 * 
 * @param {number} [count=10] - 조회할 개수
 * @returns {Array<Object>} 최근 에러들
 * 
 * @example
 * const recentErrors = 에러처리_인사.getRecentErrors(5);
 */
        getRecentErrors(count = 10) {
            return _errorHistory.slice(-count);
        },
        
 /**
 * 인사에러 생성 헬퍼
 * 
 * @param {string} message - 에러 메시지
 * @param {string} code - 에러 코드
 * @param {Object} [context={}] - 컨텍스트
 * @returns {인사에러}
 * 
 * @example
 * throw 에러처리_인사.createError(
 * '직원을 찾을 수 없습니다',
 * 'EMPLOYEE_NOT_FOUND',
 * { id: 'abc123' }
 * );
 */
        createError(message, code, context = {}) {
            return new 인사에러(message, code, context);
        },
        
 /**
 * 에러가 특정 코드인지 확인
 * 
 * @param {Error|인사에러} error - 에러 객체
 * @param {string} code - 에러 코드
 * @returns {boolean}
 * 
 * @example
 * if (에러처리_인사.isErrorCode(error, 'EMPLOYEE_NOT_FOUND')) {
 * // 직원을 찾을 수 없는 경우 처리
 * }
 */
        isErrorCode(error, code) {
            if (error instanceof 인사에러) {
                return error.code === code;
            }
            return false;
        },
        
 /**
 * 에러 래핑 (기존 에러를 인사에러로 변환)
 * 
 * @param {Error} originalError - 원본 에러
 * @param {string} code - 에러 코드
 * @param {Object} [context={}] - 추가 컨텍스트
 * @returns {인사에러}
 * 
 * @example
 * try {
 * JSON.parse(data);
 * } catch (error) {
 * throw 에러처리_인사.wrapError(error, 'DB_CORRUPT', { data });
 * }
 */
        wrapError(originalError, code, context = {}) {
            const wrappedError = new 인사에러(
                originalError.message,
                code,
                { ...context, originalError: originalError.name }
            );
            
 // 원본 스택 트레이스 보존
            if (originalError.stack) {
                wrappedError.stack = originalError.stack;
            }
            
            return wrappedError;
        },
        
 /**
 * 설정 정보
 * 
 * @returns {Object}
 */
        getConfig() {
            return {
                isDevelopment: _isDevelopment(),
                maxHistory: _maxHistory,
                currentHistoryCount: _errorHistory.length
            };
        }
    };
})();

/**
 * 전역 별칭 (편의성)
 * @const {Object} ErrorHandler
 */
const ErrorHandler = 에러처리_인사;

/**
 * 전역 별칭 (커스텀 에러 클래스)
 * @const {class} HRError
 */
const HRError = 인사에러;

// 초기화 로그
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
    console.log(' 에러처리_인사.js 로드 완료');
    console.log('에러 처리 설정:', 에러처리_인사.getConfig());
}
