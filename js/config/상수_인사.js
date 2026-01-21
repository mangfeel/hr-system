/**
 * 상수_인사.js
 * 
 * 인사관리시스템의 모든 상수를 중앙 관리
 * - 하드코딩 제거로 유지보수성 향상
 * - 설정 변경 시 한 곳만 수정
 * - 타입 안전성 및 문서화
 * 
 * @version 3.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v3.0 - 프로덕션급 리팩토링: 상수 중앙화
 * 
 * [사용 예시]
 * const key = CONFIG.STORAGE_KEY;
 * const prefix = CONFIG.UNIQUE_CODE.PREFIX;
 * alert(CONFIG.MESSAGES.SAVE_SUCCESS);
 */

/**
 * 인사관리시스템 전역 설정
 * @const {Object} CONFIG_인사
 * @readonly
 */
const CONFIG_인사 = Object.freeze({
    /**
     * 시스템 정보
     */
    VERSION: '3.0',
    SYSTEM_NAME: '인사관리시스템',
    
    /**
     * localStorage 설정
     */
    STORAGE_KEY: 'hr_system_v25_db', // ⚠️ 하위 호환성을 위해 v25 키 유지
    
    /**
     * 환경 설정
     */
    ENV: 'production', // 'development' | 'production'
    DEBUG: false,      // true: 개발 모드 (콘솔 로그 출력)
    
    /**
     * 고유번호 생성 규칙
     */
    UNIQUE_CODE: Object.freeze({
        PREFIX: 'H',           // 접두사
        LENGTH: 3,             // 숫자 자릿수 (001~999)
        MAX_ATTEMPTS: 100,     // 중복 검증 최대 시도 횟수
        MIN_NUMBER: 1,         // 최소 번호
        MAX_NUMBER: 999        // 최대 번호
    }),
    
    /**
     * 날짜 범위 제한
     */
    DATE_RANGE: Object.freeze({
        MIN_YEAR: 1900,        // 최소 연도
        MAX_YEAR: 2100,        // 최대 연도
        DEFAULT_FORMAT: 'YYYY-MM-DD'
    }),
    
    /**
     * 호봉 설정
     */
    RANK: Object.freeze({
        MIN: 1,                // 최소 호봉
        MAX: 99,               // 최대 호봉
        UPGRADE_INTERVAL_YEARS: 1  // 승급 주기 (년)
    }),
    
    /**
     * 승급률 설정
     */
    RATE: Object.freeze({
        MIN: 0,                // 최소 승급률 (%)
        MAX: 100,              // 최대 승급률 (%)
        DEFAULT: 100           // 기본값
    }),
    
    /**
     * 육아휴직 설정
     */
    MATERNITY: Object.freeze({
        MAX_DAYS: 1095,        // 최대 기간 (3년 = 1095일)
        MAX_YEARS: 3           // 최대 기간 (년)
    }),
    
    /**
     * 경력 설정
     */
    CAREER: Object.freeze({
        TYPES: Object.freeze({
            EDUCATION: '교육경력',
            EXPERIENCE: '경력경력'
        }),
        MIN_YEARS: 0,          // 최소 경력연수
        MAX_YEARS: 50          // 최대 경력연수
    }),
    
    /**
     * 고용 상태
     */
    EMPLOYMENT_STATUS: Object.freeze({
        ACTIVE: '재직',
        RETIRED: '퇴사'
    }),
    
    /**
     * 고용 형태
     */
    EMPLOYMENT_TYPE: Object.freeze({
        REGULAR: '정규직',
        CONTRACT: '계약직',
        PART_TIME: '파트타임'
    }),
    
    /**
     * 인사발령 유형
     */
    ASSIGNMENT_TYPES: Object.freeze({
        TRANSFER: '전보',      // 부서 이동
        PROMOTION: '승진',     // 직위 상승
        CHANGE: '전직',        // 직렬 변경
        CONCURRENT: '겸임'     // 겸직
    }),
    
    /**
     * UI 설정
     */
    UI: Object.freeze({
        ITEMS_PER_PAGE: 20,            // 페이지당 항목 수
        SEARCH_DEBOUNCE_MS: 300,       // 검색 디바운스 시간 (ms)
        ANIMATION_DURATION_MS: 200,    // 애니메이션 시간
        MODAL_FADE_MS: 150             // 모달 페이드 시간
    }),
    
    /**
     * 검증 규칙
     */
    VALIDATION: Object.freeze({
        // 주민등록번호 형식
        RESIDENT_NUMBER_PATTERN: /^\d{6}-[1-4]\d{6}$/,
        
        // 전화번호 형식
        PHONE_PATTERN: /^01[0-9]-\d{3,4}-\d{4}$/,
        
        // 이메일 형식
        EMAIL_PATTERN: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        
        // 사원번호 형식 (숫자만, 최대 20자)
        EMPLOYEE_NUMBER_PATTERN: /^\d{1,20}$/,
        
        // 날짜 형식 (YYYY-MM-DD)
        DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
        
        // 이름 길이
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 50,
        
        // 주소 길이
        ADDRESS_MAX_LENGTH: 200
    }),
    
    /**
     * 에러 코드
     */
    ERROR_CODES: Object.freeze({
        // 데이터베이스 에러
        DB_LOAD_ERROR: 'DB_LOAD_ERROR',
        DB_SAVE_ERROR: 'DB_SAVE_ERROR',
        DB_CORRUPT: 'DB_CORRUPT',
        
        // 직원 관련 에러
        EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
        EMPLOYEE_DUPLICATE: 'EMPLOYEE_DUPLICATE',
        EMPLOYEE_VALIDATION_ERROR: 'EMPLOYEE_VALIDATION_ERROR',
        
        // 고유번호 에러
        UNIQUE_CODE_DUPLICATE: 'UNIQUE_CODE_DUPLICATE',
        UNIQUE_CODE_EXHAUSTED: 'UNIQUE_CODE_EXHAUSTED',
        UNIQUE_CODE_INVALID: 'UNIQUE_CODE_INVALID',
        
        // 날짜 에러
        DATE_INVALID_FORMAT: 'DATE_INVALID_FORMAT',
        DATE_OUT_OF_RANGE: 'DATE_OUT_OF_RANGE',
        DATE_LOGIC_ERROR: 'DATE_LOGIC_ERROR',
        
        // 호봉 에러
        RANK_CALCULATION_ERROR: 'RANK_CALCULATION_ERROR',
        RANK_INVALID_DATA: 'RANK_INVALID_DATA',
        
        // 검증 에러
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
        
        // 시스템 에러
        UNKNOWN_ERROR: 'UNKNOWN_ERROR',
        OPERATION_CANCELLED: 'OPERATION_CANCELLED'
    }),
    
    /**
     * 사용자 메시지
     */
    MESSAGES: Object.freeze({
        // 성공 메시지
        SAVE_SUCCESS: '✅ 저장되었습니다.',
        DELETE_SUCCESS: '✅ 삭제되었습니다.',
        UPDATE_SUCCESS: '✅ 수정되었습니다.',
        BACKUP_SUCCESS: '✅ 백업이 완료되었습니다.',
        RESTORE_SUCCESS: '✅ 복원이 완료되었습니다.',
        IMPORT_SUCCESS: '✅ 가져오기가 완료되었습니다.',
        
        // 경고 메시지
        REQUIRED: '필수 입력 항목입니다.',
        INVALID_FORMAT: '형식이 올바르지 않습니다.',
        DUPLICATE: '중복된 값입니다.',
        OUT_OF_RANGE: '허용 범위를 벗어났습니다.',
        
        // 확인 메시지
        CONFIRM_DELETE: '정말 삭제하시겠습니까?\n⚠️ 이 작업은 되돌릴 수 없습니다.',
        CONFIRM_RESET: '⚠️ 모든 데이터가 삭제됩니다.\n정말 초기화하시겠습니까?',
        CONFIRM_RETIRE: '퇴사 처리하시겠습니까?',
        CONFIRM_CANCEL_RETIRE: '퇴사를 취소하시겠습니까?',
        
        // 에러 메시지
        ERROR_OCCURRED: '오류가 발생했습니다.',
        LOAD_ERROR: '데이터를 불러오는 중 오류가 발생했습니다.',
        SAVE_ERROR: '저장 중 오류가 발생했습니다.',
        DELETE_ERROR: '삭제 중 오류가 발생했습니다.',
        NOT_FOUND: '데이터를 찾을 수 없습니다.',
        
        // 정보 메시지
        NO_DATA: '데이터가 없습니다.',
        LOADING: '로딩 중...',
        PROCESSING: '처리 중...',
        SEARCH_NO_RESULT: '검색 결과가 없습니다.',
        
        // 검증 메시지
        INVALID_DATE: '올바른 날짜를 입력하세요. (YYYY-MM-DD)',
        INVALID_PHONE: '올바른 전화번호를 입력하세요. (예: 010-1234-5678)',
        INVALID_EMAIL: '올바른 이메일 주소를 입력하세요.',
        INVALID_RESIDENT_NUMBER: '올바른 주민등록번호를 입력하세요. (예: 900101-1234567)',
        DATE_MUST_BE_AFTER: '날짜가 올바르지 않습니다.',
        DATE_MUST_BE_BEFORE: '날짜가 올바르지 않습니다.',
        
        // 호봉 관련
        RANK_CALCULATION_FAILED: '호봉 계산에 실패했습니다.',
        RANK_NOT_APPLICABLE: '호봉제가 적용되지 않는 직원입니다.',
        
        // 육아휴직
        MATERNITY_ALREADY_ON_LEAVE: '이미 육아휴직 중입니다.',
        MATERNITY_NOT_ON_LEAVE: '육아휴직 중이 아닙니다.',
        MATERNITY_EXCEEDED_MAX: `육아휴직은 최대 3년까지 가능합니다.`,
        
        // 기타
        OPERATION_CANCELLED: '작업이 취소되었습니다.',
        FEATURE_NOT_IMPLEMENTED: '준비 중인 기능입니다.'
    }),
    
    /**
     * 로그 레벨
     */
    LOG_LEVELS: Object.freeze({
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        WARN: 'WARN',
        ERROR: 'ERROR'
    }),
    
    /**
     * 로그 설정
     */
    LOG_CONFIG: Object.freeze({
        MAX_LOGS: 100,                    // 메모리에 보관할 최대 로그 수
        CONSOLE_ENABLED: false,           // 콘솔 출력 여부 (DEBUG 모드일 때만)
        STORAGE_KEY: 'hr_system_logs',    // localStorage 키
        INCLUDE_TIMESTAMP: true,          // 타임스탬프 포함 여부
        INCLUDE_STACK_TRACE: true         // 스택 트레이스 포함 여부 (ERROR만)
    }),
    
    /**
     * 성능 설정
     */
    PERFORMANCE: Object.freeze({
        DOM_BATCH_SIZE: 50,               // DOM 업데이트 배치 크기
        USE_FRAGMENT: true,               // DocumentFragment 사용 여부
        DEBOUNCE_SEARCH: true,            // 검색 디바운스 사용 여부
        CACHE_DOM_ELEMENTS: true          // DOM 요소 캐싱 여부
    }),
    
    /**
     * 보고서 설정
     */
    REPORT: Object.freeze({
        // 연명부 기본 컬럼
        DEFAULT_COLUMNS: [
            'name', 'uniqueCode', 'dept', 'position', 
            'entryDate', 'currentRank', 'tenure'
        ],
        
        // 엑셀 파일명 형식
        EXCEL_FILENAME_FORMAT: 'YYYY-MM-DD',
        
        // 인쇄 설정
        PRINT_TITLE_PREFIX: '인사관리시스템',
        PAGE_SIZE: 'A4',
        ORIENTATION: 'landscape' // 'portrait' | 'landscape'
    }),
    
    /**
     * 백업 설정
     */
    BACKUP: Object.freeze({
        AUTO_BACKUP: false,               // 자동 백업 여부
        AUTO_BACKUP_INTERVAL_DAYS: 7,     // 자동 백업 주기 (일)
        FILENAME_PREFIX: 'hr_backup',     // 백업 파일명 접두사
        INCLUDE_TIMESTAMP: true           // 파일명에 타임스탬프 포함
    }),
    
    /**
     * 개발자 옵션 (프로덕션에서는 사용 안 함)
     */
    DEV: Object.freeze({
        MOCK_DATA_ENABLED: false,         // 목 데이터 사용 여부
        SKIP_VALIDATION: false,           // 검증 생략 여부 (위험!)
        SHOW_INTERNAL_ERRORS: false       // 내부 에러 상세 표시
    })
});

/**
 * 전역 별칭 (편의성)
 * 다른 파일에서 CONFIG로 접근 가능
 * 
 * @example
 * const key = CONFIG.STORAGE_KEY;
 * alert(CONFIG.MESSAGES.SAVE_SUCCESS);
 */
const CONFIG = CONFIG_인사;

/**
 * 설정 유틸리티
 */
const ConfigUtils = Object.freeze({
    /**
     * 개발 모드 여부 확인
     * @returns {boolean}
     */
    isDevelopment() {
        return CONFIG.ENV === 'development' || CONFIG.DEBUG;
    },
    
    /**
     * 프로덕션 모드 여부 확인
     * @returns {boolean}
     */
    isProduction() {
        return CONFIG.ENV === 'production' && !CONFIG.DEBUG;
    },
    
    /**
     * 디버그 모드 여부 확인
     * @returns {boolean}
     */
    isDebugMode() {
        return CONFIG.DEBUG === true;
    },
    
    /**
     * 고유번호 형식 검증
     * @param {string} code - 고유번호
     * @returns {boolean}
     */
    isValidUniqueCodeFormat(code) {
        if (!code || typeof code !== 'string') return false;
        const pattern = new RegExp(
            `^${CONFIG.UNIQUE_CODE.PREFIX}\\d{${CONFIG.UNIQUE_CODE.LENGTH}}$`
        );
        return pattern.test(code);
    },
    
    /**
     * 에러 코드 확인
     * @param {string} code - 에러 코드
     * @returns {boolean}
     */
    isValidErrorCode(code) {
        return Object.values(CONFIG.ERROR_CODES).includes(code);
    },
    
    /**
     * 설정값 가져오기 (안전)
     * @param {string} path - 설정 경로 (예: 'UNIQUE_CODE.PREFIX')
     * @param {*} defaultValue - 기본값
     * @returns {*}
     */
    get(path, defaultValue = null) {
        try {
            const keys = path.split('.');
            let value = CONFIG;
            
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return defaultValue;
                }
            }
            
            return value;
        } catch (error) {
            return defaultValue;
        }
    },
    
    /**
     * 전체 설정 정보 반환 (디버그용)
     * @returns {Object}
     */
    getAll() {
        return { ...CONFIG };
    },
    
    /**
     * 설정 정보 콘솔 출력 (개발 모드)
     */
    logConfig() {
        if (this.isDebugMode()) {
            console.group('📋 시스템 설정');
            console.log('버전:', CONFIG.VERSION);
            console.log('환경:', CONFIG.ENV);
            console.log('디버그 모드:', CONFIG.DEBUG);
            console.log('Storage Key:', CONFIG.STORAGE_KEY);
            console.groupEnd();
        }
    }
});

// 개발 모드에서 초기 설정 출력
if (ConfigUtils.isDebugMode()) {
    console.log('✅ 상수_인사.js 로드 완료');
    ConfigUtils.logConfig();
}
