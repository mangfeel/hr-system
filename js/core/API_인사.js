/**
 * API_인사.js - 서버 API 호출 모듈
 * 
 * Supabase Edge Functions를 호출하여 서버에서 계산 수행
 * - 핵심 로직은 서버에서만 실행 (코드 보호)
 * - 브라우저는 API 호출만 수행
 * 
 * @version 4.1.0
 * @since 2026-01-21
 * @location js/core/API_인사.js
 * 
 * [변경 이력]
 * v4.1.0 - validateAssignment 필드명 변환 (2026-01-22)
 *   - 클라이언트 필드명(assignmentDate, newDept, newPosition) → 서버 필드명(startDate, dept, position)
 * v4.0.0 - 검증 API 추가 (2026-01-22)
 *   - validateEmployee: 직원 데이터 검증 API
 *   - validateRegistration, validateEdit, validateCareerPeriod 등
 * v3.0.0 - 호봉계산 유틸 API 추가 (2026-01-21)
 *   - calculateRankUtils: 개별 함수 호출 지원
 *   - TenureCalculator, RankCalculator, CareerCalculator 대체
 * v2.0.0 - 급여계산, 시간외수당 API 추가 (2026-01-21)
 * v1.0.0 - 최초 생성 (2026-01-21)
 */

// ===== API 설정 =====
const API_인사 = (function() {
    
    // Supabase Edge Functions URL
    const CONFIG = {
        BASE_URL: 'https://pulanyznvpsrlkpqotat.supabase.co/functions/v1',
        TIMEOUT: 30000  // 30초
    };
    
    // ===== 공통 함수 =====
    
    /**
     * API 호출 공통 함수
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} data - 요청 데이터
     * @returns {Promise<Object>} 응답 데이터
     */
    async function call(endpoint, data = {}) {
        const url = `${CONFIG.BASE_URL}/${endpoint}`;
        
        console.log(`[API] 호출: ${endpoint}`, data);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`[API] 응답: ${endpoint}`, result);
            
            return result;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`[API] 타임아웃: ${endpoint}`);
                throw new Error('API 요청 시간이 초과되었습니다.');
            }
            console.error(`[API] 오류: ${endpoint}`, error);
            throw error;
        }
    }
    
    // ===== 호봉 계산 유틸 API =====
    
    /**
     * 호봉 계산 유틸 API 호출 (개별 함수)
     * @param {string} action - 실행할 함수명
     * @param {Object} params - 파라미터
     * @returns {Promise<any>} 계산 결과
     */
    async function calculateRankUtils(action, params) {
        const result = await call('calculate-rank-utils', { action, params });
        if (result.success) {
            return result.data;
        }
        throw new Error(result.error || '계산 실패');
    }
    
    /**
     * 근속기간 계산
     * @param {string} startDate - 시작일 (YYYY-MM-DD)
     * @param {string} endDate - 종료일 (YYYY-MM-DD)
     * @returns {Promise<Object>} { years, months, days }
     */
    async function calculateTenure(startDate, endDate) {
        return await calculateRankUtils('calculateTenure', { startDate, endDate });
    }
    
    /**
     * 초기 호봉 계산
     * @param {number} careerYears - 경력 연수
     * @param {number} careerMonths - 경력 개월
     * @returns {Promise<number>} 초기 호봉
     */
    async function calculateInitialRank(careerYears, careerMonths) {
        return await calculateRankUtils('calculateInitialRank', { careerYears, careerMonths });
    }
    
    /**
     * 첫승급일 계산
     * @param {string} entryDate - 입사일
     * @param {number} careerYears - 경력 연수
     * @param {number} careerMonths - 경력 개월
     * @param {number} careerDays - 경력 일수
     * @returns {Promise<string>} 첫승급일 (YYYY-MM-DD)
     */
    async function calculateFirstUpgradeDate(entryDate, careerYears, careerMonths, careerDays) {
        return await calculateRankUtils('calculateFirstUpgradeDate', {
            entryDate, careerYears, careerMonths, careerDays
        });
    }
    
    /**
     * 현재 호봉 계산
     * @param {number} startRank - 시작 호봉
     * @param {string} firstUpgradeDate - 첫승급일
     * @param {string} baseDate - 기준일
     * @returns {Promise<number>} 현재 호봉
     */
    async function calculateCurrentRank(startRank, firstUpgradeDate, baseDate) {
        return await calculateRankUtils('calculateCurrentRank', {
            startRank, firstUpgradeDate, baseDate
        });
    }
    
    /**
     * 차기승급일 계산
     * @param {string} firstUpgradeDate - 첫승급일
     * @param {string} baseDate - 기준일
     * @returns {Promise<string>} 차기승급일 (YYYY-MM-DD)
     */
    async function calculateNextUpgradeDate(firstUpgradeDate, baseDate) {
        return await calculateRankUtils('calculateNextUpgradeDate', {
            firstUpgradeDate, baseDate
        });
    }
    
    /**
     * 경력 환산 (인정률 + 근무시간 적용)
     * @param {Object} period - { years, months, days }
     * @param {number} rate - 인정률 (0-100)
     * @param {number} workingHours - 주당근무시간 (기본: 40)
     * @returns {Promise<Object>} { years, months, days }
     */
    async function applyConversionRate(period, rate, workingHours = 40) {
        return await calculateRankUtils('applyConversionRate', {
            period, rate, workingHours
        });
    }
    
    /**
     * 전체 경력 합산
     * @param {Array} careers - 경력 배열
     * @returns {Promise<Object>} { totalYears, totalMonths, totalDays, details }
     */
    async function calculateTotalCareer(careers) {
        return await calculateRankUtils('calculateTotalCareer', { careers });
    }
    
    // ===== 호봉 계산 API (통합) =====
    
    /**
     * 호봉 계산 API 호출 (통합)
     * @param {Object} params - 계산 파라미터
     * @returns {Promise<Object>} 계산 결과
     */
    async function calculateRank(params) {
        return await call('calculate-rank', params);
    }
    
    // ===== 급여 계산 API =====
    
    /**
     * 급여 계산 API 호출
     * @param {Object} params - 계산 파라미터
     * @returns {Promise<Object>} 계산 결과
     */
    async function calculateSalary(params) {
        return await call('calculate-salary', params);
    }
    
    // ===== 시간외수당 계산 API =====
    
    /**
     * 시간외수당 계산 API 호출
     * @param {Object} params - 계산 파라미터
     * @returns {Promise<Object>} 계산 결과
     */
    async function calculateOvertime(params) {
        return await call('calculate-overtime', params);
    }
    
    // ===== 검증 API (v4.0.0 추가) =====
    
    /**
     * 검증 API 호출 공통 함수
     * @param {string} action - 검증 액션
     * @param {Object} params - 검증 파라미터
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function validateEmployee(action, params) {
        const result = await call('validate-employee', { action, ...params });
        if (result.success) {
            return result.data;
        }
        throw new Error(result.error || '검증 실패');
    }
    
    /**
     * 직원 등록 검증
     * @param {Object} data - 직원 데이터 { name, dept, position, grade, jobType, entryDate, ... }
     * @param {Array} existingCodes - 기존 고유번호 목록 (중복 체크용)
     * @param {Array} existingNumbers - 기존 사원번호 목록 (중복 체크용)
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function validateRegistration(data, existingCodes = [], existingNumbers = []) {
        return await validateEmployee('validateRegistration', {
            data,
            existingCodes,
            existingNumbers
        });
    }
    
    /**
     * 직원 수정 검증
     * @param {Object} data - 수정할 데이터 { name, email, phone, residentNumber, ... }
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function validateEdit(data) {
        return await validateEmployee('validateEdit', { data });
    }
    
    /**
     * 경력 기간 검증
     * @param {string} startDate - 시작일
     * @param {string} endDate - 종료일
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function validateCareerPeriod(startDate, endDate) {
        return await validateEmployee('validateCareerPeriod', { startDate, endDate });
    }
    
    /**
     * 인사발령 검증
     * @param {Object} data - 발령 데이터 { entryDate, assignmentDate, newDept, newPosition }
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function validateAssignment(data) {
        // 필드명 변환 (클라이언트 → 서버)
        const serverData = {
            entryDate: data.entryDate,
            startDate: data.assignmentDate || data.startDate,
            dept: data.newDept || data.dept,
            position: data.newPosition || data.position
        };
        return await validateEmployee('validateAssignment', { data: serverData });
    }
    
    /**
     * 날짜 형식/범위 검증
     * @param {string} dateStr - 날짜 문자열 (YYYY-MM-DD)
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function validateDate(dateStr) {
        return await validateEmployee('validateDate', { dateStr });
    }
    
    /**
     * 중복 검증
     * @param {string} code - 검증할 코드
     * @param {Array} existingCodes - 기존 코드 목록
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function checkDuplicate(code, existingCodes = []) {
        return await validateEmployee('checkDuplicate', { code, existingCodes });
    }
    
    /**
     * 주민등록번호 형식 검증
     * @param {string} residentNumber - 주민등록번호 (000000-0000000)
     * @returns {Promise<Object>} { valid: boolean, errors: string[] }
     */
    async function isValidResidentNumber(residentNumber) {
        return await validateEmployee('isValidResidentNumber', { residentNumber });
    }
    
    // ===== 유틸리티 =====
    
    /**
     * API 연결 확인
     * @returns {Promise<boolean>} 연결 성공 여부
     */
    async function healthCheck() {
        try {
            const result = await call('hello-world', {});
            return result && result.message ? true : false;
        } catch (e) {
            console.error('[API] Health check 실패', e);
            return false;
        }
    }
    
    /**
     * 모든 API 상태 확인
     * @returns {Promise<Object>} 각 API별 상태
     */
    async function checkAllAPIs() {
        const results = {
            'hello-world': false,
            'calculate-rank': false,
            'calculate-rank-utils': false,
            'calculate-salary': false,
            'calculate-overtime': false,
            'validate-employee': false
        };
        
        try {
            const r1 = await call('hello-world', {});
            results['hello-world'] = r1 && r1.message ? true : false;
        } catch (e) { }
        
        try {
            const r2 = await call('calculate-rank', {
                careers: [],
                entryDate: '2020-01-01',
                baseDate: '2024-12-31',
                baseRank: 1
            });
            results['calculate-rank'] = r2 && r2.success ? true : false;
        } catch (e) { }
        
        try {
            const r3 = await calculateCurrentRank(1, '2020-01-01', '2024-12-31');
            results['calculate-rank-utils'] = typeof r3 === 'number';
        } catch (e) { }
        
        try {
            const r4 = await call('calculate-salary', { baseSalary: 1000000 });
            results['calculate-salary'] = r4 && r4.success ? true : false;
        } catch (e) { }
        
        try {
            const r5 = await call('calculate-overtime', {
                hourlyWage: 10000,
                hours: { extended15x: 1 }
            });
            results['calculate-overtime'] = r5 && r5.success ? true : false;
        } catch (e) { }
        
        try {
            const r6 = await validateRegistration({
                name: '테스트',
                dept: '테스트부',
                position: '테스트직',
                grade: '1급',
                jobType: '테스트',
                entryDate: '2024-01-01'
            });
            results['validate-employee'] = r6 && typeof r6.valid === 'boolean';
        } catch (e) { }
        
        return results;
    }
    
    // ===== 공개 API =====
    return {
        // 설정
        CONFIG,
        
        // 공통
        call,
        
        // 호봉 계산 유틸 (개별 함수)
        calculateRankUtils,
        calculateTenure,
        calculateInitialRank,
        calculateFirstUpgradeDate,
        calculateCurrentRank,
        calculateNextUpgradeDate,
        applyConversionRate,
        calculateTotalCareer,
        
        // 호봉 계산 (통합)
        calculateRank,
        
        // 급여 계산
        calculateSalary,
        
        // 시간외수당 계산
        calculateOvertime,
        
        // 검증 (v4.0.0 추가)
        validateEmployee,
        validateRegistration,
        validateEdit,
        validateCareerPeriod,
        validateAssignment,
        validateDate,
        checkDuplicate,
        isValidResidentNumber,
        
        // 유틸리티
        healthCheck,
        checkAllAPIs
    };
    
})();

// 전역 등록
if (typeof window !== 'undefined') {
    window.API_인사 = API_인사;
}

// 초기화 로그
console.log('✅ API_인사.js 로드 완료 (v4.1.0)');
