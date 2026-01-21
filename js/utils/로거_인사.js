/**
 * 로거_인사.js
 * 
 * 체계적인 로깅 시스템
 * - 4가지 로그 레벨 (DEBUG, INFO, WARN, ERROR)
 * - 타임스탬프 자동 기록
 * - 메모리 및 localStorage 저장
 * - 개발 모드에서만 콘솔 출력
 * - 로그 검색 및 필터링
 * 
 * @version 3.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v3.0 - 프로덕션급 리팩토링: 로깅 시스템 구축
 * 
 * [의존성]
 * - 상수_인사.js (CONFIG)
 * 
 * [사용 예시]
 * 로거_인사.debug('함수 시작', { id: 123 });
 * 로거_인사.info('저장 완료', { count: 5 });
 * 로거_인사.warn('경고 메시지');
 * 로거_인사.error('에러 발생', error);
 */

/**
 * 로깅 시스템
 * @namespace 로거_인사
 */
const 로거_인사 = (function() {
    /**
     * 메모리에 저장된 로그 (최대 100개)
     * @private
     * @type {Array<Object>}
     */
    let _logs = [];
    
    /**
     * 최대 로그 개수
     * @private
     * @type {number}
     */
    const _maxLogs = typeof CONFIG !== 'undefined' 
        ? CONFIG.LOG_CONFIG.MAX_LOGS 
        : 100;
    
    /**
     * localStorage 키
     * @private
     * @type {string}
     */
    const _storageKey = typeof CONFIG !== 'undefined'
        ? CONFIG.LOG_CONFIG.STORAGE_KEY
        : 'hr_system_logs';
    
    /**
     * 콘솔 출력 여부
     * @private
     * @returns {boolean}
     */
    function _shouldLogToConsole() {
        if (typeof CONFIG === 'undefined') return false;
        return CONFIG.DEBUG === true || CONFIG.ENV === 'development';
    }
    
    /**
     * 타임스탬프 생성
     * @private
     * @returns {string} ISO 8601 형식
     */
    function _getTimestamp() {
        return new Date().toISOString();
    }
    
    /**
     * 읽기 쉬운 시간 형식 변환
     * @private
     * @param {string} isoString - ISO 8601 문자열
     * @returns {string} YYYY-MM-DD HH:MM:SS 형식
     */
    function _formatTimestamp(isoString) {
        try {
            const date = new Date(isoString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            return isoString;
        }
    }
    
    /**
     * 로그 엔트리 생성
     * @private
     * @param {string} level - 로그 레벨
     * @param {string} message - 메시지
     * @param {*} data - 추가 데이터
     * @returns {Object} 로그 엔트리
     */
    function _createLogEntry(level, message, data) {
        const entry = {
            timestamp: _getTimestamp(),
            level: level,
            message: message
        };
        
        // 데이터가 있으면 추가
        if (data !== undefined && data !== null) {
            entry.data = data;
        }
        
        // ERROR 레벨이고 스택 트레이스 포함 설정이면
        if (level === 'ERROR' && data instanceof Error) {
            if (typeof CONFIG !== 'undefined' && CONFIG.LOG_CONFIG.INCLUDE_STACK_TRACE) {
                entry.stack = data.stack;
            }
        }
        
        return entry;
    }
    
    /**
     * 로그 저장 (메모리)
     * @private
     * @param {Object} entry - 로그 엔트리
     */
    function _saveToMemory(entry) {
        _logs.push(entry);
        
        // 최대 개수 초과 시 오래된 로그 제거
        if (_logs.length > _maxLogs) {
            _logs.shift();
        }
    }
    
    /**
     * 로그 저장 (localStorage)
     * @private
     * @param {Object} entry - 로그 엔트리
     */
    function _saveToStorage(entry) {
        try {
            // 기존 로그 가져오기
            const stored = localStorage.getItem(_storageKey);
            let logs = stored ? JSON.parse(stored) : [];
            
            // 새 로그 추가
            logs.push(entry);
            
            // 최대 개수 유지
            if (logs.length > _maxLogs) {
                logs = logs.slice(-_maxLogs);
            }
            
            // 저장
            localStorage.setItem(_storageKey, JSON.stringify(logs));
        } catch (e) {
            // localStorage 저장 실패는 무시 (용량 부족 등)
            console.error('로그 저장 실패:', e);
        }
    }
    
    /**
     * 콘솔 출력
     * @private
     * @param {string} level - 로그 레벨
     * @param {string} message - 메시지
     * @param {*} data - 추가 데이터
     */
    function _logToConsole(level, message, data) {
        if (!_shouldLogToConsole()) return;
        
        const timestamp = _formatTimestamp(_getTimestamp());
        const prefix = `[${timestamp}] [${level}]`;
        
        switch (level) {
            case 'DEBUG':
                if (data !== undefined) {
                    console.debug(prefix, message, data);
                } else {
                    console.debug(prefix, message);
                }
                break;
                
            case 'INFO':
                if (data !== undefined) {
                    console.info(prefix, message, data);
                } else {
                    console.info(prefix, message);
                }
                break;
                
            case 'WARN':
                if (data !== undefined) {
                    console.warn(prefix, message, data);
                } else {
                    console.warn(prefix, message);
                }
                break;
                
            case 'ERROR':
                if (data !== undefined) {
                    console.error(prefix, message, data);
                } else {
                    console.error(prefix, message);
                }
                break;
                
            default:
                if (data !== undefined) {
                    console.log(prefix, message, data);
                } else {
                    console.log(prefix, message);
                }
        }
    }
    
    /**
     * 공통 로그 함수
     * @private
     * @param {string} level - 로그 레벨
     * @param {string} message - 메시지
     * @param {*} data - 추가 데이터
     */
    function _log(level, message, data) {
        try {
            // 로그 엔트리 생성
            const entry = _createLogEntry(level, message, data);
            
            // 메모리에 저장
            _saveToMemory(entry);
            
            // localStorage에 저장
            _saveToStorage(entry);
            
            // 콘솔 출력
            _logToConsole(level, message, data);
            
        } catch (error) {
            // 로깅 자체 실패는 콘솔에만 출력
            console.error('로깅 실패:', error);
        }
    }
    
    // Public API
    return {
        /**
         * DEBUG 레벨 로그
         * 상세한 디버깅 정보 (개발 모드에서만 유용)
         * 
         * @param {string} message - 로그 메시지
         * @param {*} [data] - 추가 데이터 (선택)
         * 
         * @example
         * 로거_인사.debug('함수 시작', { userId: 123 });
         */
        debug(message, data) {
            _log('DEBUG', message, data);
        },
        
        /**
         * INFO 레벨 로그
         * 일반적인 정보성 메시지
         * 
         * @param {string} message - 로그 메시지
         * @param {*} [data] - 추가 데이터 (선택)
         * 
         * @example
         * 로거_인사.info('저장 완료', { count: 5 });
         */
        info(message, data) {
            _log('INFO', message, data);
        },
        
        /**
         * WARN 레벨 로그
         * 경고 메시지 (문제는 아니지만 주의 필요)
         * 
         * @param {string} message - 로그 메시지
         * @param {*} [data] - 추가 데이터 (선택)
         * 
         * @example
         * 로거_인사.warn('성능 저하 감지', { loadTime: 3000 });
         */
        warn(message, data) {
            _log('WARN', message, data);
        },
        
        /**
         * ERROR 레벨 로그
         * 에러 메시지 (문제 발생)
         * 
         * @param {string} message - 로그 메시지
         * @param {*} [data] - 추가 데이터 (선택, Error 객체 포함)
         * 
         * @example
         * 로거_인사.error('저장 실패', error);
         * 로거_인사.error('API 호출 실패', { status: 500 });
         */
        error(message, data) {
            _log('ERROR', message, data);
        },
        
        /**
         * 메모리의 모든 로그 반환
         * 
         * @returns {Array<Object>} 로그 배열 (복사본)
         * 
         * @example
         * const logs = 로거_인사.getLog();
         * console.table(logs);
         */
        getLog() {
            return [..._logs];
        },
        
        /**
         * 특정 레벨의 로그만 필터링
         * 
         * @param {string} level - 로그 레벨 (DEBUG, INFO, WARN, ERROR)
         * @returns {Array<Object>} 필터링된 로그 배열
         * 
         * @example
         * const errors = 로거_인사.getLogByLevel('ERROR');
         */
        getLogByLevel(level) {
            return _logs.filter(log => log.level === level);
        },
        
        /**
         * 시간 범위로 로그 필터링
         * 
         * @param {Date|string} startTime - 시작 시간
         * @param {Date|string} endTime - 종료 시간
         * @returns {Array<Object>} 필터링된 로그 배열
         * 
         * @example
         * const recentLogs = 로거_인사.getLogByTimeRange(
         *     new Date(Date.now() - 3600000), // 1시간 전
         *     new Date()
         * );
         */
        getLogByTimeRange(startTime, endTime) {
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            
            return _logs.filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return logTime >= start && logTime <= end;
            });
        },
        
        /**
         * 메시지 검색
         * 
         * @param {string} keyword - 검색 키워드
         * @returns {Array<Object>} 검색 결과
         * 
         * @example
         * const results = 로거_인사.searchLog('저장');
         */
        searchLog(keyword) {
            const lowerKeyword = keyword.toLowerCase();
            return _logs.filter(log => 
                log.message.toLowerCase().includes(lowerKeyword)
            );
        },
        
        /**
         * 메모리 로그 초기화
         * 
         * @example
         * 로거_인사.clearLog();
         */
        clearLog() {
            _logs = [];
        },
        
        /**
         * localStorage 로그 초기화
         * 
         * @example
         * 로거_인사.clearStorageLog();
         */
        clearStorageLog() {
            try {
                localStorage.removeItem(_storageKey);
            } catch (e) {
                console.error('로그 삭제 실패:', e);
            }
        },
        
        /**
         * 모든 로그 초기화 (메모리 + localStorage)
         * 
         * @example
         * 로거_인사.clearAllLogs();
         */
        clearAllLogs() {
            this.clearLog();
            this.clearStorageLog();
        },
        
        /**
         * localStorage에서 로그 복원
         * 
         * @returns {Array<Object>} 복원된 로그 배열
         * 
         * @example
         * const logs = 로거_인사.restoreFromStorage();
         */
        restoreFromStorage() {
            try {
                const stored = localStorage.getItem(_storageKey);
                if (stored) {
                    const logs = JSON.parse(stored);
                    _logs = logs.slice(-_maxLogs); // 최대 개수만큼만
                    return [..._logs];
                }
            } catch (e) {
                console.error('로그 복원 실패:', e);
            }
            return [];
        },
        
        /**
         * 로그 통계 정보
         * 
         * @returns {Object} 통계 정보
         * 
         * @example
         * const stats = 로거_인사.getStats();
         * // { total: 50, DEBUG: 20, INFO: 15, WARN: 10, ERROR: 5 }
         */
        getStats() {
            const stats = {
                total: _logs.length,
                DEBUG: 0,
                INFO: 0,
                WARN: 0,
                ERROR: 0
            };
            
            _logs.forEach(log => {
                if (stats.hasOwnProperty(log.level)) {
                    stats[log.level]++;
                }
            });
            
            return stats;
        },
        
        /**
         * 로그를 텍스트 형식으로 내보내기
         * 
         * @returns {string} 텍스트 형식 로그
         * 
         * @example
         * const text = 로거_인사.exportAsText();
         * console.log(text);
         */
        exportAsText() {
            return _logs.map(log => {
                const time = _formatTimestamp(log.timestamp);
                const data = log.data ? ` | ${JSON.stringify(log.data)}` : '';
                return `[${time}] [${log.level}] ${log.message}${data}`;
            }).join('\n');
        },
        
        /**
         * 로그를 JSON 형식으로 내보내기
         * 
         * @returns {string} JSON 문자열
         * 
         * @example
         * const json = 로거_인사.exportAsJSON();
         * download(json, 'logs.json');
         */
        exportAsJSON() {
            return JSON.stringify(_logs, null, 2);
        },
        
        /**
         * 현재 로그 설정 정보
         * 
         * @returns {Object} 설정 정보
         */
        getConfig() {
            return {
                maxLogs: _maxLogs,
                storageKey: _storageKey,
                consoleEnabled: _shouldLogToConsole(),
                currentLogCount: _logs.length
            };
        }
    };
})();

/**
 * 전역 별칭 (편의성)
 * @const {Object} Logger
 */
const Logger = 로거_인사;

// 초기화 로그
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
    console.log('✅ 로거_인사.js 로드 완료');
    console.log('로그 설정:', 로거_인사.getConfig());
}
