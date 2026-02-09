/**
 * 시간외근무_인사.js - 시간외근무 관리
 * 
 * 월별 시간외근무 등록 및 수당 계산
 * - 시간외근무 유형 설정 (기관별 맞춤)
 * - 직원별 월단위 시간외근무 시간 등록
 * - 시간외수당 자동 계산 (급여계산기 연동)
 * - 엑셀 다운로드
 * - 인쇄 (A4 가로)
 * 
 * @version 3.0.1
 * @since 2025-12-11
 * @location js/labor/시간외근무_인사.js
 * 
 * [변경 이력]
 * v3.0.1 (2026-01-29) ⭐ 시간외수당 절사 설정 적용 버그 수정
 * - SalarySettingsManager.getOrdinarySettingsByYear()에서 overtimeRounding 직접 로드
 * - 기본값을 unit: 1 → unit: 10 (10원 단위)로 변경
 * - SalaryCalculator.getOvertimeRoundingSettings 미존재 문제 해결
 * v3.0.0 (2026-01-22) ⭐ async API 연동 버전
 * - calculateOvertimePay() async로 변경
 * - generateOvertimeList() async로 변경
 * - onOvertimeHourChange() async로 변경
 * - SalaryCalculator.getEmployeeSalaryInfo() await 추가
 * - 급여계산기 v4.0.0 API 버전 호환
 * v2.3.0 - 시급 배율 적용 절사 시점 설정 반영 (2026-01-07)
 * - 급여설정의 hourlyWageRounding.applyTiming 설정 반영
 * - 'after' (기본값): 원시급 × 배율 → 절사
 * - 'before': 원시급 → 절사 → × 배율
 * - calculateOvertimePay: rawHourlyWage 반환 추가
 * - _formatOvertimeHourlyWage: getRatedHourlyWage 사용
 * - 엑셀/인쇄: 배율 적용 시급 올바르게 표시
 * v1.6.0 - 육아휴직자 제외 옵션 추가 (2025-12-12)
 * - "육아휴직자 제외" 체크박스 추가 (기본 체크)
 * - 해당 월 전체가 육아휴직인 직원만 제외
 * - 일부 근무일이 있는 직원은 체크 여부와 관계없이 표시
 * v1.5.1 - 화면 테이블 정렬 수정 (2025-12-12)
 * - 부서, 이름 가운데 정렬
 * - 시간 입력 필드 셀 가운데 정렬
 * v1.5.0 - 기본급, 통상임금 컬럼 추가 (2025-12-12)
 * - 이름 옆에 기본급, 통상임금 컬럼 추가
 * - 화면/엑셀/인쇄 모두 적용
 * v1.4.0 - 헤더 클릭 정렬 기능 추가 (2025-12-11)
 * - 부서, 이름, 합계(시간), 시간외수당 열 클릭 시 정렬
 * - 같은 열 클릭 시 오름차순/내림차순 전환
 * - 정렬 상태 아이콘 표시 (▲▼)
 * v1.3.0 - 필터 기능 추가 (2025-12-11)
 * - 부서 드롭다운 필터 추가
 * - 성명 검색 필터 추가
 * - 필터링된 데이터로 화면/엑셀/인쇄 출력
 * - 필터 적용 시 제목에 필터 정보 표시
 * v1.2.2 - 인쇄 레이아웃 개선 (2025-12-11)
 * - 부서/상세내역 열 너비 조정 (colgroup 사용)
 * - 헤더 가운데 정렬, 금액 오른쪽 정렬 통일
 * - 전체적인 폰트 크기 및 여백 조정
 * v1.2.1 - 상세내역 절사 시점 통일 (2025-12-11)
 * - calculateOvertimePay에서 유형별로 절사 후 합산
 * - 상세내역 합 = 시간외수당 총액 일치
 * v1.2.0 - 시급/상세내역 설정 반영 (2025-12-11)
 * - 시급 소수점 표시 설정 반영 (급여현황표와 동일)
 * - "시급을 정수로 표시" 체크박스 추가
 * - 상세내역에 시간외수당 절사 방식 적용
 * - 화면/엑셀/인쇄 모두 설정 반영
 * v1.1.0 - UI 개선 및 버그 수정 (2025-12-11)
 * - 시급(1배/1.5배) 컬럼을 이름 다음에 표시
 * - 상세내역 컬럼 추가 (유형별 금액 표시)
 * - 시급 절사 호출 방식 버그 수정
 * - _formatCurrency 함수명 충돌 해결
 * v1.0.0 - 최초 생성 (2025-12-11)
 * - 시간외근무 유형 설정 기능
 * - 월별 시간외근무 등록/수정/삭제
 * - 시간외수당 자동 계산
 * - 엑셀 다운로드, 인쇄 기능
 * 
 * [시간외근무 유형]
 * - extended1x: 연장근무 (1배) - 보상휴가 대체 등
 * - extended15x: 연장근무 (1.5배) - 일반 시간외수당
 * - night: 야간근무 (+0.5배) - 22시~06시
 * - extendedNight: 연장+야간 (2.0배)
 * - holiday: 휴일근무 (1.5배) - 일요일, 공휴일
 * - holidayNight: 휴일+야간 (2.0배)
 * - holidayExtended: 휴일연장 (2.0배) - 8시간 초과
 * - holidayExtendedNight: 휴일연장+야간 (2.5배)
 * 
 * [데이터 구조]
 * - hr_overtime_settings: 사용할 유형 설정
 * - hr_overtime_records: 월별 시간외근무 기록
 * 
 * [의존성]
 * - 급여계산기_인사.js (SalaryCalculator)
 * - 급여설정_인사.js (SalarySettingsManager)
 * - 데이터베이스_인사.js (db)
 * - 직원유틸_인사.js (직원유틸_인사)
 * - DOM유틸_인사.js (DOM유틸_인사)
 * - 인쇄유틸_인사.js (인쇄유틸_인사)
 * - 로거_인사.js (로거_인사)
 * - 에러처리_인사.js (에러처리_인사)
 * - XLSX (SheetJS) - 엑셀 다운로드
 */

// ===== 상수 정의 =====

/**
 * localStorage 키
 */
const OVERTIME_SETTINGS_KEY = 'hr_overtime_settings';
const OVERTIME_RECORDS_KEY = 'hr_overtime_records';

/**
 * 시간외근무 유형 정의
 * @constant {Object}
 */
const OVERTIME_TYPES = Object.freeze({
    extended1x: {
        code: 'extended1x',
        name: '연장근무 (1배)',
        shortName: '연장1배',
        rate: 1.0,
        description: '보상휴가 대체 등',
        category: 'weekday'
    },
    extended15x: {
        code: 'extended15x',
        name: '연장근무 (1.5배)',
        shortName: '연장1.5배',
        rate: 1.5,
        description: '일반 시간외수당',
        category: 'weekday'
    },
    night: {
        code: 'night',
        name: '야간근무 (+0.5배)',
        shortName: '야간',
        rate: 1.5,  // 기본 1.0 + 야간가산 0.5
        description: '22시~06시',
        category: 'weekday'
    },
    extendedNight: {
        code: 'extendedNight',
        name: '연장+야간 (2.0배)',
        shortName: '연장야간',
        rate: 2.0,
        description: '연장과 야간 중복',
        category: 'weekday'
    },
    holiday: {
        code: 'holiday',
        name: '휴일근무 (1.5배)',
        shortName: '휴일',
        rate: 1.5,
        description: '일요일, 공휴일 (8시간 이내)',
        category: 'holiday'
    },
    holidayNight: {
        code: 'holidayNight',
        name: '휴일+야간 (2.0배)',
        shortName: '휴일야간',
        rate: 2.0,
        description: '휴일 중 야간근무',
        category: 'holiday'
    },
    holidayExtended: {
        code: 'holidayExtended',
        name: '휴일연장 (2.0배)',
        shortName: '휴일연장',
        rate: 2.0,
        description: '휴일 8시간 초과',
        category: 'holiday'
    },
    holidayExtendedNight: {
        code: 'holidayExtendedNight',
        name: '휴일연장+야간 (2.5배)',
        shortName: '휴일연장야간',
        rate: 2.5,
        description: '휴일연장 중 야간',
        category: 'holiday'
    }
});

/**
 * 기본 활성화 유형
 */
const DEFAULT_ENABLED_TYPES = {
    extended1x: true,
    extended15x: true,
    night: false,
    extendedNight: false,
    holiday: true,
    holidayNight: false,
    holidayExtended: false,
    holidayExtendedNight: false
};

// ===== 전역 변수 =====

/**
 * 현재 시간외근무 데이터 (전체)
 * @type {Array|null}
 */
let _overtimeData = null;

/**
 * 필터링된 시간외근무 데이터 (화면 표시용)
 * @type {Array|null}
 */
let _filteredOvertimeData = null;

/**
 * 현재 조회 설정
 * @type {Object|null}
 */
let _overtimeSettings = null;

/**
 * 현재 정렬 상태
 * @type {Object}
 */
let _overtimeSortState = {
    column: 'name',  // 기본: 이름순
    direction: 'asc' // asc, desc
};

// ===== 데이터 관리 =====

/**
 * 시간외근무 설정 로드
 * @returns {Object} 설정 객체
 */
function loadOvertimeSettings() {
    try {
        const data = localStorage.getItem(OVERTIME_SETTINGS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        로거_인사?.error('시간외근무 설정 로드 실패', e);
    }
    return { enabledTypes: { ...DEFAULT_ENABLED_TYPES } };
}

/**
 * 시간외근무 설정 저장
 * @param {Object} settings - 설정 객체
 */
function saveOvertimeSettings(settings) {
    try {
        localStorage.setItem(OVERTIME_SETTINGS_KEY, JSON.stringify(settings));
        로거_인사?.info('시간외근무 설정 저장 완료');
    } catch (e) {
        로거_인사?.error('시간외근무 설정 저장 실패', e);
        throw e;
    }
}

/**
 * 활성화된 시간외근무 유형 목록 조회
 * @returns {Array} 활성화된 유형 배열
 */
function getEnabledOvertimeTypes() {
    const settings = loadOvertimeSettings();
    const enabledTypes = settings.enabledTypes || DEFAULT_ENABLED_TYPES;
    
    return Object.keys(OVERTIME_TYPES)
        .filter(code => enabledTypes[code])
        .map(code => OVERTIME_TYPES[code]);
}

/**
 * 시간외근무 기록 전체 로드
 * @returns {Object} 기록 객체
 */
function loadOvertimeRecords() {
    try {
        const data = localStorage.getItem(OVERTIME_RECORDS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        로거_인사?.error('시간외근무 기록 로드 실패', e);
    }
    return {};
}

/**
 * 시간외근무 기록 저장
 * @param {Object} records - 기록 객체
 */
function saveOvertimeRecords(records) {
    try {
        localStorage.setItem(OVERTIME_RECORDS_KEY, JSON.stringify(records));
        로거_인사?.info('시간외근무 기록 저장 완료');
    } catch (e) {
        로거_인사?.error('시간외근무 기록 저장 실패', e);
        throw e;
    }
}

/**
 * 특정 연월의 시간외근무 기록 조회
 * @param {number} year - 연도
 * @param {number} month - 월
 * @returns {Object} 해당 연월 기록
 */
function getOvertimeRecordsByMonth(year, month) {
    const records = loadOvertimeRecords();
    return records[String(year)]?.[String(month)] || {};
}

/**
 * 특정 직원의 월별 시간외근무 기록 조회
 * @param {string} empId - 직원 ID
 * @param {number} year - 연도
 * @param {number} month - 월
 * @returns {Object} 해당 직원 기록
 */
function getEmployeeOvertimeRecord(empId, year, month) {
    const monthRecords = getOvertimeRecordsByMonth(year, month);
    return monthRecords[empId] || null;
}

/**
 * 직원 시간외근무 기록 저장
 * @param {string} empId - 직원 ID
 * @param {number} year - 연도
 * @param {number} month - 월
 * @param {Object} record - 기록 데이터
 */
function saveEmployeeOvertimeRecord(empId, year, month, record) {
    const records = loadOvertimeRecords();
    
    if (!records[String(year)]) {
        records[String(year)] = {};
    }
    if (!records[String(year)][String(month)]) {
        records[String(year)][String(month)] = {};
    }
    
 // 빈 기록이면 삭제
    const hasHours = Object.keys(OVERTIME_TYPES).some(code => record[code] > 0);
    if (hasHours || record.note) {
        records[String(year)][String(month)][empId] = record;
    } else {
        delete records[String(year)][String(month)][empId];
    }
    
    saveOvertimeRecords(records);
}

/**
 * 직원 시간외근무 기록 삭제
 * @param {string} empId - 직원 ID
 * @param {number} year - 연도
 * @param {number} month - 월
 */
function deleteEmployeeOvertimeRecord(empId, year, month) {
    const records = loadOvertimeRecords();
    
    if (records[String(year)]?.[String(month)]?.[empId]) {
        delete records[String(year)][String(month)][empId];
        saveOvertimeRecords(records);
        return true;
    }
    return false;
}

// ===== 시간외수당 계산 =====

/**
 * 시간외수당 계산
 * @param {string} empId - 직원 ID
 * @param {number} year - 연도
 * @param {number} month - 월
 * @param {Object} hours - 유형별 시간 {extended1x: 2, extended15x: 10, ...}
 * @returns {Object} 계산 결과 {total, details, hourlyWage, baseSalary, ordinaryWage}
 * @version 3.0.0 - async API 버전
 */
async function calculateOvertimePay(empId, year, month, hours) {
    try {
 // 해당 월 기준일 (해당 월 말일)
        const lastDay = new Date(year, month, 0).getDate();
        const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
 // 급여 정보 조회 (급여계산기의 getEmployeeSalaryInfo 활용)
        let hourlyWage = 0;      // 표시용 시급 (1배, 절사 적용)
        let rawHourlyWage = 0;   // ⭐ [v2.3.0] 원시급 (절사 전)
        let baseSalary = 0;      // 기본급
        let ordinaryWage = 0;    // 통상임금
        
        if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getEmployeeSalaryInfo) {
 // v3.0.0: async API 버전
            const salaryInfo = await SalaryCalculator.getEmployeeSalaryInfo(empId, targetDate);
            if (salaryInfo) {
 // 기본급, 통상임금 저장
                baseSalary = salaryInfo.baseSalary || 0;
                ordinaryWage = salaryInfo.ordinaryWage || 0;
                
 // ⭐ [v2.3.0] 원시급 저장 (배율 적용 계산용) - rawHourlyWage 우선 사용
                rawHourlyWage = salaryInfo.rawHourlyWage || salaryInfo.hourlyWage || 0;
                
 // 표시용 시급 (1배, 절사 적용) - 이미 절사된 hourlyWage 사용
                hourlyWage = salaryInfo.hourlyWage || 0;
            }
        }
        
 // 시간외수당 절사 설정 조회
 // ⭐ [v2.3.1] SalarySettingsManager에서 직접 설정 가져오기
        let overtimeRounding = { unit: 10, method: 'round' };  // 기본값: 10원 단위 반올림
        try {
            if (typeof SalarySettingsManager !== 'undefined' && SalarySettingsManager.getOrdinarySettingsByYear) {
                const ordinarySettings = SalarySettingsManager.getOrdinarySettingsByYear(year);
                if (ordinarySettings && ordinarySettings.overtimeRounding) {
                    overtimeRounding = ordinarySettings.overtimeRounding;
                }
            }
        } catch (e) {
            로거_인사?.warn('시간외수당 절사 설정 로드 실패, 기본값 사용', e);
        }
        
 // 유형별 수당 계산 (각 유형별로 절사 적용 후 합산)
        const details = {};
        let total = 0;
        
        const enabledTypes = getEnabledOvertimeTypes();
        enabledTypes.forEach(type => {
            const h = hours[type.code] || 0;
            if (h > 0) {
 // ⭐ [v2.3.0] 배율 적용 시급 계산 (applyTiming 설정 반영)
                let ratedHourlyWage;
                if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getRatedHourlyWage) {
                    ratedHourlyWage = SalaryCalculator.getRatedHourlyWage(rawHourlyWage, type.rate, year);
                } else {
 // fallback: 기존 방식 (절사된 시급 × 배율)
                    ratedHourlyWage = hourlyWage * type.rate;
                }
                
 // 수당 계산: 배율 적용 시급 × 시간
                let pay = ratedHourlyWage * h;
                
 // 시간외수당 절사 적용
                pay = _applyRounding(pay, overtimeRounding);
                
                details[type.code] = {
                    hours: h,
                    rate: type.rate,
                    pay: pay
                };
                total += pay;
            }
        });
        
 // total은 이미 절사된 금액들의 합이므로 추가 절사 불필요
        
 // ⭐ [v2.3.0] rawHourlyWage도 반환 (배율 적용 계산용)
        return { total, details, hourlyWage, rawHourlyWage, baseSalary, ordinaryWage };
        
    } catch (e) {
        로거_인사?.error('시간외수당 계산 실패', e);
        return { total: 0, details: {}, hourlyWage: 0, rawHourlyWage: 0, baseSalary: 0, ordinaryWage: 0 };
    }
}

/**
 * 절사 적용 (내부용)
 * @param {number} amount - 금액
 * @param {Object} rounding - 절사 설정 {unit, method}
 * @returns {number} 절사 적용된 금액
 */
function _applyRounding(amount, rounding) {
    if (!amount) return 0;
    if (!rounding) return Math.round(amount);
    
    const { unit = 1, method = 'round' } = rounding;
    
    if (unit <= 1) {
        switch (method) {
            case 'floor': return Math.floor(amount);
            case 'ceil': return Math.ceil(amount);
            default: return Math.round(amount);
        }
    }
    
    switch (method) {
        case 'floor': return Math.floor(amount / unit) * unit;
        case 'ceil': return Math.ceil(amount / unit) * unit;
        default: return Math.round(amount / unit) * unit;
    }
}

// ===== 모듈 초기화 =====

/**
 * 시간외근무 모듈 로드
 */
function loadOvertimeModule() {
    try {
        로거_인사?.debug('시간외근무 모듈 로드 시작');
        
        const container = document.getElementById('module-overtime');
        if (!container) {
            로거_인사?.error('시간외근무 컨테이너를 찾을 수 없음');
            return;
        }
        
        container.innerHTML = _generateOvertimeHTML();
        
 // 기본값 설정 (현재 연월)
        _setDefaultOvertimeDateValues();
        
        로거_인사?.info('시간외근무 모듈 로드 완료');
        
    } catch (e) {
        로거_인사?.error('시간외근무 모듈 로드 실패', e);
        에러처리_인사?.handleError(e, '시간외근무 모듈 로드 실패');
    }
}

/**
 * 기본 날짜 값 설정
 */
function _setDefaultOvertimeDateValues() {
    const now = new Date();
    const yearSelect = document.getElementById('overtimeYear');
    const monthSelect = document.getElementById('overtimeMonth');
    
    if (yearSelect) {
        yearSelect.value = now.getFullYear();
    }
    if (monthSelect) {
        monthSelect.value = now.getMonth() + 1;
    }
}

// ===== HTML 생성 =====

/**
 * 메인 HTML 생성
 */
function _generateOvertimeHTML() {
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
        yearOptions.push(`<option value="${y}">${y}년</option>`);
    }
    
    const monthOptions = [];
    for (let m = 1; m <= 12; m++) {
        monthOptions.push(`<option value="${m}">${m}월</option>`);
    }
    
    return `
        <div class="card">
            <div class="card-title">⏰ 시간외근무 관리</div>
            <div class="alert alert-info">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span>월별 시간외근무 시간을 등록하면 수당이 자동 계산됩니다. 시급은 급여설정의 통상임금 기준으로 계산됩니다.</span>
            </div>
            
            <!-- 조회 조건 -->
            <div class="filter-section" style="display:flex;gap:16px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <label style="font-weight:500;">기준연월:</label>
                    <select id="overtimeYear" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                        ${yearOptions.join('')}
                    </select>
                    <select id="overtimeMonth" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                        ${monthOptions.join('')}
                    </select>
                </div>
                
                <button onclick="generateOvertimeList()" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;">
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> 조회
                </button>
                
                <button onclick="openOvertimeSettings()" class="btn btn-secondary" style="display:flex;align-items:center;gap:6px;">
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> 유형 설정
                </button>
                
                <!-- 육아휴직자 제외 옵션 -->
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:8px 12px;background:#fef3c7;border-radius:6px;border:1px solid #fcd34d;">
                    <input type="checkbox" id="overtimeExcludeMaternity" checked>
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 육아휴직자 제외</span>
                </label>
                
                <!-- 소수점 표시 옵션 (소수점 유지 설정일 때만 표시) -->
                <div id="overtimeDecimalOptions" style="display:none;align-items:center;gap:8px;padding:8px 12px;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                        <input type="checkbox" id="overtimeShowInteger" onchange="_onOvertimeDecimalOptionChange()">
                        <span>시급을 정수로 표시</span>
                    </label>
                </div>
                
                <div style="margin-left:auto;display:flex;gap:8px;">
                    <button onclick="downloadOvertimeExcel()" class="btn btn-success" style="display:flex;align-items:center;gap:6px;" id="btnOvertimeExcel" disabled>
                        <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> 엑셀
                    </button>
                    <button onclick="printOvertimeList()" class="btn btn-secondary" style="display:flex;align-items:center;gap:6px;" id="btnOvertimePrint" disabled>
                        <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></span> 인쇄
                    </button>
                </div>
            </div>
            
            <!-- 필터 영역 (조회 후 표시) -->
            <div id="overtimeFilterSection" style="display:none;margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <label style="font-weight:500;font-size:13px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> 필터:</label>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <label style="font-size:13px;">부서:</label>
                        <select id="overtimeDeptFilter" onchange="_applyOvertimeFilter()" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">
                            <option value="">전체</option>
                        </select>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <label style="font-size:13px;">성명:</label>
                        <input type="text" id="overtimeNameFilter" oninput="_applyOvertimeFilter()" placeholder="이름 검색" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;width:100px;">
                    </div>
                    <button onclick="_clearOvertimeFilter()" class="btn btn-sm" style="padding:5px 10px;font-size:12px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;">
                        초기화
                    </button>
                    <div style="margin-left:auto;font-size:13px;color:#6b7280;" id="overtimeFilterInfo"></div>
                </div>
            </div>
            
            <!-- 결과 영역 -->
            <div id="overtimeResult"></div>
        </div>
    `;
}

// ===== 시간외근무 목록 조회 =====

/**
 * 시간외근무 목록 생성
 * @version 3.0.0 - async API 버전
 */
async function generateOvertimeList() {
    try {
        const year = parseInt(document.getElementById('overtimeYear')?.value);
        const month = parseInt(document.getElementById('overtimeMonth')?.value);
        
        if (!year || !month) {
            alert('연월을 선택해주세요.');
            return;
        }
        
        로거_인사?.info(`시간외근무 목록 조회: ${year}년 ${month}월`);
        
 // 시급 절사 설정 확인
        let isDecimalMode = false;
        let hourlyWageRounding = { type: 'integer', unit: 1, method: 'floor' };
        let overtimeRounding = { unit: 10, method: 'round' };  // ⭐ [v2.3.1] 기본값 10원 단위
        
        if (typeof SalarySettingsManager !== 'undefined' && SalarySettingsManager.getOrdinarySettingsByYear) {
            const ordinarySettings = SalarySettingsManager.getOrdinarySettingsByYear(year) || {};
            hourlyWageRounding = ordinarySettings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor' };
            overtimeRounding = ordinarySettings.overtimeRounding || { unit: 10, method: 'round' };  // ⭐ [v2.3.1] 기본값 10원 단위
            isDecimalMode = hourlyWageRounding.type === 'decimal';
        }
        
 // 소수점 유지 설정일 때 체크박스 표시
        const decimalOptionsEl = document.getElementById('overtimeDecimalOptions');
        if (decimalOptionsEl) {
            decimalOptionsEl.style.display = isDecimalMode ? 'flex' : 'none';
        }
        
 // 현재 설정 저장
        _overtimeSettings = { 
            year, month, 
            isDecimalMode, hourlyWageRounding, overtimeRounding 
        };
        
 // 육아휴직자 제외 옵션
        const excludeMaternity = document.getElementById('overtimeExcludeMaternity')?.checked || false;
        
 // 재직 직원 조회
        const employees = _getEmployeesWorkedInMonth(year, month, excludeMaternity);
        if (employees.length === 0) {
            document.getElementById('overtimeResult').innerHTML = `
                <div class="alert alert-warning">
                    <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                    <span>해당 월에 근무한 직원이 없습니다.${excludeMaternity ? ' (육아휴직자 제외됨)' : ''}</span>
                </div>
            `;
            return;
        }
        
 // ⭐ v3.0.0: 배치 API로 호봉 계산 (성능 최적화)
        const lastDay = new Date(year, month, 0).getDate();
        const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        if (typeof API_인사 !== 'undefined' && typeof API_인사.calculateBatchForEmployees === 'function') {
            try {
                const uncachedEmployees = employees.filter(emp => {
                    const hasStoredRankInfo = emp.rank?.startRank && emp.rank?.firstUpgradeDate;
                    const isRankBased = emp.rank?.isRankBased !== false && hasStoredRankInfo;
                    return isRankBased;
                });
                
                if (uncachedEmployees.length > 0) {
                    console.log('[시간외근무] 배치 API 시작:', uncachedEmployees.length, '명');
                    await API_인사.calculateBatchForEmployees(uncachedEmployees, targetDate);
                    console.log('[시간외근무] 배치 API 완료');
                }
            } catch (e) {
                console.error('[시간외근무] 배치 API 오류:', e);
            }
        }
        
 // 기존 시간외근무 기록 로드
        const monthRecords = getOvertimeRecordsByMonth(year, month);
        
 // 직원별 데이터 생성 - v3.0.0: async API 버전
        const enabledTypes = getEnabledOvertimeTypes();
        _overtimeData = await Promise.all(employees.map(async (emp) => {
            const record = monthRecords[emp.id] || {};
            const hours = {};
            enabledTypes.forEach(type => {
                hours[type.code] = record[type.code] || 0;
            });
            
 // 시간외수당 계산
            const calculation = await calculateOvertimePay(emp.id, year, month, hours);
            
            return {
                emp,
                hours,
                note: record.note || '',
                calculation
            };
        }));
        
 // 필터링된 데이터 초기화 (전체)
        _filteredOvertimeData = [..._overtimeData];
        
 // 부서 목록 수집 및 필터 드롭다운 채우기
        _initOvertimeFilter();
        
 // 필터 섹션 표시
        const filterSection = document.getElementById('overtimeFilterSection');
        if (filterSection) {
            filterSection.style.display = 'block';
        }
        
 // 테이블 렌더링
        _renderOvertimeTable(enabledTypes);
        
 // 버튼 활성화
        document.getElementById('btnOvertimeExcel').disabled = false;
        document.getElementById('btnOvertimePrint').disabled = false;
        
    } catch (e) {
        로거_인사?.error('시간외근무 목록 생성 실패', e);
        에러처리_인사?.handleError(e, '시간외근무 목록 생성 실패');
    }
}

/**
 * 해당 월에 근무한 직원 조회
 * - 해당 월에 하루라도 근무했으면 포함 (중도퇴사자 포함)
 * @param {number} year - 연도
 * @param {number} month - 월
 * @returns {Array} 직원 배열
 */
function _getEmployeesWorkedInMonth(year, month, excludeMaternity = false) {
    try {
 // 해당 월의 시작일과 종료일
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
 // DB 접근 (여러 방식 호환)
        let allEmployees = [];
        if (typeof db !== 'undefined') {
            if (typeof db.getEmployees === 'function') {
                allEmployees = db.getEmployees() || [];
            } else if (db.data?.employees) {
                allEmployees = db.data.employees;
            } else if (typeof db.getAll === 'function') {
                allEmployees = db.getAll() || [];
            }
        }
        
        if (allEmployees.length === 0) {
            로거_인사?.warn('직원 데이터를 찾을 수 없음');
            return [];
        }
        
        return allEmployees.filter(emp => {
            if (!emp) return false;
            
 // 입사일 확인: 해당 월 말일 이전에 입사해야 함
 // ️ entryDate 사용 (hireDate 아님)
            const entryDate = emp.employment?.entryDate;
            if (!entryDate || entryDate > monthEnd) return false;
            
 // 퇴사일 확인: 퇴사일이 없거나, 해당 월 1일 이후 퇴사
 // → 해당 월에 하루라도 근무했으면 포함
            const retireDate = emp.employment?.retirementDate;
            if (retireDate && retireDate < monthStart) return false;
            
 // 육아휴직자 제외 옵션
            if (excludeMaternity) {
 // 해당 월 전체가 육아휴직인지 확인
                if (_isFullMonthMaternityLeave(emp, monthStart, monthEnd)) {
                    로거_인사?.debug(`육아휴직 제외: ${emp.personalInfo?.name} (${monthStart} ~ ${monthEnd} 전체 휴직)`);
                    return false;
                }
            }
            
            return true;
        }).sort((a, b) => {
 // 이름 순 정렬
            const nameA = a.personalInfo?.name || '';
            const nameB = b.personalInfo?.name || '';
            return nameA.localeCompare(nameB);
        });
        
    } catch (e) {
        로거_인사?.error('직원 조회 실패', e);
        return [];
    }
}

/**
 * 해당 월 전체가 육아휴직 기간인지 확인
 * @param {Object} emp - 직원 객체
 * @param {string} monthStart - 월 시작일 (YYYY-MM-01)
 * @param {string} monthEnd - 월 종료일 (YYYY-MM-DD)
 * @returns {boolean} 전체 휴직 여부
 */
function _isFullMonthMaternityLeave(emp, monthStart, monthEnd) {
    try {
        const history = emp.maternityLeave?.history;
        if (!history || history.length === 0) return false;
        
 // 어떤 휴직 이력이 해당 월 전체를 포함하는지 확인
        for (const leave of history) {
            const leaveStart = leave.startDate;
 // 복직일이 있으면 복직일, 없으면 예정종료일 사용
            const leaveEnd = leave.returnedAt || leave.plannedEndDate;
            
            if (!leaveStart || !leaveEnd) continue;
            
 // 휴직 시작일 <= 월 시작일 AND 휴직 종료일 >= 월 종료일
 // → 해당 월 전체가 휴직 기간에 포함됨
            if (leaveStart <= monthStart && leaveEnd >= monthEnd) {
                return true;
            }
        }
        
        return false;
    } catch (e) {
        로거_인사?.error('육아휴직 확인 실패', e);
        return false;
    }
}

/**
 * 시간외근무 테이블 렌더링
 */
function _renderOvertimeTable(enabledTypes) {
 // 필터링된 데이터 사용 (없으면 전체 데이터)
    const displayData = _filteredOvertimeData || _overtimeData;
    
    if (!displayData || displayData.length === 0) {
        document.getElementById('overtimeResult').innerHTML = `
            <div class="alert alert-warning">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                <span>조회된 데이터가 없습니다.</span>
            </div>
        `;
        return;
    }
    
    const { year, month, isDecimalMode, overtimeRounding } = _overtimeSettings;
    const showAsInteger = document.getElementById('overtimeShowInteger')?.checked || false;
    
 // 헤더 생성
    const typeHeaders = enabledTypes.map(type => 
        `<th style="min-width:70px;">${type.shortName}<br><small style="color:#6b7280;">×${type.rate}</small></th>`
    ).join('');
    
 // 행 생성
    let totalPay = 0;
    const rows = displayData.map((data, index) => {
        const emp = data.emp;
        const name = emp.personalInfo?.name || '이름없음';
        const dept = emp.assignments?.[0]?.dept || emp.currentPosition?.dept || '';
        
 // 기본급, 통상임금
        const baseSalary = data.calculation?.baseSalary || 0;
        const ordinaryWage = data.calculation?.ordinaryWage || 0;
        
 // ⭐ [v2.3.0] 시급 (1배 / 1.5배) - rawHourlyWage 사용
        const rawHourlyWage = data.calculation?.rawHourlyWage || data.calculation?.hourlyWage || 0;
        const hourlyWage1x = _formatOvertimeHourlyWage(rawHourlyWage, 1);
        const hourlyWage15x = _formatOvertimeHourlyWage(rawHourlyWage, 1.5);
        
 // 시간 입력 필드
        const hourInputs = enabledTypes.map(type => {
            const hours = data.hours[type.code] || 0;
            return `<td style="text-align:center;">
                <input type="number" 
                    class="overtime-hour-input" 
                    data-emp-id="${emp.id}" 
                    data-type="${type.code}"
                    value="${hours || ''}" 
                    min="0" 
                    max="100"
                    style="width:60px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;text-align:center;"
                    oninput="onOvertimeHourChange('${emp.id}', '${type.code}', this.value)">
            </td>`;
        }).join('');
        
 // 합계 시간
        const totalHours = Object.values(data.hours).reduce((sum, h) => sum + (h || 0), 0);
        
 // 시간외수당
        const pay = data.calculation?.total || 0;
        totalPay += pay;
        
 // 상세내역 생성 (각 유형별 금액 - 절사 적용)
        const details = data.calculation?.details || {};
        const detailParts = enabledTypes
            .filter(type => details[type.code]?.pay > 0)
            .map(type => {
 // 이미 calculateOvertimePay에서 절사 적용됨
                return `${type.shortName}: ${details[type.code].pay.toLocaleString('ko-KR')}원`;
            });
        const detailText = detailParts.join(', ') || '-';
        
        return `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td style="text-align:center;">${dept}</td>
                <td style="text-align:center;"><strong>${name}</strong></td>
                <td style="text-align:right;font-size:12px;">${baseSalary.toLocaleString('ko-KR')}</td>
                <td style="text-align:right;font-size:12px;">${ordinaryWage.toLocaleString('ko-KR')}</td>
                <td style="text-align:right;font-size:12px;">${hourlyWage1x}</td>
                <td style="text-align:right;font-size:12px;">${hourlyWage15x}</td>
                ${hourInputs}
                <td style="text-align:center;font-weight:500;">${totalHours || '-'}</td>
                <td style="text-align:right;font-weight:600;color:#4f46e5;">${_formatOvertimeCurrency(pay)}</td>
                <td style="font-size:11px;color:#6b7280;">${detailText}</td>
            </tr>
        `;
    }).join('');
    
    const html = `
        <div style="margin-bottom:16px;">
            <h3 style="margin:0;font-size:18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> ${year}년 ${month}월 시간외근무 현황</h3>
            <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">
                직원 수: ${_overtimeData.length}명 | 
                총 시간외수당: <strong style="color:#4f46e5;">${_formatOvertimeCurrency(totalPay)}</strong>
            </p>
        </div>
        
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="width:50px;">No</th>
                        <th style="min-width:100px;cursor:pointer;" onclick="_sortOvertimeData('dept')" title="클릭하여 정렬">
                            부서 ${_getSortIcon('dept')}
                        </th>
                        <th style="min-width:80px;cursor:pointer;" onclick="_sortOvertimeData('name')" title="클릭하여 정렬">
                            이름 ${_getSortIcon('name')}
                        </th>
                        <th style="width:85px;">기본급</th>
                        <th style="width:85px;">통상임금</th>
                        <th style="width:70px;">시급<br><small>(1배)</small></th>
                        <th style="width:70px;">시급<br><small>(1.5배)</small></th>
                        ${typeHeaders}
                        <th style="width:60px;cursor:pointer;" onclick="_sortOvertimeData('totalHours')" title="클릭하여 정렬">
                            합계 ${_getSortIcon('totalHours')}<br><small>(시간)</small>
                        </th>
                        <th style="min-width:100px;cursor:pointer;" onclick="_sortOvertimeData('pay')" title="클릭하여 정렬">
                            시간외수당 ${_getSortIcon('pay')}
                        </th>
                        <th style="min-width:180px;">상세내역</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot>
                    <tr style="background:#f1f5f9;font-weight:600;">
                        <td colspan="7" style="text-align:center;">합계</td>
                        ${enabledTypes.map(type => {
                            const sum = displayData.reduce((s, d) => s + (d.hours[type.code] || 0), 0);
                            return `<td style="text-align:center;">${sum || '-'}</td>`;
                        }).join('')}
                        <td style="text-align:center;">
                            ${displayData.reduce((s, d) => s + Object.values(d.hours).reduce((ss, h) => ss + (h || 0), 0), 0)}
                        </td>
                        <td style="text-align:right;color:#4f46e5;">${_formatOvertimeCurrency(totalPay)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div style="margin-top:16px;display:flex;gap:12px;">
            <button onclick="saveAllOvertimeRecords()" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></span> 전체 저장
            </button>
        </div>
        
        <style>
            .overtime-hour-input:focus {
                outline: none;
                border-color: #4f46e5;
                box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
            }
            .data-table th,
            .data-table td {
                padding: 10px 8px;
                border: 1px solid #e5e7eb;
                vertical-align: middle;
            }
            .data-table th {
                font-weight: 600;
                text-align: center;
                font-size: 13px;
            }
            .data-table th[onclick] {
                cursor: pointer;
                user-select: none;
                transition: background 0.15s;
            }
            .data-table th[onclick]:hover {
                background: #e0e7ff;
            }
            .data-table tbody tr:hover {
                background: #f9fafb;
            }
        </style>
    `;
    
    document.getElementById('overtimeResult').innerHTML = html;
}

// ===== 이벤트 핸들러 =====

/**
 * 시간 변경 이벤트
 * @version 3.0.0 - async API 버전
 */
async function onOvertimeHourChange(empId, typeCode, value) {
    const hours = parseInt(value) || 0;
    
 // 데이터 업데이트
    const dataItem = _overtimeData?.find(d => d.emp.id === empId);
    if (dataItem) {
        dataItem.hours[typeCode] = hours;
        
 // 수당 재계산 - v3.0.0: async API 버전
        const { year, month } = _overtimeSettings;
        dataItem.calculation = await calculateOvertimePay(empId, year, month, dataItem.hours);
        
 // 해당 행 업데이트
        _updateRowCalculation(empId, dataItem);
    }
}

/**
 * 비고 변경 이벤트
 */
function onOvertimeNoteChange(empId, value) {
    const dataItem = _overtimeData?.find(d => d.emp.id === empId);
    if (dataItem) {
        dataItem.note = value;
    }
}

/**
 * 행 계산 업데이트
 */
function _updateRowCalculation(empId, dataItem) {
 // 합계 시간
    const totalHours = Object.values(dataItem.hours).reduce((sum, h) => sum + (h || 0), 0);
    
 // 해당 행 찾기
    const row = document.querySelector(`input[data-emp-id="${empId}"]`)?.closest('tr');
    if (row) {
        const cells = row.querySelectorAll('td');
        const enabledTypes = getEnabledOvertimeTypes();
        
 // 셀 인덱스: No(0), 부서(1), 이름(2), 기본급(3), 통상임금(4), 시급1배(5), 시급1.5배(6), 유형들..., 합계, 시간외수당, 상세내역
        const totalHoursIdx = 7 + enabledTypes.length;
        const payIdx = totalHoursIdx + 1;
        const detailIdx = payIdx + 1;
        
 // 합계 시간 셀 업데이트
        if (cells[totalHoursIdx]) {
            cells[totalHoursIdx].textContent = totalHours || '-';
            cells[totalHoursIdx].style.fontWeight = '500';
            cells[totalHoursIdx].style.textAlign = 'center';
        }
        
 // 시간외수당 셀 업데이트
        if (cells[payIdx]) {
            cells[payIdx].textContent = _formatOvertimeCurrency(dataItem.calculation?.total || 0);
            cells[payIdx].style.fontWeight = '600';
            cells[payIdx].style.color = '#4f46e5';
            cells[payIdx].style.textAlign = 'right';
        }
        
 // 상세내역 셀 업데이트 (절사 적용)
        if (cells[detailIdx]) {
            const details = dataItem.calculation?.details || {};
            const detailParts = enabledTypes
                .filter(type => details[type.code]?.pay > 0)
                .map(type => {
 // 이미 calculateOvertimePay에서 절사 적용됨
                    return `${type.shortName}: ${details[type.code].pay.toLocaleString('ko-KR')}원`;
                });
            cells[detailIdx].textContent = detailParts.join(', ') || '-';
            cells[detailIdx].style.fontSize = '11px';
            cells[detailIdx].style.color = '#6b7280';
        }
    }
    
 // 하단 합계 업데이트
    _updateTotalRow();
}

/**
 * 전체 합계 행 업데이트
 */
function _updateTotalRow() {
    const tfoot = document.querySelector('#overtimeResult tfoot tr');
    if (!tfoot || !_overtimeData) return;
    
 // 필터링된 데이터 사용
    const displayData = _filteredOvertimeData || _overtimeData;
    const enabledTypes = getEnabledOvertimeTypes();
    const cells = tfoot.querySelectorAll('td');
    
 // 유형별 합계 (첫 번째 셀은 "합계" colspan=7)
    enabledTypes.forEach((type, idx) => {
        const sum = displayData.reduce((s, d) => s + (d.hours[type.code] || 0), 0);
        if (cells[idx + 1]) {  // +1은 "합계" 셀 다음
            cells[idx + 1].textContent = sum || '-';
        }
    });
    
 // 전체 시간 합계
    const totalHoursIdx = enabledTypes.length + 1;
    if (cells[totalHoursIdx]) {
        const totalHours = displayData.reduce((s, d) => 
            s + Object.values(d.hours).reduce((ss, h) => ss + (h || 0), 0), 0);
        cells[totalHoursIdx].textContent = totalHours;
    }
    
 // 전체 수당 합계
    const totalPayIdx = totalHoursIdx + 1;
    if (cells[totalPayIdx]) {
        const totalPay = displayData.reduce((s, d) => s + (d.calculation?.total || 0), 0);
        cells[totalPayIdx].textContent = _formatOvertimeCurrency(totalPay);
    }
}

// ===== 저장 =====

/**
 * 전체 시간외근무 기록 저장
 */
function saveAllOvertimeRecords() {
    try {
        if (!_overtimeData || !_overtimeSettings) {
            alert('저장할 데이터가 없습니다.');
            return;
        }
        
        const { year, month } = _overtimeSettings;
        
 // 각 직원별 저장
        _overtimeData.forEach(data => {
            const record = {
                ...data.hours,
                note: data.note || ''
            };
            saveEmployeeOvertimeRecord(data.emp.id, year, month, record);
        });
        
        alert(`${year}년 ${month}월 시간외근무 기록이 저장되었습니다.`);
        로거_인사?.info(`시간외근무 기록 저장 완료: ${year}년 ${month}월`);
        
    } catch (e) {
        로거_인사?.error('시간외근무 기록 저장 실패', e);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// ===== 설정 모달 =====

/**
 * 시간외근무 유형 설정 모달 열기
 */
function openOvertimeSettings() {
    const settings = loadOvertimeSettings();
    const enabledTypes = settings.enabledTypes || DEFAULT_ENABLED_TYPES;
    
 // 평일 유형
    const weekdayTypes = Object.values(OVERTIME_TYPES).filter(t => t.category === 'weekday');
    const weekdayCheckboxes = weekdayTypes.map(type => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" 
                id="ot_${type.code}" 
                ${enabledTypes[type.code] ? 'checked' : ''}
                style="width:18px;height:18px;">
            <span>
                <strong>${type.name}</strong>
                <small style="color:#6b7280;margin-left:8px;">${type.description}</small>
            </span>
        </label>
    `).join('');
    
 // 휴일 유형
    const holidayTypes = Object.values(OVERTIME_TYPES).filter(t => t.category === 'holiday');
    const holidayCheckboxes = holidayTypes.map(type => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" 
                id="ot_${type.code}" 
                ${enabledTypes[type.code] ? 'checked' : ''}
                style="width:18px;height:18px;">
            <span>
                <strong>${type.name}</strong>
                <small style="color:#6b7280;margin-left:8px;">${type.description}</small>
            </span>
        </label>
    `).join('');
    
    const modalHtml = `
        <div id="overtimeSettingsModal" class="modal-overlay" style="display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);justify-content:center;align-items:center;z-index:1000;">
            <div class="modal-content" style="background:white;border-radius:12px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding:20px;border-bottom:1px solid #e5e7eb;">
                    <h3 style="margin:0;font-size:18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> 시간외근무 유형 설정</h3>
                    <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">사용할 시간외근무 유형을 선택하세요.</p>
                </div>
                
                <div style="padding:20px;">
                    <div style="margin-bottom:20px;">
                        <h4 style="margin:0 0 12px;font-size:14px;color:#374151;">▸ 평일</h4>
                        <div style="padding-left:12px;border-left:3px solid #e5e7eb;">
                            ${weekdayCheckboxes}
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin:0 0 12px;font-size:14px;color:#374151;">▸ 휴일 (일요일, 공휴일)</h4>
                        <div style="padding-left:12px;border-left:3px solid #e5e7eb;">
                            ${holidayCheckboxes}
                        </div>
                    </div>
                </div>
                
                <div style="padding:16px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:12px;">
                    <button onclick="closeOvertimeSettingsModal()" class="btn btn-secondary">취소</button>
                    <button onclick="saveOvertimeSettingsFromModal()" class="btn btn-primary">저장</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 설정 모달 닫기
 */
function closeOvertimeSettingsModal() {
    const modal = document.getElementById('overtimeSettingsModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * 설정 모달에서 저장
 */
function saveOvertimeSettingsFromModal() {
    try {
        const enabledTypes = {};
        
        Object.keys(OVERTIME_TYPES).forEach(code => {
            const checkbox = document.getElementById(`ot_${code}`);
            enabledTypes[code] = checkbox?.checked || false;
        });
        
 // 최소 1개 이상 선택 확인
        const hasEnabled = Object.values(enabledTypes).some(v => v);
        if (!hasEnabled) {
            alert('최소 1개 이상의 유형을 선택해주세요.');
            return;
        }
        
        saveOvertimeSettings({ enabledTypes });
        closeOvertimeSettingsModal();
        
 // 목록 새로고침
        if (_overtimeSettings) {
            generateOvertimeList();
        }
        
        alert('시간외근무 유형 설정이 저장되었습니다.');
        
    } catch (e) {
        로거_인사?.error('시간외근무 설정 저장 실패', e);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// ===== 엑셀 다운로드 =====

/**
 * 엑셀 다운로드 (필터링된 데이터)
 */
function downloadOvertimeExcel() {
    try {
 // 필터링된 데이터 사용
        const exportData = _filteredOvertimeData || _overtimeData;
        
        if (!exportData || exportData.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        
        const { year, month, isDecimalMode } = _overtimeSettings;
        const showAsInteger = document.getElementById('overtimeShowInteger')?.checked || false;
        const enabledTypes = getEnabledOvertimeTypes();
        
 // 필터 정보
        const deptFilter = document.getElementById('overtimeDeptFilter')?.value || '';
        const nameFilter = document.getElementById('overtimeNameFilter')?.value || '';
        const isFiltered = deptFilter || nameFilter;
        
 // 헤더
        const headers = ['No', '부서', '이름', '기본급', '통상임금', '시급(1배)', '시급(1.5배)'];
        enabledTypes.forEach(type => headers.push(`${type.shortName}(×${type.rate})`));
        headers.push('합계(시간)', '시간외수당', '상세내역');
        
 // 데이터
        const rows = exportData.map((data, index) => {
            const hourlyWage = data.calculation?.hourlyWage || 0;
            const baseSalary = data.calculation?.baseSalary || 0;
            const ordinaryWage = data.calculation?.ordinaryWage || 0;
            
 // ⭐ [v2.3.0] 시급 (설정에 따라 배율 적용)
            let hourlyWage1x, hourlyWage15x;
            if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getRatedHourlyWage) {
 // 원시급 구하기 (hourlyWage는 이미 1배 절사 적용됨)
                const rawHourlyWage = data.rawHourlyWage || hourlyWage;
                hourlyWage1x = SalaryCalculator.getRatedHourlyWage(rawHourlyWage, 1, year);
                hourlyWage15x = SalaryCalculator.getRatedHourlyWage(rawHourlyWage, 1.5, year);
                
                if (isDecimalMode && !showAsInteger) {
                    hourlyWage1x = Number(hourlyWage1x.toFixed(2));
                    hourlyWage15x = Number(hourlyWage15x.toFixed(2));
                } else {
                    hourlyWage1x = Math.floor(hourlyWage1x);
                    hourlyWage15x = Math.floor(hourlyWage15x);
                }
            } else if (isDecimalMode && !showAsInteger) {
 // 소수점 유지
                hourlyWage1x = Number(hourlyWage.toFixed(2));
                hourlyWage15x = Number((hourlyWage * 1.5).toFixed(2));
            } else {
 // 정수
                hourlyWage1x = Math.floor(hourlyWage);
                hourlyWage15x = Math.round(hourlyWage * 1.5);
            }
            
            const row = [
                index + 1,
                data.emp.assignments?.[0]?.dept || data.emp.currentPosition?.dept || '',
                data.emp.personalInfo?.name || '',
                baseSalary,
                ordinaryWage,
                hourlyWage1x,
                hourlyWage15x
            ];
            
            enabledTypes.forEach(type => {
                row.push(data.hours[type.code] || 0);
            });
            
            const totalHours = Object.values(data.hours).reduce((sum, h) => sum + (h || 0), 0);
            
 // 상세내역 생성 (이미 calculateOvertimePay에서 절사 적용됨)
            const details = data.calculation?.details || {};
            const detailParts = enabledTypes
                .filter(type => details[type.code]?.pay > 0)
                .map(type => `${type.shortName}: ${details[type.code].pay.toLocaleString('ko-KR')}원`);
            const detailText = detailParts.join(', ') || '';
            
            row.push(totalHours);
            row.push(data.calculation?.total || 0);
            row.push(detailText);
            
            return row;
        });
        
 // 합계 행
        const totalRow = ['', '', '합계', '', '', '', ''];  // No, 부서, 이름, 기본급, 통상임금, 시급1배, 시급1.5배
        enabledTypes.forEach(type => {
            const sum = exportData.reduce((s, d) => s + (d.hours[type.code] || 0), 0);
            totalRow.push(sum);
        });
        totalRow.push(exportData.reduce((s, d) => 
            s + Object.values(d.hours).reduce((ss, h) => ss + (h || 0), 0), 0));
        totalRow.push(exportData.reduce((s, d) => s + (d.calculation?.total || 0), 0));
        totalRow.push('');  // 상세내역 - 합계 없음
        rows.push(totalRow);
        
 // XLSX
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '시간외근무');
        
 // 파일명 (필터 적용 시 표시)
        let fileName = `시간외근무_${year}년${month}월`;
        if (deptFilter) fileName += `_${deptFilter}`;
        fileName += '.xlsx';
        
        XLSX.writeFile(wb, fileName);
        
        로거_인사?.info(`시간외근무 엑셀 다운로드: ${fileName}`);
        
    } catch (e) {
        로거_인사?.error('엑셀 다운로드 실패', e);
        alert('엑셀 다운로드 중 오류가 발생했습니다.');
    }
}

// ===== 인쇄 =====

/**
 * 인쇄 (필터링된 데이터)
 */
function printOvertimeList() {
    try {
 // 필터링된 데이터 사용
        const printData = _filteredOvertimeData || _overtimeData;
        
        if (!printData || printData.length === 0) {
            alert('인쇄할 데이터가 없습니다.');
            return;
        }
        
        const { year, month, isDecimalMode } = _overtimeSettings;
        const showAsInteger = document.getElementById('overtimeShowInteger')?.checked || false;
        const enabledTypes = getEnabledOvertimeTypes();
        
 // 필터 정보
        const deptFilter = document.getElementById('overtimeDeptFilter')?.value || '';
        const nameFilter = document.getElementById('overtimeNameFilter')?.value || '';
        const filterInfo = deptFilter ? ` (${deptFilter})` : (nameFilter ? ` (검색: ${nameFilter})` : '');
        
 // 헤더
        const typeHeaders = enabledTypes.map(type => 
            `<th>${type.shortName}<br><small style="font-weight:normal;">×${type.rate}</small></th>`
        ).join('');
        
 // 행
        let totalPay = 0;
        const rows = printData.map((data, index) => {
            const typeValues = enabledTypes.map(type => 
                `<td class="text-center">${data.hours[type.code] || '-'}</td>`
            ).join('');
            
            const totalHours = Object.values(data.hours).reduce((sum, h) => sum + (h || 0), 0);
            const pay = data.calculation?.total || 0;
            const hourlyWage = data.calculation?.hourlyWage || 0;
            const baseSalary = data.calculation?.baseSalary || 0;
            const ordinaryWage = data.calculation?.ordinaryWage || 0;
            totalPay += pay;
            
 // 시급 (설정에 따라)
            let hourlyWage1xDisplay, hourlyWage15xDisplay;
            
 // ⭐ [v2.3.0] 배율 적용 시급 계산
            if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getRatedHourlyWage) {
                const rawHourlyWage = data.rawHourlyWage || hourlyWage;
                const wage1x = SalaryCalculator.getRatedHourlyWage(rawHourlyWage, 1, year);
                const wage15x = SalaryCalculator.getRatedHourlyWage(rawHourlyWage, 1.5, year);
                
                if (isDecimalMode && !showAsInteger) {
                    hourlyWage1xDisplay = wage1x.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    hourlyWage15xDisplay = wage15x.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else {
                    hourlyWage1xDisplay = Math.floor(wage1x).toLocaleString('ko-KR');
                    hourlyWage15xDisplay = Math.floor(wage15x).toLocaleString('ko-KR');
                }
            } else if (isDecimalMode && !showAsInteger) {
                hourlyWage1xDisplay = hourlyWage.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                hourlyWage15xDisplay = (hourlyWage * 1.5).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                hourlyWage1xDisplay = Math.floor(hourlyWage).toLocaleString('ko-KR');
                hourlyWage15xDisplay = Math.round(hourlyWage * 1.5).toLocaleString('ko-KR');
            }
            
 // 상세내역 생성 (이미 calculateOvertimePay에서 절사 적용됨)
            const details = data.calculation?.details || {};
            const detailParts = enabledTypes
                .filter(type => details[type.code]?.pay > 0)
                .map(type => `${type.shortName}: ${details[type.code].pay.toLocaleString('ko-KR')}원`);
            const detailText = detailParts.join(', ') || '-';
            
            return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${data.emp.assignments?.[0]?.dept || data.emp.currentPosition?.dept || ''}</td>
                    <td class="text-center">${data.emp.personalInfo?.name || ''}</td>
                    <td class="text-right">${baseSalary.toLocaleString('ko-KR')}</td>
                    <td class="text-right">${ordinaryWage.toLocaleString('ko-KR')}</td>
                    <td class="text-right">${hourlyWage1xDisplay}</td>
                    <td class="text-right">${hourlyWage15xDisplay}</td>
                    ${typeValues}
                    <td class="text-center">${totalHours || '-'}</td>
                    <td class="text-right">${_formatOvertimeCurrency(pay)}</td>
                    <td class="text-left" style="font-size:8pt;">${detailText}</td>
                </tr>
            `;
        }).join('');
        
 // 합계 행
        const typeSums = enabledTypes.map(type => {
            const sum = printData.reduce((s, d) => s + (d.hours[type.code] || 0), 0);
            return `<td class="text-center">${sum || '-'}</td>`;
        }).join('');
        
        const totalHours = printData.reduce((s, d) => 
            s + Object.values(d.hours).reduce((ss, h) => ss + (h || 0), 0), 0);
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>시간외근무 현황 - ${year}년 ${month}월${filterInfo}</title>
                <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: '맑은 고딕', sans-serif; font-size: 9pt; margin: 0; }
                    h1 { text-align: center; font-size: 16pt; margin-bottom: 15px; }
                    .info { text-align: center; margin-bottom: 12px; color: #666; font-size: 10pt; }
                    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                    th, td { border: 1px solid #333; padding: 5px 3px; vertical-align: middle; word-break: keep-all; }
                    th { background: #f0f0f0; font-size: 8pt; text-align: center; font-weight: 600; }
                    td { font-size: 9pt; }
                    .col-no { width: 2%; }
                    .col-dept { width: 8%; }
                    .col-name { width: 5%; }
                    .col-salary { width: 7%; }
                    .col-wage { width: 6%; }
                    .col-hours { width: 4%; }
                    .col-total-hours { width: 4%; }
                    .col-pay { width: 7%; }
                    .col-detail { width: 18%; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    tfoot td { background: #f5f5f5; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>시간외근무 현황${filterInfo}</h1>
                <div class="info">${year}년 ${month}월 | 직원 수: ${printData.length}명 | 총 시간외수당: ${_formatOvertimeCurrency(totalPay)}</div>
                
                <table>
                    <colgroup>
                        <col class="col-no">
                        <col class="col-dept">
                        <col class="col-name">
                        <col class="col-salary">
                        <col class="col-salary">
                        <col class="col-wage">
                        <col class="col-wage">
                        ${enabledTypes.map(() => '<col class="col-hours">').join('')}
                        <col class="col-total-hours">
                        <col class="col-pay">
                        <col class="col-detail">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>부서</th>
                            <th>이름</th>
                            <th>기본급</th>
                            <th>통상임금</th>
                            <th>시급<br>(1배)</th>
                            <th>시급<br>(1.5배)</th>
                            ${typeHeaders}
                            <th>합계</th>
                            <th>시간외수당</th>
                            <th>상세내역</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7" class="text-center">합계</td>
                            ${typeSums}
                            <td class="text-center">${totalHours}</td>
                            <td class="text-right">${_formatOvertimeCurrency(totalPay)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        
    } catch (e) {
        로거_인사?.error('인쇄 실패', e);
        alert('인쇄 중 오류가 발생했습니다.');
    }
}

// ===== 정렬 기능 =====

/**
 * 정렬 아이콘 반환
 * @param {string} column - 열 이름
 * @returns {string} 아이콘 HTML
 */
function _getSortIcon(column) {
    if (_overtimeSortState.column !== column) {
        return '<span style="color:#d1d5db;font-size:10px;">⇅</span>';
    }
    return _overtimeSortState.direction === 'asc' 
        ? '<span style="color:#4f46e5;font-size:10px;">▲</span>' 
        : '<span style="color:#4f46e5;font-size:10px;">▼</span>';
}

/**
 * 데이터 정렬
 * @param {string} column - 정렬할 열 (dept, name, totalHours, pay)
 */
function _sortOvertimeData(column) {
    if (!_filteredOvertimeData || _filteredOvertimeData.length === 0) return;
    
 // 같은 열 클릭 시 방향 전환
    if (_overtimeSortState.column === column) {
        _overtimeSortState.direction = _overtimeSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        _overtimeSortState.column = column;
        _overtimeSortState.direction = 'asc';
    }
    
    const dir = _overtimeSortState.direction === 'asc' ? 1 : -1;
    
    _filteredOvertimeData.sort((a, b) => {
        let valA, valB;
        
        switch (column) {
            case 'dept':
                valA = a.emp.assignments?.[0]?.dept || a.emp.currentPosition?.dept || '';
                valB = b.emp.assignments?.[0]?.dept || b.emp.currentPosition?.dept || '';
                return valA.localeCompare(valB, 'ko') * dir;
                
            case 'name':
                valA = a.emp.personalInfo?.name || '';
                valB = b.emp.personalInfo?.name || '';
                return valA.localeCompare(valB, 'ko') * dir;
                
            case 'totalHours':
                valA = Object.values(a.hours).reduce((sum, h) => sum + (h || 0), 0);
                valB = Object.values(b.hours).reduce((sum, h) => sum + (h || 0), 0);
                return (valA - valB) * dir;
                
            case 'pay':
                valA = a.calculation?.total || 0;
                valB = b.calculation?.total || 0;
                return (valA - valB) * dir;
                
            default:
                return 0;
        }
    });
    
 // 테이블 새로고침
    const enabledTypes = getEnabledOvertimeTypes();
    _renderOvertimeTable(enabledTypes);
    
    로거_인사?.debug(`시간외근무 정렬: ${column} ${_overtimeSortState.direction}`);
}

// ===== 필터 기능 =====

/**
 * 필터 초기화 (부서 목록 채우기)
 */
function _initOvertimeFilter() {
    if (!_overtimeData || _overtimeData.length === 0) return;
    
 // 부서 목록 수집
    const deptSet = new Set();
    _overtimeData.forEach(data => {
        const dept = data.emp.assignments?.[0]?.dept || data.emp.currentPosition?.dept || '';
        if (dept) deptSet.add(dept);
    });
    
 // 정렬
    const depts = Array.from(deptSet).sort();
    
 // 드롭다운 채우기
    const deptSelect = document.getElementById('overtimeDeptFilter');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">전체</option>' + 
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
    }
    
 // 성명 검색 초기화
    const nameInput = document.getElementById('overtimeNameFilter');
    if (nameInput) {
        nameInput.value = '';
    }
    
 // 필터 정보 업데이트
    _updateFilterInfo();
}

/**
 * 필터 적용
 */
function _applyOvertimeFilter() {
    if (!_overtimeData) return;
    
    const deptFilter = document.getElementById('overtimeDeptFilter')?.value || '';
    const nameFilter = (document.getElementById('overtimeNameFilter')?.value || '').trim().toLowerCase();
    
 // 필터링
    _filteredOvertimeData = _overtimeData.filter(data => {
        const dept = data.emp.assignments?.[0]?.dept || data.emp.currentPosition?.dept || '';
        const name = (data.emp.personalInfo?.name || '').toLowerCase();
        
 // 부서 필터
        if (deptFilter && dept !== deptFilter) return false;
        
 // 성명 필터
        if (nameFilter && !name.includes(nameFilter)) return false;
        
        return true;
    });
    
 // 필터 정보 업데이트
    _updateFilterInfo();
    
 // 테이블 새로고침
    const enabledTypes = getEnabledOvertimeTypes();
    _renderOvertimeTable(enabledTypes);
}

/**
 * 필터 초기화 (전체 표시)
 */
function _clearOvertimeFilter() {
 // 필터 값 초기화
    const deptSelect = document.getElementById('overtimeDeptFilter');
    if (deptSelect) deptSelect.value = '';
    
    const nameInput = document.getElementById('overtimeNameFilter');
    if (nameInput) nameInput.value = '';
    
 // 필터 적용
    _applyOvertimeFilter();
}

/**
 * 필터 정보 업데이트
 */
function _updateFilterInfo() {
    const infoEl = document.getElementById('overtimeFilterInfo');
    if (!infoEl) return;
    
    const total = _overtimeData?.length || 0;
    const filtered = _filteredOvertimeData?.length || 0;
    
    if (total === filtered) {
        infoEl.textContent = `전체 ${total}명`;
        infoEl.style.color = '#6b7280';
        infoEl.style.fontWeight = 'normal';
    } else {
        infoEl.textContent = `${filtered}명 / 전체 ${total}명`;
        infoEl.style.color = '#4f46e5';
        infoEl.style.fontWeight = '500';
    }
}

// ===== 유틸리티 =====

/**
 * 통화 포맷 (시간외근무 전용)
 */
function _formatOvertimeCurrency(value) {
    if (!value && value !== 0) return '-';
    return Math.round(value).toLocaleString('ko-KR') + '원';
}

/**
 * 시급 포맷 (설정에 따라 소수점/정수)
 * @param {number} hourlyWage - 원본 시급
 * @param {number} rate - 배율 (1, 1.5 등)
 * @returns {string} 포맷된 시급
 */
function _formatOvertimeHourlyWage(hourlyWage, rate) {
    if (!hourlyWage && hourlyWage !== 0) return '-';
    
    const { isDecimalMode, hourlyWageRounding, year } = _overtimeSettings || {};
    const showAsInteger = document.getElementById('overtimeShowInteger')?.checked || false;
    
 // ⭐ [v2.3.0] 설정에 따른 배율 적용 시급 계산
    let value;
    if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getRatedHourlyWage) {
 // 급여계산기의 getRatedHourlyWage 사용 (applyTiming 설정 반영)
        value = SalaryCalculator.getRatedHourlyWage(hourlyWage, rate, year);
    } else {
 // fallback: 기존 방식
        value = hourlyWage * rate;
    }
    
    if (isDecimalMode && !showAsInteger) {
 // 소수점 유지 + 체크박스 해제: 소수점 2자리
        return value.toLocaleString('ko-KR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
 // 정수로 표시
    return Math.floor(value).toLocaleString('ko-KR');
}

/**
 * 소수점 표시 옵션 변경 시 처리
 */
function _onOvertimeDecimalOptionChange() {
 // 데이터가 있으면 테이블 새로고침
    if (_overtimeData && _overtimeData.length > 0) {
        const enabledTypes = getEnabledOvertimeTypes();
        _renderOvertimeTable(enabledTypes);
    }
}

// ===== window 함수 등록 =====

if (typeof window !== 'undefined') {
 // 모듈 로드
    window.loadOvertimeModule = loadOvertimeModule;
    
 // 조회/저장
    window.generateOvertimeList = generateOvertimeList;
    window.saveAllOvertimeRecords = saveAllOvertimeRecords;
    
 // 이벤트 핸들러
    window.onOvertimeHourChange = onOvertimeHourChange;
    window.onOvertimeNoteChange = onOvertimeNoteChange;
    window._onOvertimeDecimalOptionChange = _onOvertimeDecimalOptionChange;
    
 // 필터 기능
    window._applyOvertimeFilter = _applyOvertimeFilter;
    window._clearOvertimeFilter = _clearOvertimeFilter;
    
 // 정렬 기능
    window._sortOvertimeData = _sortOvertimeData;
    
 // 설정 모달
    window.openOvertimeSettings = openOvertimeSettings;
    window.closeOvertimeSettingsModal = closeOvertimeSettingsModal;
    window.saveOvertimeSettingsFromModal = saveOvertimeSettingsFromModal;
    
 // 내보내기
    window.downloadOvertimeExcel = downloadOvertimeExcel;
    window.printOvertimeList = printOvertimeList;
    
 // 데이터 접근 (외부 모듈용)
    window.OvertimeManager = {
        loadSettings: loadOvertimeSettings,
        saveSettings: saveOvertimeSettings,
        getEnabledTypes: getEnabledOvertimeTypes,
        loadRecords: loadOvertimeRecords,
        saveRecords: saveOvertimeRecords,
        getRecordsByMonth: getOvertimeRecordsByMonth,
        getEmployeeRecord: getEmployeeOvertimeRecord,
        saveEmployeeRecord: saveEmployeeOvertimeRecord,
        deleteEmployeeRecord: deleteEmployeeOvertimeRecord,
        calculatePay: calculateOvertimePay,
        TYPES: OVERTIME_TYPES
    };
}

// 초기화 로그
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
    console.log(' 시간외근무_인사.js 로드 완료');
}
